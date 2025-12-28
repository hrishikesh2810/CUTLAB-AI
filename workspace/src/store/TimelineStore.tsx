/**
 * Timeline Store - Central state management for the workspace
 * 
 * This is the single source of truth for timeline state.
 * All components read from and dispatch actions to this store.
 */

import { createContext, useContext, useReducer, ReactNode, useCallback, useRef, useEffect } from 'react';
import { TimelineData, TimelineClip, createEmptyTimeline, generateId } from '../types';

// ============================================================
// STATE INTERFACE
// ============================================================

export interface TimelineState {
    // Timeline data (the project)
    timeline: TimelineData;

    // Playhead position in seconds
    playhead: number;

    // Playback state
    isPlaying: boolean;

    // Selection state
    selectedClipId: string | null;

    // Zoom level (pixels per second)
    zoom: number;

    // Scroll position
    scrollX: number;
}

// ============================================================
// ACTIONS
// ============================================================

type TimelineAction =
    | { type: 'SET_TIMELINE'; payload: TimelineData }
    | { type: 'SET_PLAYHEAD'; payload: number }
    | { type: 'SET_PLAYING'; payload: boolean }
    | { type: 'TOGGLE_PLAY' }
    | { type: 'SELECT_CLIP'; payload: string | null }
    | { type: 'SET_ZOOM'; payload: number }
    | { type: 'SET_SCROLL'; payload: number }
    | { type: 'ADD_CLIP'; payload: Omit<TimelineClip, 'id' | 'position'> }
    | { type: 'UPDATE_CLIP'; payload: { id: string; updates: Partial<TimelineClip> } }
    | { type: 'REMOVE_CLIP'; payload: string }
    | { type: 'SEEK_FORWARD'; payload: number }
    | { type: 'SEEK_BACKWARD'; payload: number }
    | { type: 'SEEK_TO_START' }
    | { type: 'SEEK_TO_END' }
    // Editing actions
    | { type: 'SPLIT_CLIP'; payload: { clipId: string; splitTime: number } }
    | { type: 'TRIM_CLIP_IN'; payload: { clipId: string; newInPoint: number } }
    | { type: 'TRIM_CLIP_OUT'; payload: { clipId: string; newOutPoint: number } }
    | { type: 'SPLIT_CLIP_AT_PLAYHEAD'; payload: string };

// ============================================================
// REDUCER
// ============================================================

