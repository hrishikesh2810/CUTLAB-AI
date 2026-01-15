"""
Video Processor Module
======================
Handles video file operations using OpenCV.
Extracts metadata like duration, fps, dimensions.
"""

import cv2
from typing import Optional, Dict, Any


class VideoProcessor:
    """
    VideoProcessor: Handles video file operations.
    
    Usage:
        processor = VideoProcessor("/path/to/video.mp4")
        metadata = processor.get_metadata()
    """
    
    def __init__(self, video_path: str):
        """
        Initialize with video file path.
        
        Args:
            video_path: Absolute path to video file
        """
        self.video_path = video_path
        self._cap: Optional[cv2.VideoCapture] = None
    
    def _open(self) -> cv2.VideoCapture:
        """Open video capture if not already open."""
        if self._cap is None or not self._cap.isOpened():
            self._cap = cv2.VideoCapture(self.video_path)
        return self._cap
    
    def _close(self):
        """Release video capture resources."""
        if self._cap is not None:
            self._cap.release()
            self._cap = None
    
    def get_metadata(self) -> Optional[Dict[str, Any]]:
        """
        Extract video metadata.
        
        Returns:
            Dictionary with:
            - duration: Video length in seconds
            - fps: Frames per second
            - width: Frame width in pixels
            - height: Frame height in pixels
            - frame_count: Total number of frames
            
            Returns None if video cannot be read.
        """
        try:
            cap = self._open()
            
            if not cap.isOpened():
                return None
            
            # Extract properties from OpenCV
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            # Calculate duration
            # Duration = frame_count / fps
            duration = frame_count / fps if fps > 0 else 0
            
            self._close()
            
            return {
                "duration": round(duration, 3),
                "fps": round(fps, 2),
                "width": width,
                "height": height,
                "frame_count": frame_count
            }
            
        except Exception as e:
            print(f"Error reading video metadata: {e}")
            self._close()
            return None
    
    def get_frame_at_time(self, time_sec: float) -> Optional[Any]:
        """
        Get a single frame at specified time.
        
        Args:
            time_sec: Time in seconds
            
        Returns:
            Frame as numpy array or None
        """
        try:
            cap = self._open()
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_num = int(time_sec * fps)
            
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
            ret, frame = cap.read()
            
            return frame if ret else None
            
        except Exception:
            return None
    
    def __del__(self):
        """Cleanup on deletion."""
        self._close()
