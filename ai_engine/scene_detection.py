"""
Scene Detection Module
======================
Implements precise scene detection using PySceneDetect.
Restored to match Streamlit/Production quality.
"""

import math
from typing import List, Dict, Any
from scenedetect import VideoManager, SceneManager
from scenedetect.detectors import ContentDetector

def detect_scenes(video_path: str) -> List[Dict[str, Any]]:
    """
    Detect scenes in a video file using ContentDetector.
    Returns a list of scenes with start/end times and frames.
    """
    # Create a video manager and scene manager
    video_manager = VideoManager([video_path])
    scene_manager = SceneManager()
    
    # Use ContentDetector with standard threshold (precise)
    # Threshold 27.0 is a good default for general content
    detector = ContentDetector(threshold=27.0, min_scene_len=15)
    scene_manager.add_detector(detector)
    
    try:
        # Start video manager
        video_manager.set_downscale_factor()
        video_manager.start()
        
        # Perform detection
        scene_manager.detect_scenes(frame_source=video_manager)
        
        # Get list of scenes from SceneManager
        scene_list = scene_manager.get_scene_list()
        
        results = []
        for scene in scene_list:
            start_time = scene[0].get_seconds()
            end_time = scene[1].get_seconds()
            start_frame = scene[0].get_frames()
            end_frame = scene[1].get_frames()
            
            results.append({
                "start_time": float(start_time),
                "end_time": float(end_time),
                "start_frame": int(start_frame),
                "end_frame": int(end_frame)
            })
            
        return results
        
    finally:
        video_manager.release()
