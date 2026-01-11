from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict
from uuid import uuid4

def generate_id() -> str:
    return str(uuid4())

# --- COMPONENTS ---

class Transform(BaseModel):
    """Spatial composition properties."""
    scale: float = 1.0
    x: float = 0.0  # Normalized coords or pixels? Usually centered 0.0
    y: float = 0.0
    rotation: float = 0.0
    opacity: float = 1.0
    
class Clip(BaseModel):
    """
    A unified clip object for the timeline.
    Spans a time range on the timeline (start_time -> end_time)
    mapping to a time range in the source media (in_point -> out_point).
    """
    clip_id: str = Field(default_factory=generate_id)
    source_id: str
    label: str = "Clip"
    
    # Timeline Placement (Seconds)
    start_time: float
    end_time: float
    
    # Source Content (Seconds)
    in_point: float  # Start time in source file
    out_point: float # End time in source file
    
    # Effects
    speed: float = 1.0
    transform: Transform = Field(default_factory=Transform)
    
    # Metadata
    z_index: int = 0  # Layering within track? Or implicit list order.
    
    @property
    def duration(self) -> float:
        """Timeline duration (accounting for speed)."""
        return self.end_time - self.start_time
        
    @property
    def source_duration(self) -> float:
        """Source content usage duration."""
        return self.out_point - self.in_point

class Track(BaseModel):
    """
    A horizontal lane containing clips.
    Supports sparse placement (gaps allowed).
    """
    track_id: str = Field(default_factory=generate_id)
    type: Literal['video', 'audio', 'text', 'overlay'] = 'video'
    label: str = "Main Track"
    visible: bool = True
    muted: bool = False
    clips: List[Clip] = []

class Sequence(BaseModel):
    """
    The master container for the edit.
    """
    sequence_id: str = Field(default_factory=generate_id)
    width: int = 1920
    height: int = 1080
    fps: float = 30.0
    aspect_ratio: str = "16:9"
    tracks: List[Track] = []
    
    # Global Duration is derived, but can be cached
    duration: float = 0.0
    
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class TimelineProject(BaseModel):
    """Root serialization object."""
    project_id: str
    version: str = "1.0.0"
    sequence: Sequence
