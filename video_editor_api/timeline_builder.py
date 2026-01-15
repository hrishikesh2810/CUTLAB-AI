"""
Timeline Builder Module
=======================
Converts scene timestamps into timeline clip objects for video editing.

A timeline represents the arrangement of clips on tracks.
This module transforms raw scene data into structured clip objects
that can be used by video editing UIs.
"""

import uuid
from typing import List, Dict, Any


class TimelineBuilder:
    """
    TimelineBuilder: Creates timeline structures from scene data.
    
    Usage:
        builder = TimelineBuilder()
        timeline = builder.build_from_scenes(scenes)
    
    Output structure:
        {
            "clips": [
                {
                    "clip_id": "a1b2c3d4",
                    "start": 0.0,
                    "end": 3.42,
                    "duration": 3.42,
                    "track": 1,
                    "source_start": 0.0,
                    "source_end": 3.42
                }
            ]
        }
    """
    
    def __init__(self, default_track: int = 1):
        """
        Initialize timeline builder.
        
        Args:
            default_track: Default track number for clips
        """
        self.default_track = default_track
    
    def build_from_scenes(
        self, 
        scenes: List[Dict[str, float]], 
        track: int = None
    ) -> Dict[str, Any]:
        """
        Convert scene timestamps into timeline clips.
        
        Each scene becomes a clip with:
        - clip_id: Unique identifier (8-char UUID)
        - start: Start time on timeline (seconds)
        - end: End time on timeline (seconds)
        - duration: Clip duration (seconds)
        - track: Track number (for multi-track editing)
        - source_start: Original video start time
        - source_end: Original video end time
        
        Args:
            scenes: List of scene dicts with 'start' and 'end' keys
            track: Optional track number override
        
        Returns:
            Timeline dictionary with 'clips' array
        
        Example Input:
            [{"start": 0.0, "end": 3.42}, {"start": 3.42, "end": 7.91}]
        
        Example Output:
            {
                "clips": [
                    {
                        "clip_id": "a1b2c3d4",
                        "start": 0.0,
                        "end": 3.42,
                        "duration": 3.42,
                        "track": 1,
                        "source_start": 0.0,
                        "source_end": 3.42
                    },
                    {
                        "clip_id": "e5f6g7h8",
                        "start": 3.42,
                        "end": 7.91,
                        "duration": 4.49,
                        "track": 1,
                        "source_start": 3.42,
                        "source_end": 7.91
                    }
                ]
            }
        """
        track_num = track if track is not None else self.default_track
        clips = []
        
        for scene in scenes:
            start = scene["start"]
            end = scene["end"]
            duration = round(end - start, 3)
            
            clip = {
                "clip_id": self._generate_clip_id(),
                "start": start,
                "end": end,
                "duration": duration,
                "track": track_num,
                # Source references (useful for non-destructive editing)
                "source_start": start,
                "source_end": end
            }
            
            clips.append(clip)
        
        return {"clips": clips}
    
    def _generate_clip_id(self) -> str:
        """Generate unique 8-character clip ID."""
        return str(uuid.uuid4())[:8]
    
    def merge_clips(
        self, 
        clips: List[Dict], 
        clip_ids: List[str]
    ) -> Dict[str, Any]:
        """
        Merge multiple clips into one.
        
        Args:
            clips: Full list of clips
            clip_ids: IDs of clips to merge
        
        Returns:
            Updated timeline with merged clip
        """
        to_merge = [c for c in clips if c["clip_id"] in clip_ids]
        others = [c for c in clips if c["clip_id"] not in clip_ids]
        
        if not to_merge:
            return {"clips": clips}
        
        # Find earliest start and latest end
        merged = {
            "clip_id": self._generate_clip_id(),
            "start": min(c["start"] for c in to_merge),
            "end": max(c["end"] for c in to_merge),
            "track": to_merge[0]["track"],
            "source_start": min(c["source_start"] for c in to_merge),
            "source_end": max(c["source_end"] for c in to_merge)
        }
        merged["duration"] = round(merged["end"] - merged["start"], 3)
        
        # Insert merged clip and sort by start time
        result = others + [merged]
        result.sort(key=lambda x: x["start"])
        
        return {"clips": result}
    
    def split_clip(
        self, 
        clips: List[Dict], 
        clip_id: str, 
        split_time: float
    ) -> Dict[str, Any]:
        """
        Split a clip at specified time.
        
        Args:
            clips: Full list of clips
            clip_id: ID of clip to split
            split_time: Time to split at (absolute timeline time)
        
        Returns:
            Updated timeline with split clips
        """
        result = []
        
        for clip in clips:
            if clip["clip_id"] != clip_id:
                result.append(clip)
                continue
            
            # Validate split time is within clip
            if split_time <= clip["start"] or split_time >= clip["end"]:
                result.append(clip)
                continue
            
            # Create two clips from split
            clip_a = {
                "clip_id": self._generate_clip_id(),
                "start": clip["start"],
                "end": split_time,
                "duration": round(split_time - clip["start"], 3),
                "track": clip["track"],
                "source_start": clip["source_start"],
                "source_end": clip["source_start"] + (split_time - clip["start"])
            }
            
            clip_b = {
                "clip_id": self._generate_clip_id(),
                "start": split_time,
                "end": clip["end"],
                "duration": round(clip["end"] - split_time, 3),
                "track": clip["track"],
                "source_start": clip["source_start"] + (split_time - clip["start"]),
                "source_end": clip["source_end"]
            }
            
            result.extend([clip_a, clip_b])
        
        return {"clips": result}
    
    def delete_clip(
        self, 
        clips: List[Dict], 
        clip_id: str
    ) -> Dict[str, Any]:
        """
        Remove a clip from timeline.
        
        Args:
            clips: Full list of clips
            clip_id: ID of clip to remove
        
        Returns:
            Updated timeline without the deleted clip
        """
        return {"clips": [c for c in clips if c["clip_id"] != clip_id]}
