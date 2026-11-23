'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const script = readFileSync(require('node:path').join(__dirname, '../templates/index.html'), 'utf8')
    .split('<script>').at(-1).split('</script>')[0]
    .replace('{{ velocity_layers | tojson }}', '["mf"]')
    .replace(/\binit\(\);\s*$/, '');

function harness() {
    const nodes = new Map();
    const played = [];
    const timers = new Map();
    let timerId = 0;
    const element = id => {
        if (!nodes.has(id)) nodes.set(id, {
            hidden: true, disabled: false, textContent: '', value: '', innerHTML: '', style: {},
            classList: { add() {}, remove() {}, toggle() {} },
        });
        return nodes.get(id);
    };
    element('velocityLevel').value = 'mf';
    element('octaveSpeed').value = '500';
    const ctx = vm.createContext({
        console, played,
        setTimeout: fn => { timers.set(++timerId, fn); return timerId; },
        clearTimeout: id => timers.delete(id),
        document: { getElementById: element, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} },
        window: { addEventListener() {} },
    });
    const run = code => vm.runInContext(code, ctx);
    run(script);
    run(`
        function testIndex(name) { return ALL_NOTES.findIndex(n => n.name === name); }
        function testRange(low, high, target) {
            lowNoteIndex = testIndex(low);
            highNoteIndex = testIndex(high);
            const index = testIndex(target);
            currentAnswer = index < 0 ? null : { index, ...ALL_NOTES[index] };
        }
        scrollPianoToRange = () => {};
        playNote = (midi, duration, polyphonic, layer, cents = 0) => {
            const event = { midi, cents, stopped: false };
            const source = { stop() { event.stopped = true; } };
            if (!polyphonic) currentPlayingSource = source;
            played.push(event);
            return { source };
        };
        saveState = () => {};
        sampleBuffers.mf = Object.fromEntries(AVAILABLE_SAMPLES.map(note => [note, {}]));
        loadedLayers.add('mf');
    `);
    return { run, element, played, timers,
        range(low, high, answer) {
            run(`testRange(${JSON.stringify(low)},${JSON.stringify(high)},${JSON.stringify(answer)})`);
        },
        names(expr) { return JSON.parse(run(`JSON.stringify(${expr})`)); },
        async tick() {
            const next = timers.entries().next().value;
            if (!next) return;
            timers.delete(next[0]);
            next[1]();
            await new Promise(resolve => setImmediate(resolve));
        },
    };
}

