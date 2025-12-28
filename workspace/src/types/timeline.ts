/**
 * CUTLAB AI Timeline Data Model
 * 
 * This is the JSON structure that represents the entire timeline.
 * The workspace editor reads/writes this format.
 * The Python backend (AI Engine) can also read/produce this format.
 */

// Individual clip on the timeline
export interface TimelineClip {
    id: string;                    // Unique clip identifier
    sourceVideoId: string;         // Reference to source video file
    sourceFilename: string;        // Original filename
    inPoint: number;               // Start position in source (seconds)
    outPoint: number;              // End position in source (seconds)
    position: number;              // Position on timeline (order index)
    speed: number;                 // Playback speed (1.0 = normal)
    label: string;                 // Display name
}

// Transition between clips
export interface TimelineTransition {
    id: string;                    // Unique transition identifier
    fromClipId: string;            // Clip before transition
    toClipId: string;              // Clip after transition
    type: TransitionType;          // Transition effect type
    duration: number;              // Duration in seconds
}

// Supported transition types
export type TransitionType =
    | 'cut'              // Hard cut (instant)
    | 'cross-dissolve'   // Blend between clips
    | 'fade-in'          // Fade from black
    | 'fade-out'         // Fade to black
    | 'fade-in-out';     // Fade out then in

// Timeline marker (for important points)
export interface TimelineMarker {
    id: string;
    position: number;              // Position in seconds
    label: string;
    color: string;
    type: 'audio-peak' | 'scene-change' | 'user' | 'ai-suggestion';
}

// Complete timeline data structure
export interface TimelineData {
    version: string;               // Schema version (e.g., "1.0")
    projectId: string;             // Project identifier
    createdAt: string;             // ISO timestamp
    updatedAt: string;             // ISO timestamp

    // Timeline content
    clips: TimelineClip[];
    transitions: TimelineTransition[];
    markers: TimelineMarker[];

    // Timeline duration (auto-calculated)
    duration: number;

    // Project settings
    settings: {
        fps: number;
        width: number;
        height: number;
    };
}

// Media item in the bin
export interface MediaItem {
    id: string;
    filename: string;
    path: string;
    duration: number;
    width: number;
    height: number;
    fps: number;
    hasAudio: boolean;
    thumbnailUrl?: string;
}

// Create empty timeline
export function createEmptyTimeline(projectId: string): TimelineData {
    return {
        version: '1.0',
        projectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        clips: [],
        transitions: [],
        markers: [],
        duration: 0,
        settings: {
            fps: 30,
            width: 1920,
            height: 1080,
        },
    };
}

// Generate unique ID
export function generateId(prefix: string = 'item'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
