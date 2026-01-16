from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime
from pydantic import BaseModel

from database import get_session
from models_db import Project, Export, Video

router = APIRouter(prefix="/projects", tags=["projects"])

class ProjectCreate(BaseModel):
    video_id: Optional[uuid.UUID] = None
    name: str = "Untitled Project"
    editor_state: Dict[str, Any] = {}

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    editor_state: Optional[Dict[str, Any]] = None

@router.post("/", response_model=Project)
async def create_project(
    project_in: ProjectCreate, 
    session: AsyncSession = Depends(get_session)
):
    project = Project(
        video_id=project_in.video_id,
        name=project_in.name,
        editor_state=project_in.editor_state
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project

@router.get("/{project_id}", response_model=Project)
async def get_project(
    project_id: uuid.UUID,
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.put("/{project_id}", response_model=Project)
async def update_project_state(
    project_id: uuid.UUID,
    project_update: ProjectUpdate,
    session: AsyncSession = Depends(get_session)
):
    """
    Autosave endpoint. Updates editor state.
    Creates the project if it doesn't exist (UPSERT logic for legacy migration).
    """
    result = await session.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        # Create new project if not found (lazy migration)
        # Note: We might be missing video_id here if it's from legacy.
        # Ideally we'd look it up, but for now safe defaults.
        project = Project(
            id=project_id,
            name=project_update.name or "Untitled Project",
            editor_state=project_update.editor_state or {}
        )
    else:
        # Update existing
        if project_update.name:
            project.name = project_update.name
        
        if project_update.editor_state:
            project.editor_state = project_update.editor_state
    
    project.updated_at = datetime.utcnow()
    
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project

class ExportCreate(BaseModel):
    export_type: str
    export_settings: Dict[str, Any]

@router.post("/{project_id}/export", response_model=Export)
async def create_export(
    project_id: uuid.UUID,
    export_data: ExportCreate,
    session: AsyncSession = Depends(get_session)
):
    # Verify project exists
    result = await session.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    export = Export(
        project_id=project_id,
        export_type=export_data.export_type,
        export_settings=export_data.export_settings,
        status="pending"
    )
    
    session.add(export)
    await session.commit()
    await session.refresh(export)
    
    # Trigger actual export process (background task?) - For now just DB record
    return export

@router.get("/{project_id}/exports", response_model=List[Export])
async def list_exports(
    project_id: uuid.UUID,
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(Export).where(Export.project_id == project_id).order_by(Export.created_at.desc()))
    exports = result.scalars().all()
    return exports
