"""
Timeline State Manager for CUTLAB AI Workspace
Manages timeline data for manual video editing.
"""

import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime


class TimelineStateManager:
    """
    Manages timeline state for the workspace.
    Stores timeline clips and their properties.
    """
    
    def __init__(self, project_id: str, storage_dir: str = "storage/timelines"):
        self.project_id = project_id
        self.storage_dir = storage_dir
        self.timeline_file = os.path.join(storage_dir, f"{project_id}_timeline.json")
        
        # Ensure storage directory exists
        os.makedirs(storage_dir, exist_ok=True)
        
        # Timeline data structure
        self.timeline_data = {
            "project_id": project_id,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "clips": [],  # List of clips on timeline
            "transitions": [],  # List of transitions between clips
            "duration": 0.0,  # Total timeline duration
            "settings": {
                "fps": 30.0,
                "width": 1920,
                "height": 1080
            }
        }
        
        # Valid transition types
        self.TRANSITION_TYPES = ["cut", "cross-dissolve", "fade-in", "fade-out", "fade-in-out"]
        
        # Load existing data if available
        self.load()
    
    def load(self) -> bool:
        """Load timeline state from file."""
        try:
            if os.path.exists(self.timeline_file):
                with open(self.timeline_file, 'r') as f:
                    self.timeline_data = json.load(f)
                return True
        except Exception as e:
            print(f"Failed to load timeline: {e}")
        return False
    
    def save(self) -> bool:
        """Save timeline state to file."""
        try:
            self.timeline_data["updated_at"] = datetime.now().isoformat()
            self._recalculate_duration()
            with open(self.timeline_file, 'w') as f:
                json.dump(self.timeline_data, f, indent=2)
            return True
        except Exception as e:
            print(f"Failed to save timeline: {e}")
            return False
    
    def _recalculate_duration(self):
        """Recalculate total timeline duration."""
        total = 0.0
        for clip in self.timeline_data["clips"]:
            clip_duration = (clip["end_seconds"] - clip["start_seconds"]) / clip.get("speed", 1.0)
            total += clip_duration
        self.timeline_data["duration"] = total
    
    def add_clip(self, clip_data: Dict) -> Dict:
        """
        Add a clip to the timeline.
        
        clip_data should contain:
        - source_video: path or project_id of source video
        - start_seconds: start point in source video
        - end_seconds: end point in source video
        - speed: playback speed (default 1.0)
        - label: optional label for the clip
        """
        clip_id = f"clip_{len(self.timeline_data['clips']) + 1}_{int(datetime.now().timestamp())}"
        
        clip = {
            "clip_id": clip_id,
            "source_video": clip_data.get("source_video", ""),
            "source_filename": clip_data.get("source_filename", ""),
            "start_seconds": clip_data.get("start_seconds", 0.0),
            "end_seconds": clip_data.get("end_seconds", 0.0),
            "speed": clip_data.get("speed", 1.0),
            "label": clip_data.get("label", f"Clip {len(self.timeline_data['clips']) + 1}"),
            "position": len(self.timeline_data["clips"]),  # Position in timeline
            "added_at": datetime.now().isoformat()
        }
        
        # Calculate formatted times
        clip["start_formatted"] = self._format_time(clip["start_seconds"])
        clip["end_formatted"] = self._format_time(clip["end_seconds"])
        clip["duration_seconds"] = clip["end_seconds"] - clip["start_seconds"]
        clip["duration_formatted"] = self._format_time(clip["duration_seconds"])
        
        self.timeline_data["clips"].append(clip)
        self.save()
        
        return clip
    
    def remove_clip(self, clip_id: str) -> bool:
        """Remove a clip from the timeline."""
        original_len = len(self.timeline_data["clips"])
        self.timeline_data["clips"] = [
            c for c in self.timeline_data["clips"] if c["clip_id"] != clip_id
        ]
        
        # Reorder positions
        for i, clip in enumerate(self.timeline_data["clips"]):
            clip["position"] = i
        
        if len(self.timeline_data["clips"]) < original_len:
            self.save()
            return True
        return False
    
    def update_clip(self, clip_id: str, updates: Dict) -> Optional[Dict]:
        """Update a clip's properties."""
        for clip in self.timeline_data["clips"]:
            if clip["clip_id"] == clip_id:
                # Update allowed fields
                if "start_seconds" in updates:
                    clip["start_seconds"] = updates["start_seconds"]
                    clip["start_formatted"] = self._format_time(updates["start_seconds"])
                if "end_seconds" in updates:
                    clip["end_seconds"] = updates["end_seconds"]
                    clip["end_formatted"] = self._format_time(updates["end_seconds"])
                if "speed" in updates:
                    clip["speed"] = max(0.1, min(4.0, updates["speed"]))
                if "label" in updates:
                    clip["label"] = updates["label"]
                
                # Recalculate duration
                clip["duration_seconds"] = clip["end_seconds"] - clip["start_seconds"]
                clip["duration_formatted"] = self._format_time(clip["duration_seconds"])
                
                self.save()
                return clip
        return None
    
    def split_clip(self, clip_id: str, split_position: float) -> Optional[List[Dict]]:
        """
        Split a clip at the given position.
        
        Args:
            clip_id: ID of the clip to split
            split_position: Position in seconds (relative to clip start in source video)
        
        Returns:
            List of two new clips, or None if split failed
        """
        clip_idx = None
        original_clip = None
        
        for i, clip in enumerate(self.timeline_data["clips"]):
            if clip["clip_id"] == clip_id:
                clip_idx = i
                original_clip = clip.copy()
                break
        
        if original_clip is None:
            return None
        
        # Validate split position
        if split_position <= original_clip["start_seconds"] or split_position >= original_clip["end_seconds"]:
            return None  # Split position must be within clip bounds
        
        # Create first clip (before split)
        clip1_id = f"clip_{len(self.timeline_data['clips']) + 1}_{int(datetime.now().timestamp())}"
        clip1 = {
            "clip_id": clip1_id,
            "source_video": original_clip["source_video"],
            "source_filename": original_clip["source_filename"],
            "start_seconds": original_clip["start_seconds"],
            "end_seconds": split_position,
            "speed": original_clip["speed"],
            "label": f"{original_clip['label']} (1)",
            "position": original_clip["position"],
            "added_at": datetime.now().isoformat()
        }
        clip1["start_formatted"] = self._format_time(clip1["start_seconds"])
        clip1["end_formatted"] = self._format_time(clip1["end_seconds"])
        clip1["duration_seconds"] = clip1["end_seconds"] - clip1["start_seconds"]
        clip1["duration_formatted"] = self._format_time(clip1["duration_seconds"])
        
        # Create second clip (after split)
        clip2_id = f"clip_{len(self.timeline_data['clips']) + 2}_{int(datetime.now().timestamp()) + 1}"
        clip2 = {
            "clip_id": clip2_id,
            "source_video": original_clip["source_video"],
            "source_filename": original_clip["source_filename"],
            "start_seconds": split_position,
            "end_seconds": original_clip["end_seconds"],
            "speed": original_clip["speed"],
            "label": f"{original_clip['label']} (2)",
            "position": original_clip["position"] + 1,
            "added_at": datetime.now().isoformat()
        }
        clip2["start_formatted"] = self._format_time(clip2["start_seconds"])
        clip2["end_formatted"] = self._format_time(clip2["end_seconds"])
        clip2["duration_seconds"] = clip2["end_seconds"] - clip2["start_seconds"]
        clip2["duration_formatted"] = self._format_time(clip2["duration_seconds"])
        
        # Remove original clip and insert new clips
        self.timeline_data["clips"].pop(clip_idx)
        self.timeline_data["clips"].insert(clip_idx, clip1)
        self.timeline_data["clips"].insert(clip_idx + 1, clip2)
        
        # Reorder positions
        for i, clip in enumerate(self.timeline_data["clips"]):
            clip["position"] = i
        
        self.save()
        return [clip1, clip2]
    
    def trim_in(self, clip_id: str, new_start: float) -> Optional[Dict]:
        """
        Trim the in-point (start) of a clip.
        
        Args:
            clip_id: ID of the clip to trim
            new_start: New start position in seconds
        
        Returns:
            Updated clip or None
        """
        for clip in self.timeline_data["clips"]:
            if clip["clip_id"] == clip_id:
                # Validate: new start must be before current end
                if new_start >= clip["end_seconds"]:
                    return None
                if new_start < 0:
                    new_start = 0
                
                clip["start_seconds"] = new_start
                clip["start_formatted"] = self._format_time(new_start)
                clip["duration_seconds"] = clip["end_seconds"] - clip["start_seconds"]
                clip["duration_formatted"] = self._format_time(clip["duration_seconds"])
                
                self.save()
                return clip
        return None
    
    def trim_out(self, clip_id: str, new_end: float) -> Optional[Dict]:
        """
        Trim the out-point (end) of a clip.
        
        Args:
            clip_id: ID of the clip to trim
            new_end: New end position in seconds
        
        Returns:
            Updated clip or None
        """
        for clip in self.timeline_data["clips"]:
            if clip["clip_id"] == clip_id:
                # Validate: new end must be after current start
                if new_end <= clip["start_seconds"]:
                    return None
                
                clip["end_seconds"] = new_end
                clip["end_formatted"] = self._format_time(new_end)
                clip["duration_seconds"] = clip["end_seconds"] - clip["start_seconds"]
                clip["duration_formatted"] = self._format_time(clip["duration_seconds"])
                
                self.save()
                return clip
        return None
    
    def set_speed(self, clip_id: str, speed: float) -> Optional[Dict]:
        """
        Set the playback speed of a clip.
        
        Args:
            clip_id: ID of the clip
            speed: Playback speed (0.25 to 4.0)
        
        Returns:
            Updated clip or None
        """
        # Clamp speed to valid range
        speed = max(0.25, min(4.0, speed))
        
        for clip in self.timeline_data["clips"]:
            if clip["clip_id"] == clip_id:
                clip["speed"] = speed
                self.save()
                return clip
        return None
    
    def get_clip(self, clip_id: str) -> Optional[Dict]:
        """Get a single clip by ID."""
        for clip in self.timeline_data["clips"]:
            if clip["clip_id"] == clip_id:
                return clip
        return None

    def reorder_clips(self, clip_order: List[str]) -> bool:
        """Reorder clips based on list of clip_ids."""
        try:
            clip_map = {c["clip_id"]: c for c in self.timeline_data["clips"]}
            new_clips = []
            for i, clip_id in enumerate(clip_order):
                if clip_id in clip_map:
                    clip = clip_map[clip_id]
                    clip["position"] = i
                    new_clips.append(clip)
            
            self.timeline_data["clips"] = new_clips
            self.save()
            return True
        except:
            return False
    
    def get_clips(self) -> List[Dict]:
        """Get all clips in timeline order."""
        return sorted(self.timeline_data["clips"], key=lambda x: x["position"])
    
    def get_timeline_data(self) -> Dict:
        """Get full timeline data."""
        # Ensure transitions array exists
        if "transitions" not in self.timeline_data:
            self.timeline_data["transitions"] = []
        return self.timeline_data
    
    def clear_timeline(self) -> bool:
        """Clear all clips and transitions from timeline."""
        self.timeline_data["clips"] = []
        self.timeline_data["transitions"] = []
        self.timeline_data["duration"] = 0.0
        return self.save()
    
    # ============================================================
    # TRANSITION MANAGEMENT
    # ============================================================
    
    def set_transition(self, from_clip_id: str, to_clip_id: str, 
                       transition_type: str, duration: float = 1.0) -> Optional[Dict]:
        """
        Set a transition between two clips.
        
        Args:
            from_clip_id: ID of the clip before the transition
            to_clip_id: ID of the clip after the transition
            transition_type: Type of transition (cut, cross-dissolve, fade-in, fade-out, fade-in-out)
            duration: Duration of the transition in seconds
        
        Returns:
            The transition dict or None if invalid
        """
        # Validate transition type
        if transition_type not in self.TRANSITION_TYPES:
            return None
        
        # Validate clips exist
        from_clip = self.get_clip(from_clip_id)
        to_clip = self.get_clip(to_clip_id)
        
        if not from_clip or not to_clip:
            return None
        
        # Clamp duration
        duration = max(0.1, min(5.0, duration))
        
        # Ensure transitions array exists
        if "transitions" not in self.timeline_data:
            self.timeline_data["transitions"] = []
        
        # Check if transition already exists, update it
        for t in self.timeline_data["transitions"]:
            if t["from_clip_id"] == from_clip_id and t["to_clip_id"] == to_clip_id:
                t["type"] = transition_type
                t["duration"] = duration
                t["updated_at"] = datetime.now().isoformat()
                self.save()
                return t
        
        # Create new transition
        transition = {
            "id": f"trans_{from_clip_id}_{to_clip_id}",
            "from_clip_id": from_clip_id,
            "to_clip_id": to_clip_id,
            "from_position": from_clip["position"],
            "to_position": to_clip["position"],
            "type": transition_type,
            "duration": duration,
            "created_at": datetime.now().isoformat()
        }
        
        self.timeline_data["transitions"].append(transition)
        self.save()
        return transition
    
    def get_transition(self, from_clip_id: str, to_clip_id: str) -> Optional[Dict]:
        """Get a transition between two clips."""
        if "transitions" not in self.timeline_data:
            return None
        
        for t in self.timeline_data["transitions"]:
            if t["from_clip_id"] == from_clip_id and t["to_clip_id"] == to_clip_id:
                return t
        return None
    
    def get_transition_after_clip(self, clip_id: str) -> Optional[Dict]:
        """Get the transition that follows a clip."""
        if "transitions" not in self.timeline_data:
            return None
        
        for t in self.timeline_data["transitions"]:
            if t["from_clip_id"] == clip_id:
                return t
        return None
    
    def remove_transition(self, from_clip_id: str, to_clip_id: str) -> bool:
        """Remove a transition between two clips."""
        if "transitions" not in self.timeline_data:
            return False
        
        original_len = len(self.timeline_data["transitions"])
        self.timeline_data["transitions"] = [
            t for t in self.timeline_data["transitions"]
            if not (t["from_clip_id"] == from_clip_id and t["to_clip_id"] == to_clip_id)
        ]
        
        if len(self.timeline_data["transitions"]) < original_len:
            self.save()
            return True
        return False
    
    def get_all_transitions(self) -> List[Dict]:
        """Get all transitions in the timeline."""
        if "transitions" not in self.timeline_data:
            return []
        return self.timeline_data["transitions"]
    
    def auto_generate_transitions(self, default_type: str = "cut") -> List[Dict]:
        """
        Auto-generate transitions between all adjacent clips.
        
        Args:
            default_type: Default transition type to use
        
        Returns:
            List of generated transitions
        """
        if default_type not in self.TRANSITION_TYPES:
            default_type = "cut"
        
        clips = self.get_clips()
        generated = []
        
        for i in range(len(clips) - 1):
            from_clip = clips[i]
            to_clip = clips[i + 1]
            
            # Check if transition already exists
            existing = self.get_transition(from_clip["clip_id"], to_clip["clip_id"])
            if not existing:
                trans = self.set_transition(
                    from_clip["clip_id"],
                    to_clip["clip_id"],
                    default_type,
                    0.5 if default_type != "cut" else 0.0
                )
                if trans:
                    generated.append(trans)
        
        return generated
    
    def _format_time(self, seconds: float) -> str:
        """Format seconds to HH:MM:SS.mmm"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        ms = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{ms:03d}"


def get_timeline_manager(project_id: str) -> TimelineStateManager:
    """Factory function to get a timeline manager for a project."""
    return TimelineStateManager(project_id)
