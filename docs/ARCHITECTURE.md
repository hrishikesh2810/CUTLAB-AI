# CUTLAB AI - Architecture & Structure

This document explains how the CUTLAB AI project is organized and how its components communicate.

---

## Project Overview

CUTLAB AI is a **next-generation video editing assistant** with two main interfaces:

1. **AI Dashboard** (Streamlit) - Scene detection, cut suggestions, audio analysis
2. **Workspace Editor** (Electron) - Professional NLE for manual editing

Both interfaces share the same **Timeline JSON format** for interoperability.

---

## Folder Structure

```
CUTLAB AI 2/
├── ai_engine/              # AI analysis modules (Python)
│   ├── scene_detection.py
│   ├── cut_suggester.py
│   └── timeline_builder.py
│
├── video_utils/            # Video processing utilities
│   ├── metadata.py
│   ├── audio_analysis.py
│   └── timeline_manager.py
│
├── backend/                # FastAPI REST API
│   └── main.py
│
├── frontend/               # Streamlit AI Dashboard
│   └── app.py
│
├── workspace/              # Electron NLE Editor
│   ├── electron/           # Electron main process
│   │   ├── main.js
│   │   └── preload.js
│   ├── src/                # React frontend
│   │   ├── components/
│   │   ├── types/
│   │   └── styles/
│   └── package.json
│
├── storage/                # Data storage
│   ├── videos/             # Uploaded video files
│   ├── timelines/          # Timeline JSON files
│   └── metadata.db         # SQLite database
│
└── docs/                   # Documentation
    ├── CHANGELOG.md
    └── ARCHITECTURE.md
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
├─────────────────────────────┬───────────────────────────────────┤
│   Streamlit AI Dashboard    │      Electron Workspace Editor     │
│   (Analysis & Suggestions)  │      (Manual NLE Editing)          │
└──────────────┬──────────────┴──────────────┬────────────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend (Python)                     │
│  /upload-video    /analyze-scenes    /suggest-cuts               │
│  /export-timeline  /workspace/*/timeline                         │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────┐    ┌─────────────────────────────┐
│      AI Engine              │    │    Timeline JSON Files       │
│  - Scene Detection          │    │    (storage/timelines/)      │
│  - Cut Suggester            │    │                              │
│  - Audio Analysis           │    │    Shared Format:            │
└─────────────────────────────┘    │    - clips[]                 │
                                   │    - transitions[]           │
                                   │    - markers[]               │
                                   └─────────────────────────────┘
```

---

## Component Separation

### AI Engine (Python)
- **Purpose**: Analyze video content, suggest cuts
- **Location**: `ai_engine/`, `video_utils/`
- **Dependencies**: OpenCV, Librosa, PySceneDetect, MoviePy
- **Output**: Cut suggestions, scene data, audio metrics

### Workspace Editor (Electron + React)
- **Purpose**: Professional NLE interface for manual editing
- **Location**: `workspace/`
- **Dependencies**: React, TypeScript, Electron
- **Input/Output**: Timeline JSON files

### Shared Timeline Format
Both components use the same JSON structure:

```json
{
  "version": "1.0",
  "projectId": "...",
  "clips": [
    {
      "id": "clip_1",
      "sourceVideoId": "...",
      "inPoint": 10.5,
      "outPoint": 25.3,
      "speed": 1.0
    }
  ],
  "transitions": [
    {
      "fromClipId": "clip_1",
      "toClipId": "clip_2",
      "type": "cross-dissolve",
      "duration": 1.0
    }
  ],
  "markers": []
}
```

---

## Workspace UI Layout

