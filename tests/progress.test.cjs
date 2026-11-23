'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const script = readFileSync(process.env.PIANO_TEMPLATE || join(__dirname, '../templates/index.html'), 'utf8')
    .split('<script>').at(-1).split('</script>')[0]
    .replace('{{ velocity_layers | tojson }}', '["mf"]')
    .replace(/\binit\(\);\s*$/, '');

function harness(initial = '{}') {
    const settings = new Map();
    const alerts = [];
    let stored = initial;
    let reads = 0;
    let writes = 0;
    let confirms = 0;
    let reloads = 0;
    let exported;
    let download;
    const h = { approve: true, blockStorage: false };
    const context = vm.createContext({
        console, Date, Blob: class { constructor(parts) { exported = JSON.parse(parts.join('')); } },
        URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
        Event: class {},
        localStorage: {
            getItem() { reads++; if (h.blockStorage) throw Error('denied'); return stored; },
            setItem(key, value) { if (h.blockStorage) throw Error('denied'); writes++; stored = value; },
        },
        document: {
            addEventListener() {}, getElementById: id => settings.get(id),
            createElement: () => ({ click() { download = this.download; } }),
            body: { appendChild() {}, removeChild() {} },
        },
        window: { addEventListener() {} },
        location: { reload() { reloads++; } },
        alert: msg => alerts.push(msg),
        confirm() { confirms++; return h.approve; },
        FileReader: class { readAsText(file) {
            if (file.error) this.onerror();
            else this.onload({ target: { result: file.text } });
        } },
    });
    const run = code => vm.runInContext(code, context);
    run(script);
    return Object.assign(h, {
        run, settings, alerts,
        import(text, options = {}) {
            context.input = { value: 'backup.json', files: [{ text, size: text.length, ...options }] };
            run('importProgress(input)');
            assert.equal(context.input.value, '');
        },
        state: () => ({ stored: JSON.parse(stored), exported, download, reads, writes, confirms, reloads }),
    });
}

test('malformed backups cannot erase current progress or trigger reload', () => {
    const h = harness('{"stats":{"correctCount":12}}');
    for (const data of [
        '[]', '{}', '{"unrelated":true}', '{"settings":{"smartWeight":"false"}}',
        '{"stats":{"correctCount":"9"}}', '{"resultHistory":[3]}',
        '{"pitch":{"subMode":"tuning","bestResidual":"bad"}}', '{"pitch":{"ladderIdx":99}}',
        '{"pitch":{"noteStats":{"A4":{}}}}', '{"noteStats":{"Z3":{"correct":1,"wrong":0}}}',
        '{"pitch":{"residualHistory":[1e309]}}',
    ]) h.import(data);
    assert.deepEqual(h.state().stored, { stats: { correctCount: 12 } });
    assert.equal(h.state().reloads, 0);
    assert.equal(h.state().writes, 0);
    assert.equal(h.state().confirms, 0);
});

test('compatible partial backup loads only after confirmation, and then reloads once', () => {
    const h = harness('{"stats":{"correctCount":12}}');
    const backup = '{"stats":{"correctCount":3},"noteStats":{"A4":{"correct":2,"wrong":1}}}';
    h.approve = false;
    h.import(backup);
    assert.equal(h.state().writes, 0);
    h.approve = true;
    h.import(backup);
    assert.deepEqual(h.state().stored, JSON.parse(backup));
    assert.equal(h.state().confirms, 2);
    assert.equal(h.state().reloads, 1);
});

test('unreadable, oversized and storage-blocked backup attempts do not touch existing progress', () => {
    const h = harness('{"stats":{"correctCount":12}}');
    const backup = '{"stats":{"correctCount":3}}';
    h.import(backup, { error: true });
    h.import(backup, { size: 1024 * 1024 + 1 });
    h.blockStorage = true;
    h.import(backup);
    assert.deepEqual(h.state().stored, { stats: { correctCount: 12 } });
    assert.equal(h.state().writes, 0);
    assert.equal(h.state().reloads, 0);
    assert.deepEqual(h.alerts.map(msg => msg.includes('导入失败')), [true, true, true]);
});

test('corrupted older browser storage is ignored and unavailable select values retain the default', () => {
    const h = harness('{"pitch":{"subMode":"tuning","bestResidual":"bad"}}');
    assert.equal(h.run('JSON.stringify(loadState())'), '{}');
    assert.equal(h.state().writes, 0);
    h.settings.set('velocityLevel', { tagName: 'SELECT', value: 'mf', options: [{ value: 'mf' }, { value: 'mp' }], dispatchEvent() {} });
    h.run('applySavedSettings({ velocityLevel: "removed" })');
    assert.equal(h.settings.get('velocityLevel').value, 'mf');
    h.run('applySavedSettings({ velocityLevel: "mp" })');
    assert.equal(h.settings.get('velocityLevel').value, 'mp');
});

