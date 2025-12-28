"""
Audio Analysis Module for CUTLAB AI
Provides audio feature extraction for video files using Librosa.
Works with speech, music, sports clips, and handles silent videos gracefully.
"""

import numpy as np
from typing import List, Dict, Tuple, Optional
import os

# Try to import librosa
try:
    import librosa
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False
    print("Warning: librosa not available. Audio analysis will be disabled.")

# Constants
DEFAULT_SR = 22050  # Sample rate
HOP_LENGTH = 512    # Hop length for feature extraction
SILENCE_THRESHOLD = 0.02  # RMS threshold for silence
MIN_SILENCE_DURATION = 0.5  # Minimum silence duration in seconds


def check_audio_available() -> bool:
    """Check if audio analysis is available."""
    return LIBROSA_AVAILABLE


def extract_audio_from_video(video_path: str, sr: int = DEFAULT_SR) -> Tuple[Optional[np.ndarray], int]:
    """
    Extract audio waveform from a video file.
    
    Args:
        video_path: Path to the video file
        sr: Target sample rate
        
    Returns:
        Tuple of (audio waveform as numpy array, sample rate)
        Returns (None, sr) if extraction fails
    """
    if not LIBROSA_AVAILABLE:
        return None, sr
    
    try:
        y, sr_actual = librosa.load(video_path, sr=sr, mono=True)
        if len(y) == 0:
            return None, sr
        return y, sr_actual
    except Exception as e:
        print(f"Audio extraction failed: {e}")
        return None, sr


def extract_audio_energy(video_path: str, frame_duration: float = 0.1) -> Dict:
    """
    Extract audio energy over time from a video.
    
    Args:
        video_path: Path to the video file
        frame_duration: Duration of each energy frame in seconds
        
    Returns:
        Dictionary containing:
        - 'times': List of timestamps
        - 'energy': List of energy values (0-1 normalized)
        - 'rms': List of RMS values
        - 'has_audio': Boolean indicating if audio was found
    """
    if not LIBROSA_AVAILABLE:
        return {'times': [], 'energy': [], 'rms': [], 'has_audio': False}
    
    y, sr = extract_audio_from_video(video_path)
    
    if y is None or len(y) == 0:
        return {'times': [], 'energy': [], 'rms': [], 'has_audio': False}
    
    # Calculate RMS energy
    hop_length = int(sr * frame_duration)
    rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
    
    # Normalize RMS to 0-1 range
    if rms.max() > 0:
        energy = rms / rms.max()
    else:
        energy = rms
    
    # Generate timestamps
    times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length)
    
    return {
        'times': times.tolist(),
        'energy': energy.tolist(),
        'rms': rms.tolist(),
        'has_audio': True,
        'duration': len(y) / sr,
        'avg_energy': float(np.mean(energy)),
        'max_energy': float(np.max(energy))
    }


def detect_silence_segments(video_path: str, 
                            threshold: float = SILENCE_THRESHOLD,
                            min_duration: float = MIN_SILENCE_DURATION) -> List[Dict]:
    """
    Detect silent segments in video audio.
    
    Args:
        video_path: Path to the video file
        threshold: RMS threshold below which audio is considered silent
        min_duration: Minimum duration for a segment to be considered silent
        
    Returns:
        List of silence segments with start_time, end_time, and duration
    """
    if not LIBROSA_AVAILABLE:
        return []
    
    y, sr = extract_audio_from_video(video_path)
    
    if y is None or len(y) == 0:
        return []
    
    # Calculate RMS with small hop for precision
    hop_length = int(sr * 0.05)  # 50ms frames
    rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
    times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length)
    
    # Find silent frames
    is_silent = rms < threshold
    
    # Group consecutive silent frames into segments
    silence_segments = []
    in_silence = False
    start_time = 0
    
    for i, (t, silent) in enumerate(zip(times, is_silent)):
        if silent and not in_silence:
            # Start of silence
            in_silence = True
            start_time = t
        elif not silent and in_silence:
            # End of silence
            in_silence = False
            duration = t - start_time
            if duration >= min_duration:
                silence_segments.append({
                    'start_time': float(start_time),
                    'end_time': float(t),
                    'duration': float(duration)
                })
    
    # Handle case where audio ends in silence
    if in_silence:
        duration = times[-1] - start_time
        if duration >= min_duration:
            silence_segments.append({
                'start_time': float(start_time),
                'end_time': float(times[-1]),
                'duration': float(duration)
            })
    
    return silence_segments


