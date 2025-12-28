import { useTimeline, useMedia, formatTimecode, formatTime, getClipAtTime } from '../store';
import { useEffect, useState, useMemo } from 'react';
import './PreviewPlayer.css';

export function PreviewPlayer() {
    const { state, videoRef, play, pause, seekTo, dispatch } = useTimeline();
    const { state: mediaState, getItemById } = useMedia();
    const { playhead, isPlaying, timeline, selectedClipId } = state;

    const [videoLoaded, setVideoLoaded] = useState(false);
    const [videoError, setVideoError] = useState(false);

    const duration = timeline.duration || 0;
    const progress = duration > 0 ? (playhead / duration) * 100 : 0;

    // Get current clip at playhead position
    const currentClip = getClipAtTime(timeline.clips, playhead);

    // Get the media item for the current clip
    const currentMedia = useMemo(() => {
        if (!currentClip) return null;
        return getItemById(currentClip.sourceVideoId);
    }, [currentClip, getItemById]);

    // Get video source URL
    const videoSrc = currentMedia?.path || '';

    // Load video when clip changes
    useEffect(() => {
        if (videoRef.current && videoSrc) {
            const video = videoRef.current;

            // Only reload if source changed
            if (video.src !== videoSrc) {
                setVideoLoaded(false);
                setVideoError(false);
                video.src = videoSrc;
                video.load();
            }

            // Seek to correct position within clip
            if (currentClip) {
                const clipTime = playhead - currentClip.inPoint;
                if (Math.abs(video.currentTime - clipTime) > 0.1) {
                    video.currentTime = Math.max(0, clipTime);
                }
            }
        }
    }, [videoSrc, currentClip, playhead, videoRef]);

    // Handle scrubber change
    const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        seekTo(time);
    };

    // Frame step controls
    const stepFrame = (direction: 1 | -1) => {
        const fps = timeline.settings.fps || 30;
        const frameTime = 1 / fps;
        seekTo(playhead + (frameTime * direction));
    };

    // Keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case ' ':
                e.preventDefault();
                dispatch({ type: 'TOGGLE_PLAY' });
                break;
            case 'ArrowLeft':
                stepFrame(-1);
                break;
            case 'ArrowRight':
                stepFrame(1);
                break;
            case 'Home':
                seekTo(0);
                break;
            case 'End':
                seekTo(duration);
                break;
        }
    };

    const handleVideoLoad = () => {
        setVideoLoaded(true);
        setVideoError(false);
    };

    const handleVideoError = () => {
        setVideoError(true);
        setVideoLoaded(false);
    };

    return (
        <div className="preview-player" tabIndex={0} onKeyDown={handleKeyDown}>
            <div className="panel-header">
                <span>🎬 Preview</span>
                <span className="timecode">{formatTimecode(playhead, timeline.settings.fps)}</span>
            </div>

            <div className="preview-viewport">
                {/* Video display area */}
                <div className="preview-screen">
                    {/* Actual video element */}
                    <video
                        ref={videoRef}
                        className={`preview-video ${videoLoaded && currentClip ? 'visible' : ''}`}
                        onLoadedData={handleVideoLoad}
                        onError={handleVideoError}
                        playsInline
                    />

                    {/* Overlay when no clips or video not loaded */}
                    {(!currentClip || !videoLoaded) && (
                        <div className="preview-placeholder">
                            {timeline.clips.length === 0 ? (
                                <>
                                    <span className="preview-icon">📽️</span>
                                    <span className="preview-text">No clips on timeline</span>
                                    <span className="preview-hint">Import videos and double-click to add</span>
                                </>
                            ) : !currentClip ? (
                                <>
                                    <span className="preview-icon">⏸</span>
                                    <span className="preview-text">No clip at current position</span>
                                    <span className="preview-hint">Move playhead to a clip</span>
                                </>
                            ) : videoError ? (
                                <>
                                    <span className="preview-icon">⚠️</span>
                                    <span className="preview-text">Video file not found</span>
                                    <span className="preview-hint">{currentMedia?.filename || 'Unknown'}</span>
                                </>
                            ) : (
                                <>
                                    <span className="preview-icon loading">⏳</span>
                                    <span className="preview-text">Loading video...</span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Current clip indicator */}
                    {currentClip && (
                        <div className="current-clip-indicator">
                            <span className="clip-label">▶ {currentClip.label}</span>
                            <span className="clip-time">
                                {formatTime(playhead - currentClip.inPoint)} / {formatTime(currentClip.outPoint - currentClip.inPoint)}
                            </span>
                        </div>
                    )}

                    {/* Playing indicator */}
                    {isPlaying && (
                        <div className="playing-indicator">
                            <span className="playing-dot"></span>
                            PLAYING
                        </div>
                    )}
                </div>

                {/* Transport controls */}
                <div className="preview-controls">
                    <div className="control-left">
                        <button
                            className="control-btn"
                            title="Go to Start (Home)"
                            onClick={() => seekTo(0)}
                        >
                            ⏮
                        </button>
                        <button
                            className="control-btn"
                            title="Previous Frame (←)"
                            onClick={() => stepFrame(-1)}
                        >
                            ◀
                        </button>
                        {isPlaying ? (
                            <button
                                className="control-btn control-main"
                                onClick={pause}
                                title="Pause (Space)"
                            >
                                ⏸
                            </button>
                        ) : (
                            <button
                                className="control-btn control-main"
                                onClick={play}
                                title="Play (Space)"
                            >
                                ▶
                            </button>
                        )}
                        <button
                            className="control-btn"
                            title="Next Frame (→)"
                            onClick={() => stepFrame(1)}
                        >
                            ▶
                        </button>
                        <button
                            className="control-btn"
                            title="Go to End (End)"
                            onClick={() => seekTo(duration)}
                        >
                            ⏭
                        </button>
                    </div>

                    <div className="control-center">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${progress}%` }}
                            />
                            <input
                                type="range"
                                min="0"
                                max={duration || 1}
                                step="0.001"
                                value={playhead}
                                onChange={handleScrub}
                                className="progress-input"
                                disabled={duration === 0}
                            />
                        </div>
                    </div>

                    <div className="control-right">
                        <span className="duration-display">
                            {formatTime(playhead)} / {formatTime(duration)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
