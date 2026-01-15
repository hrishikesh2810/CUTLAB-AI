/**
 * Video Player Component
 * ======================
 * Center panel with HTML5 video player and controls.
 */

import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useRef, useEffect, useCallback } from 'react';
import type { VideoFile } from './types';

interface VideoPlayerProps {
    video: VideoFile | null;
    currentTime: number;
    isPlaying: boolean;
    onTimeUpdate: (time: number) => void;
    onTogglePlay: () => void;
    onSeek: (time: number) => void;
    setVideoRef: (ref: HTMLVideoElement | null) => void;
}

function formatTimecode(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30); // Assuming 30fps
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}

export function VideoPlayer({
    video,
    currentTime,
    isPlaying,
    onTimeUpdate,
    onTogglePlay,
    onSeek,
    setVideoRef,
}: VideoPlayerProps) {
    const videoElementRef = useRef<HTMLVideoElement>(null);

    // Set ref on mount and whenever it changes
    useEffect(() => {
        if (videoElementRef.current) {
            setVideoRef(videoElementRef.current);
        }
        return () => setVideoRef(null);
    }, [setVideoRef, video?.url]); // Re-run when video URL changes

    // Sync isPlaying state with video element
    useEffect(() => {
        const videoEl = videoElementRef.current;
        if (!videoEl || !video?.url) return;

        if (isPlaying) {
            videoEl.play().catch((err) => {
                console.log('Playback prevented:', err);
            });
        } else {
            videoEl.pause();
        }
    }, [isPlaying, video?.url]);

    // Handle time update from video element
    const handleTimeUpdate = useCallback(() => {
        if (videoElementRef.current) {
            onTimeUpdate(videoElementRef.current.currentTime);
        }
    }, [onTimeUpdate]);

    // Handle video ended
    const handleEnded = useCallback(() => {
        // Reset to start or stop playing
        if (videoElementRef.current) {
            onTimeUpdate(videoElementRef.current.duration);
        }
    }, [onTimeUpdate]);

    // Handle progress bar click
    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!video) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const newTime = percent * video.duration;
        onSeek(newTime);

        // Also update video element directly for immediate response
        if (videoElementRef.current) {
            videoElementRef.current.currentTime = newTime;
        }
    };

    // Skip forward/backward
    const skip = (seconds: number) => {
        if (video && videoElementRef.current) {
            const newTime = Math.max(0, Math.min(video.duration, currentTime + seconds));
            videoElementRef.current.currentTime = newTime;
            onSeek(newTime);
        }
    };

    // Handle play button click
    const handlePlayClick = () => {
        onTogglePlay();
    };

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only handle if not typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    handlePlayClick();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    skip(-5);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    skip(5);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentTime, video]);

    const progress = video ? (currentTime / video.duration) * 100 : 0;

    return (
        <div className="video-player">
            {/* Video Container */}
            <div className="video-container">
                {video?.url ? (
                    <video
                        ref={videoElementRef}
                        src={video.url}
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={handleEnded}
                        onLoadedMetadata={() => {
                            // Ensure ref is set after metadata loads
                            if (videoElementRef.current) {
                                setVideoRef(videoElementRef.current);
                            }
                        }}
                        playsInline
                        preload="auto"
                    />
                ) : (
                    <div className="video-placeholder">
                        <Play size={64} strokeWidth={1} />
                        <p>Import a video to preview</p>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="player-controls">
                {/* Timecode */}
                <div className="timecode">
                    <span className="current">{formatTimecode(currentTime)}</span>
                    <span className="separator">/</span>
                    <span className="total">{formatTimecode(video?.duration || 0)}</span>
                </div>

                {/* Transport Controls */}
                <div className="transport">
                    <button
                        className="transport-btn"
                        onClick={() => skip(-5)}
                        disabled={!video}
                        title="Skip back 5s (←)"
                    >
                        <SkipBack size={20} />
                    </button>

                    <button
                        className="transport-btn play-btn"
                        onClick={handlePlayClick}
                        disabled={!video}
                        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                    >
                        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                    </button>

                    <button
                        className="transport-btn"
                        onClick={() => skip(5)}
                        disabled={!video}
                        title="Skip forward 5s (→)"
                    >
                        <SkipForward size={20} />
                    </button>
                </div>

                {/* Volume (placeholder) */}
                <div className="volume">
                    <Volume2 size={18} />
                </div>
            </div>

            {/* Progress Bar */}
            <div
                className="progress-bar"
                onClick={handleProgressClick}
            >
                <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                />
                <div
                    className="progress-handle"
                    style={{ left: `${progress}%` }}
                />
            </div>
        </div>
    );
}