def detect_audio_peaks(video_path: str, 
                       prominence: float = 0.3,
                       min_distance_sec: float = 0.5) -> List[Dict]:
    """
    Detect audio peaks/beats in video audio.
    Uses onset detection for speech and beat detection for music.
    
    Args:
        video_path: Path to the video file
        prominence: Minimum prominence for peak detection
        min_distance_sec: Minimum time between peaks in seconds
        
    Returns:
        List of peak events with timestamp, strength, and type
    """
    if not LIBROSA_AVAILABLE:
        return []
    
    y, sr = extract_audio_from_video(video_path)
    
    if y is None or len(y) == 0:
        return []
    
    peaks = []
    
    try:
        # Onset detection (works for both speech and music)
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        onset_times = librosa.onset.onset_detect(
            y=y, sr=sr, units='time',
            backtrack=False
        )
        
        # Get onset strengths at detected times
        onset_frames = librosa.time_to_frames(onset_times, sr=sr)
        
        for i, (t, frame) in enumerate(zip(onset_times, onset_frames)):
            if frame < len(onset_env):
                strength = float(onset_env[frame])
                # Normalize strength
                max_strength = onset_env.max() if onset_env.max() > 0 else 1
                norm_strength = strength / max_strength
                
                if norm_strength >= prominence:
                    peaks.append({
                        'timestamp': float(t),
                        'strength': float(norm_strength),
                        'type': 'onset'
                    })
        
        # Also try beat detection for music
        try:
            tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
            beat_times = librosa.frames_to_time(beat_frames, sr=sr)
            
            for t in beat_times:
                # Check if this beat is not already covered by an onset
                is_new = all(abs(t - p['timestamp']) > min_distance_sec for p in peaks)
                if is_new:
                    peaks.append({
                        'timestamp': float(t),
                        'strength': 0.7,  # Default strength for beats
                        'type': 'beat'
                    })
        except Exception:
            pass  # Beat detection may fail for non-musical audio
        
        # Sort by timestamp
        peaks.sort(key=lambda x: x['timestamp'])
        
        # Filter peaks that are too close together
        if peaks and min_distance_sec > 0:
            filtered_peaks = [peaks[0]]
            for p in peaks[1:]:
                if p['timestamp'] - filtered_peaks[-1]['timestamp'] >= min_distance_sec:
                    filtered_peaks.append(p)
            peaks = filtered_peaks
            
    except Exception as e:
        print(f"Peak detection error: {e}")
    
    return peaks


def get_segment_audio_features(video_path: str, 
                               start_time: float, 
                               end_time: float) -> Dict:
    """
    Get audio features for a specific time segment.
    
    Args:
        video_path: Path to the video file
        start_time: Start of segment in seconds
        end_time: End of segment in seconds
        
    Returns:
        Dictionary with segment audio features
    """
    if not LIBROSA_AVAILABLE:
        return {
            'has_audio': False,
            'avg_energy': 0.5,
            'is_silent': False,
            'has_peak': False,
            'peak_count': 0,
            'energy_label': 'Unknown'
        }
    
    duration = end_time - start_time
    if duration <= 0:
        return {
            'has_audio': False,
            'avg_energy': 0.5,
            'is_silent': False,
            'has_peak': False,
            'peak_count': 0,
            'energy_label': 'Unknown'
        }
    
    try:
        y, sr = librosa.load(video_path, sr=DEFAULT_SR, 
                             offset=start_time, duration=duration)
        
        if y is None or len(y) == 0:
            return {
                'has_audio': False,
                'avg_energy': 0.5,
                'is_silent': True,
                'has_peak': False,
                'peak_count': 0,
                'energy_label': 'No Audio'
            }
        
        # Calculate RMS
        rms = librosa.feature.rms(y=y)[0]
        avg_rms = np.mean(rms)
        max_rms = np.max(rms) if len(rms) > 0 else 0
        
        # Determine if silent
        is_silent = avg_rms < SILENCE_THRESHOLD
        
        # Check for peaks/onsets
        try:
            onset_env = librosa.onset.onset_strength(y=y, sr=sr)
            peaks_in_segment = np.sum(onset_env > np.mean(onset_env) + np.std(onset_env))
        except:
            peaks_in_segment = 0
        
        # Normalize energy (typical speech RMS is 0.01-0.1)
        normalized_energy = min(1.0, avg_rms * 10)
        
        # Determine energy label
        if is_silent:
            energy_label = "Silence Detected"
        elif normalized_energy > 0.7:
            energy_label = "High Energy Segment"
        elif peaks_in_segment > 3:
            energy_label = "Audio Peak"
        elif normalized_energy > 0.4:
            energy_label = "Moderate Energy"
        else:
            energy_label = "Low Energy"
        
        return {
            'has_audio': True,
            'avg_energy': float(normalized_energy),
            'max_energy': float(min(1.0, max_rms * 10)),
            'is_silent': is_silent,
            'has_peak': peaks_in_segment > 2,
            'peak_count': int(peaks_in_segment),
            'energy_label': energy_label,
            'raw_rms': float(avg_rms)
        }
        
    except Exception as e:
        print(f"Segment audio analysis error: {e}")
        return {
            'has_audio': False,
            'avg_energy': 0.5,
            'is_silent': False,
            'has_peak': False,
            'peak_count': 0,
            'energy_label': 'Analysis Error'
        }


def analyze_full_audio(video_path: str) -> Dict:
    """
    Perform comprehensive audio analysis on a video.
    
    Returns a complete audio analysis report.
    """
    result = {
        'has_audio': False,
        'duration': 0,
        'energy_profile': {},
        'silence_segments': [],
        'peaks': [],
        'summary': {}
    }
    
    if not LIBROSA_AVAILABLE:
        result['error'] = 'Librosa not available'
        return result
    
    # Extract energy profile
    energy_data = extract_audio_energy(video_path)
    result['energy_profile'] = energy_data
    result['has_audio'] = energy_data.get('has_audio', False)
    
    if not result['has_audio']:
        return result
    
    result['duration'] = energy_data.get('duration', 0)
    
    # Detect silence
    result['silence_segments'] = detect_silence_segments(video_path)
    
    # Detect peaks
    result['peaks'] = detect_audio_peaks(video_path)
    
    # Summary statistics
    total_silence = sum(s['duration'] for s in result['silence_segments'])
    result['summary'] = {
        'avg_energy': energy_data.get('avg_energy', 0),
        'max_energy': energy_data.get('max_energy', 0),
        'silence_ratio': total_silence / result['duration'] if result['duration'] > 0 else 0,
        'peak_count': len(result['peaks']),
        'silence_segment_count': len(result['silence_segments'])
    }
    
    return result
