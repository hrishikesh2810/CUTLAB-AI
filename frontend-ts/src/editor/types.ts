/**
 * Video Editor - Types
 * ====================
 * TypeScript interfaces for the video editor components.
 */

export interface VideoFile {
    video_id: string;
    filename: string;
    duration: number;
    fps: number;
    width: number;
    height: number;
    url?: string;
}

export interface Scene {
    start: number;
    end: number;
}

export interface TimelineClip {
    clip_id: string;
    name: string;
    start: number;      // Timeline start position (seconds)
    end: number;        // Timeline end position (seconds)
    sourceStart: number; // Source video start
    sourceEnd: number;   // Source video end
    color: string;
    track: number;
}

export interface VideoFilters {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
    grayscale: number;
    sepia: number;
    hueRotate: number;
}

export interface Caption {
    start: number;
    end: number;
    text: string;
}

export interface EditorState {
    video: VideoFile | null;
    scenes: Scene[];
    clips: TimelineClip[];
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    isLoading: boolean;
    error: string | null;
    zoom: number;  // pixels per second
    selectedClipId: string | null;
    filters: VideoFilters;
    captions: Caption[];
    isGeneratingCaptions: boolean;
    showCaptions: boolean;
}
