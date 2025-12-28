# CUTLAB AI - Changelog

All notable changes to the CUTLAB AI project are documented here.

---

## Day 6 – Workspace Foundation

### Added
- Electron + React + TypeScript workspace project (`workspace/`)
- 4-panel NLE editor layout:
  - Media Bin (left) - displays imported clips with thumbnails
  - Preview Player (center) - video playback with transport controls
  - Inspector (right) - clip properties panel
  - Timeline (bottom) - horizontal track with playhead
- Timeline JSON data model (`src/types/timeline.ts`)
- Dark professional theme with CSS custom properties
- Playhead with scrubber functionality
- Basic clip rendering on timeline track

### Technical
- Vite build system with React plugin
- Electron main/preload process separation
- TypeScript strict mode enabled

---

## Workspace – Remotion Integration

### Added
- Remotion rendering engine for timeline preview
- `@remotion/player` for in-browser video composition
- TimelineComposition component renders clips as Sequences
- RemotionPreview replaces HTML5 video element
- Frame-accurate playback and seeking
- Media import with browser file picker
- MediaStore for managing imported video files
- Purple "REMOTION" badge in header

### Technical
- Remotion Player syncs with TimelineStore playhead
- Video clips rendered via Remotion Sequence API
- MediaMap links sourceVideoId to video URLs
- Supports playback rate (speed) changes per clip

---

## Editing – Split & Trim

### Added
- Split clip at playhead position (S key or button)
- Trim In: Set clip start to playhead position
- Trim Out: Set clip end to playhead position
- Delete selected clip (Delete/Backspace key)
- Split button in Inspector panel
- Trim In/Out buttons in Inspector panel
- Visual editing tools in "Edit at Playhead" section

### Technical
- Non-destructive editing: Only JSON model is modified
- Remotion automatically re-renders on state change
- Reducer actions: SPLIT_CLIP, TRIM_CLIP_IN, TRIM_CLIP_OUT
- Timeline duration auto-recalculated after edits
- Split creates two new clips with (L) and (R) labels

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| S | Split clip at playhead |
| Delete | Delete selected clip |
| Backspace | Delete selected clip |

---

## Timeline Core

### Added
- Timeline state management system (`src/store/TimelineStore.tsx`)
- Centralized React Context with useReducer pattern
- Playhead position state with clamping
- Click-to-seek on timeline ruler and tracks
- Preview ↔ Timeline synchronization via video element ref
- Keyboard shortcuts: Space (play/pause), arrows (frame step), Home/End
- Zoom controls (10-200 px/s range)
- Double-click media items to add clips to timeline
- Timeline duration auto-calculation from clips

### Technical
- React Context + useReducer for state management
- Video element ref forwarded through context
- Bidirectional sync: playhead updates video, video updates playhead

## Day 5 – Timeline Export

### Added
- Timeline builder module (`ai_engine/timeline_builder.py`)
- JSON timeline export format
- XML timeline export (NLE-compatible)
- Backend `/export-timeline` endpoint
- Frontend Export tab with download buttons

---

## Day 4 – Audio-Aware Cut Suggestions

### Added
- Audio analysis module (`video_utils/audio_analysis.py`)
- Librosa integration for audio features
- Audio-aware cut suggestion rules
- Audio energy and label fields in database
- Frontend audio label display with emojis

---

## Day 3 – Workspace Manual Editing

### Added
- Workspace tab in frontend
- Timeline state manager (`video_utils/timeline_manager.py`)
- Split, trim, speed editing tools
- Transition system (cut, dissolve, fade)
- Backend workspace endpoints

---

## Day 2 – Cut Suggestions

### Added
- Cut suggester module (`ai_engine/cut_suggester.py`)
- Motion, face, repetitiveness analysis
- Backend `/suggest-cuts` endpoint
- Frontend suggestion cards with accept/reject

---

## Day 1 – Core Pipeline

### Added
- Project structure and requirements
- Video metadata extraction
- Scene detection with PySceneDetect
- SQLite database with SQLAlchemy
- FastAPI backend
- Streamlit frontend
