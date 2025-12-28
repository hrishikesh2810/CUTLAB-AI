"""
Smart Cut Suggestion Engine for CUTLAB AI
Analyzes scenes using motion, audio, and visual features to suggest cuts.
All suggestions are explainable with clear reasoning.
"""

import cv2
import numpy as np
import os
import sys
from typing import List, Dict, Any, Optional

# Add parent to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import audio analysis module
try:
    from video_utils import audio_analysis
    AUDIO_ANALYSIS_AVAILABLE = True
except ImportError:
    AUDIO_ANALYSIS_AVAILABLE = False

def format_time(seconds: float) -> str:
    """Convert seconds to HH:MM:SS.mmm format with milliseconds."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    milliseconds = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{milliseconds:03d}"


def analyze_motion_intensity(video_path: str, start_time: float, end_time: float) -> float:
    """
    Analyze motion intensity within a scene using frame differencing.
    Returns a normalized score between 0 (no motion) and 1 (high motion).
    """
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        cap.release()
        return 0.5
    
    start_frame = int(start_time * fps)
    end_frame = int(end_time * fps)
    
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
    
    motion_scores = []
    prev_gray = None
    
    sample_interval = max(1, (end_frame - start_frame) // 20)
    
    frame_idx = start_frame
    while frame_idx < end_frame:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            break
            
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.resize(gray, (320, 180))
        
        if prev_gray is not None:
            diff = cv2.absdiff(prev_gray, gray)
            motion_score = np.mean(diff) / 255.0
            motion_scores.append(motion_score)
        
        prev_gray = gray
        frame_idx += sample_interval
    
    cap.release()
    
    if not motion_scores:
        return 0.5
    
    avg_motion = np.mean(motion_scores)
    return min(1.0, avg_motion * 10)


def detect_faces_in_scene(video_path: str, start_time: float, end_time: float) -> bool:
    """
    Lightweight face detection using OpenCV Haar cascades.
    """
    try:
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    except:
        return False
    
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        cap.release()
        return False
    
    start_frame = int(start_time * fps)
    end_frame = int(end_time * fps)
    
    sample_frames = [
        start_frame,
        (start_frame + end_frame) // 2,
        end_frame - 1
    ]
    
    faces_detected = False
    for frame_idx in sample_frames:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            continue
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.resize(gray, (640, 360))
        
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        if len(faces) > 0:
            faces_detected = True
            break
    
    cap.release()
    return faces_detected


def detect_repetitive_frames(video_path: str, start_time: float, end_time: float) -> float:
    """
    Detect if scene contains repetitive/static frames.
    Returns score between 0 (varied) and 1 (highly repetitive).
    """
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        cap.release()
        return 0.5
    
    start_frame = int(start_time * fps)
    end_frame = int(end_time * fps)
    
    frame_hashes = []
    sample_interval = max(1, (end_frame - start_frame) // 10)
    
    frame_idx = start_frame
    while frame_idx < end_frame:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            break
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        small = cv2.resize(gray, (16, 16))
        frame_hash = small.flatten().tolist()
        frame_hashes.append(frame_hash)
        
        frame_idx += sample_interval
    
    cap.release()
    
    if len(frame_hashes) < 2:
        return 0.5
    
    similarities = []
    for i in range(1, len(frame_hashes)):
        diff = np.mean(np.abs(np.array(frame_hashes[i]) - np.array(frame_hashes[i-1])))
        similarity = 1.0 - (diff / 255.0)
        similarities.append(similarity)
    
    return np.mean(similarities) if similarities else 0.5


def get_audio_features_for_scene(video_path: str, start_time: float, end_time: float) -> Dict:
    """
    Get comprehensive audio features for a scene segment.
    """
    if AUDIO_ANALYSIS_AVAILABLE:
        return audio_analysis.get_segment_audio_features(video_path, start_time, end_time)
    else:
        return {
            'has_audio': False,
            'avg_energy': 0.5,
            'is_silent': False,
            'has_peak': False,
            'peak_count': 0,
            'energy_label': 'Audio analysis unavailable'
        }


def check_peaks_in_timerange(peaks: List[Dict], start_time: float, end_time: float) -> Dict:
    """
    Check if there are audio peaks within a time range.
    """
    peaks_in_range = [p for p in peaks if start_time <= p['timestamp'] <= end_time]
    
    if not peaks_in_range:
        return {'has_peaks': False, 'count': 0, 'max_strength': 0}
    
    return {
        'has_peaks': True,
        'count': len(peaks_in_range),
        'max_strength': max(p['strength'] for p in peaks_in_range),
        'peak_times': [p['timestamp'] for p in peaks_in_range]
    }


def check_silence_overlap(silence_segments: List[Dict], start_time: float, end_time: float) -> Dict:
    """
    Check if a time range overlaps with silence segments.
    """
    total_silence = 0
    duration = end_time - start_time
    
    for seg in silence_segments:
        # Calculate overlap
        overlap_start = max(start_time, seg['start_time'])
        overlap_end = min(end_time, seg['end_time'])
        
        if overlap_start < overlap_end:
            total_silence += overlap_end - overlap_start
    
    silence_ratio = total_silence / duration if duration > 0 else 0
    
    return {
        'has_silence': silence_ratio > 0.3,
        'silence_ratio': silence_ratio,
        'is_mostly_silent': silence_ratio > 0.7
    }


def suggest_cuts(video_path: str, scenes: List[Dict], video_duration: float) -> List[Dict[str, Any]]:
    """
    Analyze scenes and suggest cuts based on motion, audio, and visual rules.
    
    Enhanced Rules (Audio-Aware):
    1. Low motion + sustained silence → high confidence cut
    2. Very long static scenes → suggest trim
    3. Repetitive visual frames (no faces) → suggest cut
    4. High audio energy → mark as important, avoid cutting
    5. Audio peaks → protect these moments
    6. Silence + low motion = increased cut confidence
    """
    suggestions = []
    
    # Pre-compute full audio analysis for efficiency
    audio_data = None
    silence_segments = []
    audio_peaks = []
    
    if AUDIO_ANALYSIS_AVAILABLE:
        try:
            audio_data = audio_analysis.analyze_full_audio(video_path)
            if audio_data.get('has_audio'):
                silence_segments = audio_data.get('silence_segments', [])
                audio_peaks = audio_data.get('peaks', [])
        except Exception as e:
            print(f"Full audio analysis failed: {e}")
    
    # Calculate average scene duration
    if scenes:
        avg_duration = sum(s['end_time'] - s['start_time'] for s in scenes) / len(scenes)
    else:
        avg_duration = 10.0
    
    for scene in scenes:
        start = scene['start_time']
        end = scene['end_time']
        duration = end - start
        
        # Skip very short scenes
        if duration < 1.0:
            continue
        
        # === MOTION ANALYSIS ===
        motion = analyze_motion_intensity(video_path, start, end)
        
        # === FACE DETECTION ===
        has_faces = detect_faces_in_scene(video_path, start, end)
        
        # === REPETITIVENESS ===
        repetitiveness = detect_repetitive_frames(video_path, start, end)
        
        # === AUDIO ANALYSIS ===
        audio_features = get_audio_features_for_scene(video_path, start, end)
        
        # Check for peaks and silence in this segment
        peak_info = check_peaks_in_timerange(audio_peaks, start, end)
        silence_info = check_silence_overlap(silence_segments, start, end)
        
        # === APPLY RULES ===
        reasons = []
        confidence = 0.0
        should_suggest = False
        suggestion_type = "CUT"
        audio_label = audio_features.get('energy_label', 'Unknown')
        
        # Rule 1: Low motion + sustained silence → HIGH confidence cut
        if motion < 0.2 and silence_info['is_mostly_silent']:
            reasons.append("Low motion with sustained silence")
            confidence += 0.5
            should_suggest = True
            audio_label = "Silence Detected"
        elif motion < 0.2 and audio_features.get('is_silent', False):
            reasons.append("Low motion and silence detected")
            confidence += 0.4
            should_suggest = True
            audio_label = "Silence Detected"
        
        # Rule 2: Very long static scenes → suggest trim
        if duration > avg_duration * 2 and motion < 0.3:
            reasons.append(f"Scene unusually long ({duration:.1f}s) with low activity")
            confidence += 0.3
            suggestion_type = "TRIM"
            should_suggest = True
        
        # Rule 3: Repetitive visual frames (no faces)
        if repetitiveness > 0.85 and not has_faces:
            reasons.append("Highly repetitive visual content")
            confidence += 0.3
            should_suggest = True
        
        # Rule 4: Silence + low motion = increased confidence
        if silence_info['silence_ratio'] > 0.5 and motion < 0.25:
            if "silence" not in " ".join(reasons).lower():
                reasons.append("Extended silence with minimal visual change")
            confidence += 0.15
            should_suggest = True
        
        # Rule 5: Low energy audio + low motion
        if audio_features.get('avg_energy', 0.5) < 0.2 and motion < 0.2 and not has_faces:
            if "silence" not in " ".join(reasons).lower():
                reasons.append("Low audio energy with static visuals")
            confidence += 0.2
            should_suggest = True
            audio_label = "Low Energy"
        
        # === PROTECTION RULES (reduce confidence) ===
        
        # Protect high audio energy segments
        if audio_features.get('avg_energy', 0) > 0.6:
            confidence *= 0.5
            if should_suggest:
                reasons.append("Note: High audio energy detected - review carefully")
            audio_label = "High Energy Segment"
        
        # Protect segments with audio peaks
        if peak_info['has_peaks'] and peak_info['max_strength'] > 0.5:
            confidence *= 0.6
            if should_suggest:
                reasons.append(f"Note: {peak_info['count']} audio peak(s) detected")
            audio_label = "Audio Peak"
        
        # Protect faces (talking head content)
        if has_faces and should_suggest:
            confidence *= 0.6
            reasons.append("Note: Face detected - may be important speech")
        
        # === FINALIZE SUGGESTION ===
        if should_suggest and confidence > 0.2:
            suggestions.append({
                "scene_id": scene.get('scene_id', 0),
                "cut_start": format_time(start),
                "cut_end": format_time(end),
                "start_seconds": start,
                "end_seconds": end,
                "confidence": round(min(confidence, 0.95), 2),
                "suggestion_type": suggestion_type,
                "reason": "; ".join(reasons),
                "audio_label": audio_label,
                "metrics": {
                    "motion_intensity": round(motion, 2),
                    "silence_level": round(silence_info['silence_ratio'], 2),
                    "audio_energy": round(audio_features.get('avg_energy', 0.5), 2),
                    "has_faces": has_faces,
                    "repetitiveness": round(repetitiveness, 2),
                    "duration": round(duration, 2),
                    "has_audio_peaks": peak_info['has_peaks'],
                    "peak_count": peak_info['count']
                }
            })
    
    # Sort by confidence (highest first)
    suggestions.sort(key=lambda x: x['confidence'], reverse=True)
    
    return suggestions
