"""
Smart Cut Suggestion Engine for CUTLAB AI (OPTIMIZED)
Analyzes scenes using motion, audio, and visual features to suggest cuts.
Performance optimized with batch processing, caching, and parallel execution.
"""

import cv2
import numpy as np
import os
import sys
from typing import List, Dict, Any, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import lru_cache

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


class VideoAnalyzer:
    """
    Optimized video analyzer that caches video properties and 
    processes multiple scenes efficiently with a single VideoCapture.
    """
    
    def __init__(self, video_path: str):
        self.video_path = video_path
        self._cap = None
        self._fps = None
        self._frame_count = None
        self._face_cascade = None
        
    def __enter__(self):
        self._cap = cv2.VideoCapture(self.video_path)
        self._fps = self._cap.get(cv2.CAP_PROP_FPS)
        self._frame_count = int(self._cap.get(cv2.CAP_PROP_FRAME_COUNT))
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._cap:
            self._cap.release()
        self._cap = None
        
    @property
    def fps(self) -> float:
        return self._fps if self._fps and self._fps > 0 else 30.0
    
    def _get_face_cascade(self):
        if self._face_cascade is None:
            try:
                self._face_cascade = cv2.CascadeClassifier(
                    cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
                )
            except:
                self._face_cascade = False
        return self._face_cascade if self._face_cascade else None
    
    def _read_frame_at(self, frame_idx: int) -> Tuple[bool, Any]:
        """Read a frame at specific index."""
        self._cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        return self._cap.read()
    
    def analyze_scene(self, start_time: float, end_time: float) -> Dict[str, Any]:
        """
        Perform ALL analyses for a scene in a single pass.
        More efficient than separate calls.
        """
        start_frame = int(start_time * self.fps)
        end_frame = int(end_time * self.fps)
        total_frames = end_frame - start_frame
        
        if total_frames <= 0:
            return self._default_metrics()
        
        # Sample fewer frames for efficiency
        num_samples = min(10, max(3, total_frames // 10))
        sample_indices = np.linspace(start_frame, end_frame - 1, num_samples, dtype=int)
        
        motion_scores = []
        frame_hashes = []
        prev_gray = None
        faces_detected = False
        face_cascade = self._get_face_cascade()
        
        # Single pass through sampled frames
        for idx in sample_indices:
            ret, frame = self._read_frame_at(idx)
            if not ret:
                continue
            
            # Resize once for all operations
            small = cv2.resize(frame, (320, 180))
            gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
            
            # Motion analysis
            if prev_gray is not None:
                diff = cv2.absdiff(prev_gray, gray)
                motion_scores.append(np.mean(diff) / 255.0)
            prev_gray = gray
            
            # Frame hash for repetitiveness
            tiny = cv2.resize(gray, (16, 16))
            frame_hashes.append(tiny.flatten())
            
            # Face detection (only check 3 frames for speed)
            if not faces_detected and face_cascade is not None and len(frame_hashes) <= 3:
                faces = face_cascade.detectMultiScale(
                    gray, scaleFactor=1.2, minNeighbors=4, minSize=(20, 20)
                )
                if len(faces) > 0:
                    faces_detected = True
        
        # Calculate metrics
        motion = min(1.0, np.mean(motion_scores) * 10) if motion_scores else 0.5
        
        # Repetitiveness
        if len(frame_hashes) >= 2:
            similarities = []
            for i in range(1, len(frame_hashes)):
                diff = np.mean(np.abs(frame_hashes[i].astype(float) - frame_hashes[i-1].astype(float)))
                similarities.append(1.0 - (diff / 255.0))
            repetitiveness = np.mean(similarities)
        else:
            repetitiveness = 0.5
            
        return {
            'motion': round(motion, 3),
            'has_faces': faces_detected,
            'repetitiveness': round(repetitiveness, 3)
        }
    
    def _default_metrics(self) -> Dict[str, Any]:
        return {'motion': 0.5, 'has_faces': False, 'repetitiveness': 0.5}


def analyze_scene_batch(video_path: str, scenes: List[Dict]) -> Dict[int, Dict]:
    """
    Analyze multiple scenes efficiently using a single VideoCapture instance.
    Returns dict mapping scene_id to metrics.
    """
    results = {}
    
    with VideoAnalyzer(video_path) as analyzer:
        for scene in scenes:
            scene_id = scene.get('scene_id', 0)
            start = scene['start_time']
            end = scene['end_time']
            
            # Skip very short scenes
            if end - start < 1.0:
                results[scene_id] = analyzer._default_metrics()
                continue
                
            results[scene_id] = analyzer.analyze_scene(start, end)
    
    return results


def check_peaks_in_timerange(peaks: List[Dict], start_time: float, end_time: float) -> Dict:
    """Check if there are audio peaks within a time range."""
    peaks_in_range = [p for p in peaks if start_time <= p['timestamp'] <= end_time]
    
    if not peaks_in_range:
        return {'has_peaks': False, 'count': 0, 'max_strength': 0}
    
    return {
        'has_peaks': True,
        'count': len(peaks_in_range),
        'max_strength': max(p['strength'] for p in peaks_in_range),
    }


def check_silence_overlap(silence_segments: List[Dict], start_time: float, end_time: float) -> Dict:
    """Check if a time range overlaps with silence segments."""
    total_silence = 0
    duration = end_time - start_time
    
    for seg in silence_segments:
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
    
    OPTIMIZED VERSION:
    - Batch video analysis with single VideoCapture
    - Pre-computed audio analysis
    - Efficient numpy operations
    
    Rules:
    1. Low motion + sustained silence → high confidence cut
    2. Very long static scenes → suggest trim
    3. Repetitive visual frames (no faces) → suggest cut
    4. High audio energy → mark as important, avoid cutting
    5. Audio peaks → protect these moments
    """
    if not scenes:
        return []
    
    suggestions = []
    
    # === PRE-COMPUTE AUDIO ANALYSIS (ONCE) ===
    audio_data = None
    silence_segments = []
    audio_peaks = []
    segment_energy = {}  # Cache segment energy
    
    if AUDIO_ANALYSIS_AVAILABLE:
        try:
            audio_data = audio_analysis.analyze_full_audio(video_path)
            if audio_data.get('has_audio'):
                silence_segments = audio_data.get('silence_segments', [])
                audio_peaks = audio_data.get('peaks', [])
                
                # Pre-calculate segment energies from full analysis
                energy_levels = audio_data.get('energy_levels', [])
                time_resolution = audio_data.get('time_resolution', 0.5)
                
                for scene in scenes:
                    start = scene['start_time']
                    end = scene['end_time']
                    start_idx = int(start / time_resolution) if time_resolution > 0 else 0
                    end_idx = int(end / time_resolution) if time_resolution > 0 else 0
                    
                    if energy_levels and start_idx < len(energy_levels):
                        segment_e = energy_levels[start_idx:min(end_idx + 1, len(energy_levels))]
                        segment_energy[scene.get('scene_id', 0)] = np.mean(segment_e) if segment_e else 0.5
        except Exception as e:
            print(f"Audio analysis warning: {e}")
    
    # === BATCH VIDEO ANALYSIS ===
    print(f"Analyzing {len(scenes)} scenes...")
    video_metrics = analyze_scene_batch(video_path, scenes)
    print(f"Video analysis complete.")
    
    # === CALCULATE AVERAGE DURATION ===
    avg_duration = sum(s['end_time'] - s['start_time'] for s in scenes) / len(scenes)
    
    # === PROCESS EACH SCENE ===
    for scene in scenes:
        scene_id = scene.get('scene_id', 0)
        start = scene['start_time']
        end = scene['end_time']
        duration = end - start
        
        # Skip very short scenes
        if duration < 1.0:
            continue
        
        # Get pre-computed metrics
        metrics = video_metrics.get(scene_id, {'motion': 0.5, 'has_faces': False, 'repetitiveness': 0.5})
        motion = metrics['motion']
        has_faces = metrics['has_faces']
        repetitiveness = metrics['repetitiveness']
        
        # Get audio metrics
        avg_energy = segment_energy.get(scene_id, 0.5)
        peak_info = check_peaks_in_timerange(audio_peaks, start, end)
        silence_info = check_silence_overlap(silence_segments, start, end)
        
        # === APPLY RULES ===
        reasons = []
        confidence = 0.0
        should_suggest = False
        suggestion_type = "CUT"
        audio_label = "Normal"
        
        # Determine audio label
        if silence_info['is_mostly_silent']:
            audio_label = "Silence Detected"
        elif peak_info['has_peaks']:
            audio_label = "Audio Peak"
        elif avg_energy > 0.6:
            audio_label = "High Energy"
        elif avg_energy < 0.2:
            audio_label = "Low Energy"
        
        # Rule 1: Low motion + sustained silence → HIGH confidence cut
        if motion < 0.2 and silence_info['is_mostly_silent']:
            reasons.append("Low motion with sustained silence")
            confidence += 0.5
            should_suggest = True
        elif motion < 0.2 and silence_info['silence_ratio'] > 0.3:
            reasons.append("Low motion and silence detected")
            confidence += 0.4
            should_suggest = True
        
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
        if avg_energy < 0.2 and motion < 0.2 and not has_faces:
            if "silence" not in " ".join(reasons).lower():
                reasons.append("Low audio energy with static visuals")
            confidence += 0.2
            should_suggest = True
        
        # === PROTECTION RULES ===
        
        # Protect high audio energy segments
        if avg_energy > 0.6:
            confidence *= 0.5
            if should_suggest:
                reasons.append("Note: High audio energy - review carefully")
        
        # Protect segments with audio peaks
        if peak_info['has_peaks'] and peak_info['max_strength'] > 0.5:
            confidence *= 0.6
            if should_suggest:
                reasons.append(f"Note: {peak_info['count']} audio peak(s) detected")
        
        # Protect faces
        if has_faces and should_suggest:
            confidence *= 0.6
            reasons.append("Note: Face detected - may be important")
        
        # === FINALIZE SUGGESTION ===
        if should_suggest and confidence > 0.2:
            suggestions.append({
                "scene_id": scene_id,
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
                    "audio_energy": round(avg_energy, 2),
                    "has_faces": has_faces,
                    "repetitiveness": round(repetitiveness, 2),
                    "duration": round(duration, 2),
                    "has_audio_peaks": peak_info['has_peaks'],
                    "peak_count": peak_info['count']
                }
            })
    
    # Sort by confidence (highest first)
    suggestions.sort(key=lambda x: x['confidence'], reverse=True)
    
    print(f"Generated {len(suggestions)} suggestions")
    return suggestions
