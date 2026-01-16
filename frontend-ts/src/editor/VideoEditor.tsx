/**
 * Video Editor Page
 * =================
 * Main container component for the video editor.
 * 
 * Layout:
 * ┌─────────────────────────────────────────┐
 * │            TOOLBAR                       │
 * ├───────────┬─────────────────────────────┤
 * │           │                             │
 * │  MEDIA    │      VIDEO PLAYER           │
 * │  LIBRARY  │                             │
 * │           │                             │
 * ├───────────┴─────────────────────────────┤
 * │            TIMELINE                      │
 * └─────────────────────────────────────────┘
 */

import { useVideoEditor } from './useVideoEditor';
import { Toolbar } from './Toolbar';
import { EditorSidebar } from './EditorSidebar';
import { VideoPlayer } from './VideoPlayer';
import { Timeline } from './Timeline';
import { ResizeHandle } from '../components/ResizeHandle';

import { ExportModal } from '../components/ExportModal';
import { ExportProgress } from '../components/ExportProgress';
import { useSmartHumanEffects } from '../context/SmartHumanEffectsContext';
import { AlertCircle, X } from 'lucide-react';
import { useState } from 'react';
import './VideoEditor.css';
import type { CaptionSettings } from './types';

interface VideoEditorProps {
    projectId?: string | null;
}

