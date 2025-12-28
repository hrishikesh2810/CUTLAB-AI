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
    | { type: 'SEEK_TO_END' };

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
