# Audio Intelligence Pipeline (Phase 1)

## Overview
A standalone backend pipeline that extracts audio execution from video files, analyzes them for rhythm and energy, and outputs intelligent cut timestamps in JSON format.
This module is **stateless** and designed for offline processing.

## Architecture

### Modules
1.  **`audio_extractor.py`**: Wraps FFmpeg to generate standard WAV files (22050Hz Mono).
2.  **`beat_detection.py`**: Uses Onset Detection (Numpy/Scipy) to find Tempo and Beat Grid.
3.  **`energy_analysis.py`**: Detects RMS energy peaks (loud moments) with filtering (<0.5s).
4.  **`audio_pipeline.py`**: Orchestrator that applies filtering rules and guarantees JSON structure.

### Version 1.1 Filtering Rules
The pipeline enforces the following constraints before output generation:
1.  **Ignore < 1.0s**: No cuts in the first second.
2.  **Min Gap 0.7s**: Enforced minimum duration between consecutive cuts.
3.  **No Pure Beats**: Removes `rhythm_beat`. Only `beat_and_peak` or `audio_energy_peak` are kept.
4.  **Density Limit**: Max 3 cuts per 10-second non-overlapping bucket.
5.  **Confidence**: `beat_and_peak` (0.9), `audio_energy_peak` (0.75).

### Data Flow
`Video File` -> `[Extraction]` -> `WAV` -> `[Analysis]` -> `Raw Data` -> `[Pipeline Logic]` -> `audio_cuts.json`

## Input / Output

### Input
-   **Video File Path**: Absolute path to `.mp4` / `.mov` file.

### Output JSON
File: `backend/outputs/audio_cuts.json`

```json
{
  "source": "audio_analysis",
  "version": "1.1",
  "tempo_bpm": 120.5,
  "suggested_cuts": [
    {
      "timestamp": 12.34,
      "reason": "beat_and_peak",
      "confidence": 0.9,
      "intent": "music_sync"
    },
    {
      "timestamp": 15.67,
      "reason": "audio_energy_peak",
      "confidence": 0.75,
      "intent": "music_sync"
    }
  ]
}
```

## Integration
This pipeline is designed to be called by the main FastAPI application or a worker queue. It does not write to the database itself; it produces a JSON artifact that the integration layer should read and persist if necessary.

## Limitations
-   Processing speed depends on CPU (Numpy-bound).
-   No deep learning (Transformer/Whisper) used in Phase 1.
-   Single-threaded execution per file.
