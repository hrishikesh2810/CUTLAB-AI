# Smart Human Effects backend using MediaPipe

"""
Backend service that analyses a video with MediaPipe to extract human‑related metadata.
Provides two FastAPI endpoints:
  * POST /ai/mediapipe/analyze   – returns per‑segment face detection, bounding box, motion score, etc.
  * POST /ai/mediapipe/effects-preview – returns supported effect names and required parameters (no rendering).

The service is deliberately lightweight: it only extracts metadata; the frontend decides how to apply visual effects.
"""

import os
import json
import cv2
import numpy as np
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# MediaPipe imports – they are optional until the user installs the package.
try:
    import mediapipe as mp
except ImportError as e:
    raise ImportError("mediapipe is required for Smart Human Effects. Install with 'pip install mediapipe'.")

router = APIRouter(prefix="/ai/mediapipe", tags=["MediaPipe"])

# ---------------------------------------------------------------------------
# Pydantic request models
# ---------------------------------------------------------------------------
class AnalyzeRequest(BaseModel):
    video_id: str
    frame_interval: int = 5  # process every N frames (default 5)
    segment_duration: float = 1.0  # seconds per output segment

class EffectsPreviewRequest(BaseModel):
    video_id: str
    selected_effect: str

# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------
def _get_video_path(video_id: str) -> str:
    """Helper to find video file path for a project."""
    import os
    video_dir = "storage/videos"
    if not os.path.exists(video_dir):
        return None
        
    for f in os.listdir(video_dir):
        if f.startswith(video_id):
            return os.path.join(video_dir, f)
    return None

def _extract_face_bbox(face_detection_result, image_width: int, image_height: int) -> Dict[str, float]:
    """Convert MediaPipe normalized bounding box to a dict with normalized coordinates.
    Returns {x, y, w, h} where (x, y) is the top‑left corner.
    """
    if not face_detection_result:
        return {"x": 0, "y": 0, "w": 0, "h": 0}
    # MediaPipe returns a list of detections – we take the first one.
    detection = face_detection_result[0]
    bbox = detection.location_data.relative_bounding_box
    return {
        "x": max(0.0, min(1.0, bbox.x_center - bbox.width / 2)),
        "y": max(0.0, min(1.0, bbox.y_center - bbox.height / 2)),
        "w": max(0.0, min(1.0, bbox.width)),
        "h": max(0.0, min(1.0, bbox.height)),
    }

def _compute_motion_score(prev_frame: np.ndarray, cur_frame: np.ndarray) -> float:
    """Simple motion intensity based on absolute pixel difference.
    Returns a value in [0, 1] after normalising by the maximum possible diff.
    """
    if prev_frame is None:
        return 0.0
    diff = cv2.absdiff(prev_frame, cur_frame)
    # Normalise by 255 * number of channels * pixels
    max_diff = 255 * diff.shape[0] * diff.shape[1] * diff.shape[2]
    score = diff.sum() / max_diff
    return float(score)

# ---------------------------------------------------------------------------
# Core analysis routine
# ---------------------------------------------------------------------------
def analyze_video(video_path: str, frame_interval: int = 5, segment_duration: float = 1.0) -> List[Dict[str, Any]]:
    """Process a video with MediaPipe and return a list of segment dictionaries.
    Each segment aggregates per‑frame data (face presence, bbox, motion) over the
    specified segment_duration (seconds). The function is deliberately lightweight –
    it does not write any files, only returns JSON‑compatible data.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Unable to open video file: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_idx = 0
    prev_gray = None

    # MediaPipe solutions – we initialise once and reuse.
    face_detector = mp.solutions.face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.5)
    pose_estimator = mp.solutions.pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)
    selfie_seg = mp.solutions.selfie_segmentation.SelfieSegmentation(model_selection=1)

    segments: List[Dict[str, Any]] = []
    # Temporary accumulators for the current segment
    seg_start_time = 0.0
    seg_data: List[Dict[str, Any]] = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1
        if frame_idx % frame_interval != 0:
            continue
        timestamp = frame_idx / fps

        # Convert to RGB for MediaPipe
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        # Face detection
        face_results = face_detector.process(rgb)
        face_present = bool(face_results.detections)
        face_box = _extract_face_bbox(face_results.detections, frame.shape[1], frame.shape[0]) if face_present else {"x": 0, "y": 0, "w": 0, "h": 0}
        # Pose (we only need landmarks count for now)
        pose_results = pose_estimator.process(rgb)
        # Motion score
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        motion_score = _compute_motion_score(prev_gray, gray)
        prev_gray = gray

        seg_data.append({
            "timestamp": timestamp,
            "face_present": face_present,
            "face_box": face_box,
            "motion_score": motion_score,
        })

        # If we have crossed the segment boundary, aggregate.
        if timestamp - seg_start_time >= segment_duration:
            # Aggregate booleans and numeric values.
            face_detected = any(d["face_present"] for d in seg_data)
            # Average motion score
            avg_motion = sum(d["motion_score"] for d in seg_data) / len(seg_data)
            # Use the first face box where a face was detected (fallback to zeros)
            first_face = next((d["face_box"] for d in seg_data if d["face_present"]), {"x": 0, "y": 0, "w": 0, "h": 0})
            segments.append({
                "start": round(seg_start_time, 3),
                "end": round(seg_start_time + segment_duration, 3),
                "face_detected": face_detected,
                "motion_score": round(avg_motion, 3),
                "face_box": first_face,
            })
            # Reset for next segment
            seg_start_time += segment_duration
            seg_data = []

    # Flush any remaining data as a final (possibly shorter) segment
    if seg_data:
        face_detected = any(d["face_present"] for d in seg_data)
        avg_motion = sum(d["motion_score"] for d in seg_data) / len(seg_data)
        first_face = next((d["face_box"] for d in seg_data if d["face_present"]), {"x": 0, "y": 0, "w": 0, "h": 0})
        segments.append({
            "start": round(seg_start_time, 3),
            "end": round(seg_start_time + segment_duration, 3),
            "face_detected": face_detected,
            "motion_score": round(avg_motion, 3),
            "face_box": first_face,
        })

    cap.release()
    return segments

# ---------------------------------------------------------------------------
# FastAPI routes
# ---------------------------------------------------------------------------
@router.post("/analyze")
async def mediapipe_analyze(req: AnalyzeRequest):
    video_path = _get_video_path(req.video_id)
    try:
        segments = analyze_video(video_path, req.frame_interval, req.segment_duration)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"segments": segments}

@router.post("/effects-preview")
async def mediapipe_effects_preview(req: EffectsPreviewRequest):
    # This endpoint does **not** render anything – it merely validates the request
    # and returns the list of supported effect names with a short description.
    supported = [
        {"name": "Face Focus", "description": "Zoom & brighten when a face is present"},
        {"name": "Auto Reframe", "description": "Keeps the face centered for vertical shorts"},
        {"name": "Background Soft Blur", "description": "Blurs background using selfie segmentation"},
        {"name": "Motion Emphasis", "description": "Boost contrast during high‑motion segments"},
    ]
    if req.selected_effect not in [e["name"] for e in supported]:
        raise HTTPException(status_code=400, detail="Unsupported effect")
    return {"selected_effect": req.selected_effect, "supported": supported}

# Export the router so the main FastAPI app can include it.
__all__ = ["router"]
