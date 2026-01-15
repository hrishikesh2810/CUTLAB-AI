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
import { MediaLibrary } from './MediaLibrary';
import { VideoPlayer } from './VideoPlayer';
import { Timeline } from './Timeline';
import { AlertCircle, X } from 'lucide-react';
import './VideoEditor.css';

export function VideoEditor() {
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
    } = useVideoEditor();

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

    return (
        <div className="video-editor">
            {/* Toolbar */}
            <Toolbar
                video={state.video}
                isLoading={state.isLoading}
                onImport={handleImport}
                onDetectScenes={handleDetectScenes}
            />

            {/* Main Content */}
            <div className="editor-main">
                {/* Left: Media Library */}
                <MediaLibrary
                    video={state.video}
                    scenes={state.scenes}
                    onSceneClick={handleSceneClick}
                />

                {/* Center: Video Player */}
                <VideoPlayer
                    video={state.video}
                    currentTime={state.currentTime}
                    isPlaying={state.isPlaying}
                    onTimeUpdate={onTimeUpdate}
                    onTogglePlay={togglePlay}
                    onSeek={seekTo}
                    setVideoRef={setVideoRef}
                />
            </div>

            {/* Bottom: Timeline */}
            <Timeline
                clips={state.clips}
                duration={state.duration}
                currentTime={state.currentTime}
                zoom={state.zoom}
                selectedClipId={state.selectedClipId}
                onClipClick={selectClip}
                onSeek={seekTo}
                onZoomChange={setZoom}
            />

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
