import cv2
from scenedetect import VideoManager
from scenedetect import SceneManager
from scenedetect.detectors import ContentDetector

def detect_scenes(video_path: str, threshold: float = 30.0):
    """
    Detects scenes in a video using PySceneDetect.
    Returns a list of dicts with:
    - scene_id
    - start_time (seconds)
    - end_time (seconds)
    - start_frame
    - end_frame
    """
    
    # Create a video manager point to video file
    video_manager = VideoManager([video_path])
    
    # Construct a scene manager and add the detector
    scene_manager = SceneManager()
    scene_manager.add_detector(ContentDetector(threshold=threshold))
    
    # Improve processing speed by downscaling (optional)
    video_manager.set_downscale_factor()
    
    # Start the video manager and perform scene detection
    video_manager.start()
    scene_manager.detect_scenes(frame_source=video_manager)
    
    # Get list of detected scenes
    scene_list = scene_manager.get_scene_list()
    
    # Release resources
    video_manager.release()
    
    results = []
    for i, scene in enumerate(scene_list):
        start, end = scene
        results.append({
            "scene_id": i + 1,
            "start_time": start.get_seconds(),
            "end_time": end.get_seconds(),
            "start_frame": start.get_frames(),
            "end_frame": end.get_frames()
        })
        
    return results
