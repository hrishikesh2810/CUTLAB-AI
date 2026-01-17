from sqlalchemy import create_engine, Column, String, Integer, Float, Boolean, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import os

DB_PATH = "sqlite:///../storage/metadata.db"

engine = create_engine(DB_PATH, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class VideoMetadata(Base):
    __tablename__ = "video_metadata"

    project_id = Column(String, primary_key=True, index=True)
    filename = Column(String)
    duration = Column(Float)
    fps = Column(Float)
    width = Column(Integer)
    height = Column(Integer)
    has_audio = Column(Boolean)
    
    scenes = relationship("VideoScene", back_populates="video")
    cut_suggestions = relationship("CutSuggestion", back_populates="video")
    timelines = relationship("ProjectTimeline", back_populates="video")

class VideoScene(Base):
    __tablename__ = "video_scenes"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("video_metadata.project_id"))
    start_time = Column(Float)
    end_time = Column(Float)
    start_frame = Column(Integer)
    end_frame = Column(Integer)
    
    video = relationship("VideoMetadata", back_populates="scenes")

class CutSuggestion(Base):
    __tablename__ = "cut_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("video_metadata.project_id"))
    scene_id = Column(Integer)
    start_time = Column(Float)
    end_time = Column(Float)
    confidence = Column(Float)
    suggestion_type = Column(String)  # CUT, TRIM
    reason = Column(Text)
    motion_intensity = Column(Float)
    silence_level = Column(Float)
    audio_energy = Column(Float)  # Audio energy level
    audio_label = Column(String)   # Audio-aware label
    has_faces = Column(Boolean)
    repetitiveness = Column(Float)
    
    video = relationship("VideoMetadata", back_populates="cut_suggestions")

class ProjectTimeline(Base):
    __tablename__ = "project_timelines"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("video_metadata.project_id"), index=True)
    version = Column(Integer, default=1)
    timeline_json = Column(Text)  # Stores the TimelineProject JSON schema
    updated_at = Column(String)   # ISO format timestamp
    
    video = relationship("VideoMetadata", back_populates="timelines")

def init_db():
    # Create parent directory if it doesn't exist
    os.makedirs("../storage", exist_ok=True)
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
