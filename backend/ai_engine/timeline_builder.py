"""
Timeline Builder for CUTLAB AI
Creates non-destructive timeline exports from analysis results.
Supports JSON and XML formats for editor compatibility.
"""

import json
import xml.etree.ElementTree as ET
from xml.dom import minidom
from typing import List, Dict, Any, Optional
from datetime import datetime


def format_time_precise(seconds: float) -> str:
    """Convert seconds to HH:MM:SS.mmm format."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    milliseconds = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{milliseconds:03d}"


def format_time_frames(seconds: float, fps: float = 30.0) -> str:
    """Convert seconds to timecode format HH:MM:SS:FF (frames)."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    frames = int((seconds % 1) * fps)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}:{frames:02d}"


class TimelineBuilder:
    """Builds and exports non-destructive timeline data."""
    
    def __init__(self, project_id: str, video_metadata: Dict):
        self.project_id = project_id
        self.video_metadata = video_metadata
        self.scenes: List[Dict] = []
        self.suggestions: List[Dict] = []
        self.accepted_suggestions: List[Dict] = []
        self.audio_markers: List[Dict] = []
        
    def set_scenes(self, scenes: List[Dict]):
        """Set detected scenes."""
        self.scenes = scenes
        
    def set_suggestions(self, suggestions: List[Dict], accepted_ids: Optional[List[int]] = None):
        """
        Set cut suggestions.
        If accepted_ids provided, filter to only those.
        If None, all suggestions are considered accepted.
        """
        self.suggestions = suggestions
        if accepted_ids is None:
            self.accepted_suggestions = suggestions
        else:
            self.accepted_suggestions = [s for s in suggestions if s.get('scene_id') in accepted_ids]
    
    def set_audio_markers(self, markers: List[Dict]):
        """Set audio importance markers (peaks, silence regions)."""
        self.audio_markers = markers
    
    def build_timeline_data(self) -> Dict[str, Any]:
        """
        Build the complete timeline data structure.
        Returns a structured dict with all timeline information.
        """
        # Build timeline entries from suggestions
        timeline_entries = []
        
        for suggestion in self.accepted_suggestions:
            entry = {
                "id": suggestion.get('scene_id', 0),
                "start": format_time_precise(suggestion.get('start_seconds', 0)),
                "end": format_time_precise(suggestion.get('end_seconds', 0)),
                "start_seconds": suggestion.get('start_seconds', 0),
                "end_seconds": suggestion.get('end_seconds', 0),
                "duration_seconds": suggestion.get('metrics', {}).get('duration', 0),
                "action": suggestion.get('suggestion_type', 'CUT').lower(),
                "confidence": suggestion.get('confidence', 0),
                "reason": suggestion.get('reason', ''),
                "audio_label": suggestion.get('audio_label', 'Unknown'),
                "metrics": suggestion.get('metrics', {})
            }
            timeline_entries.append(entry)
        
        # Sort by start time
        timeline_entries.sort(key=lambda x: x['start_seconds'])
        
        # Build highlight markers (audio peaks, important moments)
        highlight_markers = []
        for scene in self.scenes:
            # Check if this scene has audio peaks
            scene_suggestions = [s for s in self.suggestions 
                               if s.get('scene_id') == scene.get('scene_id')]
            for sugg in scene_suggestions:
                if sugg.get('metrics', {}).get('has_audio_peaks'):
                    highlight_markers.append({
                        "timestamp": format_time_precise(sugg.get('start_seconds', 0)),
                        "timestamp_seconds": sugg.get('start_seconds', 0),
                        "type": "audio_peak",
                        "label": "Audio Peak Detected"
                    })
        
        return {
            "version": "1.0",
            "generated_at": datetime.now().isoformat(),
            "project_id": self.project_id,
            "source_video": {
                "filename": self.video_metadata.get('filename', 'unknown'),
                "duration": self.video_metadata.get('duration', 0),
                "duration_formatted": format_time_precise(self.video_metadata.get('duration', 0)),
                "fps": self.video_metadata.get('fps', 30),
                "resolution": f"{self.video_metadata.get('width', 0)}x{self.video_metadata.get('height', 0)}",
                "has_audio": self.video_metadata.get('has_audio', False)
            },
            "summary": {
                "total_scenes": len(self.scenes),
                "total_suggestions": len(self.suggestions),
                "accepted_suggestions": len(self.accepted_suggestions),
                "total_cut_time": sum(e['duration_seconds'] for e in timeline_entries)
            },
            "timeline": timeline_entries,
            "scenes": [
                {
                    "scene_id": s.get('scene_id', i + 1),
                    "start": format_time_precise(s.get('start_time', 0)),
                    "end": format_time_precise(s.get('end_time', 0)),
                    "start_seconds": s.get('start_time', 0),
                    "end_seconds": s.get('end_time', 0)
                }
                for i, s in enumerate(self.scenes)
            ],
            "highlight_markers": highlight_markers
        }
    
    def export_json(self, accepted_ids: Optional[List[int]] = None) -> str:
        """
        Export timeline as JSON string.
        """
        if accepted_ids is not None:
            self.accepted_suggestions = [s for s in self.suggestions if s.get('scene_id') in accepted_ids]
        
        timeline_data = self.build_timeline_data()
        return json.dumps(timeline_data, indent=2)
    
    def export_xml(self, accepted_ids: Optional[List[int]] = None) -> str:
        """
        Export timeline as XML string.
        Compatible with basic NLE import structures.
        """
        if accepted_ids is not None:
            self.accepted_suggestions = [s for s in self.suggestions if s.get('scene_id') in accepted_ids]
        
        timeline_data = self.build_timeline_data()
        fps = self.video_metadata.get('fps', 30)
        
        # Create root element
        root = ET.Element("cutlab_timeline")
        root.set("version", "1.0")
        root.set("generator", "CUTLAB AI")
        
        # Metadata
        meta = ET.SubElement(root, "metadata")
        ET.SubElement(meta, "project_id").text = self.project_id
        ET.SubElement(meta, "generated_at").text = timeline_data['generated_at']
        
        # Source
        source = ET.SubElement(root, "source")
        ET.SubElement(source, "filename").text = timeline_data['source_video']['filename']
        ET.SubElement(source, "duration").text = str(timeline_data['source_video']['duration'])
        ET.SubElement(source, "fps").text = str(fps)
        ET.SubElement(source, "width").text = str(self.video_metadata.get('width', 0))
        ET.SubElement(source, "height").text = str(self.video_metadata.get('height', 0))
        
        # Summary
        summary = ET.SubElement(root, "summary")
        ET.SubElement(summary, "total_scenes").text = str(timeline_data['summary']['total_scenes'])
        ET.SubElement(summary, "total_suggestions").text = str(timeline_data['summary']['total_suggestions'])
        ET.SubElement(summary, "accepted_suggestions").text = str(timeline_data['summary']['accepted_suggestions'])
        ET.SubElement(summary, "total_cut_time").text = f"{timeline_data['summary']['total_cut_time']:.3f}"
        
        # Timeline entries
        timeline = ET.SubElement(root, "timeline")
        for entry in timeline_data['timeline']:
            clip = ET.SubElement(timeline, "clip")
            clip.set("id", str(entry['id']))
            clip.set("action", entry['action'])
            
            ET.SubElement(clip, "in").text = format_time_frames(entry['start_seconds'], fps)
            ET.SubElement(clip, "out").text = format_time_frames(entry['end_seconds'], fps)
            ET.SubElement(clip, "in_seconds").text = f"{entry['start_seconds']:.3f}"
            ET.SubElement(clip, "out_seconds").text = f"{entry['end_seconds']:.3f}"
            ET.SubElement(clip, "duration").text = f"{entry['duration_seconds']:.3f}"
            ET.SubElement(clip, "confidence").text = f"{entry['confidence']:.2f}"
            ET.SubElement(clip, "reason").text = entry['reason']
            ET.SubElement(clip, "audio_label").text = entry['audio_label']
        
        # Scenes
        scenes_elem = ET.SubElement(root, "scenes")
        for scene in timeline_data['scenes']:
            scene_elem = ET.SubElement(scenes_elem, "scene")
            scene_elem.set("id", str(scene['scene_id']))
            ET.SubElement(scene_elem, "in").text = format_time_frames(scene['start_seconds'], fps)
            ET.SubElement(scene_elem, "out").text = format_time_frames(scene['end_seconds'], fps)
        
        # Markers
        markers = ET.SubElement(root, "markers")
        for marker in timeline_data['highlight_markers']:
            marker_elem = ET.SubElement(markers, "marker")
            marker_elem.set("type", marker['type'])
            ET.SubElement(marker_elem, "timestamp").text = marker['timestamp']
            ET.SubElement(marker_elem, "label").text = marker['label']
        
        # Pretty print
        xml_string = ET.tostring(root, encoding='unicode')
        dom = minidom.parseString(xml_string)
        return dom.toprettyxml(indent="  ")


def build_timeline(
    project_id: str,
    video_metadata: Dict,
    scenes: List[Dict],
    suggestions: List[Dict],
    accepted_ids: Optional[List[int]] = None,
    export_format: str = "json"
) -> str:
    """
    Convenience function to build and export timeline.
    
    Args:
        project_id: Project identifier
        video_metadata: Video metadata dict
        scenes: List of detected scenes
        suggestions: List of cut suggestions
        accepted_ids: List of accepted scene IDs (None = all accepted)
        export_format: "json" or "xml"
    
    Returns:
        Formatted timeline string
    """
    builder = TimelineBuilder(project_id, video_metadata)
    builder.set_scenes(scenes)
    builder.set_suggestions(suggestions, accepted_ids)
    
    if export_format.lower() == "xml":
        return builder.export_xml()
    else:
        return builder.export_json()
