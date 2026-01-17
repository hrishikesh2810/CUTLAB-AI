import cv2
from moviepy.editor import VideoFileClip
import os
import uuid

def extract_metadata(file_path: str):
    """
    Extracts metadata from a video file.
    Returns a dictionary with:
    - duration (seconds)
    - fps
    - resolution (width, height)
    - has_audio (bool)
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    # Use OpenCV for video properties
    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        raise ValueError("Could not open video file with OpenCV")

    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    duration = 0.0
    if fps > 0:
        duration = frame_count / fps
    else:
        # Fallback to MoviePy for duration if OpenCV fails
        try:
            temp_clip = VideoFileClip(file_path)
            duration = temp_clip.duration
            temp_clip.close()
        except:
            pass

    
    cap.release()

    # Use MoviePy to check for audio
    has_audio = False
    try:
        clip = VideoFileClip(file_path)
        if clip.audio is not None:
            has_audio = True
        clip.close()
    except Exception as e:
        print(f"Warning: Could not check audio with MoviePy: {e}")

    return {
        "duration": duration,
        "fps": fps,
        "width": width,
        "height": height,
        "has_audio": has_audio
    }

def generate_project_id():
    return str(uuid.uuid4())
