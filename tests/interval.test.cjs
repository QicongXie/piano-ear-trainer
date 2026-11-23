'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

const script = readFileSync(process.env.PIANO_TEMPLATE || join(__dirname, '../templates/index.html'), 'utf8')
    .split('// ========== 音程挑战 ==========')[1]
    .split('// ========== 初始化 ==========')[0];

function harness() {
    const element = () => ({
        textContent: '', addEventListener(name, callback) { this[name] = callback; },
        classList: { toggle(key, enabled) { this[key] = enabled; } },
    });
    const nodes = {};
    const options = Array.from({ length: 4 }, (_, i) => {
        const label = element();
        return { ...element(), dataset: { intervalChoice: i }, label, querySelector: () => label };
    });
    const played = [], timers = [], random = [];
    const pitchNames = { 60: 'C4', 62: 'D4', 64: 'E4', 65: 'F4', 67: 'G4', 69: 'A4', 71: 'B4' };
    const h = { played, nodes, options, failMidi: null, random };
    const cx = vm.createContext({
        currentMode: 'interval', VELOCITY_LAYERS: ['mf'],
        ALL_NOTES: Array.from({ length: 88 }, (_, i) => ({ name: pitchNames[21 + i] })),
        document: { getElementById: id => nodes[id] ??= element(), querySelectorAll: () => options },
        Math: { floor: Math.floor, random: () => random.shift() ?? 0 },
        setTimeout: callback => timers.push(callback),
        playNote(midi) {
            if (midi === h.failMidi) return null;
            const source = { stop() { this.stopped = true; }, addEventListener() {} };
            played.push({ midi, source });
            return { source };
        },
    });
    h.run = code => vm.runInContext(code, cx);
    h.run(script + '\nsetupInterval();');
    h.drain = async () => {
        while (timers.length) {
            timers.shift()();
            await Promise.resolve();
            await Promise.resolve();
        }
    };
    return h;
}

test('generates five valid interval questions, adds descending intervals and closer distractors, and restarts', async () => {
    const h = harness();
    assert.equal(h.nodes.intervalOptions.hidden, true);
    const directions = [];
    let previous;
    for (let i = 1; i <= 5; i++) {
        h.random.push(0, 0, ...(i > 3 ? [i === 4 ? 0 : 0.9] : []));
        h.nodes.intervalAdvance.click();
        assert.ok(h.options.every(option => option.disabled));
        h.run('answerInterval(0)');
        assert.equal(h.run('intervalRound.selected'), null);
        await h.drain();
        const { notes, distance, choices } = h.run('intervalRound.question');
        const [first, second] = notes;
        assert.equal(Math.abs(second - first), distance);
        assert.notEqual(distance, previous);
        assert.equal(new Set(choices).size, 4);
        assert.ok(choices.includes(distance));
        assert.equal(choices.includes(12), i <= 3);
        directions.push(Math.sign(second - first));
        assert.equal(h.nodes.intervalProgress.textContent, `${i} / 5`);
        h.options[choices.indexOf(distance)].click();
        h.run('answerInterval(0)'); // Ignore extra choices after the first submission.
        assert.equal(h.run('intervalRound.score'), i);
        previous = distance;
    }
    assert.deepEqual(directions, [1, 1, 1, -1, 1]);
    assert.match(h.nodes.intervalStatus.textContent, /五题答对 5 题/);
    assert.equal(h.nodes.intervalAdvance.textContent, '再玩一轮');
    h.nodes.intervalAdvance.click();
    await h.drain();
    assert.equal(h.nodes.intervalProgress.textContent, '1 / 5');
    assert.equal(h.run('intervalRound.score'), 0);
});

test('stops partial playback on exit, replays the same pair, and exposes wrong/right explanation', async () => {
    const h = harness();
    h.nodes.intervalAdvance.click();
    const first = h.played[0];
    h.run("currentMode = 'training'; stopInterval()");
    await h.drain();
    assert.ok(first.source.stopped);
    assert.equal(h.played.length, 1);
    h.run("currentMode = 'interval'; renderInterval()");
    assert.match(h.nodes.intervalStatus.textContent, /播放已中断/);
    h.nodes.intervalReplay.click();
    await h.drain();
    const { notes, distance, choices } = h.run('intervalRound.question');
    assert.deepEqual(h.played.slice(-2).map(entry => entry.midi), Array.from(notes));
    const target = choices.indexOf(distance);
    const wrong = (target + 1) % 4;
    h.options[wrong].click();
    assert.equal(h.options[target].classList.correct, true);
    assert.equal(h.options[wrong].classList.incorrect, true);
    assert.match(h.nodes.intervalFeedback.textContent, /你选了.*正确答案是.*半音.*上行/);
    const feedback = h.nodes.intervalFeedback.textContent;
    h.nodes.intervalReplay.click();
    await h.drain();
    assert.equal(h.nodes.intervalFeedback.textContent, feedback);
    assert.equal(h.run('intervalRound.score'), 0);
});

test('failed sample never unlocks guessing; explicit replay recovers without losing progress', async () => {
    const h = harness();
    h.failMidi = 62;
    h.nodes.intervalAdvance.click();
    await h.drain();
    assert.equal(h.played.length, 1);
    assert.ok(h.options.every(option => option.disabled));
    assert.match(h.nodes.intervalStatus.textContent, /重试加载.*重听两音/);
    h.failMidi = null;
    h.nodes.intervalReplay.click();
    await h.drain();
    assert.ok(h.options.every(option => !option.disabled));
    assert.equal(h.nodes.intervalProgress.textContent, '1 / 5');
});

test('explanations spell accidentals according to the selected interval, not raw key names', () => {
    const h = harness();
    assert.deepEqual(Array.from(h.run('intervalNoteNames({notes: [60, 63], distance: 3})')), ['C4', 'E♭4']);
    assert.deepEqual(Array.from(h.run('intervalNoteNames({notes: [60, 55], distance: 5})')), ['C4', 'G3']);
    assert.deepEqual(Array.from(h.run('intervalNoteNames({notes: [71, 75], distance: 4})')), ['B4', 'D♯5']);
});