```
┌────────────────────────────────────────────────────────────────┐
│  Header: Logo | Project Name | Save                            │
├──────────┬─────────────────────────────────────┬───────────────┤
│          │                                     │               │
│  Media   │         Preview Player              │   Inspector   │
│   Bin    │                                     │               │
│          │         ▶ Transport Controls        │   Properties  │
│          │                                     │               │
├──────────┴─────────────────────────────────────┴───────────────┤
│                                                                 │
│  Timeline: |0:00|-------|0:30|-------|1:00|-------|             │
│  V1: [====CLIP 1====][====CLIP 2====][====CLIP 3====]          │
│  A1: ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~               │
│       ▲ Playhead                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack Summary

| Component | Technology |
|-----------|------------|
| AI Analysis | Python, OpenCV, Librosa |
| Backend API | FastAPI, SQLAlchemy |
| AI Dashboard | Streamlit |
| Workspace Shell | Electron |
| Workspace UI | React + TypeScript |
| Timeline Render | CSS + React |
| Data Storage | SQLite, JSON files |
| Preview Render | **Remotion** (@remotion/player) |

---

## Key Design Principles

1. **Non-Destructive Editing**: Timeline JSON is the source of truth, never modify original video files
2. **Python-Only AI**: All analysis runs locally without cloud APIs
3. **Separation of Concerns**: AI suggestions are separate from manual editing
4. **Interoperability**: Shared timeline format between all components
5. **CPU-Only**: No GPU dependencies for maximum compatibility

---

## AI–Workspace Data Flow

The AI analysis and Workspace editor are **loosely coupled** through a shared data contract.

### Data Ownership

| File | Owner | Mutability in Workspace |
|------|-------|-------------------------|
| `timeline.json` | Workspace Editor | Read/Write |
| `ai_insights.json` | AI Engine | Read-Only |

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     ANALYSIS PAGES                               │
│  /upload → /analysis → /analysis/cuts → /analysis/audio         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐        ┌─────────────────┐                     │
│   │  AI Engine  │───────▶│ ai_insights.json│                     │
│   │  (Python)   │        │  (AI-owned)     │                     │
│   └─────────────┘        └────────┬────────┘                     │
│                                   │ (read-only)                  │
├───────────────────────────────────┼─────────────────────────────┤
│                     WORKSPACE                                    │
│                                   ▼                              │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              AIInsightsStore (React Context)              │   │
│   │  - Loads ai_insights.json                                 │   │
│   │  - Tracks suggestion status (pending/applied/ignored)    │   │
│   │  - Does NOT modify original AI data                       │   │
│   └──────────────────────────┬────────────────────────────────┘   │
│                              │                                    │
│   ┌──────────────────────────┴────────────────────────────────┐   │
│   │              AISuggestionsPanel Component                  │   │
│   │  - Displays suggestions with Apply/Ignore controls         │   │
│   │  - "Apply" → dispatches ADD_MARKER to TimelineStore        │   │
│   │  - Updates suggestion status (not AI data)                 │   │
│   └──────────────────────────┬────────────────────────────────┘   │
│                              │                                    │
│                              ▼                                    │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              TimelineStore (React Context)               │   │
│   │  - Owns timeline.json                                    │   │
│   │  - ADD_MARKER action inserts AI suggestion markers       │   │
│   │  - All manual edits modify timeline only                 │   │
│   └──────────────────────────┬────────────────────────────────┘   │
│                              │                                    │
│                              ▼                                    │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              timeline.json (Editor-owned)                │   │
│   │  - Clips, transitions, markers                           │   │
│   │  - Markers include AI suggestion references              │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### AI Insights Schema (ai_insights.json)

```typescript
interface AIInsights {
    version: string;
    projectId: string;
    videoPath: string;
    createdAt: string;
    summary: {
        totalDuration: number;
        sceneCount: number;
        suggestedCuts: number;
        suggestedKeeps: number;
        averageConfidence: number;
    };
    suggestions: AISuggestion[];
    audioSegments: AudioSegment[];
    sceneBoundaries: SceneBoundary[];
}

