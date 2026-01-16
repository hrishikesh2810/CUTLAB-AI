/**
 * Video Editor - Custom Hook
 * ==========================
 * Manages state and logic for the video editor.
 * Automatically syncs with dashboard-uploaded videos.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { VideoFile, Scene, TimelineClip, EditorState, VideoFilters, TextOverlay, Caption } from './types';
import * as api from './api';
import { DEFAULT_FILTERS } from './filterUtils';

const CLIP_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
];

export function useVideoEditor(projectId?: string | null) {
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
        filters: DEFAULT_FILTERS,
        captions: [],
        textOverlays: [],
        isGeneratingCaptions: false,
        showCaptions: false,
        captionSettings: {
            style: {
                fontFamily: 'Inter',
                fontSize: 24,
                color: '#ffffff',
                backgroundColor: 'rgba(0,0,0,0.5)',
                fontWeight: 'normal',
                fontStyle: 'normal',
            },
            position: { x: 50, y: 90 },
        },
        aiContentAnalysis: null,
        aiContentEffects: {
            smartJumpCuts: true,
            highlightMoments: true,
            engagementBoost: false,
            captionPunchUp: true,
            autoIntroTrim: false,
        },
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

    // Set Filters
    const setFilters = useCallback((filters: VideoFilters) => {
        updateState({ filters });
    }, [updateState]);

    // Set Caption Settings
    const setCaptionSettings = useCallback((settings: Partial<EditorState['captionSettings']>) => {
        setState(prev => ({
            ...prev,
            captionSettings: { ...prev.captionSettings, ...settings }
        }));
    }, []);

    // Add Text Overlay
    const addTextOverlay = useCallback((text: string = 'New Text') => {
        const newOverlay: TextOverlay = {
            id: crypto.randomUUID(),
            text,
            start: state.currentTime,
            end: state.currentTime + 3, // Default 3 seconds
            style: { ...state.captionSettings.style }, // Inherit current style
            position: { x: 50, y: 50 }, // Center
        };
        updateState({ textOverlays: [...state.textOverlays, newOverlay] });
    }, [state.currentTime, state.captionSettings.style, state.textOverlays, updateState]);

    // Update Text Overlay
    const updateTextOverlay = useCallback((id: string, updates: Partial<TextOverlay>) => {
        const newOverlays = state.textOverlays.map(o =>
            o.id === id ? { ...o, ...updates } : o
        );
        updateState({ textOverlays: newOverlays });
    }, [state.textOverlays, updateState]);

    // Remove Text Overlay
    const removeTextOverlay = useCallback((id: string) => {
        updateState({ textOverlays: state.textOverlays.filter(o => o.id !== id) });
    }, [state.textOverlays, updateState]);


    // Load video from dashboard project
    const loadDashboardProject = useCallback(async (id: string) => {
        updateState({ isLoading: true, error: null });

        try {
            const project = await api.getDashboardProject(id);

            if (!project || project.status !== 'success') {
                throw new Error('Project not found');
            }

            const { metadata, scenes: projectScenes } = project;

            // Create video file object
            const video: VideoFile = {
                video_id: id,
                filename: metadata.filename,
                duration: metadata.duration,
                fps: metadata.fps,
                width: metadata.width,
                height: metadata.height,
                url: api.getDashboardVideoUrl(id), // Uses main backend
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
                filters: DEFAULT_FILTERS, // Reset filters on new project load
                captions: [], // Reset captions on new project load
                isGeneratingCaptions: false,
                showCaptions: false,
            });

            console.log('✅ Loaded dashboard project:', id);
            return video;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load project';
            updateState({ isLoading: false, error: message });
            console.error('Failed to load dashboard project:', error);
            return null;
        }
    }, [updateState]);

    // Auto-load dashboard project on changes or mount
    useEffect(() => {
        if (projectId) {
            loadDashboardProject(projectId);
        } else if (!hasLoadedDashboardProject.current) {
            // Only try auto-loading if no prop provided and not already done
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
        }
    }, [projectId, loadDashboardProject]);

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
                filters: DEFAULT_FILTERS,
                captions: [], // Reset captions on new import
                isGeneratingCaptions: false,
                showCaptions: false,
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

    // Generate Captions
    const generateCaptions = useCallback(async () => {
        if (!state.video) return;

        updateState({ isGeneratingCaptions: true, error: null });

        try {
            const response = await api.generateCaptions(state.video.video_id);
            updateState({
                captions: response.captions,
                isGeneratingCaptions: false,
                showCaptions: true // Auto-show after generation
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Caption generation failed';
            updateState({ isGeneratingCaptions: false, error: message });
        }
    }, [state.video, updateState]);

    // Toggle Captions
    const toggleCaptions = useCallback(() => {
        updateState({ showCaptions: !state.showCaptions });
    }, [state.showCaptions, updateState]);

    const updateCaption = useCallback((index: number, updates: Partial<Caption>) => {
        const newCaptions = [...state.captions];
        if (newCaptions[index]) {
            newCaptions[index] = { ...newCaptions[index], ...updates };
            updateState({ captions: newCaptions });
        }
    }, [state.captions, updateState]);

    const runContentAnalysis = useCallback(async () => {
        if (!state.video) return;
        updateState({ isLoading: true, error: null });

        try {
            const result = await api.analyzeContent({
                captions: state.captions,
                timeline: state.clips,
                video_duration: state.duration
            });
            updateState({ aiContentAnalysis: result, isLoading: false });
        } catch (error) {
            console.error("Content analysis failed:", error);
            updateState({ isLoading: false, error: "Failed to analyze content." });
        }
    }, [state.video, state.captions, state.clips, state.duration, updateState]);

    const toggleAIContentEffect = useCallback((effect: keyof EditorState['aiContentEffects']) => {
        setState(prev => ({
            ...prev,
            aiContentEffects: {
                ...prev.aiContentEffects,
                [effect]: !prev.aiContentEffects[effect]
            }
        }));
    }, []);

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
        setFilters,
        generateCaptions,
        toggleCaptions,
        updateCaption,
        setCaptionSettings,
        runContentAnalysis,
        toggleAIContentEffect,
        addTextOverlay,
        updateTextOverlay,
        removeTextOverlay,
    };
}
