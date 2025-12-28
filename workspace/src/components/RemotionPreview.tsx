/**
 * Remotion Preview Component
 * 
 * Uses @remotion/player to render the timeline composition
 * with full playback controls and frame-accurate seeking.
 */

import { Player, PlayerRef } from '@remotion/player';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { TimelineComposition } from '../remotion/TimelineComposition';
import { useTimeline, useMedia, formatTimecode, formatTime } from '../store';
import './RemotionPreview.css';

const FPS = 30;

export function RemotionPreview() {
    const playerRef = useRef<PlayerRef>(null);
    const { state: timelineState, dispatch, seekTo } = useTimeline();
    const { state: mediaState } = useMedia();
    const { timeline, playhead, isPlaying } = timelineState;

    // Build media URL map from imported media
    const mediaMap = useMemo(() => {
        const map = new Map<string, string>();
        mediaState.items.forEach(item => {
            map.set(item.id, item.path);
        });
        return map;
    }, [mediaState.items]);

    // Calculate total duration in frames
    const durationInFrames = useMemo(() => {
        const duration = timeline.duration || 1;
        return Math.max(Math.round(duration * FPS), FPS); // Minimum 1 second
    }, [timeline.duration]);

    // Sync Remotion player with timeline playhead
    useEffect(() => {
        if (playerRef.current) {
            const targetFrame = Math.round(playhead * FPS);
            const currentFrame = playerRef.current.getCurrentFrame();

            // Only seek if difference is significant (avoid feedback loop)
            if (Math.abs(currentFrame - targetFrame) > 1) {
                playerRef.current.seekTo(targetFrame);
            }
        }
    }, [playhead]);

    // Sync play/pause state
    useEffect(() => {
        if (playerRef.current) {
            if (isPlaying) {
                playerRef.current.play();
            } else {
                playerRef.current.pause();
            }
        }
    }, [isPlaying]);

    // Handle play state changes
    const handlePlay = useCallback(() => {
        dispatch({ type: 'SET_PLAYING', payload: true });
    }, [dispatch]);

    const handlePause = useCallback(() => {
        dispatch({ type: 'SET_PLAYING', payload: false });
    }, [dispatch]);

    // Transport controls
    const handlePlayPause = () => {
        dispatch({ type: 'TOGGLE_PLAY' });
    };

    const handleSeekToStart = () => {
        seekTo(0);
    };

    const handleSeekToEnd = () => {
        seekTo(timeline.duration);
    };

    const stepFrame = (direction: 1 | -1) => {
        const frameTime = 1 / FPS;
        seekTo(Math.max(0, playhead + (frameTime * direction)));
    };

    // Keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case ' ':
                e.preventDefault();
                handlePlayPause();
                break;
            case 'ArrowLeft':
                stepFrame(-1);
                break;
            case 'ArrowRight':
                stepFrame(1);
                break;
            case 'Home':
                handleSeekToStart();
                break;
            case 'End':
                handleSeekToEnd();
                break;
        }
    };

    const progress = timeline.duration > 0
        ? (playhead / timeline.duration) * 100
        : 0;

    return (
        <div className="remotion-preview" tabIndex={0} onKeyDown={handleKeyDown}>
            <div className="panel-header">
                <span>🎬 Preview</span>
                <span className="timecode">{formatTimecode(playhead, FPS)}</span>
            </div>

            <div className="preview-viewport">
                {/* Remotion Player */}
                <div className="remotion-container">
                    {timeline.clips.length > 0 && mediaState.items.length > 0 ? (
                        <Player
                            ref={playerRef}
                            component={TimelineComposition}
                            inputProps={{
                                timeline,
                                mediaMap,
                            }}
                            durationInFrames={durationInFrames}
                            fps={FPS}
                            compositionWidth={1920}
                            compositionHeight={1080}
                            style={{
                                width: '100%',
                                height: '100%',
                            }}
                            controls={false}
                            loop={false}
                            autoPlay={false}
                            clickToPlay={false}
                            spaceKeyToPlayOrPause={false}
                            onPlay={handlePlay}
                            onPause={handlePause}
                            onEnded={handlePause}
                        />
                    ) : (
                        <div className="preview-placeholder">
                            <span className="preview-icon">📽️</span>
                            <span className="preview-text">
                                {timeline.clips.length === 0
                                    ? 'No clips on timeline'
                                    : 'Import videos to preview'
                                }
                            </span>
                            <span className="preview-hint">
                                Import videos and add them to the timeline
                            </span>
                        </div>
                    )}
                </div>

                {/* Transport Controls */}
                <div className="preview-controls">
                    <div className="control-left">
                        <button
                            className="control-btn"
                            onClick={handleSeekToStart}
                            title="Go to Start (Home)"
                        >
                            ⏮
                        </button>
                        <button
                            className="control-btn"
                            onClick={() => stepFrame(-1)}
                            title="Previous Frame (←)"
                        >
                            ◀
                        </button>
                        <button
                            className="control-btn control-main"
                            onClick={handlePlayPause}
                            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                        >
                            {isPlaying ? '⏸' : '▶'}
                        </button>
                        <button
                            className="control-btn"
                            onClick={() => stepFrame(1)}
                            title="Next Frame (→)"
                        >
                            ▶
                        </button>
                        <button
                            className="control-btn"
                            onClick={handleSeekToEnd}
                            title="Go to End (End)"
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
                                max={timeline.duration || 1}
                                step="0.001"
                                value={playhead}
                                onChange={(e) => seekTo(parseFloat(e.target.value))}
                                className="progress-input"
                                disabled={timeline.duration === 0}
                            />
                        </div>
                    </div>

                    <div className="control-right">
                        <span className="duration-display">
                            {formatTime(playhead)} / {formatTime(timeline.duration)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Playback indicator */}
            {isPlaying && (
                <div className="playing-indicator">
                    <span className="playing-dot"></span>
                    PLAYING
                </div>
            )}
        </div>
    );
}