function timelineReducer(state: TimelineState, action: TimelineAction): TimelineState {
    switch (action.type) {
        case 'SET_TIMELINE':
            return {
                ...state,
                timeline: action.payload,
            };

        case 'SET_PLAYHEAD': {
            // Clamp playhead to valid range
            const maxTime = state.timeline.duration || 0;
            const newPlayhead = Math.max(0, Math.min(action.payload, maxTime));
            return {
                ...state,
                playhead: newPlayhead,
            };
        }

        case 'SET_PLAYING':
            return {
                ...state,
                isPlaying: action.payload,
            };

        case 'TOGGLE_PLAY':
            return {
                ...state,
                isPlaying: !state.isPlaying,
            };

        case 'SELECT_CLIP':
            return {
                ...state,
                selectedClipId: action.payload,
            };

        case 'SET_ZOOM':
            // Clamp zoom between 10 and 200 pixels per second
            return {
                ...state,
                zoom: Math.max(10, Math.min(200, action.payload)),
            };

        case 'SET_SCROLL':
            return {
                ...state,
                scrollX: Math.max(0, action.payload),
            };

        case 'ADD_CLIP': {
            const newClip: TimelineClip = {
                ...action.payload,
                id: generateId('clip'),
                position: state.timeline.clips.length,
            };

            // Calculate new duration
            const clipEnd = newClip.outPoint;
            const newDuration = Math.max(state.timeline.duration, clipEnd);

            return {
                ...state,
                timeline: {
                    ...state.timeline,
                    clips: [...state.timeline.clips, newClip],
                    duration: newDuration,
                    updatedAt: new Date().toISOString(),
                },
            };
        }

        case 'UPDATE_CLIP': {
            const updatedClips = state.timeline.clips.map(clip =>
                clip.id === action.payload.id
                    ? { ...clip, ...action.payload.updates }
                    : clip
            );

            // Recalculate duration
            const maxEnd = Math.max(...updatedClips.map(c => c.outPoint), 0);

            return {
                ...state,
                timeline: {
                    ...state.timeline,
                    clips: updatedClips,
                    duration: maxEnd,
                    updatedAt: new Date().toISOString(),
                },
            };
        }

        case 'REMOVE_CLIP': {
            const filteredClips = state.timeline.clips
                .filter(c => c.id !== action.payload)
                .map((c, i) => ({ ...c, position: i }));

            const maxEnd = Math.max(...filteredClips.map(c => c.outPoint), 0);

            return {
                ...state,
                timeline: {
                    ...state.timeline,
                    clips: filteredClips,
                    duration: maxEnd,
                    updatedAt: new Date().toISOString(),
                },
                selectedClipId: state.selectedClipId === action.payload ? null : state.selectedClipId,
            };
        }

        case 'SEEK_FORWARD':
            return {
                ...state,
                playhead: Math.min(state.playhead + action.payload, state.timeline.duration),
            };

        case 'SEEK_BACKWARD':
            return {
                ...state,
                playhead: Math.max(state.playhead - action.payload, 0),
            };

        case 'SEEK_TO_START':
            return {
                ...state,
                playhead: 0,
            };

        case 'SEEK_TO_END':
            return {
                ...state,
                playhead: state.timeline.duration,
            };

        // ============================================================
        // EDITING ACTIONS - Non-destructive JSON mutations
        // ============================================================

        case 'SPLIT_CLIP': {
            const { clipId, splitTime } = action.payload;
            const clipIndex = state.timeline.clips.findIndex(c => c.id === clipId);

            if (clipIndex === -1) return state;

            const originalClip = state.timeline.clips[clipIndex];

            // Validate split time is within clip bounds
            if (splitTime <= originalClip.inPoint || splitTime >= originalClip.outPoint) {
                return state;
            }

            // Create two new clips from the original
            const clip1: TimelineClip = {
                ...originalClip,
                id: generateId('clip'),
                outPoint: splitTime,
                label: `${originalClip.label} (L)`,
            };

            const clip2: TimelineClip = {
                ...originalClip,
                id: generateId('clip'),
                inPoint: splitTime,
                label: `${originalClip.label} (R)`,
                position: originalClip.position + 1,
            };

            // Replace original with two new clips
            const newClips = [
                ...state.timeline.clips.slice(0, clipIndex),
                clip1,
                clip2,
                ...state.timeline.clips.slice(clipIndex + 1),
            ].map((c, i) => ({ ...c, position: i }));

            return {
                ...state,
                timeline: {
                    ...state.timeline,
                    clips: newClips,
                    updatedAt: new Date().toISOString(),
                },
                selectedClipId: clip1.id, // Select the left part
            };
        }

        case 'SPLIT_CLIP_AT_PLAYHEAD': {
            const clipId = action.payload;
            const clip = state.timeline.clips.find(c => c.id === clipId);

            if (!clip) return state;

            // Check if playhead is within this clip
            if (state.playhead <= clip.inPoint || state.playhead >= clip.outPoint) {
                return state;
            }

            // Delegate to SPLIT_CLIP action
            return timelineReducer(state, {
                type: 'SPLIT_CLIP',
                payload: { clipId, splitTime: state.playhead },
            });
        }

        case 'TRIM_CLIP_IN': {
            const { clipId, newInPoint } = action.payload;
            const clipIndex = state.timeline.clips.findIndex(c => c.id === clipId);

            if (clipIndex === -1) return state;

            const clip = state.timeline.clips[clipIndex];

            // Validate: in point must be before out point
            if (newInPoint >= clip.outPoint || newInPoint < 0) {
                return state;
            }

            const updatedClips = state.timeline.clips.map(c =>
                c.id === clipId
                    ? { ...c, inPoint: newInPoint }
                    : c
            );

            // Recalculate duration
            const maxEnd = Math.max(...updatedClips.map(c => c.outPoint), 0);

            return {
                ...state,
                timeline: {
                    ...state.timeline,
                    clips: updatedClips,
                    duration: maxEnd,
                    updatedAt: new Date().toISOString(),
                },
            };
        }

        case 'TRIM_CLIP_OUT': {
            const { clipId, newOutPoint } = action.payload;
            const clipIndex = state.timeline.clips.findIndex(c => c.id === clipId);

            if (clipIndex === -1) return state;

            const clip = state.timeline.clips[clipIndex];

            // Validate: out point must be after in point
            if (newOutPoint <= clip.inPoint) {
                return state;
            }

            const updatedClips = state.timeline.clips.map(c =>
                c.id === clipId
                    ? { ...c, outPoint: newOutPoint }
                    : c
            );

            // Recalculate duration
            const maxEnd = Math.max(...updatedClips.map(c => c.outPoint), 0);

            return {
                ...state,
                timeline: {
                    ...state.timeline,
                    clips: updatedClips,
                    duration: maxEnd,
                    updatedAt: new Date().toISOString(),
                },
            };
        }

        default:
            return state;
    }
}

// ============================================================
// INITIAL STATE
// ============================================================

const initialState: TimelineState = {
    timeline: createEmptyTimeline('workspace_project'),
    playhead: 0,
    isPlaying: false,
    selectedClipId: null,
    zoom: 50, // 50 pixels per second
    scrollX: 0,
};

// ============================================================
// CONTEXT
// ============================================================

interface TimelineContextValue {
    state: TimelineState;
    dispatch: React.Dispatch<TimelineAction>;

    // Convenience methods
    setPlayhead: (time: number) => void;
    play: () => void;
    pause: () => void;
    togglePlay: () => void;
    seekTo: (time: number) => void;
    selectClip: (id: string | null) => void;

