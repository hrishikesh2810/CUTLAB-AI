import os
import sys
import json
import logging
import tempfile
from typing import List, Dict, Any

# Ensure we can import from backend modules
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "../.."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.audio_ai.audio_extractor import extract_audio
from backend.audio_ai.beat_detection import detect_beats
from backend.audio_ai.energy_analysis import analyze_energy_peaks

def run_audio_pipeline(video_path: str, output_json_path: str = "backend/outputs/audio_cuts.json") -> Dict[str, Any]:
    """
    Orchestrates the Audio Analysis Pipeline.
    
    1. Extracts audio from video.
    2. Detects Beats & Tempo.
    3. Detects Energy Peaks.
    4. Merges and formats results into a deterministic JSON.
    
    Args:
        video_path (str): Absolute path to the source video.
        output_json_path (str): Path to save the resulting JSON.
        
    Returns:
        Dict: The resulting data dictionary.
    """
    
    # Validation
    if not os.path.exists(video_path):
        print(f"Error: Video not found at {video_path}")
        return {}
        
    # Setup Temp Audio Path
    temp_fd, temp_audio_path = tempfile.mkstemp(suffix=".wav")
    os.close(temp_fd) # Close file handle so ffmpeg can write
    
    try:
        # 1. Extraction
        extract_audio(video_path, temp_audio_path)
        
        # 2. Beat Detection
        tempo, beats = detect_beats(temp_audio_path)
        
        # 3. Energy Analysis
        peaks = analyze_energy_peaks(temp_audio_path, min_distance=0.5)
        
        # 4. Merge & Format
        candidates = []
        
        # 4.1 Collect Candidates
        for b in beats:
             # Initially beat
             candidates.append({
                "timestamp": b,
                "reason": "rhythm_beat",
                "confidence": 0.6
             })
             
        for p in peaks:
             match = None
             for c in candidates:
                 if abs(c['timestamp'] - p) < 0.1:
                     match = c
                     break
             
             if match:
                 match['reason'] = 'beat_and_peak'
                 match['confidence'] = 0.9  # Rule 6
                 match['timestamp'] = p     # Snap to peak
             else:
                 candidates.append({
                    "timestamp": p, 
                    "reason": "audio_energy_peak", 
                    "confidence": 0.75      # Rule 6
                 })
        
        # 4.2 Apply Filters
        candidates.sort(key=lambda x: x['timestamp'])
        filtered_step_1 = []
        
        for c in candidates:
            t = c['timestamp']
            
            # Rule 1: Ignore < 1.0s
            if t < 1.0:
                continue
                
            # Rule 3: Remove pure rhythm_beat
            if c['reason'] == 'rhythm_beat':
                continue
                
            # Rule 7: Add intent
            c['intent'] = 'music_sync'
            
            filtered_step_1.append(c)
            
        # Rule 5: Density Limit (Max 3 per 10s bucket)
        buckets = {}
        for c in filtered_step_1:
            b_idx = int(c['timestamp'] // 10)
            if b_idx not in buckets: buckets[b_idx] = []
            buckets[b_idx].append(c)
            
        density_filtered = []
        for b_idx in sorted(buckets.keys()):
            items = buckets[b_idx]
            # Prioritize high confidence, then earlier time
            items.sort(key=lambda x: (-x['confidence'], x['timestamp']))
            # Keep top 3
            keep = items[:3]
            # Re-sort by time for consistency
            keep.sort(key=lambda x: x['timestamp'])
            density_filtered.extend(keep)
            
        # Rule 2: Minimum 0.7s gap
        # We must re-sort fully by time before gap check
        density_filtered.sort(key=lambda x: x['timestamp'])
        
        final_cuts = []
        last_valid_time = -999.0
        
        for c in density_filtered:
            if (c['timestamp'] - last_valid_time) >= 0.7:
                 c['timestamp'] = round(c['timestamp'], 2)
                 final_cuts.append(c)
                 last_valid_time = c['timestamp']
        
        # Construct Final JSON
        result = {
            "source": "audio_analysis",
            "version": "1.1",  # Rule 8
            "tempo_bpm": round(tempo, 2),
            "suggested_cuts": final_cuts
        }
        
        # Write Output
        os.makedirs(os.path.dirname(output_json_path), exist_ok=True)
        with open(output_json_path, "w") as f:
            json.dump(result, f, indent=2, sort_keys=True)
            
        return result
        
    except Exception as e:
        print(f"Pipeline Failed: {e}")
        raise
    finally:
        # Cleanup
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

if __name__ == "__main__":
    # Simple CLI Test
    if len(sys.argv) > 1:
        vid_path = sys.argv[1]
        print(f"Running pipeline on {vid_path}...")
        res = run_audio_pipeline(vid_path)
        print(f"Done. Generated {len(res.get('suggested_cuts', []))} cuts.")
    else:
        print("Usage: python audio_pipeline.py <video_path>")
