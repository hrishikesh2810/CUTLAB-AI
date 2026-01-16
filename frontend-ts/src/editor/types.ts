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

export interface CaptionStyle {
    fontFamily: string;
    fontSize: number;
    color: string;
    backgroundColor: string;
    fontWeight: string;
    fontStyle: string;
}

export interface CaptionPosition {
    x: number; // Percentage 0-100
    y: number; // Percentage 0-100
}

// Common interface for overlay items
export interface OverlayItem {
    id: string;
    text: string;
    start: number;
    end: number;
    style?: CaptionStyle;
    position?: CaptionPosition;
}

export interface Caption extends OverlayItem {
    // Legacy support if needed, but OverlayItem covers it
}

export interface TextOverlay extends OverlayItem {
    // Specific text overlay properties if any
}

export interface CaptionSettings {
    style: CaptionStyle;
    position: CaptionPosition;
}

export interface AIContentAnalysis {
    smart_jump_cuts: Array<{ start: number; end: number }>;
    highlight_segments: Array<{ start: number; end: number; sentiment: string }>;
    engagement_segments: Array<{ start: number; end: number }>;
    intro_segment: { start: number; end: number } | null;
    punched_up_captions: Caption[];
}

export interface AIContentEffectsState {
    smartJumpCuts: boolean;
    highlightMoments: boolean;
    engagementBoost: boolean;
    captionPunchUp: boolean;
    autoIntroTrim: boolean;
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
    textOverlays: TextOverlay[]; // Added for manual text
    isGeneratingCaptions: boolean;
    showCaptions: boolean;
    captionSettings: CaptionSettings;
    aiContentAnalysis: AIContentAnalysis | null;
    aiContentEffects: AIContentEffectsState;
}