test('complete scale/window references fit the chosen range and include the answer, or refuse', () => {
    const h = harness();
    const { element, range, run, names } = h;
    const notes = () => names('getOctaveRefNotes().map(i => ALL_NOTES[i].name)');
    element('octaveRefMode').value = 'chromatic';
    range('D4', 'C#5', 'C#5');
    assert.equal(notes().length, 12);
    assert.equal(notes()[0], 'D4');
    assert.equal(notes().at(-1), 'C#5');
    range('D4', 'C5', 'C5');
    assert.deepEqual(notes(), []);

    element('octaveRefMode').value = 'diatonic';
    range('C4', 'B4', 'F#4');
    assert.deepEqual(notes(), ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']);
    range('C#4', 'C5', 'C#4');
    assert.deepEqual(notes(), []); // No C4 on left of the answer, even though there are seven white keys.

    element('octaveRefMode').value = 'context';
    element('contextRange').value = '2';
    run('Math.random = () => 0.99');
    range('G4', 'C5', 'G#4');
    assert.deepEqual(notes(), ['G#4', 'A4', 'A#4', 'B4', 'C5']);
    range('G4', 'A4', 'G#4');
    assert.deepEqual(notes(), []);
});

test('standard A and tonic references do not substitute outside the configured bounds', async () => {
    const h = harness();
    h.range('C5', 'D5', 'C#5');
    h.element('octaveRefMode').value = 'standardA';
    await h.run('playOctaveHint()');
    assert.equal(h.played.length, 0);
    assert.match(h.element('hintArea').textContent, /固定为 A4.*不包含 A4/);

    h.range('C#5', 'G5', 'F5');
    h.element('octaveRefMode').value = 'tonic';
    assert.equal(h.run('getOctaveRefNotes().length'), 0);
    h.range('C5', 'G5', 'F5');
    assert.equal(h.run('ALL_NOTES[getOctaveRefNotes()[0]].name'), 'C5');

    h.range('G4', 'C5', 'B4');
    h.element('octaveRefMode').value = 'standardA';
    assert.equal(h.run('ALL_NOTES[getOctaveRefNotes()[0]].name'), 'A4');
});

test('interval reference preserves fixed size and direction, and random choices use feasible options only', () => {
    const { range, element, run, names } = harness();
    const indices = () => names('getIntervalRefNotes().notes.map(n => ALL_NOTES[n.index].name)');
    range('C4', 'G4', 'E4');
    element('intervalType').value = '7';
    element('intervalDirection').value = 'up';
    assert.deepEqual(indices(), ['C4', 'G4']);
    element('intervalDirection').value = 'down';
    assert.equal(run('getIntervalRefNotes()'), null);
    element('intervalDirection').value = 'both';
    assert.equal(run('getIntervalRefNotes()'), null);

    range('F3', 'G4', 'E4');
    assert.deepEqual(indices(), ['C4', 'G4', 'C4', 'F3']);

    range('C4', 'D4', 'C#4');
    element('intervalType').value = 'random';
    element('intervalDirection').value = 'random';
    for (const value of ['0', '0.99']) {
        run(`Math.random = () => ${value}`);
        assert.deepEqual(indices(), ['C4', 'D4']);
        assert.equal(run('getIntervalRefNotes().direction'), 'up');
    }
});

test('range update invalidates a running reference even if the live answer stays in range', async () => {
    const h = harness();
    h.range('C4', 'B4', 'D4');
    h.element('octaveRefMode').value = 'chromatic';
    const playing = h.run('playOctaveHint()');
    assert.equal(h.played.length, 1);
    h.run("lowNoteIndex = testIndex('C#4'); updateTrainingRange()");
    assert.equal(h.run("currentAnswer.name"), 'D4');
    assert.equal(h.run('cachedOctaveRefNotes'), null);
    assert.equal(h.played[0].stopped, true);
    await h.tick();
    await playing;
    assert.equal(h.played.length, 1);
});

test('single-note training comparisons stay inside the range, but freeplay stays unrestricted', () => {
    const h = harness();
    h.range('C4', 'D4', 'C#4');
    h.run("isAnswered = true; onKeyClick(testIndex('E4')); onKeyClick(testIndex('C4'))");
    assert.deepEqual(h.played.map(e => e.midi), [60]);
    h.run("currentMode = 'freeplay'; onKeyClick(testIndex('A0')); onKeyClick(testIndex('C8'))");
    assert.deepEqual(h.played.map(e => e.midi), [60, 21, 108]);
});

test('pitch tasks reject too narrow a range and keep either comparison direction and manual tuning inside', async () => {
    const h = harness();
    const { range, run, element } = h;
    run("currentMode = 'pitch'");
    range('C4', 'C#4');
    run('newPitchQuestion()');
    assert.equal(h.played.length, 0);
    assert.match(element('pitchFeedback').textContent, /至少 3 个连续半音键/);

    range('C4', 'D4');
    for (const random of ['0.01', '0.99']) {
        run(`Math.random = () => ${random}; pitchSubMode = 'direction'; updateTrainingRange(); newPitchQuestion()`);
        await h.tick();
        assert.equal(run('pitchBaseMidi'), 61);
        assert.equal(run('pitchTargetCents'), random === '0.01' ? -50 : 50);
    }

    for (const random of ['0.01', '0.99']) {
        run(`Math.random = () => ${random}; pitchSubMode = 'tuning'; updateTrainingRange(); newPitchQuestion()`);
        assert.equal(run('pitchBaseMidi'), 61);
        for (const raw of [0, 100]) {
            run(`updateTuneFromSlider(${raw}); playPitchAdjusted()`);
            const { midi, cents } = h.played.at(-1);
            assert.ok(midi + cents / 100 >= 60 && midi + cents / 100 <= 62);
        }
    }
    range('C5', 'D5');
    run('updateTrainingRange()');
    assert.equal(run('pitchQuestionActive'), false);
    assert.equal(h.played.at(-1).stopped, true);
});
