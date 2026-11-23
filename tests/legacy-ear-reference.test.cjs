'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const vm = require('node:vm');

function setup() {
    const html = readFileSync(process.env.PIANO_TEMPLATE || join(__dirname, '../templates/index.html'), 'utf8');
    const script = html.split('<script>').at(-1).split('</script>')[0]
        .replace('{{ velocity_layers | tojson }}', '["pp","p","mp","mf","f","ff"]')
        .replace(/\binit\(\);\s*$/, '');
    const nodes = new Map();
    const node = id => {
        if (!nodes.has(id)) nodes.set(id, {
            value: '', textContent: '', innerHTML: '', children: [],
            addEventListener(event, fn) { this[event] = fn; }, appendChild(e) { this.children.push(e); },
            classList: {add() {}, remove() {}}, insertBefore(e) { this.children.unshift(e); },
        });
        return nodes.get(id);
    };
    const context = vm.createContext({
        document: {querySelector: node, querySelectorAll: () => [], getElementById: node, addEventListener() {}, createElement: () => ({})},
        window: {addEventListener() {}}, Option: function(text, value) { this.text = text; this.value = value; },
    });
    const run = js => vm.runInContext(js, context);
    run(script);
    return {node, run};
}

test('wrong guess with hints off does not leak answer; explicit reveal still does', () => {
    const h = setup();
    h.node('hintType').value = 'none';
    h.run(`
        playNote = () => {}; showNoteName = () => {}; showWrongFeedback = () => {};
        updateScore = () => {}; recordAnswer = () => {};
        lowNoteIndex = 32; highNoteIndex = 40;
        currentAnswer = {index: 36, ...ALL_NOTES[36]};
        onKeyClick(35);
    `);
    assert.match(h.node('hintArea').innerHTML, /再试试/);
    const entry = h.node('historyList').children[0].textContent;
    assert.match(entry, /G#3/);
    assert.doesNotMatch(entry, /A3/);
    h.run('showAnswer()');
    assert.match(h.node('historyList').children[0].textContent, /A3/);
});

test('all chromatic intervals keep their requested direction at both piano edges', () => {
    const h = setup();
    const result = h.run(`
        (() => {
            for (let answerIndex = 0; answerIndex < ALL_NOTES.length; answerIndex++) {
                currentAnswer = {index: answerIndex, ...ALL_NOTES[answerIndex]};
                for (let distance = 1; distance <= 12; distance++) {
                    document.getElementById('intervalType').value = String(distance);
                    for (const dir of ['up','down','both']) {
                        document.getElementById('intervalDirection').value = dir;
                        const result = getIntervalRefNotes();
                        const notes = result?.notes.map(n => n.index);
                        const diffs = notes?.filter((_, i) => i % 2).map((n, i) => n - notes[2 * i]);
                        const wanted = dir === 'up' ? [distance] : dir === 'down' ? [-distance] : [distance,-distance];
                        if (result?.direction !== dir || String(diffs) !== String(wanted) ||
                            notes.length !== wanted.length * 2 || notes.some(n => n < 0 || n >= ALL_NOTES.length)) {
                            return {answer: currentAnswer.name, distance, dir, notes, diffs};
                        }
                    }
                }
            }
            return null;
        })()
    `);
    assert.equal(result, null, JSON.stringify(result));
});

test('moving the allowed range retires an excluded active question without a missed answer', () => {
    const h = setup();
    h.run(`
        populateSelects();
        lowNoteIndex = 32; highNoteIndex = 55;
        currentAnswer = {index: 36, ...ALL_NOTES[36]};
        lastNewQuestionAt = 123;
        totalCount = 4; wrongCount = 2;
        let stoppedForRange = false;
        currentPlayingSource = { stop() { stoppedForRange = true; } };
    `);
    h.node('highNote').value = '48';
    h.node('highNote').change();
    assert.equal(h.run('currentAnswer.index'), 36);
    h.node('lowNote').value = '37';
    h.node('lowNote').change();
    assert.equal(h.run('currentAnswer'), null);
    assert.equal(h.run('totalCount'), 4);
    assert.equal(h.run('wrongCount'), 2);
    assert.equal(h.run('lastNewQuestionAt'), 0);
    assert.ok(h.run('stoppedForRange'));
    assert.equal(h.node('btnReplay').disabled, true);
    assert.equal(h.node('btnShowAnswer').disabled, true);
    assert.match(h.node('statusText').textContent, /请重新出题/);
});
