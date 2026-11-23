'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

test('a listening port blocks startup without attempting to kill its owner', () => {
    const bin = mkdtempSync(join(tmpdir(), 'piano-launcher-'));
    const killMarker = join(bin, 'kill-attempt');
    const startupMarker = join(bin, 'startup-attempt');
    try {
        const commands = {
            lsof: 'printf "43210\\n"\n',
            xargs: ': > "$KILL_MARKER"\n',
            pip: ': > "$STARTUP_MARKER"\n',
            nohup: ': > "$STARTUP_MARKER"\n'
        };
        for (const [name, body] of Object.entries(commands)) {
            const path = join(bin, name);
            writeFileSync(path, '#!/bin/sh\n' + body);
            chmodSync(path, 0o700);
        }
        const result = spawnSync('bash', [join(__dirname, '../run.sh')], {
            env: { ...process.env, PATH: bin + ':' + process.env.PATH,
                KILL_MARKER: killMarker, STARTUP_MARKER: startupMarker, PORT: '17860' },
            encoding: 'utf8',
            timeout: 3000
        });
        assert.equal(existsSync(killMarker), false, 'must not attempt to kill an unrelated process');
        assert.equal(existsSync(startupMarker), false, 'must reject the port before installing or launching');
        assert.equal(result.status, 1);
        assert.match(result.stderr, /端口 17860 已被占用/);
    } finally {
        rmSync(bin, { recursive: true, force: true });
    }
});

test('a failed sample conversion does not start a silent server', () => {
    const bin = mkdtempSync(join(tmpdir(), 'piano-launcher-'));
    const startupMarker = join(bin, 'startup-attempt');
    try {
        const commands = {
            lsof: 'exit 1\n',
            python: 'case "$1" in -c) exit 0;; */prepare_samples.py) exit 2;; esac\nexit 9\n',
            nohup: ': > "$STARTUP_MARKER"\n'
        };
        for (const [name, body] of Object.entries(commands)) {
            const path = join(bin, name);
            writeFileSync(path, '#!/bin/sh\n' + body);
            chmodSync(path, 0o700);
        }
        const { status, stderr } = spawnSync('bash', [join(__dirname, '../run.sh')], {
            env: { ...process.env, PATH: bin + ':' + process.env.PATH,
                STARTUP_MARKER: startupMarker, AUDIO_FORMAT: 'wav', PORT: '17860' },
            encoding: 'utf8', timeout: 3000
        });
        assert.equal(existsSync(startupMarker), false);
        assert.equal(status, 1);
        assert.match(stderr, /钢琴采样预处理失败，服务未启动/);
    } finally {
        rmSync(bin, { recursive: true, force: true });
    }
});
