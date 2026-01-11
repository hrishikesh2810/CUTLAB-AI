import numpy as np
from scipy.io import wavfile
from scipy.signal import find_peaks
from typing import Tuple, List

def detect_beats(audio_path: str) -> Tuple[float, List[float]]:
    """
    Detects tempo and beat timestamps from an audio file.
    
    Uses a lightweight Onset Detection algorithm (RMS Flux) to estimate beats
    without heavy dependencies like Librosa/Numba.

    Args:
        audio_path (str): Path to the WAV audio file.

    Returns:
        Tuple[float, List[float]]: A tuple containing:
            - tempo (float): The estimated tempo in BPM.
            - beats (List[float]): A list of timestamps (seconds) where beats occur.
    """
    # Load audio using scipy
    try:
        sr, data = wavfile.read(audio_path)
    except Exception as e:
        raise RuntimeError(f"Failed to read WAV file: {audio_path}") from e

    # Convert to float32 [-1, 1]
    if data.dtype == np.int16:
        y = data.astype(np.float32) / 32768.0
    elif data.dtype == np.float32:
        y = data
    else:
        # Fallback normalization
        y = data.astype(np.float32)
        max_val = np.max(np.abs(y))
        if max_val > 0:
            y = y / max_val

    # Ensure mono
    if len(y.shape) > 1:
        y = np.mean(y, axis=1)

    # 1. Compute RMS Envelope
    frame_length = 1024
    hop_length = 512
    
    pad = int(frame_length / 2)
    y_padded = np.pad(y, (pad, pad), mode='constant')
    y_sq = y_padded ** 2
    window = np.ones(frame_length)
    energy_sum = np.convolve(y_sq, window, mode='valid')[::hop_length]
    rms = np.sqrt(energy_sum / frame_length)
    
    # 2. Compute Spectral/Energy Flux (Difference)
    # Simple Onset strength: Positive difference of RMS
    rms_diff = np.diff(rms, prepend=0)
    onset_env = np.maximum(rms_diff, 0)
    
    # Normalize
    if np.max(onset_env) > 0:
        onset_env = onset_env / np.max(onset_env)
        
    # 3. Peak Picking (Beats)
    # Distance: assume max 240 BPM -> 4 beats/sec -> 0.25s interval
    # Let's say min distance is 0.2s
    frame_rate = sr / hop_length
    min_dist_frames = int(0.25 * frame_rate)
    
    peaks, _ = find_peaks(
        onset_env, 
        height=0.1,    # Threshold
        distance=min_dist_frames
    )
    
    beat_times = peaks * (hop_length / sr)
    
    # 4. Estimate Tempo from Median IOI (Inter-Onset Interval)
    if len(beat_times) > 1:
        iois = np.diff(beat_times)
        median_ioi = np.median(iois)
        tempo = 60.0 / median_ioi if median_ioi > 0 else 0.0
    else:
        tempo = 0.0
        
    return float(tempo), list(beat_times)
