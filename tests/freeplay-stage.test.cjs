'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const html = readFileSync(require('node:path').join(__dirname, '../templates/index.html'), 'utf8');
const script = html.split('<script>').at(-1).split('</script>')[0]
    .replace('{{ velocity_layers | tojson }}', '["mf"]').replace(/\binit\(\);\s*$/, '');

function harness(touch = true, landscape = true, short = true) {
    const nodes = {};
    const classes = new Set();
    const windowEvents = new Map();
    const documentEvents = new Map();
    const media = {
        touch: { matches: touch }, orientation: { matches: landscape },
        landscape: { matches: landscape && short },
    };
    for (const query of Object.values(media)) {
        query.addEventListener = (name, handler) => { query.change = handler; };
    }
    const element = id => nodes[id] ??= {
        attrs: {}, disabled: false, style: {},
        setAttribute(name, value) { this.attrs[name] = value; },
        addEventListener(name, handler) { this[name] = handler; },
        focus() { document.activeElement = this; },
    };
    const body = { classList: { toggle(name, on) { if (on) classes.add(name); else classes.delete(name); } } };
    const wrapper = {
        scrollLeft: 560, clientWidth: 730, scrollWidth: 2184,
        addEventListener(name, handler) { this[name] = handler; },
        scrollTo({ left }) { this.scrollLeft = Math.max(0, Math.min(this.scrollWidth - this.clientWidth, left)); this.scroll(); },
    };
    const document = {
        body, getElementById: element,
        addEventListener(name, handler) { documentEvents.set(name, handler); },
        querySelector(selector) {
            if (selector === '.piano-wrapper') return wrapper;
            if (selector === '.freeplay-stage-bar') return { contains: x => ['freeplayExit', 'freeplayPanLower', 'freeplayPanHigher'].some(id => x === element(id)) };
            return null;
        },
    };
    document.activeElement = body;
    const context = vm.createContext({ document, window: {
        matchMedia: text => text.includes('pointer') ? media.touch : text.includes('max-height') ? media.landscape : media.orientation,
        addEventListener(name, handler) { windowEvents.set(name, handler); },
    } });
    const run = code => vm.runInContext(code, context);
    run(script);
    run(`
        pianoKeys = ALL_NOTES.map((n, i) => ({
            offsetLeft: Math.floor(i * 52 / 88) * 42, offsetWidth: n.isBlack ? 28 : 42,
            dataset: { name: n.name }, classList: { contains: cls => cls === 'white-key' && !n.isBlack }
        }));
        setupFreeplayStage();
    `);
    return { run, element, document, wrapper, media, windowEvents, documentEvents,
        enter() { run("currentMode = 'freeplay'; syncFreeplayStage()"); },
        expanded() { return classes.has('freeplay-expanded'); },
        rotate(toLandscape) {
            media.orientation.matches = toLandscape;
            media.landscape.matches = toLandscape;
            media.orientation.change();
            media.landscape.change();
        },
    };
}

test('only compact touch landscape autoexpands in freeplay; exit suppression survives address-bar changes', () => {
    const desktop = harness(false);
    desktop.enter();
    assert.equal(desktop.expanded(), false);
    const otherMode = harness(true);
    assert.equal(otherMode.expanded(), false);
    otherMode.enter();
    assert.equal(otherMode.expanded(), true);
    otherMode.element('freeplayExit').click();
    assert.equal(otherMode.document.activeElement, otherMode.element('freeplayExpand'));
    assert.equal(otherMode.expanded(), false);
    otherMode.media.landscape.matches = false;
    otherMode.media.landscape.change();
    otherMode.media.landscape.matches = true;
    otherMode.media.landscape.change();
    assert.equal(otherMode.expanded(), false);
    otherMode.element('freeplayExpand').click();
    assert.equal(otherMode.expanded(), true);
    otherMode.rotate(false);
    assert.equal(otherMode.expanded(), false);
    otherMode.rotate(true);
    assert.equal(otherMode.expanded(), true);
});

test('portrait opt-in/Escape restores focus and modes/browser page navigation do not trap the stage', () => {
    const h = harness(true, false);
    h.enter();
    assert.equal(h.expanded(), false);
    h.element('freeplayExpand').focus();
    h.element('freeplayExpand').click();
    assert.equal(h.expanded(), true);
    assert.equal(h.document.activeElement, h.element('freeplayExit'));
    let prevented = false;
    h.documentEvents.get('keydown')({ key: 'Escape', preventDefault() { prevented = true; } });
    assert.equal(h.expanded(), false);
    assert.equal(prevented, true);
    assert.equal(h.document.activeElement, h.element('freeplayExpand'));

    h.rotate(true);
    assert.equal(h.expanded(), true);
    h.windowEvents.get('pagehide')();
    assert.equal(h.expanded(), false);
    h.windowEvents.get('pageshow')();
    assert.equal(h.expanded(), true);
    h.run("currentMode = 'training'; syncFreeplayStage()");
    assert.equal(h.expanded(), false);
});

test('range arrows pan at either edge, not transpose or create audio', () => {
    const h = harness();
    h.enter();
    const initial = h.element('freeplayVisibleRange').textContent;
    const start = h.wrapper.scrollLeft;
    h.element('freeplayPanHigher').click();
    assert.equal(h.wrapper.scrollLeft, start + 7 * 42);
    assert.notEqual(h.element('freeplayVisibleRange').textContent, initial);
    assert.equal(h.run('freeplayOctave'), 4);
    assert.equal(h.run('KEYBOARD_MAP.KeyZ'), 0);
    assert.equal(h.run('audioCtx'), null);
    for (let i = 0; i < 10; i++) h.element('freeplayPanLower').click();
    assert.equal(h.wrapper.scrollLeft, 0);
    assert.equal(h.element('freeplayPanLower').disabled, true);
    for (let i = 0; i < 10; i++) h.element('freeplayPanHigher').click();
    assert.equal(h.wrapper.scrollLeft, 2184 - 730);
    assert.equal(h.element('freeplayPanHigher').disabled, true);
    assert.match(html, /touch-action: pan-x pinch-zoom/);
});
