"""
Scene Detector Module
=====================
Uses PySceneDetect for precise, industry-standard scene detection.
Replacing manual OpenCV implementation to match Streamlit/Production quality.
"""

from typing import List, Dict, Optional, Any
import os
import cv2
import numpy as np
from dataclasses import dataclass

# PySceneDetect imports
from scenedetect import VideoManager
from scenedetect import SceneManager
from scenedetect.detectors import ContentDetector, AdaptiveDetector

@dataclass
class DetectionConfig:
    """Configuration for scene detection."""
    method: str = "content"  # "content" or "adaptive"
    threshold: float = 27.0  # Threshold for ContentDetector (default 27.0)
    min_scene_length: float = 0.6  # Minimum length in seconds
    adaptive_window: int = 2  # Window size for AdaptiveDetector

class SceneDetector:
    """
    Detects scenes in video using PySceneDetect.
    """
    
    def __init__(self, video_path: str, config: Optional[DetectionConfig] = None):
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")
            
        self.video_path = video_path
        self.config = config or DetectionConfig()
        
    def detect_scenes(self) -> List[Dict[str, float]]:
        """
        Run scene detection and return list of scenes.
        """
        # Create a video manager and scene manager
        video_manager = VideoManager([self.video_path])
        scene_manager = SceneManager()
        
        # Start video manager to get FPS first
        video_manager.set_downscale_factor()
        video_manager.start()
        
        try:
            # Get framerate
            fps = video_manager.get_framerate()
            if not fps:
                fps = 30.0
            
            # Convert min_length to frames
            min_scene_frames = int(self.config.min_scene_length * fps)
            
            # Select detector based on config
            if self.config.method == "adaptive":
                detector = AdaptiveDetector(
                    adaptive_threshold=self.config.threshold,
                    min_scene_len=min_scene_frames,
                    window_width=self.config.adaptive_window
                )
            else:
                # Standard ContentDetector
                detector = ContentDetector(
                    threshold=self.config.threshold,
                    min_scene_len=min_scene_frames
                )
                
            scene_manager.add_detector(detector)
            
            # Perform detection
            scene_manager.detect_scenes(frame_source=video_manager)
            
            # Get list of scenes
            scene_list = scene_manager.get_scene_list()
            
            # Convert to our format
            scenes = []
            for scene in scene_list:
                start_time = scene[0].get_seconds()
                end_time = scene[1].get_seconds()
                
                scenes.append({
                    "start": float(start_time),
                    "end": float(end_time)
                })
                
            return scenes
            
        finally:
            video_manager.release()

if __name__ == "__main__":
    # Test
    import sys
    if len(sys.argv) > 1:
        detector = SceneDetector(sys.argv[1])
        scenes = detector.detect_scenes()
        print(f"Detected {len(scenes)} scenes:")
        for s in scenes:
            print(f"  {s['start']:.2f}s - {s['end']:.2f}s")
