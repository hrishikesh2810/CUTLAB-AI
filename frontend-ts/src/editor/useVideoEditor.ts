/**
 * Video Editor - Custom Hook
 * ==========================
 * Manages state and logic for the video editor.
 * Automatically syncs with dashboard-uploaded videos.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { VideoFile, Scene, TimelineClip, EditorState } from './types';
import * as api from './api';

const CLIP_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
];

export function useVideoEditor() {
    const [state, setState] = useState<EditorState>({
        video: null,
        scenes: [],
        clips: [],
        currentTime: 0,
        duration: 0,
        isPlaying: false,
        isLoading: false,
        error: null,
        zoom: 50, // 50 pixels per second
        selectedClipId: null,
    });

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hasLoadedDashboardProject = useRef(false);

    // Set video element reference
    const setVideoRef = useCallback((ref: HTMLVideoElement | null) => {
        videoRef.current = ref;
    }, []);

    // Update state helper
    const updateState = useCallback((updates: Partial<EditorState>) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    // Load video from dashboard project
    const loadDashboardProject = useCallback(async (projectId: string) => {
        updateState({ isLoading: true, error: null });

        try {
            const project = await api.getDashboardProject(projectId);

            if (!project || project.status !== 'success') {
                throw new Error('Project not found');
            }

            const { metadata, scenes: projectScenes } = project;

            // Create video file object
            const video: VideoFile = {
                video_id: projectId,
                filename: metadata.filename,
                duration: metadata.duration,
                fps: metadata.fps,
                width: metadata.width,
                height: metadata.height,
                url: api.getDashboardVideoUrl(projectId), // Uses main backend
            };

            // Convert scenes to clips if available
            const scenes: Scene[] = projectScenes?.map(s => ({
                start: s.start_time,
                end: s.end_time,
            })) || [];

            const clips: TimelineClip[] = scenes.map((scene, index) => ({
                clip_id: `clip_${index}`,
                name: `Scene ${index + 1}`,
                start: scene.start,
                end: scene.end,
                sourceStart: scene.start,
                sourceEnd: scene.end,
                color: CLIP_COLORS[index % CLIP_COLORS.length],
                track: 0,
            }));

            updateState({
                video,
                scenes,
                clips,
                duration: metadata.duration,
                currentTime: 0,
                isLoading: false,
            });

            console.log('✅ Loaded dashboard project:', projectId);
            return video;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load project';
            updateState({ isLoading: false, error: message });
            console.error('Failed to load dashboard project:', error);
            return null;
        }
    }, [updateState]);

    // Auto-load dashboard project on mount
    useEffect(() => {
        if (hasLoadedDashboardProject.current) return;
        hasLoadedDashboardProject.current = true;

        const loadFromDashboard = async () => {
            // Check localStorage for saved project ID
            const savedProjectId = api.getSavedProjectId();

            if (savedProjectId) {
                console.log('📂 Found saved project:', savedProjectId);
                await loadDashboardProject(savedProjectId);
                return;
            }

            // Otherwise, check if there are any projects in the dashboard
            try {
                const { projects } = await api.getDashboardProjects();

                if (projects && projects.length > 0) {
                    // Load the most recent project (first in list)
                    const latestProject = projects[0];
                    console.log('📂 Loading latest project:', latestProject.project_id);
                    await loadDashboardProject(latestProject.project_id);
                }
            } catch (error) {
                console.log('No dashboard projects found');
            }
        };

        loadFromDashboard();
    }, [loadDashboardProject]);

    // Import video (upload new)
    const importVideo = useCallback(async (file: File) => {
        updateState({ isLoading: true, error: null });

        try {
            const response = await api.uploadVideo(file);

            // Get file extension from original filename
            const ext = file.name.split('.').pop() || 'mp4';

            const video: VideoFile = {
                video_id: response.video_id,
                filename: response.filename,
                duration: response.duration,
                fps: response.fps,
                width: response.width,
                height: response.height,
                url: api.getVideoUrl(response.video_id, ext),
            };

            updateState({
                video,
                duration: response.duration,
                scenes: [],
                clips: [],
                currentTime: 0,
                isLoading: false,
            });

            return video;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Upload failed';
            updateState({ isLoading: false, error: message });
            throw error;
        }
    }, [updateState]);

    // Detect scenes
    const detectScenes = useCallback(async (preset?: string) => {
        if (!state.video) {
            updateState({ error: 'No video loaded' });
            return;
        }

        updateState({ isLoading: true, error: null });

        try {
            // Check if this is a dashboard project (has scenes from main API)
            const savedProjectId = api.getSavedProjectId();

            if (savedProjectId === state.video.video_id && state.scenes.length > 0) {
                // Already have scenes from dashboard, use them
                updateState({ isLoading: false });
                return { scenes: state.scenes };
            }

            // Otherwise, use editor API for new uploads
            const response = await api.detectScenes(state.video.video_id, preset);

            // Convert scenes to clips
            const clips: TimelineClip[] = response.scenes.map((scene, index) => ({
                clip_id: `clip_${index}`,
                name: `Scene ${index + 1}`,
                start: scene.start,
                end: scene.end,
                sourceStart: scene.start,
                sourceEnd: scene.end,
                color: CLIP_COLORS[index % CLIP_COLORS.length],
                track: 0,
            }));

            updateState({
                scenes: response.scenes,
                clips,
                isLoading: false,
            });

            return response;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Scene detection failed';
            updateState({ isLoading: false, error: message });
            throw error;
        }
    }, [state.video, state.scenes, updateState]);

    // Seek to time
    const seekTo = useCallback((time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            updateState({ currentTime: time });
        }
    }, [updateState]);

    // Play/Pause
    const togglePlay = useCallback(() => {
        if (videoRef.current) {
            if (state.isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            updateState({ isPlaying: !state.isPlaying });
        }
    }, [state.isPlaying, updateState]);

    // Update current time (called from video timeupdate event)
    const onTimeUpdate = useCallback((time: number) => {
        updateState({ currentTime: time });
    }, [updateState]);

    // Select clip
    const selectClip = useCallback((clipId: string | null) => {
        updateState({ selectedClipId: clipId });

        // Seek to clip start if selecting
        if (clipId) {
            const clip = state.clips.find(c => c.clip_id === clipId);
            if (clip) {
                seekTo(clip.start);
            }
        }
    }, [state.clips, updateState, seekTo]);

    // Zoom timeline
    const setZoom = useCallback((zoom: number) => {
        updateState({ zoom: Math.max(10, Math.min(200, zoom)) });
    }, [updateState]);

    // Clear error
    const clearError = useCallback(() => {
        updateState({ error: null });
    }, [updateState]);

    // Reload from dashboard
    const reloadFromDashboard = useCallback(async () => {
        const savedProjectId = api.getSavedProjectId();
        if (savedProjectId) {
            await loadDashboardProject(savedProjectId);
        }
    }, [loadDashboardProject]);

    return {
        state,
        videoRef,
        setVideoRef,
        importVideo,
        detectScenes,
        seekTo,
        togglePlay,
        onTimeUpdate,
        selectClip,
        setZoom,
        clearError,
        loadDashboardProject,
        reloadFromDashboard,
    };
}
