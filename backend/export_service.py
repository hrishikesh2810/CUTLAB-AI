import os
import subprocess
import json
import uuid
import threading
import time
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

router = APIRouter(prefix="/export", tags=["Export"])

# In-memory storage for export status
# In a production app, this would be in Redis or DB
export_tasks: Dict[str, Dict[str, Any]] = {}

# Ensure export directories exist
OUTPUT_DIR = "storage/exports"
REPORTS_DIR = "storage/reports"
DATA_DIR = "storage/data"
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

class ExportRequest(BaseModel):
    video_id: str
    editor_state: Dict[str, Any]
    export_settings: Dict[str, Any]

class StatusResponse(BaseModel):
    status: str
    progress: float
    download_url: str = None
    error: str = None

def get_video_path(project_id: str) -> str:
    """Helper to find video file path for a project."""
    # This mirrors the logic in main.py
    video_dir = "storage/videos"
    if not os.path.exists(video_dir):
        return None
    for f in os.listdir(video_dir):
        if f.startswith(project_id):
            return os.path.join(video_dir, f)
    return None

def build_ffmpeg_filtergraph(filters: Dict[str, Any], ai_effects: Dict[str, Any], captions: List[Any], ai_metadata: List[Any]) -> str:
    """
    Constructs an FFmpeg complex filter string based on editor state.
    """
    filter_chains = []
    
    # 1. Base Filters (Color Correction)
    # Mapping our percentages (0-200) to FFmpeg eq parameters
    # brightness: -1 to 1 (default 0)
    # contrast: 0 to 10 (default 1)
    # saturation: 0 to 10 (default 1)
    
    b = (filters.get('brightness', 100) - 100) / 100.0
    c = filters.get('contrast', 100) / 100.0
    s = filters.get('saturation', 100) / 100.0
    
    filter_chains.append(f"eq=brightness={b}:contrast={c}:saturation={s}")
    
    # Hue Rotate
    h = filters.get('hueRotate', 0)
    if h != 0:
        filter_chains.append(f"hue=h={h}")
        
    # Grayscale
    g = filters.get('grayscale', 0)
    if g > 0:
        # Interpolate between normal and gray
        filter_chains.append(f"hue=s={1.0 - (g/100.0)}")
        
    # Sepia (Manual color matrix for sepia)
    sepia = filters.get('sepia', 0)
    if sepia > 0:
        # FFmpeg sepia lookup would be better, but we use colorchannelmixer
        # Weights for sepia:
        # R = .393R + .769G + .189B
        # G = .349R + .686G + .168B
        # B = .272R + .534G + .131B
        w = sepia / 100.0
        r = f"{1-w + 0.393*w}:{0.769*w}:{0.189*w}"
        g_ch = f"{0.349*w}:{1-w + 0.686*w}:{0.168*w}"
        b_ch = f"{0.272*w}:{0.534*w}:{1-w + 0.131*w}"
        filter_chains.append(f"colorchannelmixer={r}:0:{g_ch}:0:{b_ch}")
        
    # Blur
    blur = filters.get('blur', 0)
    if blur > 0:
        filter_chains.append(f"boxblur={blur}")

    # TODO: Add dynamic AI effects (zoom/crop) based on ai_metadata
    # This requires a more complex script-based filter or multiple passes
    # For now, we apply static filters.

    return ",".join(filter_chains)

def run_video_export(export_id: str, video_id: str, editor_state: Dict[str, Any], settings: Dict[str, Any]):
    """Background task for FFmpeg rendering."""
    try:
        export_tasks[export_id]["progress"] = 10
        input_path = get_video_path(video_id)
        if not input_path:
            raise Exception("Input video not found")
            
        output_filename = f"{export_id}.mp4"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        
        # Prepare filters
        filters = editor_state.get("filters", {})
        smart_effects = editor_state.get("smartHumanEffects", {})
        captions = editor_state.get("captions", [])
        
        # Get timeline clips
        clips = editor_state.get("clips", [])
        if not clips:
            # Fallback if no timeline: use the whole video
            clips = [{"start": 0, "end": 100, "in_point": 0, "out_point": -1}] # Simple placeholder

        # Build FFmpeg command for concatenation and trimming
        # Example for one clip: ffmpeg -ss IN -t DUR -i INPUT -vf FILTERS OUTPUT
        
        # Since we might have multiple clips, we'll use a filter_complex or a concat file
        # A simpler way for a "pro" version is to build an complex filtergraph with multiple inputs
        
        # For this MVP, let's handle the single video file case with trims
        # If there are multiple clips, we'd need to loop and build inputs
        
        filter_str = build_ffmpeg_filtergraph(filters, smart_effects, captions, [])
        
        # Resolution
        res = settings.get("resolution", "720p")
        
        # Parse resolution string to determine target height
        # Format "720p (HD)" -> 720
        target_height = 720
        if "480p" in res:
            target_height = 480
        elif "1080p" in res:
            target_height = 1080
        
        if "Original" in res:
            scale_filter = "scale=-1:-1"
        else:
            # Use scale=-2:h to maintain aspect ratio and ensure divisible by 2 for encoding
            scale_filter = f"scale=-2:{target_height}"
            
        if filter_str:
            final_vf = f"{filter_str},{scale_filter}"
        else:
            final_vf = scale_filter

        # Burn Captions
        # Create a temporary SRT file
        srt_path = os.path.join(OUTPUT_DIR, f"{export_id}.srt")
        if captions:
            with open(srt_path, "w") as f:
                for i, cap in enumerate(captions):
                    f.write(f"{i+1}\n")
                    # Format time 00:00:00,000
                    def fmt(s):
                        h = int(s // 3600)
                        m = int((s % 3600) // 60)
                        sec = int(s % 60)
                        ms = int((s % 1) * 1000)
                        return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"
                    f.write(f"{fmt(cap['start'])} --> {fmt(cap['end'])}\n")
                    f.write(f"{cap['text']}\n\n")
            
            # Add subtitles filter
            # Note: FFmpeg subtitles filter needs absolute path or relative to current dir
            # On Mac/Linux, we need to escape colons in the path
            safe_srt = srt_path.replace(":", "\\:")
            final_vf += f",subtitles='{safe_srt}'"

        export_tasks[export_id]["progress"] = 30
        
        # Run FFmpeg
        # We'll use a single input and just trim for now as a baseline
        # Professional multi-clip concat would use -f concat but this is harder to apply filters per clip
        
        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-vf", final_vf,
            "-c:v", "libx264", "-preset", "medium", "-crf", "23",
            "-c:a", "aac", "-b:a", "128k",
            output_path
        ]
        
        # Execute
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True)
        
        # Monitor progress (rough estimate)
        for line in process.stdout:
            # Parse 'time=' from ffmpeg output to update progress if possible
            # For now, just step through
            pass
            
        process.wait()
        
        if process.returncode != 0:
            raise Exception(f"FFmpeg failed with code {process.returncode}")

        export_tasks[export_id]["status"] = "completed"
        export_tasks[export_id]["progress"] = 100
        export_tasks[export_id]["download_url"] = f"/export/download/{output_filename}"
        
        # Cleanup SRT
        if os.path.exists(srt_path):
            os.remove(srt_path)
            
    except Exception as e:
        print(f"Export failed: {e}")
        export_tasks[export_id]["status"] = "failed"
        export_tasks[export_id]["error"] = str(e)

