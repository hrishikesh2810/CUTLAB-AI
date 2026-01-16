/**
 * Video Editor - API Service
 * ==========================
 * Handles communication with both the video editor backend (8001)
 * and the main CUTLAB backend (8000) for dashboard integration.
 */

// Editor API (new simplified backend)
const EDITOR_API = 'http://127.0.0.1:8001';

// Main CUTLAB API (dashboard backend)
const MAIN_API = 'http://127.0.0.1:8000';

export interface UploadResponse {
    video_id: string;
    filename: string;
    duration: number;
    fps: number;
    width: number;
    height: number;
}

export interface SceneDetectResponse {
    video_id: string;
    scene_count: number;
    scenes: { start: number; end: number }[];
    config: {
        threshold: number;
        min_scene_length: number;
        shake_threshold: number;
        preset: string | null;
    };
}

export interface TimelineResponse {
    video_id: string;
    clips: {
        clip_id: string;
        start: number;
        end: number;
        duration: number;
        track: number;
        source_start: number;
        source_end: number;
    }[];
    total_duration: number;
}

// Dashboard project interface
export interface DashboardProject {
    project_id: string;
    filename: string;
    duration: number;
    fps: number;
    width: number;
    height: number;
    has_audio: boolean;
}

export interface DashboardProjectResponse {
    status: string;
    project_id: string;
    metadata: {
        filename: string;
        duration: number;
        fps: number;
        width: number;
        height: number;
        has_audio: boolean;
    };
    scenes: { scene_id: number; start_time: number; end_time: number }[] | null;
    suggestions: unknown[] | null;
}

// =========================================================================
// EDITOR API (port 8001)
// =========================================================================

/**
 * Upload a video file to the editor backend.
 */
export async function uploadVideo(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${EDITOR_API}/upload-video`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
}

/**
 * Detect scenes in an uploaded video (editor backend).
 */
export async function detectScenes(
    videoId: string,
    preset?: string
): Promise<SceneDetectResponse> {
    const params = new URLSearchParams();
    if (preset) {
        params.append('preset', preset);
    }

    const url = `${EDITOR_API}/scene-detect/${videoId}?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Scene detection failed');
    }

    return response.json();
}

/**
 * Get timeline for a video.
 */
export async function getTimeline(videoId: string): Promise<TimelineResponse> {
    const response = await fetch(`${EDITOR_API}/timeline/${videoId}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get timeline');
    }

    return response.json();
}

/**
 * Get video file URL from editor backend.
 */
export function getVideoUrl(videoId: string, extension: string = 'mp4'): string {
    return `${EDITOR_API}/uploads/${videoId}.${extension}`;
}

// =========================================================================
// MAIN CUTLAB API (port 8000) - Dashboard Integration
// =========================================================================

/**
 * Get project from dashboard backend.
 */
export async function getDashboardProject(projectId: string): Promise<DashboardProjectResponse> {
    const response = await fetch(`${MAIN_API}/project/${projectId}`);

    if (!response.ok) {
        throw new Error('Failed to fetch dashboard project');
    }

    return response.json();
}

/**
 * Get list of projects from dashboard.
 */
export async function getDashboardProjects(): Promise<{ projects: DashboardProject[] }> {
    const response = await fetch(`${MAIN_API}/projects`);

    if (!response.ok) {
        throw new Error('Failed to fetch projects');
    }

    return response.json();
}

/**
 * Get video URL from main backend storage.
 */
export function getDashboardVideoUrl(projectId: string): string {
    // The main backend stores videos in storage/videos/{project_id}.ext
    // We need to find the extension - try common ones
    return `${MAIN_API}/video/${projectId}`;
}

/**
 * Get scenes from dashboard project.
 */
export async function getDashboardScenes(projectId: string): Promise<{
    scenes: { scene_id: number; start_time: number; end_time: number }[];
}> {
    const project = await getDashboardProject(projectId);
    return {
        scenes: project.scenes || [],
    };
}

/**
 * Get saved project ID from localStorage (synced with dashboard).
 */
export function getSavedProjectId(): string | null {
    // Dashboard saves to 'cutlab_active_project'
    return localStorage.getItem('cutlab_active_project');
}

/**
 * Check if a project exists in the dashboard.
 */
// ... (previous code)

/**
 * Check if a project exists in the dashboard.
 */
export async function checkDashboardProject(projectId: string): Promise<DashboardProjectResponse | null> {
    try {
        return await getDashboardProject(projectId);
    } catch {
        return null;
    }
}

// =========================================================================
// CAPTION API
// =========================================================================

import type { Caption } from './types';

export interface CaptionResponse {
    status: string;
    project_id: string;
    captions: Caption[];
}

/**
 * Generate captions using OpenAI Whisper (Main Backend)
 */
export async function generateCaptions(projectId: string): Promise<CaptionResponse> {
    const response = await fetch(`${MAIN_API}/generate-captions/${projectId}`, {
        method: 'POST',
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Caption generation failed');
    }

    return response.json();
}

/**
 * AI Content Analysis (Main Backend)
 */
export async function analyzeContent(data: {
    captions: Caption[];
    timeline: any[];
    video_duration: number;
}): Promise<any> {
    const response = await fetch(`${MAIN_API}/ai/content/analyze`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Content analysis failed');
    }

    return response.json();
}
