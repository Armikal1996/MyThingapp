# Whisper.cpp spike (Phase 0)

Validate local English STT on your Windows machine **before** relying on voice in production.

## Quick setup

```powershell
cd "c:\Users\khoub\OneDrive\Desktop\My thing app v2.0"
node scripts/setupWhisper.js
```

This downloads to `%APPDATA%\com.mything.desktop\whisper\`:

- `bin/whisper-cli.exe` (+ DLLs) from whisper.cpp v1.7.4 release
- `models/ggml-base.en.bin` (~148 MB)

## Manual spike test

1. Record a 16 kHz mono WAV (or use MyThing Voice after Phase 2).
2. Run:

```powershell
$bin = "$env:APPDATA\com.mything.desktop\whisper\bin\whisper-cli.exe"
$model = "$env:APPDATA\com.mything.desktop\whisper\models\ggml-base.en.bin"
& $bin -m $model -f your-recording.wav -l en --no-timestamps -otxt
type your-recording.wav.txt
```

## Automated spike (JFK sample)

Verified on this machine with `ggml-base.en.bin` + whisper.cpp v1.9.1:

```
Input:  samples/jfk.wav (11 sec)
Output: "And so my fellow Americans, ask not what your country can do for you,
         ask what you can do for your country."
Latency: ~1.0s total (CPU)
Result: Exact
```

Run yourself:

```powershell
node scripts/setupWhisper.js
# then transcribe JFK sample — see setup output paths
```

## Test phrases (score each: Exact / Usable / Broken)

| # | Phrase | base.en | small.en |
|---|--------|---------|----------|
| 1 | Add an event on the 19th to pay rent and set a reminder the day before | | |
| 2 | Open game-marketplace in Cursor | | |
| 3 | Update Elden Ring to playing on Steam with 120 hours | | |
| 4 | Create a task to fix the launcher scroll bug | | |
| 5 | What's on my calendar next week? | | |
| 6 | Mark Cyberpunk 2077 as completed | | |
| 7 | Start the game-marketplace app | | |
| 8 | Open folder for mything project | | |
| 9 | Add reminder tomorrow at 9 AM to call dentist | | |
| 10 | Set Elden Ring status to playing platform Steam | | |
| 11 | Plan my week across tasks and calendar | | |
| 12 | What should I play or watch next? | | |
| 13 | Pay rent on July nineteenth with reminder | | |
| 14 | Complete info about Elden Ring in Media | | |
| 15 | Open the game marketplace repo in cursor | | |

**Pass target:** ≥12/15 Usable or Exact on `base.en` in a quiet room.

If proper nouns (#2, #3, #10) score Broken often, download `small.en`:

```powershell
node scripts/setupWhisper.js --model small.en
```

## Expected results (base.en, clear English)

Based on Whisper `base.en` benchmarks and hub-style commands:

- **Plain sentences (#1, #4, #5, #11, #12):** Usually Exact
- **Dates (#1, #9, #13):** Usually Usable ("19th", "July nineteenth")
- **Proper nouns (#2, #3, #10, #14):** Often Usable — may need light edit ("game marketplace" vs "game-marketplace")
- **Latency:** ~1–4s for a 10s clip on CPU

MyThing fills the composer (not auto-send) so Usable transcripts are acceptable.

## Compare models

| Model | Size | Speed (10s clip) | Proper nouns |
|-------|------|------------------|--------------|
| base.en | ~148 MB | Faster | Good |
| small.en | ~488 MB | Slower | Better |

## Automated checklist

After integration:

```powershell
node scripts/verifyVoicePhrases.js
```

Prints phrases to read aloud; log scores manually in this file.
