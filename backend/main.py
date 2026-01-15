from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Query
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import shutil
import os
import sys
from typing import Optional, List

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from storage import db
from video_utils import metadata
from ai_engine import scene_detection
from ai_engine import cut_suggester
from ai_engine import timeline_builder

app = FastAPI(title="CUTLAB AI Backend")

# Add CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB
db.init_db()
os.makedirs("storage/videos", exist_ok=True)

def get_video_path(project_id: str) -> str:
    """Helper to find video file path for a project."""
    video_dir = "storage/videos"
    for f in os.listdir(video_dir):
        if f.startswith(project_id):
            return os.path.join(video_dir, f)
    return None

@app.get("/projects")
async def list_projects(db_session: Session = Depends(db.get_db)):
    """List all available projects."""
    try:
        projects = db_session.query(db.VideoMetadata).all()
        return {
            "status": "success",
            "count": len(projects),
            "projects": [
                {
                    "project_id": p.project_id,
                    "filename": p.filename,
                    "duration": p.duration,
                    "fps": p.fps,
                    "width": p.width,
                    "height": p.height,
                    "has_audio": p.has_audio
                }
                for p in projects
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/project/{project_id}")
async def get_project(project_id: str, db_session: Session = Depends(db.get_db)):
    """Get full project data including scenes and suggestions."""
    try:
        # Get video metadata
        video_record = db_session.query(db.VideoMetadata).filter(
            db.VideoMetadata.project_id == project_id
        ).first()
        
        if not video_record:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get scenes
        db_scenes = db_session.query(db.VideoScene).filter(
            db.VideoScene.project_id == project_id
        ).order_by(db.VideoScene.start_time).all()
        
        # Get suggestions
        db_suggestions = db_session.query(db.CutSuggestion).filter(
            db.CutSuggestion.project_id == project_id
        ).all()
        
        # Build response
        scenes = [
            {
                "scene_id": i + 1,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "start_frame": s.start_frame,
                "end_frame": s.end_frame
            }
            for i, s in enumerate(db_scenes)
        ]
        
        suggestions = [
            {
                "scene_id": s.scene_id,
                "cut_start": f"{int(s.start_time//3600):02d}:{int((s.start_time%3600)//60):02d}:{int(s.start_time%60):02d}.{int((s.start_time%1)*1000):03d}",
                "cut_end": f"{int(s.end_time//3600):02d}:{int((s.end_time%3600)//60):02d}:{int(s.end_time%60):02d}.{int((s.end_time%1)*1000):03d}",
                "start_seconds": s.start_time,
                "end_seconds": s.end_time,
                "confidence": s.confidence,
                "suggestion_type": s.suggestion_type,
                "reason": s.reason,
                "audio_label": s.audio_label or "Unknown",
                "metrics": {
                    "motion_intensity": s.motion_intensity,
                    "silence_level": s.silence_level,
                    "audio_energy": s.audio_energy or 0.5,
                    "has_faces": s.has_faces,
                    "repetitiveness": s.repetitiveness,
                    "duration": s.end_time - s.start_time,
                    "has_audio_peaks": False,
                    "peak_count": 0
                }
            }
            for s in db_suggestions
        ]
        
        return {
            "status": "success",
            "project_id": project_id,
            "metadata": {
                "filename": video_record.filename,
                "duration": video_record.duration,
                "fps": video_record.fps,
                "width": video_record.width,
                "height": video_record.height,
                "has_audio": video_record.has_audio
            },
            "scenes": scenes,
            "suggestions": suggestions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/video/{project_id}")
async def stream_video(project_id: str):
    """Stream video file for the editor."""
    from fastapi.responses import FileResponse
    
    video_path = get_video_path(project_id)
    
    if not video_path or not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    # Determine media type
    ext = os.path.splitext(video_path)[1].lower()
    media_types = {
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.webm': 'video/webm',
        '.mkv': 'video/x-matroska',
    }
    media_type = media_types.get(ext, 'video/mp4')
    
    return FileResponse(
        video_path,
        media_type=media_type,
        filename=os.path.basename(video_path)
    )

@app.post("/upload-video")
async def upload_video(file: UploadFile = File(...), db_session: Session = Depends(db.get_db)):
    try:
        project_id = metadata.generate_project_id()
        file_extension = os.path.splitext(file.filename)[1]
        safe_filename = f"{project_id}{file_extension}"
        file_path = f"storage/videos/{safe_filename}"

        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Extract metadata
        try:
            meta = metadata.extract_metadata(file_path)
        except Exception as e:
            try:
                os.remove(file_path)
            except:
                pass
            raise HTTPException(status_code=400, detail=f"Failed to process video: {str(e)}")

        # Save to DB
        db_item = db.VideoMetadata(
            project_id=project_id,
            filename=file.filename,
            duration=meta["duration"],
            fps=meta["fps"],
            width=meta["width"],
            height=meta["height"],
            has_audio=meta["has_audio"]
        )
        db_session.add(db_item)
        db_session.commit()
        db_session.refresh(db_item)

        return {
            "status": "success",
            "project_id": project_id,
            "metadata": meta,
            "message": "Video uploaded and processed successfully"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-scenes/{project_id}")
async def analyze_scenes(project_id: str, db_session: Session = Depends(db.get_db)):
    try:
        # Check if project exists
        video_record = db_session.query(db.VideoMetadata).filter(db.VideoMetadata.project_id == project_id).first()
        if not video_record:
            raise HTTPException(status_code=404, detail="Project not found")
        
        video_path = get_video_path(project_id)
        if not video_path:
            raise HTTPException(status_code=404, detail="Video file not found on disk")

        # Run scene detection
        scenes = scene_detection.detect_scenes(video_path)
        
        # Clear existing scenes
        db_session.query(db.VideoScene).filter(db.VideoScene.project_id == project_id).delete()
        
        for s in scenes:
            scene_item = db.VideoScene(
                project_id=project_id,
                start_time=s["start_time"],
                end_time=s["end_time"],
                start_frame=s["start_frame"],
                end_frame=s["end_frame"]
            )
            db_session.add(scene_item)
        
        db_session.commit()
        
        return {
            "status": "success",
            "project_id": project_id,
            "scene_count": len(scenes),
            "scenes": scenes
        }

    except Exception as e:
        db_session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/suggest-cuts/{project_id}")
async def suggest_cuts(project_id: str, db_session: Session = Depends(db.get_db)):
    try:
        # Check if project exists
        video_record = db_session.query(db.VideoMetadata).filter(db.VideoMetadata.project_id == project_id).first()
        if not video_record:
            raise HTTPException(status_code=404, detail="Project not found")
        
        video_path = get_video_path(project_id)
        if not video_path:
            raise HTTPException(status_code=404, detail="Video file not found on disk")
        
        # Get scenes from DB
        db_scenes = db_session.query(db.VideoScene).filter(db.VideoScene.project_id == project_id).all()
        
        if not db_scenes:
            raise HTTPException(status_code=400, detail="No scenes detected. Please run scene detection first.")
        
        # Convert to dict format
        scenes = [
            {
                "scene_id": i + 1,
                "start_time": s.start_time,
                "end_time": s.end_time
            }
            for i, s in enumerate(db_scenes)
        ]
        
        # Run cut suggestion engine
        suggestions = cut_suggester.suggest_cuts(video_path, scenes, video_record.duration)
        
        # Clear existing suggestions
        db_session.query(db.CutSuggestion).filter(db.CutSuggestion.project_id == project_id).delete()
        
        # Save suggestions to DB
        for s in suggestions:
            suggestion_item = db.CutSuggestion(
                project_id=project_id,
                scene_id=s["scene_id"],
                start_time=s["start_seconds"],
                end_time=s["end_seconds"],
                confidence=s["confidence"],
                suggestion_type=s["suggestion_type"],
                reason=s["reason"],
                motion_intensity=s["metrics"]["motion_intensity"],
                silence_level=s["metrics"]["silence_level"],
                audio_energy=s["metrics"].get("audio_energy", 0.5),
                audio_label=s.get("audio_label", "Unknown"),
                has_faces=s["metrics"]["has_faces"],
                repetitiveness=s["metrics"]["repetitiveness"]
            )
            db_session.add(suggestion_item)
        
        db_session.commit()
        
        return {
            "status": "success",
            "project_id": project_id,
            "suggestion_count": len(suggestions),
            "suggestions": suggestions
        }

    except Exception as e:
        db_session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/export-timeline/{project_id}")
async def export_timeline(
    project_id: str,
    format: str = Query("json", description="Export format: 'json' or 'xml'"),
    accepted_ids: Optional[str] = Query(None, description="Comma-separated list of accepted scene IDs"),
    db_session: Session = Depends(db.get_db)
):
    """
    Export timeline in JSON or XML format.
    
    - format: 'json' or 'xml'
    - accepted_ids: Optional comma-separated scene IDs to include (if None, all are included)
    """
    try:
        # Get video metadata
        video_record = db_session.query(db.VideoMetadata).filter(
            db.VideoMetadata.project_id == project_id
        ).first()
        
        if not video_record:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get scenes
        db_scenes = db_session.query(db.VideoScene).filter(
            db.VideoScene.project_id == project_id
        ).order_by(db.VideoScene.start_time).all()
        
        if not db_scenes:
            raise HTTPException(status_code=400, detail="No scenes detected. Run scene detection first.")
        
        # Get suggestions
        db_suggestions = db_session.query(db.CutSuggestion).filter(
            db.CutSuggestion.project_id == project_id
        ).all()
        
        # Parse accepted IDs
        parsed_accepted_ids = None
        if accepted_ids:
            try:
                parsed_accepted_ids = [int(x.strip()) for x in accepted_ids.split(",")]
            except:
                raise HTTPException(status_code=400, detail="Invalid accepted_ids format")
        
        # Build video metadata dict
        video_meta = {
            "filename": video_record.filename,
            "duration": video_record.duration,
            "fps": video_record.fps,
            "width": video_record.width,
            "height": video_record.height,
            "has_audio": video_record.has_audio
        }
        
        # Build scenes list
        scenes = [
            {
                "scene_id": i + 1,
                "start_time": s.start_time,
                "end_time": s.end_time
            }
            for i, s in enumerate(db_scenes)
        ]
        
        # Build suggestions list
        suggestions = [
            {
                "scene_id": s.scene_id,
                "start_seconds": s.start_time,
                "end_seconds": s.end_time,
                "confidence": s.confidence,
                "suggestion_type": s.suggestion_type,
                "reason": s.reason,
                "audio_label": s.audio_label or "Unknown",
                "metrics": {
                    "motion_intensity": s.motion_intensity,
                    "silence_level": s.silence_level,
                    "audio_energy": s.audio_energy or 0.5,
                    "has_faces": s.has_faces,
                    "repetitiveness": s.repetitiveness,
                    "duration": s.end_time - s.start_time,
                    "has_audio_peaks": False  # Not stored in DB currently
                }
            }
            for s in db_suggestions
        ]
        
        # Build and export timeline
        export_content = timeline_builder.build_timeline(
            project_id=project_id,
            video_metadata=video_meta,
            scenes=scenes,
            suggestions=suggestions,
            accepted_ids=parsed_accepted_ids,
            export_format=format.lower()
        )
        
        # Set appropriate content type and filename
        if format.lower() == "xml":
            content_type = "application/xml"
            filename = f"cutlab_timeline_{project_id[:8]}.xml"
        else:
            content_type = "application/json"
            filename = f"cutlab_timeline_{project_id[:8]}.json"
        
        return Response(
            content=export_content,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# WORKSPACE TIMELINE ENDPOINTS
# ============================================================

from video_utils import timeline_manager
from pydantic import BaseModel

class ClipData(BaseModel):
    source_video: str
    source_filename: str = ""
    start_seconds: float
    end_seconds: float
    speed: float = 1.0
    label: str = ""

class ClipUpdate(BaseModel):
    start_seconds: Optional[float] = None
    end_seconds: Optional[float] = None
    speed: Optional[float] = None
    label: Optional[str] = None

@app.get("/workspace/{project_id}/timeline")
async def get_workspace_timeline(project_id: str):
    """Get the workspace timeline for a project."""
    try:
        manager = timeline_manager.get_timeline_manager(project_id)
        return {
            "status": "success",
            "timeline": manager.get_timeline_data()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/workspace/{project_id}/timeline/clip")
async def add_clip_to_timeline(project_id: str, clip: ClipData):
    """Add a clip to the workspace timeline."""
    try:
        manager = timeline_manager.get_timeline_manager(project_id)
        new_clip = manager.add_clip({
            "source_video": clip.source_video,
            "source_filename": clip.source_filename,
            "start_seconds": clip.start_seconds,
            "end_seconds": clip.end_seconds,
            "speed": clip.speed,
            "label": clip.label
        })
        return {
            "status": "success",
            "clip": new_clip,
            "timeline": manager.get_timeline_data()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/workspace/{project_id}/timeline/clip/{clip_id}")
async def update_timeline_clip(project_id: str, clip_id: str, updates: ClipUpdate):
    """Update a clip in the timeline."""
    try:
        manager = timeline_manager.get_timeline_manager(project_id)
        update_dict = {}
        if updates.start_seconds is not None:
            update_dict["start_seconds"] = updates.start_seconds
        if updates.end_seconds is not None:
            update_dict["end_seconds"] = updates.end_seconds
        if updates.speed is not None:
            update_dict["speed"] = updates.speed
        if updates.label is not None:
            update_dict["label"] = updates.label
        
        updated_clip = manager.update_clip(clip_id, update_dict)
        if updated_clip:
            return {
                "status": "success",
                "clip": updated_clip,
                "timeline": manager.get_timeline_data()
            }
        else:
            raise HTTPException(status_code=404, detail="Clip not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/workspace/{project_id}/timeline/clip/{clip_id}")
async def remove_clip_from_timeline(project_id: str, clip_id: str):
    """Remove a clip from the timeline."""
    try:
        manager = timeline_manager.get_timeline_manager(project_id)
        if manager.remove_clip(clip_id):
            return {
                "status": "success",
                "message": "Clip removed",
                "timeline": manager.get_timeline_data()
            }
        else:
            raise HTTPException(status_code=404, detail="Clip not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/workspace/{project_id}/timeline")
async def clear_workspace_timeline(project_id: str):
    """Clear all clips from the timeline."""
    try:
        manager = timeline_manager.get_timeline_manager(project_id)
        manager.clear_timeline()
        return {
            "status": "success",
            "message": "Timeline cleared",
            "timeline": manager.get_timeline_data()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/workspace/{project_id}/timeline/from-suggestions")
async def populate_timeline_from_suggestions(
    project_id: str,
    db_session: Session = Depends(db.get_db)
):
    """
    Populate timeline with clips based on cut suggestions.
    Creates clips for the parts that should be KEPT (inverse of cut suggestions).
    """
    try:
        # Get video metadata
        video_record = db_session.query(db.VideoMetadata).filter(
            db.VideoMetadata.project_id == project_id
        ).first()
        
        if not video_record:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get scenes
        db_scenes = db_session.query(db.VideoScene).filter(
            db.VideoScene.project_id == project_id
        ).order_by(db.VideoScene.start_time).all()
        
        # Get suggestions (parts to cut)
        db_suggestions = db_session.query(db.CutSuggestion).filter(
            db.CutSuggestion.project_id == project_id
        ).all()
        
        # Build set of scene IDs to cut
        scenes_to_cut = {s.scene_id for s in db_suggestions}
        
        # Create timeline with scenes to KEEP
        manager = timeline_manager.get_timeline_manager(project_id)
        manager.clear_timeline()
        
        for i, scene in enumerate(db_scenes):
            scene_id = i + 1
            if scene_id not in scenes_to_cut:
                manager.add_clip({
                    "source_video": project_id,
                    "source_filename": video_record.filename,
                    "start_seconds": scene.start_time,
                    "end_seconds": scene.end_time,
                    "speed": 1.0,
                    "label": f"Scene {scene_id}"
                })
        
        return {
            "status": "success",
            "message": f"Timeline populated with {len(manager.get_clips())} clips",
            "timeline": manager.get_timeline_data()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# EDITING TOOLS ENDPOINTS
# ============================================================

class SplitRequest(BaseModel):
    split_position: float  # Position in source video seconds

class TrimRequest(BaseModel):
    new_position: float  # New in/out point in source video seconds

class SpeedRequest(BaseModel):
    speed: float  # Playback speed (0.25 to 4.0)

@app.post("/workspace/{project_id}/timeline/clip/{clip_id}/split")
async def split_clip(project_id: str, clip_id: str, request: SplitRequest):
    """
    Split a clip at the given position.
    Creates two new clips from the original.
    """
    try:
        manager = timeline_manager.get_timeline_manager(project_id)
        result = manager.split_clip(clip_id, request.split_position)
        
        if result:
            return {
                "status": "success",
                "message": "Clip split successfully",
                "new_clips": result,
                "timeline": manager.get_timeline_data()
            }
        else:
            raise HTTPException(
                status_code=400, 
                detail="Failed to split clip. Ensure split position is within clip bounds."
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/workspace/{project_id}/timeline/clip/{clip_id}/trim-in")
async def trim_clip_in(project_id: str, clip_id: str, request: TrimRequest):
    """
    Trim the in-point (start) of a clip.
    """
    try:
        manager = timeline_manager.get_timeline_manager(project_id)
        result = manager.trim_in(clip_id, request.new_position)
        
        if result:
            return {
                "status": "success",
                "message": "Clip in-point trimmed",
                "clip": result,
                "timeline": manager.get_timeline_data()
            }
        else:
            raise HTTPException(
                status_code=400,
                detail="Failed to trim. New start must be before current end."
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/workspace/{project_id}/timeline/clip/{clip_id}/trim-out")
async def trim_clip_out(project_id: str, clip_id: str, request: TrimRequest):
    """
    Trim the out-point (end) of a clip.
    """
    try:
        manager = timeline_manager.get_timeline_manager(project_id)
        result = manager.trim_out(clip_id, request.new_position)
        
        if result:
            return {
                "status": "success",
                "message": "Clip out-point trimmed",
                "clip": result,
                "timeline": manager.get_timeline_data()
            }
        else:
            raise HTTPException(
                status_code=400,
                detail="Failed to trim. New end must be after current start."
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/workspace/{project_id}/timeline/clip/{clip_id}/speed")
async def set_clip_speed(project_id: str, clip_id: str, request: SpeedRequest):
    """
    Set the playback speed of a clip.
    Speed is clamped between 0.25x and 4.0x.
    """
    try:
        manager = timeline_manager.get_timeline_manager(project_id)
        result = manager.set_speed(clip_id, request.speed)
        
        if result:
            return {
                "status": "success",
                "message": f"Speed set to {result['speed']}x",
                "clip": result,
                "timeline": manager.get_timeline_data()
            }
        else:
            raise HTTPException(status_code=404, detail="Clip not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/workspace/{project_id}/timeline/clip/{clip_id}")
async def get_clip(project_id: str, clip_id: str):
    """Get a single clip by ID."""
    try:
        manager = timeline_manager.get_timeline_manager(project_id)
        clip = manager.get_clip(clip_id)
        
        if clip:
            return {
                "status": "success",
                "clip": clip
            }
        else:
            raise HTTPException(status_code=404, detail="Clip not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# TRANSITION ENDPOINTS
# ============================================================

class TransitionRequest(BaseModel):
    from_clip_id: str
    to_clip_id: str
    transition_type: str  # cut, cross-dissolve, fade-in, fade-out, fade-in-out
    duration: float = 1.0

@app.post("/workspace/{project_id}/timeline/transition")
async def set_transition(project_id: str, request: TransitionRequest):
    """
    Set a transition between two clips.
    """
    try:
        manager = timeline_manager.get_timeline_manager(project_id)
        result = manager.set_transition(
            request.from_clip_id,
            request.to_clip_id,
            request.transition_type,
            request.duration
        )
        
        if result:
            return {
                "status": "success",
                "message": f"Transition set: {request.transition_type}",
                "transition": result,
                "timeline": manager.get_timeline_data()
            }
        else:
            raise HTTPException(
                status_code=400,
                detail="Failed to set transition. Check clip IDs and transition type."
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/workspace/{project_id}/timeline/transitions")
async def get_transitions(project_id: str):
    """Get all transitions in the timeline."""
    try:
        manager = timeline_manager.get_timeline_manager(project_id)
        return {
            "status": "success",
            "transitions": manager.get_all_transitions(),
            "transition_types": manager.TRANSITION_TYPES
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/workspace/{project_id}/timeline/transition")
async def remove_transition(
    project_id: str,
    from_clip_id: str = Query(...),
    to_clip_id: str = Query(...)
):
    """Remove a transition between two clips."""
    try:
        manager = timeline_manager.get_timeline_manager(project_id)
        if manager.remove_transition(from_clip_id, to_clip_id):
            return {
                "status": "success",
                "message": "Transition removed",
                "timeline": manager.get_timeline_data()
            }
        else:
            raise HTTPException(status_code=404, detail="Transition not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/workspace/{project_id}/timeline/transitions/auto")
async def auto_generate_transitions(
    project_id: str,
    default_type: str = Query("cut", description="Default transition type")
):
    """Auto-generate transitions between all adjacent clips."""
    try:
        manager = timeline_manager.get_timeline_manager(project_id)
        generated = manager.auto_generate_transitions(default_type)
        return {
            "status": "success",
            "message": f"Generated {len(generated)} transitions",
            "generated": generated,
            "timeline": manager.get_timeline_data()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
