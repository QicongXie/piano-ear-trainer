#!/usr/bin/env node
/**
 * build-docs.js —— 从 templates/index.html 生成 docs/index.html（GitHub Pages / EdgeOne 静态部署版）
 *
 * 前端只维护 templates/index.html（Flask 模板版）；docs/index.html 是它的静态产物：
 *   1) 把 Jinja 配置占位符替换为写死的默认值（与 app.py 的 app_config 默认值保持一致）
 *   2) 把绝对采样路径 `/samples/ 改为相对路径 `samples/（静态托管没有 Flask 路由）
 *
 * 用法：node build-docs.js
 * 说明：采样音频 docs/samples/ 不由本脚本管理，始终随仓库维护。
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'templates', 'index.html');
const OUT = path.join(ROOT, 'docs', 'index.html');

// 静态部署默认配置——需与 app.py 的 app_config 默认值保持一致
const CONFIG = {
    audio_format: 'mp3',
    velocity_layers: ['pp', 'p', 'mp', 'mf', 'f', 'ff'],
    default_low_note: 'C4',
    default_high_note: 'A6',
};

// templates 中的 Jinja 配置块（精确匹配，用于整体替换）
const TEMPLATE_BLOCK = [
    '// 后端传入的配置：音频格式和可用力度层',
    "const AUDIO_FORMAT = '{{ audio_format }}';",
    'const VELOCITY_LAYERS = {{ velocity_layers | tojson }};',
    "const DEFAULT_LOW_NOTE = '{{ default_low_note }}';",
    "const DEFAULT_HIGH_NOTE = '{{ default_high_note }}';",
].join('\n');

const STATIC_BLOCK = [
    '// 静态部署配置（由 build-docs.js 从 templates/index.html 自动生成，请勿手动修改本文件）',
    `const AUDIO_FORMAT = ${JSON.stringify(CONFIG.audio_format)};`,
    `const VELOCITY_LAYERS = ${JSON.stringify(CONFIG.velocity_layers)};`,
    `const DEFAULT_LOW_NOTE = ${JSON.stringify(CONFIG.default_low_note)};`,
    `const DEFAULT_HIGH_NOTE = ${JSON.stringify(CONFIG.default_high_note)};`,
].join('\n');

function fail(msg) {
    console.error(`\u274c build-docs 失败：${msg}`);
    process.exit(1);
}

if (!fs.existsSync(SRC)) fail(`未找到源模板 ${SRC}`);
let html = fs.readFileSync(SRC, 'utf8');

// 1) 配置块：Jinja 占位符 → 写死默认值
if (!html.includes(TEMPLATE_BLOCK)) {
    fail('未找到 Jinja 配置块，templates 结构可能已变，请同步更新 build-docs.js 的 TEMPLATE_BLOCK');
}
html = html.split(TEMPLATE_BLOCK).join(STATIC_BLOCK);

// 2) 采样路径：绝对 → 相对
html = html.replace(/`\/samples\//g, '`samples/');

// 3) 生成前校验：不得残留 Jinja 占位符或绝对采样路径
const problems = [];
if (/\{\{/.test(html)) problems.push('残留 Jinja 占位符 {{...}}');
if (html.includes('`/samples/')) problems.push('残留绝对采样路径 `/samples/');
if (problems.length) fail(problems.join('；'));

fs.writeFileSync(OUT, html, 'utf8');
console.log('\u2705 已生成 docs/index.html');
console.log(`   format=${CONFIG.audio_format} | layers=[${CONFIG.velocity_layers.join(', ')}] | low=${CONFIG.default_low_note} | high=${CONFIG.default_high_note}`);
