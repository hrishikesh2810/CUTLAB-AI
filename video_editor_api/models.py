"""
Timeline Data Models for Non-Linear Video Editor
=================================================
Pydantic models defining the timeline structure.

ARCHITECTURE OVERVIEW
─────────────────────
A timeline represents video/audio arrangement in a non-linear editor.

┌─────────────────────────────────────────────────────────────────────────┐
│                              TIMELINE                                   │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Track 1 (Video) │ Clip A ████████│ Clip B ████│     │ Clip C ████ │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │ Track 2 (Video) │                │ Clip D ██████████│             │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │ Track 3 (Audio) │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ │
│  └────────────────────────────────────────────────────────────────────┘ │
│        0s          5s         10s         15s         20s         25s   │
└─────────────────────────────────────────────────────────────────────────┘

KEY CONCEPTS
────────────
- Timeline: Container for all tracks and settings
- Track: A horizontal lane that holds clips (video track, audio track)
- Clip: A segment of media placed on a track
- Timeline Position: Where clip starts on the timeline (playhead time)
- Source In/Out: Which portion of the original media is used

TRIM & DRAG SUPPORT
───────────────────
For trim operations, clips have:
- source_in / source_out: The portion of source media being used
- timeline_start / timeline_end: Where it appears on the timeline

When trimming the START of a clip:
- timeline_start increases → source_in increases (reveals less of start)

When trimming the END of a clip:  
- timeline_end decreases → source_out decreases (reveals less of end)

When dragging (moving) a clip:
- timeline_start and timeline_end change together
- source_in and source_out remain the same
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any, Literal
from enum import Enum
from uuid import uuid4
from datetime import datetime


# =============================================================================
# ENUMS
# =============================================================================

class TrackType(str, Enum):
    """Type of track in the timeline."""
    VIDEO = "video"
    AUDIO = "audio"
    TITLE = "title"      # For text overlays
    EFFECT = "effect"    # For adjustment layers


class ClipType(str, Enum):
    """Type of clip."""
    VIDEO = "video"      # Video with audio
    AUDIO = "audio"      # Audio only
    IMAGE = "image"      # Still image
    TITLE = "title"      # Text overlay
    GAP = "gap"          # Empty space (for ripple delete prevention)


class TransitionType(str, Enum):
    """Transition between clips."""
    NONE = "none"
    CUT = "cut"
    DISSOLVE = "dissolve"
    FADE_IN = "fade_in"
    FADE_OUT = "fade_out"
    WIPE = "wipe"


# =============================================================================
# CLIP MODEL
# =============================================================================

class Clip(BaseModel):
    """
    A single clip on the timeline.
    
    TIMELINE COORDINATE SYSTEM
    ──────────────────────────
    Timeline uses seconds as the primary unit.
    
    ┌─────────────────── Source Media (original file) ───────────────────┐
    │  [unused]  │  source_in ──────────────────► source_out  │ [unused] │
    │            │            USED PORTION                     │          │
    └────────────┴─────────────────────────────────────────────┴──────────┘
                 │                                             │
                 ▼                                             ▼
    ┌─────────────────────── Timeline ─────────────────────────────────────┐
    │            │ timeline_start ──────────────► timeline_end │          │
    │            │              CLIP ON TIMELINE               │          │
    └────────────┴─────────────────────────────────────────────┴──────────┘
    
    TRIM EXAMPLE
    ────────────
    Original: 10 second clip, using seconds 2-8 (6 seconds shown)
    - source_in = 2.0, source_out = 8.0
    - timeline_start = 5.0, timeline_end = 11.0
    
    Trim start by 1 second (drag left edge right):
    - source_in = 3.0 (was 2.0)
    - timeline_start = 6.0 (was 5.0)
    - timeline_end = 11.0 (unchanged)
    - source_out = 8.0 (unchanged)
    
    DRAG EXAMPLE
    ────────────
    Move clip 3 seconds later:
    - timeline_start = 8.0 (was 5.0)
    - timeline_end = 14.0 (was 11.0)
    - source_in = 2.0 (unchanged)
    - source_out = 8.0 (unchanged)
    """
    
    # Unique identifier
    clip_id: str = Field(
        default_factory=lambda: str(uuid4())[:8],
        description="Unique clip identifier"
    )
    
    # Display name
    name: str = Field(
        default="Untitled Clip",
        description="Human-readable clip name"
    )
    
    # Clip type
    clip_type: ClipType = Field(
        default=ClipType.VIDEO,
        description="Type of media"
    )
    
    # Source media reference
    source_id: Optional[str] = Field(
        default=None,
        description="Reference to source media file (video_id)"
    )
    
    source_path: Optional[str] = Field(
        default=None,
        description="Path to source media file"
    )
    
    # Source media time range (what portion of original is used)
    source_in: float = Field(
        ge=0,
        description="Start time in source media (seconds)"
    )
    
    source_out: float = Field(
        ge=0,
        description="End time in source media (seconds)"
    )
    
    # Timeline position (where clip appears on timeline)
    timeline_start: float = Field(
        ge=0,
        description="Start position on timeline (seconds)"
    )
    
    timeline_end: float = Field(
        ge=0,
        description="End position on timeline (seconds)"
    )
    
    # Track assignment
    track_index: int = Field(
        ge=0,
        description="Which track this clip is on (0-indexed)"
    )
    
    # Speed/rate
    speed: float = Field(
        default=1.0,
        ge=0.1,
        le=10.0,
        description="Playback speed (1.0 = normal, 2.0 = 2x fast)"
    )
    
    # Audio properties
    volume: float = Field(
        default=1.0,
        ge=0.0,
        le=3.0,
        description="Audio volume (0.0 = mute, 1.0 = normal)"
    )
    
    muted: bool = Field(
        default=False,
        description="Whether audio is muted"
    )
    
    # Visual properties
    opacity: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Visual opacity (0.0 = transparent, 1.0 = opaque)"
    )
    
    # Transform (for picture-in-picture, scaling)
    transform: Optional[Dict[str, float]] = Field(
        default=None,
        description="Transform properties: {scale, x, y, rotation}"
    )
    
    # Transitions
    transition_in: Optional[TransitionType] = Field(
        default=None,
        description="Transition at start of clip"
    )
    
    transition_out: Optional[TransitionType] = Field(
        default=None,
        description="Transition at end of clip"
    )
    
    transition_duration: float = Field(
        default=0.5,
        ge=0,
        le=5.0,
        description="Transition duration in seconds"
    )
    
    # Locked (prevent edits)
    locked: bool = Field(
        default=False,
        description="If true, clip cannot be edited"
    )
    
    # Metadata
    created_at: datetime = Field(
        default_factory=datetime.now,
        description="When clip was created"
    )
    
    # Computed properties
    @property
    def duration(self) -> float:
        """Duration on timeline in seconds."""
        return self.timeline_end - self.timeline_start
    
    @property
    def source_duration(self) -> float:
        """Duration of source media being used."""
        return self.source_out - self.source_in
    
    @validator('timeline_end')
    def timeline_end_after_start(cls, v, values):
        if 'timeline_start' in values and v <= values['timeline_start']:
            raise ValueError('timeline_end must be greater than timeline_start')
        return v
    
    @validator('source_out')
    def source_out_after_in(cls, v, values):
        if 'source_in' in values and v <= values['source_in']:
            raise ValueError('source_out must be greater than source_in')
        return v
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# =============================================================================
# TRACK MODEL
# =============================================================================

class Track(BaseModel):
    """
    A track in the timeline (horizontal lane for clips).
    
    TRACK HIERARCHY
    ───────────────
    Higher track index = renders on top (for video)
    Track 0 is usually the primary/base layer
    
    ┌─────────────────────────────────────────┐
    │ Track 2 (top)        - overlays/titles  │  ← Rendered last (on top)
    │ Track 1 (middle)     - b-roll           │
    │ Track 0 (bottom)     - primary footage  │  ← Rendered first (base)
    └─────────────────────────────────────────┘
    """
    
    track_id: str = Field(
        default_factory=lambda: str(uuid4())[:8],
        description="Unique track identifier"
    )
    
    name: str = Field(
        default="Track",
        description="Human-readable track name"
    )
    
    track_type: TrackType = Field(
        default=TrackType.VIDEO,
        description="Type of track"
    )
    
    index: int = Field(
        ge=0,
        description="Track order (0 = bottom)"
    )
    
    # Track state
    enabled: bool = Field(
        default=True,
        description="Whether track is visible/audible"
    )
    
    locked: bool = Field(
        default=False,
        description="Whether track is locked for editing"
    )
    
    # Track-level audio
    volume: float = Field(
        default=1.0,
        ge=0.0,
        le=3.0,
        description="Track volume multiplier"
    )
    
    muted: bool = Field(
        default=False,
        description="Whether track audio is muted"
    )
    
    # Track height (for UI rendering)
    height: int = Field(
        default=60,
        ge=30,
        le=200,
        description="Track height in pixels (UI)"
    )
    
    # Color (for UI)
    color: str = Field(
        default="#4A90D9",
        description="Track color for UI display"
    )


# =============================================================================
# TIMELINE MODEL
# =============================================================================

class Timeline(BaseModel):
    """
    The complete timeline structure.
    
    FRONTEND USAGE
    ──────────────
    The frontend receives this structure and:
    
    1. RENDERING TRACKS
       - Iterate through `tracks` array
       - For each track, filter `clips` where clip.track_index == track.index
       - Render clips at their timeline_start position
    
    2. RENDERING CLIPS
       - Position: left = timeline_start * pixelsPerSecond
       - Width: (timeline_end - timeline_start) * pixelsPerSecond
       - Color: Based on clip_type or track.color
    
    3. PLAYHEAD
       - Current time indicator at `playhead_position`
       - When playing, increment playhead by (1/fps) per frame
    
    4. DRAG OPERATIONS
       - On drag start: Store original timeline_start/end
       - On drag: Update timeline_start/end by delta
       - On drop: Validate no overlaps, snap to grid if enabled
    
    5. TRIM OPERATIONS
       - Left edge drag: Adjust timeline_start AND source_in
       - Right edge drag: Adjust timeline_end AND source_out
       - Clamp to source media duration
    
    6. ZOOM
       - pixelsPerSecond controls zoom level
       - Higher value = zoomed in (more detail)
       - Lower value = zoomed out (see more time)
    
    7. TIME DISPLAY
       - Convert seconds to timecode: HH:MM:SS:FF
       - FF = frame number = (seconds % 1) * fps
    """
    
    timeline_id: str = Field(
        default_factory=lambda: str(uuid4())[:8],
        description="Unique timeline identifier"
    )
    
    name: str = Field(
        default="Untitled Timeline",
        description="Timeline name"
    )
    
    # Sequence settings
    width: int = Field(
        default=1920,
        ge=1,
        description="Output video width"
    )
    
    height: int = Field(
        default=1080,
        ge=1,
        description="Output video height"
    )
    
    fps: float = Field(
        default=30.0,
        ge=1,
        le=120,
        description="Frames per second"
    )
    
    sample_rate: int = Field(
        default=48000,
        description="Audio sample rate (Hz)"
    )
    
    # Duration
    duration: float = Field(
        default=0.0,
        ge=0,
        description="Total timeline duration (auto-calculated)"
    )
    
    # Playhead position
    playhead_position: float = Field(
        default=0.0,
        ge=0,
        description="Current playhead position (seconds)"
    )
    
    # In/Out points for export
    in_point: Optional[float] = Field(
        default=None,
        description="Export start point (seconds)"
    )
    
    out_point: Optional[float] = Field(
        default=None,
        description="Export end point (seconds)"
    )
    
    # Tracks and clips
    tracks: List[Track] = Field(
        default_factory=list,
        description="List of tracks"
    )
    
    clips: List[Clip] = Field(
        default_factory=list,
        description="List of all clips"
    )
    
    # UI state (can be stored/restored)
    zoom_level: float = Field(
        default=50.0,
        ge=10,
        le=500,
        description="Pixels per second (zoom level)"
    )
    
    scroll_position: float = Field(
        default=0.0,
        ge=0,
        description="Horizontal scroll position (seconds)"
    )
    
    # Markers (for chaptering, notes)
    markers: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Timeline markers [{time, label, color}]"
    )
    
    # Metadata
    created_at: datetime = Field(
        default_factory=datetime.now
    )
    
    modified_at: datetime = Field(
        default_factory=datetime.now
    )
    
    def get_clips_on_track(self, track_index: int) -> List[Clip]:
        """Get all clips on a specific track."""
        return [c for c in self.clips if c.track_index == track_index]
    
    def get_clip_at_time(self, time: float, track_index: int = None) -> List[Clip]:
        """Get clips at a specific timeline time."""
        results = []
        for clip in self.clips:
            if clip.timeline_start <= time < clip.timeline_end:
                if track_index is None or clip.track_index == track_index:
                    results.append(clip)
        return results
    
    def calculate_duration(self) -> float:
        """Calculate timeline duration from clips."""
        if not self.clips:
            return 0.0
        return max(clip.timeline_end for clip in self.clips)
    
    def update_duration(self):
        """Update duration based on clips."""
        self.duration = self.calculate_duration()
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class ClipCreate(BaseModel):
    """Request model for creating a clip."""
    source_id: str
    source_in: float
    source_out: float
    timeline_start: float
    track_index: int = 0
    name: Optional[str] = None


class ClipUpdate(BaseModel):
    """Request model for updating a clip (trim/drag)."""
    timeline_start: Optional[float] = None
    timeline_end: Optional[float] = None
    source_in: Optional[float] = None
    source_out: Optional[float] = None
    track_index: Optional[int] = None
    speed: Optional[float] = None
    volume: Optional[float] = None
    opacity: Optional[float] = None
    locked: Optional[bool] = None


class TimelineCreate(BaseModel):
    """Request model for creating a timeline."""
    name: str = "Untitled Timeline"
    width: int = 1920
    height: int = 1080
    fps: float = 30.0


# =============================================================================
# EXAMPLE JSON
# =============================================================================

EXAMPLE_TIMELINE_JSON = """
{
  "timeline_id": "tl_a1b2c3",
  "name": "My Project Timeline",
  "width": 1920,
  "height": 1080,
  "fps": 30.0,
  "sample_rate": 48000,
  "duration": 25.5,
  "playhead_position": 12.3,
  "in_point": null,
  "out_point": null,
  "zoom_level": 50.0,
  "scroll_position": 0.0,
  
  "tracks": [
    {
      "track_id": "tr_001",
      "name": "Video 1",
      "track_type": "video",
      "index": 0,
      "enabled": true,
      "locked": false,
      "volume": 1.0,
      "muted": false,
      "height": 60,
      "color": "#4A90D9"
    },
    {
      "track_id": "tr_002", 
      "name": "B-Roll",
      "track_type": "video",
      "index": 1,
      "enabled": true,
      "locked": false,
      "volume": 1.0,
      "muted": false,
      "height": 60,
      "color": "#D94A4A"
    },
    {
      "track_id": "tr_003",
      "name": "Audio 1",
      "track_type": "audio",
      "index": 2,
      "enabled": true,
      "locked": false,
      "volume": 0.8,
      "muted": false,
      "height": 40,
      "color": "#4AD94A"
    }
  ],
  
  "clips": [
    {
      "clip_id": "cl_001",
      "name": "Interview Shot",
      "clip_type": "video",
      "source_id": "vid_abc123",
      "source_path": "/uploads/interview.mp4",
      "source_in": 5.0,
      "source_out": 15.0,
      "timeline_start": 0.0,
      "timeline_end": 10.0,
      "track_index": 0,
      "speed": 1.0,
      "volume": 1.0,
      "muted": false,
      "opacity": 1.0,
      "transform": null,
      "transition_in": null,
      "transition_out": "dissolve",
      "transition_duration": 0.5,
      "locked": false
    },
    {
      "clip_id": "cl_002",
      "name": "Landscape B-Roll",
      "clip_type": "video",
      "source_id": "vid_def456",
      "source_path": "/uploads/landscape.mp4",
      "source_in": 0.0,
      "source_out": 8.0,
      "timeline_start": 10.0,
      "timeline_end": 18.0,
      "track_index": 0,
      "speed": 1.0,
      "volume": 0.5,
      "muted": false,
      "opacity": 1.0,
      "transform": null,
      "transition_in": "dissolve",
      "transition_out": null,
      "transition_duration": 0.5,
      "locked": false
    },
    {
      "clip_id": "cl_003",
      "name": "Overlay Clip",
      "clip_type": "video",
      "source_id": "vid_ghi789",
      "source_path": "/uploads/overlay.mp4",
      "source_in": 2.0,
      "source_out": 6.0,
      "timeline_start": 12.0,
      "timeline_end": 16.0,
      "track_index": 1,
      "speed": 1.0,
      "volume": 0.0,
      "muted": true,
      "opacity": 0.8,
      "transform": {"scale": 0.5, "x": 0.7, "y": 0.1, "rotation": 0},
      "transition_in": "fade_in",
      "transition_out": "fade_out",
      "transition_duration": 0.3,
      "locked": false
    },
    {
      "clip_id": "cl_004",
      "name": "Background Music",
      "clip_type": "audio",
      "source_id": "aud_xyz",
      "source_path": "/uploads/music.mp3",
      "source_in": 0.0,
      "source_out": 25.5,
      "timeline_start": 0.0,
      "timeline_end": 25.5,
      "track_index": 2,
      "speed": 1.0,
      "volume": 0.3,
      "muted": false,
      "opacity": 1.0,
      "transform": null,
      "transition_in": "fade_in",
      "transition_out": "fade_out",
      "transition_duration": 1.0,
      "locked": false
    }
  ],
  
  "markers": [
    {"time": 5.0, "label": "Chapter 1", "color": "#FFD700"},
    {"time": 15.0, "label": "Key Moment", "color": "#FF4500"},
    {"time": 22.0, "label": "Outro", "color": "#32CD32"}
  ],
  
  "created_at": "2026-01-15T21:00:00",
  "modified_at": "2026-01-15T21:05:00"
}
"""


if __name__ == "__main__":
    # Example usage
    import json
    
    # Create a timeline
    timeline = Timeline(
        name="Demo Timeline",
        width=1920,
        height=1080,
        fps=30.0
    )
    
    # Add tracks
    timeline.tracks = [
        Track(name="Video 1", track_type=TrackType.VIDEO, index=0),
        Track(name="Audio 1", track_type=TrackType.AUDIO, index=1),
    ]
    
    # Add a clip
    clip = Clip(
        name="Scene 1",
        source_id="vid_001",
        source_in=0.0,
        source_out=10.0,
        timeline_start=0.0,
        timeline_end=10.0,
        track_index=0
    )
    timeline.clips.append(clip)
    timeline.update_duration()
    
    # Export to JSON
    print(timeline.json(indent=2))