@router.post("/video")
async def export_video(req: ExportRequest, background_tasks: BackgroundTasks):
    export_id = str(uuid.uuid4())
    export_tasks[export_id] = {
        "status": "processing",
        "progress": 0,
        "type": "video"
    }
    background_tasks.add_task(run_video_export, export_id, req.video_id, req.editor_state, req.export_settings)
    return {"export_id": export_id}

@router.post("/report")
async def export_report(req: ExportRequest):
    export_id = str(uuid.uuid4())
    filename = f"report_{export_id}.pdf"
    filepath = os.path.join(REPORTS_DIR, filename)
    
    try:
        doc = SimpleDocTemplate(filepath, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []
        
        # Title
        elements.append(Paragraph(f"Project Report: {req.video_id}", styles['Title']))
        elements.append(Spacer(1, 12))
        
        # Overview
        elements.append(Paragraph("Project Overview", styles['Heading2']))
        data = [
            ["Item", "Value"],
            ["Video ID", req.video_id],
            ["Clips Count", str(len(req.editor_state.get('clips', [])))],
            ["Captions Count", str(len(req.editor_state.get('captions', [])))],
            ["Export Date", time.ctime()]
        ]
        t = Table(data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(t)
        elements.append(Spacer(1, 12))
        
        # Filters
        elements.append(Paragraph("Applied Filters", styles['Heading2']))
        filters = req.editor_state.get('filters', {})
        filter_data = [[k, v] for k, v in filters.items()]
        if filter_data:
            tf = Table(filter_data)
            tf.setStyle(TableStyle([('GRID', (0, 0), (-1, -1), 0.5, colors.grey)]))
            elements.append(tf)
        else:
            elements.append(Paragraph("No filters applied.", styles['Normal']))
        elements.append(Spacer(1, 12))

        # AI Insights
        elements.append(Paragraph("AI Recommendations & Insights", styles['Heading2']))
        suggestions = req.editor_state.get('suggestions', [])
        if suggestions:
            for s in suggestions:
                elements.append(Paragraph(f"- {s.get('type', 'CUT')}: {s.get('reason', 'N/A')}", styles['Normal']))
        else:
            elements.append(Paragraph("No AI recommendations used.", styles['Normal']))
            
        doc.build(elements)
        
        return {
            "status": "completed",
            "download_url": f"/export/download_report/{filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/data")
async def export_data(req: ExportRequest):
    export_id = str(uuid.uuid4())
    filename = f"data_{export_id}.json"
    filepath = os.path.join(DATA_DIR, filename)
    
    try:
        # Full source of truth
        export_payload = {
            "project_metadata": {
                "video_id": req.video_id,
                "exported_at": time.ctime(),
                "version": "1.0.0"
            },
            "editor_state": req.editor_state,
            "export_settings": req.export_settings
        }
        
        with open(filepath, "w") as f:
            json.dump(export_payload, f, indent=2)
            
        return {
            "status": "completed",
            "download_url": f"/export/download_data/{filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{export_id}")
async def get_status(export_id: str):
    if export_id not in export_tasks:
        raise HTTPException(status_code=404, detail="Export task not found")
    return export_tasks[export_id]

@router.get("/download/{filename}")
async def download_file(filename: str):
    path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(path):
        return FileResponse(path, media_type="video/mp4", filename="exported_video.mp4")
    raise HTTPException(status_code=404, detail="File not found")

@router.get("/download_report/{filename}")
async def download_report(filename: str):
    path = os.path.join(REPORTS_DIR, filename)
    if os.path.exists(path):
        return FileResponse(path, media_type="application/pdf", filename="project_report.pdf")
    raise HTTPException(status_code=404, detail="File not found")

@router.get("/download_data/{filename}")
async def download_data(filename: str):
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        return FileResponse(path, media_type="application/json", filename="project_data.json")
    raise HTTPException(status_code=404, detail="File not found")
