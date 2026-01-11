import numpy as np
from scipy.io import wavfile
from scipy.signal import find_peaks
from typing import List

def analyze_energy_peaks(audio_path: str, min_distance: float = 0.5) -> List[float]:
    """
    Analyzes audio RMS energy to find significant peaks potentially suitable for cuts.
    Filters peaks that are too close together.
    
    Implementation uses pure Numpy/Scipy to avoid heavy dependency issues.

    Args:
        audio_path (str): Path to the WAV audio file.
        min_distance (float): Minimum time (seconds) required between peaks.

    Returns:
        List[float]: A list of timestamps (seconds) where energy peaks occur.
    """
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
        y = data.astype(np.float32)
        max_val = np.max(np.abs(y))
        if max_val > 0:
            y = y / max_val

    # Ensure mono
    if len(y.shape) > 1:
        y = np.mean(y, axis=1)

    # Compute RMS energy manually (Frame size 1024, Hop 512)
    frame_length = 1024
    hop_length = 512
    
    # Pad to center (mocking librosa behavior roughly)
    pad = int(frame_length / 2)
    y_padded = np.pad(y, (pad, pad), mode='constant')
    
    # Squared energy
    y_sq = y_padded ** 2
    
    # Moving sum window
    window = np.ones(frame_length)
    # Valid convolution returns (len - window + 1)
    energy_sum = np.convolve(y_sq, window, mode='valid')
    
    # Decimate by hop
    energy_sum = energy_sum[::hop_length]
    
    # Valid safety check
    if len(energy_sum) == 0:
        return []
        
    rms = np.sqrt(energy_sum / frame_length)
    
    # Normalize RMS
    if np.max(rms) > 0:
        rms_norm = rms / np.max(rms)
    else:
        return []

    # Find peaks using scipy
    # distance in samples = seconds * (sr / hop_length) -> approximate frame rate is sr/hop
    frame_rate = sr / hop_length
    min_dist_frames = int(min_distance * frame_rate)
    
    peaks, _ = find_peaks(
        rms_norm,
        height=0.3,     # Min amplitude
        distance=min_dist_frames,
        prominence=0.1
    )
    
    # Convert frames to time
    peak_times = peaks * (hop_length / sr)
    
    return [float(t) for t in peak_times]

