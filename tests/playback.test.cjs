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
    h.run("currentMode = 'freeplay'; freeplayNoteOn('KeyZ')");
    assert.equal(h.played.length, 1);
    h.listeners.get('window.blur')();
    h.run("freeplayNoteOn('KeyZ')");
    assert.equal(h.played.length, 2);
});

test('freeplay maps 34 distinct chromatic notes and supports holding keys on both rows', () => {
    const h = makeHarness();
    h.run("currentMode = 'freeplay'; Object.keys(KEYBOARD_MAP).forEach(freeplayNoteOn)");
    assert.equal(h.played.length, 34);
    assert.deepEqual(h.played.map(e => e.midi), Array.from({ length: 34 }, (_, i) => 60 + i));
    assert.equal(h.run('Object.keys(activeKeySources).length'), 34);
    h.listeners.get('document.keyup')({ code: 'KeyZ' });
    assert.equal(h.run('Object.keys(activeKeySources).length'), 33);
    assert.equal(h.run('activeKeySources.KeyQ.noteIdx'), 56);
});

test('changing octave releases held notes and old keyup cannot cut a new pitch', async () => {
    const h = makeHarness();
    h.run("currentMode = 'freeplay'; freeplayNoteOn('KeyZ'); freeplayNoteOn('KeyQ'); shiftFreeplayOctave(1)");
    assert.equal(h.element('freeplayOctave').textContent, 'C5–A7');
    assert.equal(h.run('Object.keys(activeKeySources).length'), 0);
    h.listeners.get('document.keyup')({ code: 'KeyZ' });
    h.run("freeplayNoteOn('KeyZ')");
    await h.tick();
    await h.tick();
    assert.deepEqual(h.played.map(e => [e.midi, e.stopped]), [[60, true], [77, true], [72, false]]);
});

test('freeplay labels move with the bracket shortcut, stay within full octaves, and clear on mode exit', () => {
    const h = makeHarness();
    h.run("pianoKeys = ALL_NOTES.map(() => ({ dataset: {} })); switchMode('freeplay')");
    assert.equal(h.run('pianoKeys[39].dataset.freeplayKey'), 'Z');
    assert.equal(h.run('pianoKeys[51].dataset.freeplayKey'), ',');
    assert.equal(h.run('pianoKeys[57].dataset.freeplayKey'), '2');
    assert.equal(h.run('pianoKeys[72].dataset.freeplayKey'), 'P');
    const send = (code, options = {}) => h.listeners.get('document.keydown')({
        code, target: {}, preventDefault() {}, ...options,
    });
    send('BracketRight', { ctrlKey: true });
    assert.equal(h.element('freeplayOctave').textContent, 'C4–A6');
    send('BracketRight');
    assert.equal(h.element('freeplayOctave').textContent, 'C5–A7');
    assert.equal(h.run('pianoKeys[39].dataset.freeplayKey'), undefined);
    assert.equal(h.run('pianoKeys[51].dataset.freeplayKey'), 'Z');
    for (let i = 0; i < 8; i++) send('BracketRight');
    assert.equal(h.element('freeplayOctave').textContent, 'C5–A7');
    assert.equal(h.element('freeplayHigher').disabled, true);
    for (let i = 0; i < 8; i++) send('BracketLeft');
    assert.equal(h.element('freeplayOctave').textContent, 'C1–A3');
    assert.equal(h.element('freeplayLower').disabled, true);
    h.run("switchMode('training')");
    assert.equal(h.run('pianoKeys.filter(k => k.dataset.freeplayKey).length'), 0);
});
