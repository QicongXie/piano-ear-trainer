'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

const template = readFileSync(join(__dirname, '../templates/index.html'), 'utf8');
const menuCode = template.slice(template.indexOf('function updateGamesMenu('), template.indexOf('function setupMelody('));

test('both pitch exercises are direct menu entries with independent active state', () => {
    const entries = [
        { gameMode: 'pitch', pitchSubmode: 'direction' },
        { gameMode: 'pitch', pitchSubmode: 'tuning' },
        { gameMode: 'melody' },
        { gameMode: 'interval' }
    ].map(dataset => ({
        dataset, attrs: {},
        setAttribute(name, value) { this.attrs[name] = value; },
        removeAttribute(name) { delete this.attrs[name]; }
    }));
    const openCalls = [];
    const handlers = {};
    const summary = { focused: false, classList: { toggle(name, value) { summary.active = value; } },
        focus() { this.focused = true; } };
    const details = { open: true, querySelectorAll() { return entries; }, addEventListener() {}, contains() { return false; } };
    const menu = { addEventListener(name, handler) { handlers[name] = handler; } };
    const context = vm.createContext({
        document: { getElementById: id => ({gamesMenu: details, gamesMenuToggle: summary, gamesMenuItems: menu})[id], addEventListener() {} },
        switchMode: (...args) => openCalls.push(args)
    });
    vm.runInContext(menuCode + "\nsetupGamesMenu(); updateGamesMenu('pitch', 'direction');", context);
    assert.deepEqual(entries.map(x => x.attrs['aria-current']), ['true', undefined, undefined, undefined]);
    assert.equal(details.open, false);
    assert.equal(summary.active, true);
    handlers.click({ target: { closest: () => entries[1] } });
    assert.deepEqual(openCalls, [['pitch', 'tuning']]);
    assert.equal(summary.focused, true);
    vm.runInContext("updateGamesMenu('pitch', 'tuning');", context);
    assert.deepEqual(entries.map(x => x.attrs['aria-current']), [undefined, 'true', undefined, undefined]);
    assert.match(template, /data-game-mode="pitch" data-pitch-submode="direction"/);
    assert.match(template, /data-game-mode="pitch" data-pitch-submode="tuning"/);
    assert.doesNotMatch(template, /class="pitch-submodes"/);
});