export function VideoEditor({ projectId }: VideoEditorProps) {
    const {
        state,
        setVideoRef,
        importVideo,
        detectScenes,
        seekTo,
        togglePlay,
        onTimeUpdate,
        selectClip,
        setZoom,
        clearError,
        setFilters,
        generateCaptions,
        toggleCaptions,
        updateCaption,
        setCaptionSettings,
        runContentAnalysis,
        toggleAIContentEffect,
        addTextOverlay,
        updateTextOverlay,
        removeTextOverlay
    } = useVideoEditor(projectId);

    const { state: smartHumanState } = useSmartHumanEffects();
    const [isExportOpen, setIsExportOpen] = useState(false);

    // AI/UI State
    const [sidebarWidth, setSidebarWidth] = useState(300);

    // Export State
    const [exportStatus, setExportStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
    const [exportProgress, setExportProgress] = useState(0);
    const [exportDownloadUrl, setExportDownloadUrl] = useState<string | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);
    const [exportType, setExportType] = useState<'video' | 'report' | 'data'>('video');

    // Handle file import
    const handleImport = async (file: File) => {
        try {
            await importVideo(file);
        } catch (error) {
            console.error('Import failed:', error);
        }
    };

    // Handle scene detection
    const handleDetectScenes = async () => {
        try {
            await detectScenes('vlog'); // Using vlog preset as default
        } catch (error) {
            console.error('Scene detection failed:', error);
        }
    };

    // Handle scene click in media library
    const handleSceneClick = (scene: { start: number; end: number }) => {
        seekTo(scene.start);
    };



    // Combined Source of Truth for Export
    const fullEditorState = {
        ...state,
        smartHumanEffects: smartHumanState
    };

    const handleStartExport = async (type: 'video' | 'report' | 'data', resolution: string) => {
        setExportStatus('processing');
        setExportProgress(0);
        setExportError(null);
        setExportType(type);
        setExportDownloadUrl(null);

        const endpoint = `/export/${type}`;
        const body = {
            video_id: state.video?.video_id,
            editor_state: fullEditorState,
            export_settings: {
                resolution,
                timestamp: new Date().toISOString()
            }
        };

        try {
            const res = await fetch(`http://127.0.0.1:8000${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (type === 'video') {
                pollExportStatus(data.export_id);
            } else {
                setExportStatus('completed');
                setExportDownloadUrl(data.download_url);
                setExportProgress(100);
            }
        } catch (err: any) {
            setExportStatus('failed');
            setExportError(err.message);
        }
    };

    const pollExportStatus = async (exportId: string) => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`http://127.0.0.1:8000/export/status/${exportId}`);
                const data = await res.json();

                setExportProgress(data.progress);

                if (data.status === 'completed') {
                    clearInterval(interval);
                    setExportStatus('completed');
                    setExportDownloadUrl(data.download_url);
                } else if (data.status === 'failed') {
                    clearInterval(interval);
                    setExportStatus('failed');
                    setExportError(data.error);
                }
            } catch (err) {
                clearInterval(interval);
                setExportStatus('failed');
            }
        }, 2000);
    };

    return (
        <div className="video-editor">
            {/* Toolbar */}
            <Toolbar
                video={state.video}
                isLoading={state.isLoading}
                onImport={handleImport}
                onDetectScenes={handleDetectScenes}
                onExport={() => setIsExportOpen(true)}
            />

            {/* Main Content, Sidebar, Player, Timeline */}
            <div className="editor-main">
                {/* Left: Sidebar (Media & Filters) */}
                <EditorSidebar
                    width={sidebarWidth}
                    video={state.video}
                    scenes={state.scenes}
                    filters={state.filters}
                    captions={state.captions}
                    textOverlays={state.textOverlays}
                    isGeneratingCaptions={state.isGeneratingCaptions}
                    showCaptions={state.showCaptions}
                    captionSettings={state.captionSettings}
                    aiContentAnalysis={state.aiContentAnalysis}
                    aiContentEffects={state.aiContentEffects}
                    onSceneClick={handleSceneClick}
                    onUpdateFilters={setFilters}
                    onGenerateCaptions={generateCaptions}
                    onToggleCaptions={toggleCaptions}
                    onUpdateCaption={updateCaption}
                    onUpdateCaptionSettings={(styleUpdates) => setCaptionSettings({ style: { ...state.captionSettings.style, ...styleUpdates } })}
                    onToggleAIContentEffect={toggleAIContentEffect}
                    onRunContentAnalysis={runContentAnalysis}
                    onAddTextOverlay={addTextOverlay}
                    onUpdateTextOverlay={updateTextOverlay}
                    onRemoveTextOverlay={removeTextOverlay}
                />

                <ResizeHandle
                    initialWidth={sidebarWidth}
                    onResize={setSidebarWidth}
                    minWidth={280}
                    maxWidth={600}
                />

                {/* Center: Video Player */}
                <VideoPlayer
                    video={state.video}
                    currentTime={state.currentTime}
                    isPlaying={state.isPlaying}
                    filters={state.filters}
                    captions={state.captions}
                    textOverlays={state.textOverlays}
                    showCaptions={state.showCaptions}
                    captionSettings={state.captionSettings}
                    aiContentAnalysis={state.aiContentAnalysis}
                    aiContentEffects={state.aiContentEffects}
                    onUpdateCaption={updateCaption}
                    onUpdateTextOverlay={updateTextOverlay}
                    onTimeUpdate={onTimeUpdate}
                    onTogglePlay={togglePlay}
                    onSeek={seekTo}
                    setVideoRef={setVideoRef}
                />
            </div>

            {/* Bottom: Timeline */}
            <Timeline
                clips={state.clips}
                captions={state.captions}
                duration={state.duration}
                currentTime={state.currentTime}
                zoom={state.zoom}
                selectedClipId={state.selectedClipId}
                onClipClick={selectClip}
                onSeek={seekTo}
                onZoomChange={setZoom}
            />

            {/* Modals & Overlays */}
            <ExportModal
                isOpen={isExportOpen}
                onClose={() => setIsExportOpen(false)}
                editorState={fullEditorState}
                onStartExport={handleStartExport}
            />

            {/* Export Progress Toast */}
            {exportStatus !== 'idle' && (
                <ExportProgress
                    status={exportStatus}
                    progress={exportProgress}
                    downloadUrl={exportDownloadUrl}
                    error={exportError}
                    type={exportType}
                    onClose={() => setExportStatus('idle')}
                />
            )}

            {/* Error Toast */}
            {state.error && (
                <div className="error-toast">
                    <AlertCircle size={20} />
                    <span>{state.error}</span>
                    <button onClick={clearError}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Loading Overlay */}
            {state.isLoading && (
                <div className="loading-overlay">
                    <div className="loading-spinner" />
                    <p>Processing...</p>
                </div>
            )}
        </div>
    );
}