interface AISuggestion {
    id: string;
    type: 'cut' | 'keep' | 'trim' | 'transition';
    startTime: number;
    endTime: number;
    confidence: 'high' | 'medium' | 'low';
    score: number;           // 0-1
    reason: string;          // Human-readable
    status?: 'pending' | 'applied' | 'ignored';
}
```

### Apply Workflow

1. User clicks "Apply" on a suggestion
2. `handleApply()` in AISuggestionsPanel:
   - Dispatches `ADD_MARKER` to TimelineStore
   - Calls `applySuggestion(id)` to update status
3. TimelineStore adds marker to `timeline.json`
4. AIInsightsStore updates local status (not AI data)
5. Timeline UI re-renders with new marker

### Key Invariants

1. **AI data is immutable**: Workspace never modifies `ai_insights.json`
2. **Timeline owns markers**: Applied suggestions become timeline markers
3. **Status is local**: Applied/ignored status stored in AIInsightsStore
4. **Clean separation**: AI runs only on Analysis pages, Workspace reads results

---

## Timeline Mutation Rules

All edits modify the JSON model only. Remotion re-renders automatically.

### Allowed Mutations

| Operation | JSON Change | Effect |
|-----------|-------------|--------|
| **Split** | Creates 2 clips from 1; adjusts inPoint/outPoint | Clip divided at playhead |
| **Trim In** | Updates clip.inPoint | Start of clip moves forward |
| **Trim Out** | Updates clip.outPoint | End of clip moves backward |
| **Delete** | Removes clip from array | Clip removed from timeline |
| **Add Clip** | Appends new clip to array | New clip appears on track |

### Split Algorithm

```typescript
// Original clip: { inPoint: 0, outPoint: 10 }
// Split at playhead: 5

→ Clip 1: { inPoint: 0, outPoint: 5, label: "Clip (L)" }
→ Clip 2: { inPoint: 5, outPoint: 10, label: "Clip (R)" }
```

### Trim Algorithm

```typescript
// Original clip: { inPoint: 2, outPoint: 8 }
// Trim In to playhead: 4
→ { inPoint: 4, outPoint: 8 }  // Left portion removed

// Trim Out to playhead: 6
→ { inPoint: 2, outPoint: 6 }  // Right portion removed
```

### Invariants

1. `inPoint` must always be < `outPoint`
2. `inPoint` cannot be negative
3. Timeline duration = max(clip.outPoint for all clips)
4. Original video files are never modified

---

## Workspace State Management

The Electron workspace uses a centralized state management pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                    TimelineProvider                          │
│  (React Context + useReducer)                                │
├─────────────────────────────────────────────────────────────┤
│  State:                                                      │
│  ├── timeline: TimelineData     # Clips, transitions, etc   │
│  ├── playhead: number           # Current time in seconds   │
│  ├── isPlaying: boolean         # Playback state            │
│  ├── selectedClipId: string     # Currently selected clip   │
│  └── zoom: number               # Pixels per second         │
├─────────────────────────────────────────────────────────────┤
│  Actions:                                                    │
│  SET_PLAYHEAD, SET_PLAYING, ADD_CLIP, UPDATE_CLIP, etc      │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
      ┌──────────┐   ┌──────────┐   ┌──────────┐
      │ Timeline │   │ Preview  │   │ Inspector│
      │ Component│   │ Player   │   │ Panel    │
      └──────────┘   └──────────┘   └──────────┘
```

### Key Files
- `src/store/TimelineStore.tsx` - State management
- `src/types/timeline.ts` - TypeScript interfaces

---

## Preview ↔ Timeline Synchronization

Bidirectional sync between the timeline playhead and video player:

```
┌─────────────────┐                    ┌─────────────────┐
│    Timeline     │                    │  Video Element  │
│    Playhead     │ ─── seekTo() ───▶  │  (HTML5 <video>)│
│                 │                    │                 │
│    (state)      │ ◀── timeupdate ─── │  currentTime    │
└─────────────────┘                    └─────────────────┘
```

**Sync Rules:**
1. Clicking timeline ruler → updates playhead → syncs video currentTime
2. Playing video → timeupdate events → update playhead state
3. Transport controls → dispatch actions → sync both
4. Keyboard shortcuts (Space, arrows) → dispatch actions → sync both

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| Space | Play/Pause toggle |
| ← Arrow | Previous frame |
| → Arrow | Next frame |
| Home | Seek to start |
| End | Seek to end |

---

## Timeline Data Flow

```
User Action (click, keyboard, transport control)
         │
         ▼
    dispatch(action)
         │
         ▼
    timelineReducer()
         │
         ├── Updates state.playhead
         ├── Updates state.isPlaying
         └── Updates state.timeline
                  │
                  ▼
         React re-render
                  │
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
Timeline      Preview       Inspector
(playhead     (video        (clip props)
 position)    sync)
```