test('exports a valid live backup even when storage is disabled', () => {
    const h = harness();
    h.blockStorage = true;
    h.run('correctCount = 7; totalCount = 7; resultHistory = [1, 1]; exportProgress()');
    const { exported, download, reads, writes } = h.state();
    assert.equal(exported.stats.correctCount, 7);
    assert.deepEqual(exported.resultHistory, [1, 1]);
    assert.match(download, /^ear-trainer-progress-\d{4}-\d{2}-\d{2}\.json$/);
    assert.equal(reads, 0);
    assert.equal(writes, 0);
    assert.equal(h.run(`parseProgress(${JSON.stringify(JSON.stringify(exported))}).stats.correctCount`), 7);
});

test('legacy combined scores archive once, while attributable mode histories survive', () => {
    const h = harness(JSON.stringify({ pitch: {
        correct: 7, wrong: 4, total: 11, streak: 2,
        minJnd: 10, ladderIdx: 7, jndHistory: [50, 30], bestResidual: 1.5, residualHistory: [4, 1.5],
        noteStats: { A4: { dirN: 6, dirWrong: 2, tuneN: 4, tuneResid: 16 } },
    } }));
    h.settings.set('pitchLegacyArchive', { hidden: true });
    h.run('restorePitchProgress(loadState().pitch); updatePitchStats(); saveState()');
    const { stored } = h.state();
    assert.equal(stored.version, 2);
    assert.deepEqual(stored.pitch.legacyCombined, { correct: 7, wrong: 4, total: 11, streak: 2 });
    assert.deepEqual(stored.pitch.direction, { correct: 0, wrong: 0, total: 0, streak: 0 });
    assert.deepEqual(stored.pitch.tuning, stored.pitch.direction);
    assert.deepEqual(stored.pitch.jndHistory, [50, 30]);
    assert.deepEqual(stored.pitch.residualHistory, [4, 1.5]);
    assert.equal(stored.pitch.bestResidual, 1.5);
    assert.equal(stored.pitch.ladderIdx, 7);
    assert.equal(stored.pitch.noteStats.A4.tuneResid, 16);
    assert.equal(h.settings.get('pitchLegacyArchive').hidden, false);
    assert.match(h.settings.get('pitchLegacyArchive').textContent, /归档.*11 题/);

    h.run('restorePitchProgress(loadState().pitch); saveState()');
    assert.deepEqual(h.state().stored, stored);
});

test('actual direction and tuning answers update independent displays; local reset and restart do not cross modes', () => {
    const h = harness();
    for (const id of ['pitchAccuracy', 'pitchTotal', 'pitchStreak', 'pitchFeedback']) h.settings.set(id, {});
    h.run(`
        document.querySelectorAll = () => [];
        drawPitchCurve = () => {};
        pitchQuestionActive = true;
        pitchTargetCents = 50;
        pitchBaseName = 'A4';
        answerPitchDirection('up');
    `);
    assert.equal(h.settings.get('pitchAccuracy').textContent, '100%');
    h.run("pitchSubMode = 'tuning'; updatePitchStats()");
    assert.equal(h.settings.get('pitchAccuracy').textContent, '-');
    h.run("pitchQuestionActive = true; pitchScored = false; pitchTuneCents = 12; confirmTuning()");
    assert.equal(h.settings.get('pitchAccuracy').textContent, '0%');
    assert.equal(h.settings.get('pitchTotal').textContent, 1);
    const prior = h.state().stored;
    h.run("restorePitchProgress(loadState().pitch); resetPitchStats()");
    const { pitch } = h.state().stored;
    assert.deepEqual(pitch.direction, prior.pitch.direction);
    assert.deepEqual(pitch.jndHistory, [50]);
    assert.deepEqual(pitch.tuning, { correct: 0, wrong: 0, total: 0, streak: 0 });
    assert.deepEqual(pitch.residualHistory, []);
    assert.deepEqual(pitch.noteStats.A4, { dirN: 1, dirWrong: 0, tuneN: 0, tuneResid: 0 });
    assert.equal(pitch.bestResidual, null);
});

test('unknown progress versions and impossible versioned pitch counters are rejected', () => {
    const h = harness();
    const direction = { correct: 3, wrong: 1, total: 2, streak: 3 };
    const tuning = { correct: 0, wrong: 0, total: 0, streak: 0 };
    h.import(JSON.stringify({ version: 2, pitch: { direction, tuning } }));
    h.import(JSON.stringify({ version: 777, settings: {} }));
    assert.equal(h.state().writes, 0);
});
