#!/usr/bin/env python3
"""
视唱练耳训练工具 - Flask 后端
提供静态文件服务和音频采样接口
"""

import os
import argparse
from flask import Flask, render_template, send_from_directory

app = Flask(__name__, static_folder='static')

# 全局配置，由命令行参数设置
app_config = {
    'audio_format': 'mp3',
    'velocity_layers': ['pp', 'p', 'mp', 'mf', 'f', 'ff'],
    'default_low_note': 'C4',
    'default_high_note': 'A6',
}


@app.route('/')
def index():
    return render_template('index.html',
                           audio_format=app_config['audio_format'],
                           velocity_layers=app_config['velocity_layers'],
                           default_low_note=app_config['default_low_note'],
                           default_high_note=app_config['default_high_note'])


@app.route('/samples/<path:filename>')
def serve_sample(filename):
    """提供音频采样文件"""
    samples_dir = os.path.join(app.static_folder, 'samples')
    return send_from_directory(samples_dir, filename)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="视唱练耳训练工具")
    parser.add_argument('--host', default='0.0.0.0', help='监听地址')
    parser.add_argument('--port', type=int, default=7860, help='监听端口')
    parser.add_argument('--debug', action='store_true', help='调试模式')
    parser.add_argument('--audio-format', default='mp3', choices=['mp3', 'wav'],
                        help='音频采样格式 (默认 mp3)')
    parser.add_argument('--velocity-layers', nargs='+', default=['pp', 'p', 'mp', 'mf', 'f', 'ff'],
                        help='可用的力度层列表')
    parser.add_argument('--default-low-note', default='C4',
                        help='默认低音范围 (默认 C4)')
    parser.add_argument('--default-high-note', default='A6',
                        help='默认高音范围 (默认 A6)')
    args = parser.parse_args()

    app_config['audio_format'] = args.audio_format
    app_config['velocity_layers'] = args.velocity_layers
    app_config['default_low_note'] = args.default_low_note
    app_config['default_high_note'] = args.default_high_note

    print(f"🎹 视唱练耳训练工具启动中...")
    print(f"🌐 访问地址: http://{args.host}:{args.port}")
    print(f"🎵 音频格式: {args.audio_format}")
    print(f"🔊 力度层: {args.velocity_layers}")

    app.run(host=args.host, port=args.port, debug=args.debug, threaded=True)
