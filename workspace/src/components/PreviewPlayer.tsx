import { useTimeline, formatTimecode, formatTime } from '../store';
import './PreviewPlayer.css';

export function PreviewPlayer() {
    const { state, videoRef, play, pause, seekTo, dispatch } = useTimeline();
    const { playhead, isPlaying, timeline } = state;

    const duration = timeline.duration || 30; // Default 30s for empty timeline
    const progress = duration > 0 ? (playhead / duration) * 100 : 0;

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

    return (
        <div className="preview-player" tabIndex={0} onKeyDown={handleKeyDown}>
            <div className="panel-header">
                <span>🎬 Preview</span>
                <span className="timecode">{formatTimecode(playhead, timeline.settings.fps)}</span>
            </div>

            <div className="preview-viewport">
                {/* Video display area */}
                <div className="preview-screen">
                    {/* Hidden video element for future video loading */}
                    <video
                        ref={videoRef}
                        className="preview-video"
                        style={{ display: 'none' }}
                    />

                    {/* Placeholder when no video */}
                    <div className="preview-placeholder">
                        <span className="preview-icon">{isPlaying ? '⏸' : '▶'}</span>
                        <span className="preview-text">
                            {timeline.clips.length > 0
                                ? 'Preview rendering not yet implemented'
                                : 'No clips on timeline'
                            }
                        </span>
                        <span className="preview-time">{formatTime(playhead)}</span>
                    </div>
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
                                max={duration}
                                step="0.001"
                                value={playhead}
                                onChange={handleScrub}
                                className="progress-input"
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
