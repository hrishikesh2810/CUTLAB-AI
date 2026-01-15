"""
Video Editor API - Scene Detection Backend
==========================================
A FastAPI backend for video editing with OpenCV-based scene detection.

Author: Senior Backend Engineer
Version: 1.0.0
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os
import uuid
import shutil

# Import our modular components
from video_processor import VideoProcessor
from scene_detector import SceneDetector
from timeline_builder import TimelineBuilder

# =============================================================================
# APP CONFIGURATION
# =============================================================================

app = FastAPI(
    title="Video Editor API",
    description="Backend API for video editing with scene detection",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount uploads directory for serving video files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# In-memory storage for video metadata (use Redis/DB in production)
video_store: dict = {}

# =============================================================================
# API ENDPOINTS
# =============================================================================

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "Video Editor API", "version": "1.0.0"}


@app.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
    """
    Upload a video file for processing.
    
    - Accepts: MP4, MOV, AVI, MKV video files
    - Saves to: /uploads/{video_id}.{extension}
    - Returns: video_id, duration (seconds), fps
    
    Example Response:
    {
        "video_id": "abc123",
        "filename": "my_video.mp4",
        "duration": 120.5,
        "fps": 30.0,
        "width": 1920,
        "height": 1080
    }
    """
    # Validate file type
    allowed_extensions = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Generate unique video ID
    video_id = str(uuid.uuid4())[:8]
    
    # Save file to uploads directory
    file_path = os.path.join(UPLOAD_DIR, f"{video_id}{file_ext}")
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Extract video metadata using OpenCV
    processor = VideoProcessor(file_path)
    metadata = processor.get_metadata()
    
    if not metadata:
        # Clean up on failure
        os.remove(file_path)
        raise HTTPException(status_code=400, detail="Failed to read video file")
    
    # Store video info for later use
    video_store[video_id] = {
        "path": file_path,
        "filename": file.filename,
        "scenes": None,  # Populated after scene detection
        **metadata
    }
    
    return JSONResponse({
        "video_id": video_id,
        "filename": file.filename,
        "duration": metadata["duration"],
        "fps": metadata["fps"],
        "width": metadata["width"],
        "height": metadata["height"]
    })


@app.get("/scene-detect/{video_id}")
async def detect_scenes(
    video_id: str, 
    threshold: float = 27.0,
    min_scene_length: float = 0.6,
    method: str = "content",
    preset: str = None
):
    """
    Perform precise scene detection on an uploaded video using PySceneDetect.
    
    Parameters:
    - video_id: The ID returned from /upload-video
    - threshold: Detection sensitivity (lower = more scenes). Default: 27.0
    - min_scene_length: Minimum scene duration in seconds. Default: 0.6
    - method: "content" (standard) or "adaptive" (better for fast motion/shake)
    - preset: Optional preset ("music_video", "narrative", "documentary", "vlog")
    
    Presets override other parameters:
    - music_video: Sensitive (threshold=20.0, min=0.3s)
    - narrative: Standard (threshold=27.0, min=1.0s)  
    - documentary: Stable (threshold=32.0, min=2.0s, adaptive)
    - vlog: Balanced (threshold=30.0, min=0.8s, adaptive)
    """
    from scene_detector import DetectionConfig
    
    # Validate video exists
    if video_id not in video_store:
        raise HTTPException(status_code=404, detail=f"Video not found: {video_id}")
    
    video_info = video_store[video_id]
    video_path = video_info["path"]
    
    # Apply preset if specified
    config = DetectionConfig()
    
    if preset == "music_video":
        config.threshold = 20.0
        config.min_scene_length = 0.3
        config.method = "content"
    elif preset == "narrative":
        config.threshold = 27.0
        config.min_scene_length = 1.0
        config.method = "content"
    elif preset == "documentary":
        config.threshold = 32.0
        config.min_scene_length = 2.0
        config.method = "adaptive"
    elif preset == "vlog":
        config.threshold = 30.0
        config.min_scene_length = 0.8
        config.method = "adaptive"
    else:
        # Use provided parameters
        config.threshold = threshold
        config.min_scene_length = min_scene_length
        config.method = method
    
    # Perform scene detection
    detector = SceneDetector(video_path, config)
    scenes = detector.detect_scenes()
    
    # Cache results
    video_store[video_id]["scenes"] = scenes
    
    return JSONResponse({
        "video_id": video_id,
        "scene_count": len(scenes),
        "config": {
            "threshold": config.threshold,
            "min_scene_length": config.min_scene_length,
            "method": config.method,
            "preset": preset
        },
        "scenes": scenes
    })


@app.get("/timeline/{video_id}")
async def get_timeline(video_id: str):
    """
    Convert detected scenes into timeline clip objects.
    
    Each clip includes:
    - clip_id: Unique identifier (UUID)
    - start: Start time in seconds
    - end: End time in seconds  
    - track: Track number (default: 1)
    - duration: Clip duration in seconds
    
    Returns:
    {
        "clips": [
            {
                "clip_id": "a1b2c3d4",
                "start": 0.0,
                "end": 3.42,
                "duration": 3.42,
                "track": 1
            }
        ],
        "total_duration": 120.5
    }
    """
    # Validate video exists
    if video_id not in video_store:
        raise HTTPException(status_code=404, detail=f"Video not found: {video_id}")
    
    video_info = video_store[video_id]
    
    # Check if scenes have been detected
    if video_info["scenes"] is None:
        raise HTTPException(
            status_code=400, 
            detail="Scenes not detected yet. Call /scene-detect/{video_id} first."
        )
    
    # Build timeline from scenes
    builder = TimelineBuilder()
    timeline = builder.build_from_scenes(video_info["scenes"])
    
    return JSONResponse({
        "video_id": video_id,
        "clips": timeline["clips"],
        "total_duration": video_info["duration"]
    })


@app.get("/videos")
async def list_videos():
    """List all uploaded videos."""
    videos = []
    for video_id, info in video_store.items():
        videos.append({
            "video_id": video_id,
            "filename": info["filename"],
            "duration": info["duration"],
            "has_scenes": info["scenes"] is not None
        })
    return JSONResponse({"videos": videos, "count": len(videos)})


@app.delete("/video/{video_id}")
async def delete_video(video_id: str):
    """Delete an uploaded video."""
    if video_id not in video_store:
        raise HTTPException(status_code=404, detail=f"Video not found: {video_id}")
    
    # Remove file
    try:
        os.remove(video_store[video_id]["path"])
    except:
        pass
    
    # Remove from store
    del video_store[video_id]
    
    return JSONResponse({"status": "deleted", "video_id": video_id})


# =============================================================================
# RUN SERVER
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