    // Editing methods
    splitClipAtPlayhead: (clipId: string) => void;
    splitClip: (clipId: string, time: number) => void;
    trimClipIn: (clipId: string, newInPoint: number) => void;
    trimClipOut: (clipId: string, newOutPoint: number) => void;
    deleteSelectedClip: () => void;

    // Video element ref for synchronization
    videoRef: React.RefObject<HTMLVideoElement>;
}

const TimelineContext = createContext<TimelineContextValue | null>(null);

// ============================================================
// PROVIDER
// ============================================================

interface TimelineProviderProps {
    children: ReactNode;
    initialTimeline?: TimelineData;
}

export function TimelineProvider({ children, initialTimeline }: TimelineProviderProps) {
    const [state, dispatch] = useReducer(
        timelineReducer,
        initialTimeline
            ? { ...initialState, timeline: initialTimeline }
            : initialState
    );

    const videoRef = useRef<HTMLVideoElement>(null);

    // Convenience methods
    const setPlayhead = useCallback((time: number) => {
        dispatch({ type: 'SET_PLAYHEAD', payload: time });
    }, []);

    const play = useCallback(() => {
        dispatch({ type: 'SET_PLAYING', payload: true });
    }, []);

    const pause = useCallback(() => {
        dispatch({ type: 'SET_PLAYING', payload: false });
    }, []);

    const togglePlay = useCallback(() => {
        dispatch({ type: 'TOGGLE_PLAY' });
    }, []);

    const seekTo = useCallback((time: number) => {
        dispatch({ type: 'SET_PLAYHEAD', payload: time });
        // Sync video element
        if (videoRef.current) {
            videoRef.current.currentTime = time;
        }
    }, []);

    const selectClip = useCallback((id: string | null) => {
        dispatch({ type: 'SELECT_CLIP', payload: id });
    }, []);

    // Editing methods
    const splitClipAtPlayhead = useCallback((clipId: string) => {
        dispatch({ type: 'SPLIT_CLIP_AT_PLAYHEAD', payload: clipId });
    }, []);

    const splitClip = useCallback((clipId: string, time: number) => {
        dispatch({ type: 'SPLIT_CLIP', payload: { clipId, splitTime: time } });
    }, []);

    const trimClipIn = useCallback((clipId: string, newInPoint: number) => {
        dispatch({ type: 'TRIM_CLIP_IN', payload: { clipId, newInPoint } });
    }, []);

    const trimClipOut = useCallback((clipId: string, newOutPoint: number) => {
        dispatch({ type: 'TRIM_CLIP_OUT', payload: { clipId, newOutPoint } });
    }, []);

    const deleteSelectedClip = useCallback(() => {
        if (state.selectedClipId) {
            dispatch({ type: 'REMOVE_CLIP', payload: state.selectedClipId });
        }
    }, [state.selectedClipId]);

    // Sync video playback with isPlaying state
    useEffect(() => {
        if (!videoRef.current) return;

        if (state.isPlaying) {
            videoRef.current.play().catch(() => {
                // Autoplay was prevented
                dispatch({ type: 'SET_PLAYING', payload: false });
            });
        } else {
            videoRef.current.pause();
        }
    }, [state.isPlaying]);

    // Sync playhead when video time updates
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            if (state.isPlaying) {
                dispatch({ type: 'SET_PLAYHEAD', payload: video.currentTime });
            }
        };

        const handleEnded = () => {
            dispatch({ type: 'SET_PLAYING', payload: false });
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('ended', handleEnded);
        };
    }, [state.isPlaying]);

    const value: TimelineContextValue = {
        state,
        dispatch,
        setPlayhead,
        play,
        pause,
        togglePlay,
        seekTo,
        selectClip,
        // Editing
        splitClipAtPlayhead,
        splitClip,
        trimClipIn,
        trimClipOut,
        deleteSelectedClip,
        videoRef,
    };

    return (
        <TimelineContext.Provider value={value}>
            {children}
        </TimelineContext.Provider>
    );
}

// ============================================================
// HOOK
// ============================================================

export function useTimeline(): TimelineContextValue {
    const context = useContext(TimelineContext);
    if (!context) {
        throw new Error('useTimeline must be used within a TimelineProvider');
    }
    return context;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Convert seconds to timecode string (HH:MM:SS:FF)
 */
export function formatTimecode(seconds: number, fps: number = 30): string {
    const totalFrames = Math.floor(seconds * fps);
    const frames = totalFrames % fps;
    const totalSeconds = Math.floor(seconds);
    const secs = totalSeconds % 60;
    const mins = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600);

    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}

/**
 * Convert seconds to simple time string (M:SS.ms)
 */
export function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);

    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

/**
 * Get clip at a specific time position
 */
export function getClipAtTime(clips: TimelineClip[], time: number): TimelineClip | null {
    return clips.find(clip => time >= clip.inPoint && time < clip.outPoint) || null;
}