---

## Workspace Rendering Engine

The workspace uses **Remotion** for timeline-driven video preview rendering.

### Why Remotion?
- Frame-accurate video composition
- React-based declarative API
- No manual frame syncing required
- Supports speed changes, sequences, transitions
- In-browser playback via @remotion/player

### Rendering Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TimelineStore                             │
│  (timeline.json is source of truth)                          │
├─────────────────────────────────────────────────────────────┤
│  timeline.clips[] ──────────────────────────────────────────┼───┐
│  playhead ─────────────────────────────────────────────────┼───┤
│  isPlaying ────────────────────────────────────────────────┼───┤
└─────────────────────────────────────────────────────────────┘   │
                                                                  │
                                 ┌────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  RemotionPreview Component                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │               @remotion/player                          │ │
│  │                                                          │ │
│  │   ┌─────────────────────────────────────────────────┐   │ │
│  │   │         TimelineComposition                      │   │ │
│  │   │                                                   │   │ │
│  │   │   Sequence(clip1) ──▶ Video(src, startFrom)     │   │ │
│  │   │   Sequence(clip2) ──▶ Video(src, playbackRate)  │   │ │
│  │   │   Sequence(clip3) ──▶ ...                       │   │ │
│  │   │                                                   │   │ │
│  │   └─────────────────────────────────────────────────┘   │ │
│  │                                                          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| TimelineComposition | `src/remotion/TimelineComposition.tsx` | Maps clips to Remotion Sequences |
| RemotionPreview | `src/components/RemotionPreview.tsx` | Player wrapper with transport controls |
| MediaStore | `src/store/MediaStore.tsx` | Manages imported video files |

### Data Flow

1. **User imports video** → MediaStore.items updated
2. **User adds clip** → TimelineStore.clips updated
3. **Remotion Player renders** → TimelineComposition receives props
4. **Each clip** → Mapped to `<Sequence>` with `<Video>` child
5. **Playback syncs** → Player frame ↔ TimelineStore.playhead

### Video URL Mapping

```typescript
// MediaStore provides URL lookup
const mediaMap = new Map<string, string>();
mediaState.items.forEach(item => {
  map.set(item.id, item.path);  // sourceVideoId → video URL
});

// TimelineComposition uses mediaMap
const videoUrl = mediaMap.get(clip.sourceVideoId);
```

---

## Transitions & Effects Pipeline

Transitions are applied using Remotion's `interpolate` function for frame-accurate animation.

### Transition Rendering Flow

```
For each clip in timeline:
  1. Check for transition IN (from previous clip)
  2. Check for transition OUT (to next clip)
  3. Calculate opacity using interpolate():
     
     Fade In:
     opacity = interpolate(frame, [0, transitionFrames], [0, 1])
     
     Fade Out:
     opacity = interpolate(frame, [outStart, clipEnd], [1, 0])
  
  4. Apply opacity to <AbsoluteFill style={{ opacity }}>
```

### Speed Control Pipeline

```
Clip.speed → playbackRate prop → Remotion Video component

┌────────────────────────────────────────────┐
│  <Video                                    │
│    src={videoUrl}                          │
│    startFrom={inPoint * fps}               │
│    playbackRate={clip.speed}  ◀────────────│── SET_CLIP_SPEED action
│  />                                        │
└────────────────────────────────────────────┘
```

### Transition Types

| Type | Implementation |
|------|----------------|
| `cut` | No opacity change |
| `cross-dissolve` | Overlapping opacity fade (out + in) |
| `fade-in` | Opacity: 0 → 1 over duration |
| `fade-out` | Opacity: 1 → 0 over duration |

### Key Files

| File | Purpose |
|------|---------|
| `src/remotion/Transitions.tsx` | TransitionWrapper, Fade components |
| `src/remotion/TimelineComposition.tsx` | Applies transitions to clips |
| `src/store/TimelineStore.tsx` | ADD_TRANSITION, SET_CLIP_SPEED actions |
| `src/components/Inspector.tsx` | Transition/Speed UI controls |



