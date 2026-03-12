#!/usr/bin/env python3
"""
预处理 Salamander Grand Piano 采样文件
从原始 48khz 24bit WAV 文件中提取多力度级别的采样,
支持转换为 mp3 或 wav 格式供网页使用

力度分层方案（原始 v1-v16 映射为 6 个级别）:
  pp  (极弱)  -> v1-v3   取 v2
  p   (弱)    -> v4-v6   取 v5
  mp  (中弱)  -> v7-v8   取 v8
  mf  (中强)  -> v9-v10  取 v10
  f   (强)    -> v11-v13 取 v12
  ff  (极强)  -> v14-v16 取 v15
"""

import os
import subprocess
import argparse
import glob

# 力度级别定义: 名称 -> 代表性的原始力度编号
VELOCITY_LAYERS = {
    'pp': 2,    # 极弱
    'p':  5,    # 弱
    'mp': 8,    # 中弱（默认/单力度模式使用）
    'mf': 10,   # 中强
    'f':  12,   # 强
    'ff': 15,   # 极强
}


def get_note_files(source_dir, velocity):
    """获取指定力度的所有音符文件"""
    pattern = os.path.join(source_dir, f"*v{velocity}.wav")
    files = glob.glob(pattern)
    # 排除 harm/rel 等非标准音符文件
    note_files = [f for f in files if not os.path.basename(f).startswith(('harm', 'rel'))]
    return sorted(note_files)


def convert_sample(input_path, output_path, duration=4.0, sample_rate=44100, fmt='mp3'):
    """
    将 WAV 采样转换为指定格式
    - 截短到指定时长
    - 降采样到 44100Hz
    - 添加淡出效果
    """
    cmd = [
        'ffmpeg', '-y',
        '-i', input_path,
        '-t', str(duration),
        '-ar', str(sample_rate),
        '-af', f'afade=t=out:st={duration - 0.5}:d=0.5',
    ]
    if fmt == 'mp3':
        cmd += ['-b:a', '128k']
    elif fmt == 'wav':
        # 输出 16bit PCM WAV（比 24bit 更小，网页兼容性好）
        cmd += ['-c:a', 'pcm_s16le']
    cmd.append(output_path)
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)


def main():
    parser = argparse.ArgumentParser(description="预处理钢琴采样文件")
    # 默认路径基于脚本所在目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    parser.add_argument('--source-dir',
                        default=os.path.join(script_dir, 'SalamanderGrandPianoV3_48khz24bit', '48khz24bit'),
                        help='源 WAV 文件目录')
    parser.add_argument('--output-dir',
                        default=os.path.join(script_dir, 'static', 'samples'),
                        help='输出文件目录')
    parser.add_argument('--format', choices=['mp3', 'wav'], default='mp3',
                        help='输出音频格式 (默认 mp3，可选 wav)')
    parser.add_argument('--velocity', type=int, default=None,
                        help='仅转换单个力度级别 (1-16)，不指定则转换全部6个力度层')
    parser.add_argument('--duration', type=float, default=4.0,
                        help='截取时长(秒), 默认4.0')
    parser.add_argument('--layers', nargs='+', default=None,
                        choices=list(VELOCITY_LAYERS.keys()),
                        help='指定要转换的力度层 (如: mp mf f)，不指定则转换全部')
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)
    fmt = args.format

    if args.velocity is not None:
        # 兼容旧模式：仅转换单个指定力度
        layers = {'single': args.velocity}
    elif args.layers:
        layers = {k: VELOCITY_LAYERS[k] for k in args.layers}
    else:
        layers = VELOCITY_LAYERS

    total_converted = 0

    for layer_name, vel in layers.items():
        note_files = get_note_files(args.source_dir, vel)
        if not note_files:
            print(f"⚠️ 力度 v{vel} ({layer_name}) 未找到采样文件，跳过")
            continue

        # 如果是单力度模式（兼容旧版），文件名不加力度后缀
        suffix = '' if layer_name == 'single' else f'_{layer_name}'
        print(f"\n🎵 处理力度层: {layer_name} (v{vel}) - {len(note_files)} 个文件")

        for i, fpath in enumerate(note_files):
            basename = os.path.basename(fpath)
            # 从文件名提取音名, 如 "A0v8.wav" -> "A0"
            note_name = basename.split('v')[0]
            output_name = f"{note_name}{suffix}.{fmt}"
            output_path = os.path.join(args.output_dir, output_name)

            print(f"  [{i+1}/{len(note_files)}] {basename} -> {output_name}")
            convert_sample(fpath, output_path, duration=args.duration, fmt=fmt)
            total_converted += 1

    print(f"\n✅ 完成! 共转换 {total_converted} 个采样文件到 {args.output_dir}")
    print(f"   格式: {fmt.upper()}, 力度层: {list(layers.keys())}")

    # 列出所有生成的文件
    all_files = sorted([f for f in os.listdir(args.output_dir) if f.endswith(f'.{fmt}')])
    print(f"   文件总数: {len(all_files)}")


if __name__ == '__main__':
    main()
