'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const script = readFileSync(process.env.PIANO_TEMPLATE || require('node:path').join(__dirname, '../templates/index.html'), 'utf8')
    .split('<script>').at(-1).split('</script>')[0]
    .replace('{{ velocity_layers | tojson }}', '["mf"]')
    .replace(/\binit\(\);\s*$/, '');

function harness() {
    const calls = [];
    const nodes = new Map();
    const element = id => {
        if (!nodes.has(id)) nodes.set(id, {
            hidden: true, disabled: false, textContent: '', value: '', innerHTML: '', style: {},
            classList: { add() {}, remove() {} },
        });
        return nodes.get(id);
    };
    element('velocityLevel').value = 'mf';
    element('octaveRefMode').value = 'none';
    const h = { online: false, missing: null, nodes, calls, played: 0 };
    const print = { log() {}, warn() {} };
    class AudioContext {
        state = 'running';
        currentTime = 0;
        destination = {};
        async decodeAudioData() { return {}; }
        createGain() {
            return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
        }
        createBufferSource() {
            return { playbackRate: {}, connect() {}, start() { h.played++; }, stop() {} };
        }
    }
    const ctx = vm.createContext({
        console: print, AbortController,
        fetch: async url => {
            calls.push(url);
            const ok = h.online && (!h.missing || !url.includes(h.missing));
            return { ok, async arrayBuffer() { return new ArrayBuffer(1); } };
        },
        setTimeout: () => 0, clearTimeout() {},
        document: { getElementById: element, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} },
        window: { AudioContext, addEventListener() {} },
    });
    h.run = code => vm.runInContext(code, ctx);
    h.run(script);
    h.run('drawCurve = () => {}; addHistory = () => {}; updateScore = () => {};');
    return h;
}

test('complete fetch failure is not cached as loaded; one explicit retry recovers without reload', async () => {
    const h = harness();
    await h.run('loadSamples()');
    const initialRequests = h.calls.length;
    assert.equal(h.run("loadedLayers.has('mf')"), false);
    assert.match(h.nodes.get('sampleNoticeText').textContent, /0\/30/);
    assert.equal(h.nodes.get('sampleNotice').hidden, false);
    h.run('playNote(60); playNote(64); playNote(67)');
    await h.run("loadSingleLayer('mf')");
    assert.equal(h.calls.length, initialRequests);
    h.online = true;
    await h.run('Promise.all([retrySamples(), retrySamples()])');
    assert.equal(h.run("loadedLayers.has('mf')"), true);
    assert.equal(h.calls.length - initialRequests, 30);
    assert.equal(h.nodes.get('sampleNotice').hidden, true);
    h.run('playNote(60)');
    assert.equal(h.played, 1);
});

test('partial retry preserves decoded buffers and requests only missing samples', async () => {
    const h = harness();
    h.online = true;
    h.missing = 'A0';
    await h.run('loadSamples()');
    assert.equal(h.run("Object.keys(sampleBuffers.mf).length"), 29);
    assert.match(h.nodes.get('sampleNoticeText').textContent, /29\/30/);
    h.run('globalThis.originalBuffer = sampleBuffers.mf.C4');
    const initialRequests = h.calls.length;
    h.missing = null;
    await h.run("retrySamples()");
    assert.equal(h.calls.length - initialRequests, 1);
    assert.match(h.calls.at(-1), /A0_mf/);
    assert.equal(h.run('sampleBuffers.mf.C4 === originalBuffer'), true);
});

test('silent training action does not create a question or score the previous one as skipped', async () => {
    const h = harness();
    await h.run('loadSamples()');
    h.run(`
        pickWeightedNoteIndex = () => 40;
        lowNoteIndex = 30; highNoteIndex = 60;
        globalThis.oldAnswer = { name: 'C4', index: 39, midi: 60 };
        currentAnswer = oldAnswer;
        newQuestion();
    `);
    assert.equal(h.run('currentAnswer === oldAnswer'), true);
    assert.equal(h.run('questionScored'), false);
    assert.equal(h.run('wrongCount'), 0);
    assert.equal(h.run('totalCount'), 0);
    assert.match(h.nodes.get('hintArea').textContent, /没有播放目标音/);
});

test('silent pitch action leaves the previous round unopened and does not schedule a stimulus', async () => {
    const h = harness();
    await h.run('loadSamples()');
    h.run('pickWeightedPitchNote = () => 39; newPitchQuestion()');
    assert.equal(h.run('pitchQuestionActive'), false);
    assert.equal(h.run('pitchTotal'), 0);
    assert.equal(h.run('pitchStimulusTimer'), null);
    assert.match(h.nodes.get('pitchFeedback').textContent, /没有播放音准练习/);
});
