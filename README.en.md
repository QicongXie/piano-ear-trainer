# 🎹 Piano Ear & Intonation Trainer

<p align="center">
  <a href="README.md">简体中文</a> ·
  <b>English</b>
</p>

A web-based piano ear-training tool built on the real Salamander Grand Piano samples. Beyond regular **single-note ear training**, it features dedicated **intonation training** — learning to hear and tune the microtones that fall *between* the piano keys. This is especially useful for players of fretless / continuous-pitch instruments such as violin or erhu who need to polish their intonation.

## 🌐 Live Demo

No installation needed — open and play (static build on GitHub Pages):

**👉 https://qicongxie.github.io/piano-ear-trainer/**

## 📸 Screenshots

| Ear Training | Intonation Training (Tuning) |
|:---:|:---:|
| <img src="docs/screenshot-main.png" width="420" alt="Ear Training"> | <img src="docs/screenshot-pitch.png" width="420" alt="Intonation Training"> |

## ✨ Features

Three modes, backed by live stats, progress curves, record export/import, and mobile support.

### 🎵 Ear Training (single-note recognition)

- **Custom range**: set any low/high boundary between A0–C8.
- **Reference modes**: none (pure listening), full chromatic scale, diatonic scale, context window, tonic only, standard A (A4=440Hz), interval reference.
- **Hints**: direction (higher/lower) / interval distance / none; wrong keys are annotated with direction & distance.
- **Velocity**: fixed or random, across 6 layers (pp / p / mp / mf / f / ff).
- **Smart questions**: weak-note first — questions are weighted by each note's historical error rate.
- **Live stats**: correct, wrong, total, streak (with best), accuracy.
- **Progress curve**: cumulative accuracy over time.

### 🎯 Intonation Training (microtones / "between the keys") — the highlight

Detunes the real piano samples by exact **cents** (1 semitone = 100 cents) to train pitch acuity beyond equal temperament. Two sub-modes:

- **Deviation direction**: hear the reference note then the target, decide whether the target is **higher / lower**.
  - Adaptive staircase: starts at 50 cents, **descends quickly** while you're correct, then switches to a **fine search** after your first miss to converge on your discrimination limit.
  - Reaches down to **2 cents** (well beyond typical human limits); the sub-5-cent tiers require **more consecutive correct answers to unlock** (3 / 4 / 5).
- **Tuning practice**: a detuned target note is played against the reference; drag the slider to tune it into unison.
  - Scored by **residual error (cents)**, pass line ≤ 5 cents; the "in-tune" slider position is randomly hidden each round to prevent visual cheating.
  - Independent auditions: replay reference / preview adjusted note / play both together (to hear beats & consonance).
- **Weak-region weighting** (optional, on by default): weights questions by each region's history (error rate / average residual) to focus on your weak spots.
- **Score curves**: discrimination-threshold curve / tuning-residual curve — lower is better, with your best marked.

### 🎹 Free Play

A virtual 88-key piano playable by mouse or computer keyboard, with octave switching.

### 🧰 General

- **Real piano timbre**: high-quality Salamander Grand Piano V3 samples, velocity-layered and lazy-loaded.
- **Persistence + export/import**: all settings, stats, weak-note distribution and progress curves are saved in the browser; export to JSON and import on another computer to keep your targeted practice.
- **Mobile-friendly**: responsive layout (the piano scrolls horizontally on phones).
- **Keyboard shortcuts**: every mode uses `A` to generate a question, with `A/S/D/F` as the main keys (see below).

## ⌨️ Keyboard Shortcuts

| Mode | Keys |
|---|---|
| Ear Training | `A` new · `S` replay · `D` play reference · `F` reveal answer |
| Intonation · Direction | `A` new · `S` replay · `D` higher · `F` lower |
| Intonation · Tuning | `A` new · `S` tune down · `D` tune up · `F` confirm · `Z` replay reference · `X` preview adjusted · `C` play both |
| Free Play | White keys `A S D F G H J K` → C D E F G A B C; black keys `W E T Y U`; `Z`/`X` change octave |

## 🚀 Local Setup

The live demo works out of the box. To run the full local version (Flask backend + custom samples):

### Requirements

- **Python 3.6+**
- **Flask** — web framework
- **ffmpeg** — audio conversion
- **Git LFS** — large sample assets

```bash
# Ubuntu / Debian
sudo apt install ffmpeg git-lfs
# macOS
brew install ffmpeg git-lfs
# Initialize Git LFS (first time only)
git lfs install
```

### Quick Start

```bash
# 1. Clone
git clone git@github.com:QicongXie/piano-ear-trainer.git
cd piano-ear-trainer

# 2. One-step setup (pull LFS samples → extract → install deps → preprocess audio)
bash setup.sh

# 3. Run
bash run.sh
```

The service runs in the background at `http://0.0.0.0:7860`.

### Configuration (environment variables)

| Variable | Default | Description |
|---------|--------|------|
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `7860` | Port |
| `DEBUG` | `false` | Debug mode |
| `AUDIO_FORMAT` | `mp3` | Audio format (mp3 / wav) |
| `VELOCITY_LAYERS` | `pp p mp mf f ff` | Velocity layers (space-separated) |
| `DEFAULT_LOW_NOTE` | `C4` | Default range lower bound |
| `DEFAULT_HIGH_NOTE` | `A6` | Default range upper bound |

```bash
# wav format + custom port
AUDIO_FORMAT=wav PORT=8080 bash run.sh

# single velocity layer (save disk space)
VELOCITY_LAYERS="mf" bash setup.sh && bash run.sh
```

### Stop / Logs

```bash
lsof -i :7860 -t | xargs kill -9   # stop
tail -f app.log                    # logs
```

## 📁 Project Structure

```
piano-ear-trainer/
├── app.py                  # Flask backend
├── prepare_samples.py      # sample preprocessing
├── run.sh                  # start script (nohup background)
├── setup.sh                # one-step setup (LFS pull + extract + preprocess)
├── templates/
│   └── index.html          # frontend (local Flask version)
├── docs/                   # GitHub Pages static build (samples + screenshots)
│   ├── index.html          # static frontend (hardcoded config, relative sample paths)
│   ├── samples/            # audio samples for the static site
│   ├── screenshot-main.png # ear training screenshot
│   └── screenshot-pitch.png# intonation training screenshot
├── static/
│   └── samples/            # [generated] preprocessed samples for local version
├── SalamanderGrandPianoV3+20161209_48khz24bit.tar  # [LFS] raw sample pack
├── README.md               # Chinese docs (default)
├── README.en.md            # English docs
├── .gitattributes          # Git LFS config
└── .gitignore
```

> `[LFS]` files are managed by Git LFS; `[generated]` directories are produced by scripts.

## 🎵 Velocity Layers

The original Salamander pack has 16 velocity levels (v1–v16), mapped here to 6 common layers:

| Layer | Meaning | Original range | Representative |
|--------|------|------------|---------|
| pp | pianissimo | v1–v3 | v2 |
| p | piano | v4–v6 | v5 |
| mp | mezzo-piano | v7–v8 | v8 |
| mf | mezzo-forte | v9–v10 | v10 |
| f | forte | v11–v13 | v12 |
| ff | fortissimo | v14–v16 | v15 |

## 🎼 Sample Source

[Salamander Grand Piano V3](https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html) — free piano samples recorded by Alexander Holm, 48kHz / 24bit.
