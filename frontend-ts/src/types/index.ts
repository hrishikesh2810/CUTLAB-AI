// Project Types
export interface ProjectMetadata {
    filename: string;
    duration: number;
    fps: number;
    width: number;
    height: number;
    has_audio: boolean;
}

export interface Project {
    project_id: string;
    filename: string;
    duration: number;
    fps: number;
    width: number;
    height: number;
    has_audio: boolean;
}

// Scene Types
export interface Scene {
    scene_id: number;
    start_time: number;
    end_time: number;
    start_frame?: number;
    end_frame?: number;
    duration?: number;
}

// Suggestion Types
export interface SuggestionMetrics {
    motion_intensity: number;
    silence_level: number;
    audio_energy: number;
    has_faces: boolean;
    repetitiveness: number;
    duration: number;
    has_audio_peaks?: boolean;
    peak_count?: number;
}

export interface CutSuggestion {
    scene_id: number;
    cut_start: string;
    cut_end: string;
    start_seconds: number;
    end_seconds: number;
    confidence: number;
    suggestion_type: string;
    reason: string;
    audio_label: string;
    metrics: SuggestionMetrics;
}

// Timeline Types
export interface TimelineClip {
    clip_id: string;
    label: string;
    source_video: string;
    source_filename?: string;
    start_seconds: number;
    end_seconds: number;
    duration: number;
    speed: number;
    start_formatted?: string;
    end_formatted?: string;
    duration_formatted?: string;
    transform?: {
        scale: number;
        x: number;
        y: number;
    };
}

export interface Transition {
    from_clip_id: string;
    to_clip_id: string;
    type: 'cut' | 'cross-dissolve' | 'fade-in' | 'fade-out' | 'fade-in-out';
    duration: number;
}

export interface Timeline {
    clips: TimelineClip[];
    duration: number;
    transitions: Transition[];
}

// API Response Types
export interface ProjectsResponse {
    status: string;
    count: number;
    projects: Project[];
}

export interface ProjectResponse {
    status: string;
    project_id: string;
    metadata: ProjectMetadata;
    scenes: Scene[] | null;
    suggestions: CutSuggestion[] | null;
}

export interface UploadResponse {
    status: string;
    project_id: string;
    metadata: ProjectMetadata;
    message: string;
}

export interface ScenesResponse {
    status: string;
    project_id: string;
    scene_count: number;
    scenes: Scene[];
}

export interface SuggestionsResponse {
    status: string;
    project_id: string;
    suggestion_count: number;
    suggestions: CutSuggestion[];
}

export interface TimelineResponse {
    status: string;
    timeline: Timeline;
}

// UI State Types
export interface SequenceSettings {
    width: number;
    height: number;
    fps: number;
}

export type TabType = 'upload' | 'analysis' | 'suggestions' | 'editor' | 'export';
