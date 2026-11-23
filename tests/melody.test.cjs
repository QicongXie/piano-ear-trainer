'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

const melodyScript = readFileSync(join(__dirname, '../templates/index.html'), 'utf8')
    .split('// ========== 听音接龙 ==========')[1]
    .split('// ========== 初始化 ==========')[0];

function harness() {
    const element = () => ({
        classList: { add() {} }, replaceChildren() {}, dataset: {},
        addEventListener(name, handler) { this[name] = handler; }
    });
    const nodes = {};
    const keys = Array.from({ length: 5 }, (_, i) => ({ ...element(), dataset: { melodyNote: i } }));
    const timers = [], saved = {}, played = [];
    const context = vm.createContext({
        document: { getElementById: id => nodes[id] ??= element(), querySelectorAll: () => keys, createElement: element },
        currentMode: 'melody',
        VELOCITY_LAYERS: ['mf'],
        localStorage: { getItem: key => saved[key] ?? null, setItem: (key, value) => { saved[key] = value; } },
        playNote(midi) {
            const source = { stopped: false, stop() { this.stopped = true; }, addEventListener() {} };
            played.push({ midi, source });
            return { source };
        },
        setTimeout: handler => timers.push(handler)
    });
    const run = source => vm.runInContext(source, context);
    run(melodyScript);
    run('setupMelody()');
    return { run, nodes, keys, saved, played, async drain() {
        while (timers.length) {
            timers.shift()();
            await Promise.resolve();
            await Promise.resolve();
        }
    } };
}

test('melody locks input during playback, cancels on leave, and restarts input on replay', async () => {
    const h = harness();
    h.run('chooseMelodyNote(0)');
    assert.equal(h.played.at(-1).midi, 60);
    h.run('advanceMelody(); chooseMelodyNote(0)');
    assert.ok(h.keys.every(key => key.disabled));
    assert.equal(h.run('melodyRound.entered'), 0);
    const first = h.played.at(-1), playCount = h.played.length;
    h.run("currentMode = 'training'; stopMelody(true)");
    await h.drain();
    assert.equal(h.run('melodyRound.phase'), 'interrupted');
    assert.ok(first.source.stopped);
    assert.equal(h.played.length, playCount);
    h.run("currentMode = 'melody'; renderMelody()");
    h.nodes.melodyReplay.click();
    await h.drain();
    assert.equal(h.run('melodyRound.phase'), 'answering');
    h.run('chooseMelodyNote(melodyRound.sequence[0])');
    assert.equal(h.run('melodyRound.entered'), 1);
    h.nodes.melodyReplay.click();
    await h.drain();
    assert.equal(h.run('melodyRound.entered'), 0);
    h.run('chooseMelodyNote((melodyRound.sequence[0] + 1) % 5)');
    assert.equal(h.run('melodyRound.phase'), 'lost');
    assert.match(h.nodes.melodyStatus.textContent, /正确旋律/);
});

test('melody grows from three to eight notes and remembers best after restart', async () => {
    const h = harness();
    h.run('advanceMelody()');
    await h.drain();
    for (let length = 3; length <= 8; length++) {
        assert.equal(h.run('melodyRound.sequence.length'), length);
        assert.ok(h.run('melodyRound.sequence.every((n, i, a) => !i || a[i-1] !== n)'));
        h.run('melodyRound.sequence.forEach(chooseMelodyNote)');
        if (length < 8) {
            assert.equal(h.run('melodyRound.phase'), 'round-won');
            h.run('advanceMelody()');
            await h.drain();
        }
    }
    assert.equal(h.run('melodyRound.phase'), 'won');
    assert.equal(h.saved['piano-ear-trainer.melody.best.v1'], '6');
    h.run('advanceMelody()');
    await h.drain();
    assert.equal(h.run('melodyRound.score'), 0);
    assert.equal(h.run('melodyRound.best'), 6);
    assert.equal(h.run('melodyRound.sequence.length'), 3);
});
