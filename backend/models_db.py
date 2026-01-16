import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(index=True, unique=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    projects: List["Project"] = Relationship(back_populates="user")

class Video(SQLModel, table=True):
    __tablename__ = "videos"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    filename: str
    file_path: str
    duration: float
    fps: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    projects: List["Project"] = Relationship(back_populates="video")

class Project(SQLModel, table=True):
    __tablename__ = "projects"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id")
    video_id: Optional[uuid.UUID] = Field(default=None, foreign_key="videos.id")
    name: str = Field(default="Untitled Project")
    
    # Store the full editor state as JSONB
    editor_state: Dict[str, Any] = Field(default={}, sa_column=Column(JSONB))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    user: Optional[User] = Relationship(back_populates="projects")
    video: Optional[Video] = Relationship(back_populates="projects")
    exports: List["Export"] = Relationship(back_populates="project")

class Export(SQLModel, table=True):
    __tablename__ = "exports"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    project_id: uuid.UUID = Field(foreign_key="projects.id")
    export_type: str  # video, report, data
    export_settings: Dict[str, Any] = Field(default={}, sa_column=Column(JSONB))
    output_path: Optional[str] = None
    status: str = Field(default="pending") # pending, processing, completed, failed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    project: Project = Relationship(back_populates="exports")
