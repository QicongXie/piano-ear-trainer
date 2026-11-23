'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

const script = readFileSync(process.env.PIANO_TEMPLATE || require('node:path').join(__dirname, '../templates/index.html'), 'utf8')
    .split('<script>').at(-1).split('</script>')[0]
    .replace('{{ velocity_layers | tojson }}', '["pp","p","mp","mf","f","ff"]');

function makeHarness() {
    const timers = new Map();
    const nodes = new Map();
    const listeners = new Map();
    const played = [];
    let nextTimer = 0;
    const element = id => {
        if (!nodes.has(id)) nodes.set(id, {
            value: '', textContent: '', innerHTML: '', disabled: false, style: {}, classList: {
                add() {}, remove() {}, toggle() {}
            }, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}
        });
        return nodes.get(id);
    };
    element('octaveSpeed').value = '500';
    element('octaveRefMode').value = 'diatonic';
    const context = vm.createContext({
        document: { getElementById: element, querySelector: () => null, querySelectorAll: () => [],
            addEventListener: (event, fn) => listeners.set('document.' + event, fn) },
        window: { addEventListener: (event, fn) => listeners.set('window.' + event, fn) },
        setTimeout: fn => { timers.set(++nextTimer, fn); return nextTimer; },
        clearTimeout: id => timers.delete(id),
        console, played,
    });
    const run = code => vm.runInContext(code, context);
    // Stop before init() so these tests run without real DOM or audio devices.
    run(script.replace(/\binit\(\);\s*$/, ''));
    run(`
        scrollPianoToRange = () => {};
        audioCtx = { currentTime: 0 };
        getOctaveRefNotes = () => [0, 1];
        getIntervalRefNotes = () => ({ notes: [{ index: 0 }, { index: 1 }], intervalName: '小二度', direction: 'up' });
        playNote = (midi, duration, polyphonic, layer, cents) => {
            const event = { midi, layer, cents, stopped: false };
            const source = { stop() { event.stopped = true; } };
            if (!polyphonic) currentPlayingSource = source;
            played.push(event);
            return { source, gainNode: { gain: { value: 1, cancelScheduledValues() {},
                setValueAtTime() {}, exponentialRampToValueAtTime() {} } } };
        };
    `);
    return { run, timers, element, played, listeners, async tick() {
        const entry = timers.entries().next().value;
        if (entry) {
            timers.delete(entry[0]);
            entry[1]();
            await new Promise(resolve => setImmediate(resolve));
        }
    } };
}

for (const refMode of ['diatonic', 'interval']) {
    test(refMode + ' reference does not keep playing or replay after leaving training', async () => {
        const h = makeHarness();
        h.element('octaveRefMode').value = refMode;
        const completion = h.run('currentAnswer = { midi: 60 }; playOctaveHint()');
        assert.equal(h.played.length, 1);
        h.run("switchMode('freeplay')");
        for (let step = 0; step < 3; step++) await h.tick();
        await completion;
        assert.equal(h.played.length, 1);
        assert.equal(h.played[0].stopped, true);
        assert.equal(h.element('btnPlayOctave').disabled, false);
    });
}

test('normal reference replays the target, and a second hotkey does not duplicate playback', async () => {
    const h = makeHarness();
    const completion = h.run('currentAnswer = { midi: 60 }; playOctaveHint()');
    await h.run('playOctaveHint()');
    await h.tick();
    await h.tick();
    await h.tick();
    await completion;
    assert.deepEqual(h.played.map(e => e.midi), [21, 22, 60]);
    assert.equal(h.element('btnPlayOctave').disabled, false);
});

test('pitch pair locks velocity, then stops queued/playing notes when leaving the mode', async () => {
    const h = makeHarness();
    h.run(`currentMode = 'pitch'; pitchQuestionActive = true; pitchBaseMidi = 60;
        pitchVelocityLayer = 'f'; pitchTargetCents = -12; playPitchStimulus();`);
    await h.tick();
    assert.deepEqual(h.played.map(({ layer, cents }) => [layer, cents]), [['f', 0], ['f', -12]]);
    assert.equal(h.played[0].stopped, true);
    h.run("playPitchStimulus(); switchMode('training')");
    await h.tick();
    assert.equal(h.played.length, 3);
    assert.equal(h.played[2].stopped, true);
});

test('freeplay releases a held key on blur and accepts that key again', () => {
    const h = makeHarness();
    h.run("currentMode = 'freeplay'; freeplayNoteOn('KeyA')");
    assert.equal(h.played.length, 1);
    h.listeners.get('window.blur')();
    h.run("freeplayNoteOn('KeyA')");
    assert.equal(h.played.length, 2);
});

test('shifting the legacy keyboard octave releases held notes and keeps Z/X mapping', async () => {
    const h = makeHarness();
    h.run("currentMode = 'freeplay'; freeplayNoteOn('KeyA')");
    const send = (code, modifiers = {}) => h.listeners.get('document.keydown')({
        code, target: {}, preventDefault() {}, ...modifiers
    });
    send('KeyX', { metaKey: true });
    assert.equal(h.run('freeplayOctave'), 4);
    send('KeyX');
    assert.equal(h.element('freeplayOctave').textContent, 5);
    assert.equal(h.run('Object.keys(activeKeySources).length'), 0);
    h.listeners.get('document.keyup')({ code: 'KeyA' });
    h.run("freeplayNoteOn('KeyA')");
    await h.tick();
    assert.deepEqual(h.played.map(e => [e.midi, e.stopped]), [[60, true], [72, false]]);
});
