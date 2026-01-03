# CUTLAB AI - Changelog

All notable changes to the CUTLAB AI project are documented here.

---

## Navigation & AI Integration

### Added
- **React Router Navigation** with 6 pages:
  - `/upload` - Video upload with drag-and-drop
  - `/analysis` - AI analysis hub with overview
  - `/analysis/cuts` - Cut suggestions with Apply/Ignore controls
  - `/analysis/audio` - Audio analysis with waveform visualization
  - `/workspace` - Main editing workspace with AI panel
  - `/export` - Export options with format selection

- **AI Insights Data Contract** (`ai_insights.json`):
  - Schema version tracking
  - Suggestions array with confidence scores
  - Audio segments (speech, music, silence, peaks)
  - Scene boundaries

- **AI Integration in Workspace**:
  - AI Suggestions Panel (side panel)
  - Timeline markers for applied suggestions
  - Apply/Ignore controls per suggestion
  - Status filtering (pending/applied/ignored)

- **Clean Data Flow**:
  - `timeline.json` - Editor-owned, mutable
  - `ai_insights.json` - AI-owned, read-only in workspace
  - Suggestions update only status, not AI data

### Technical
- `AIInsightsStore.tsx` - State management for AI data
- `ai-insights.ts` - TypeScript interfaces for data contract
- `AISuggestionsPanel.tsx` - Workspace side panel component
- `ADD_MARKER` / `REMOVE_MARKER` actions in TimelineStore
- Nested routes for Analysis sub-pages

### Data Contracts

**ai_insights.json**
```json
{
  "version": "1.0",
  "projectId": "...",
  "suggestions": [
    {
      "id": "sug_1",
      "type": "cut | keep | trim | transition",
      "startTime": 15.5,
      "endTime": 22.3,
      "confidence": "high | medium | low",
      "score": 0.92,
      "reason": "AI explanation",
      "status": "pending | applied | ignored"
    }
  ],
  "audioSegments": [...],
  "sceneBoundaries": [...]
}
```

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

## Transitions & Speed Control

### Added
- Cross-dissolve transition via Remotion interpolate API
- Fade-in and fade-out transition types
- Speed adjustment via playbackRate (0.25x - 4x)
- Speed indicator overlay in preview when speed ≠ 1
- Transition controls in Inspector panel:
  - In/Out transition type dropdowns
  - Duration input (seconds)
- Speed presets: 0.5x, 1x, 1.5x, 2x buttons
- Speed slider with fine control

### Technical
- Transitions.tsx: TransitionWrapper, Fade components
- TimelineComposition applies opacity interpolation for transitions
- SET_CLIP_SPEED action with 0.25-4x clamping
- ADD_TRANSITION, UPDATE_TRANSITION, REMOVE_TRANSITION actions
- Remotion Video component uses playbackRate prop

### Transition Types Supported
| Type | Effect |
|------|--------|
| cut | Hard cut (no transition) |
| cross-dissolve | Opacity blend between clips |
| fade-in | Fade from black |
| fade-out | Fade to black |

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
