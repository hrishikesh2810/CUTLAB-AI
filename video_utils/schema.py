from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal, Union

# --- CORE COMPONENTS ---

class Transform(BaseModel):
    """Visual transformation properties for video/image clips."""
    scale: float = 1.0
    position_x: float = 0.0  # Normalized -1.0 to 1.0 or pixels
    position_y: float = 0.0
    rotation: float = 0.0    # Degrees
    opacity: float = 1.0

class AudioProperties(BaseModel):
    """Audio specific properties."""
    volume: float = 1.0
    fade_in: float = 0.0
    fade_out: float = 0.0
    muted: bool = False

# --- CLIP DEFINITION ---

class TimelineClip(BaseModel):
    """
    A single clip on the timeline.
    
    Supports 'Gap' implicitly by the space between clips, 
    or explicitly if we want a transparent filler.
    """
    id: str
    asset_id: str  # Reference to the source media
    label: str = "Clip"
    
    # Timing (Seconds)
    timeline_in: float   # Where it starts on the timeline
    timeline_out: float  # Where it ends on the timeline
    source_in: float     # Start point in the source file
    source_out: float    # End point in the source file
    
    speed: float = 1.0
    
    # Properties
    transform: Transform = Field(default_factory=Transform)
    audio: AudioProperties = Field(default_factory=AudioProperties)
    
    # Transitions (Optional linkage)
    transition_in: Optional[Dict] = None
    transition_out: Optional[Dict] = None

# --- TRACK DEFINITION ---

class Track(BaseModel):
    """A single timeline track (layer)."""
    id: str
    type: Literal['video', 'audio', 'text', 'overlay']
    label: str = ""
    clips: List[TimelineClip] = []
    
    # Track State
    visible: bool = True
    locked: bool = False
    muted: bool = False
    z_index: int = 0  # Layer order (0 = bottom)

# --- SEQUENCE & PROJECT ---

class SequenceSettings(BaseModel):
    """Global settings for the timeline sequence."""
    width: int = 1920
    height: int = 1080
    fps: float = 30.0
    aspect_ratio: str = "16:9"
    timecode_start: str = "00:00:00:00"

class AssetMetadata(BaseModel):
    """Metadata for a source file."""
    id: str
    path: str
    filename: str
    duration: float
    type: Literal['video', 'audio', 'image']
    width: Optional[int] = None
    height: Optional[int] = None

class TimelineProject(BaseModel):
    """
    Root object for the CapCut-like Timeline Engine.
    """
    version: str = "2.0"
    project_id: str
    created_at: str
    updated_at: str
    
    sequence: SequenceSettings = Field(default_factory=SequenceSettings)
    tracks: List[Track] = []
    
    # Asset Library (Map asset_id -> AssetMetadata)
    assets: Dict[str, AssetMetadata] = {}

    def get_duration(self) -> float:
        """Calculate total timeline duration based on the last clip end."""
        max_end = 0.0
        for track in self.tracks:
            for clip in track.clips:
                if clip.timeline_out > max_end:
                    max_end = clip.timeline_out
        return max_end
