/**
 * Video Player Component
 * ======================
 * Center panel with HTML5 video player and controls.
 */

import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import type { VideoFile, VideoFilters, Caption } from './types';
import { getFilterString } from './filterUtils';
import { useSmartHumanEffects } from '../context/SmartHumanEffectsContext';

interface VideoPlayerProps {
    video: VideoFile | null;
    currentTime: number;
    isPlaying: boolean;
    filters?: VideoFilters;
    captions?: Caption[];
    showCaptions?: boolean;
    onTimeUpdate: (time: number) => void;
    onTogglePlay: () => void;
    onSeek: (time: number) => void;
    setVideoRef: (ref: HTMLVideoElement | null) => void;
}

type AISegment = {
    start: number;
    end: number;
    face_detected: boolean;
    motion_score: number;
    face_box: { x: number; y: number; w: number; h: number };
};

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
    filters,
    captions = [],
    showCaptions = false,
    onTimeUpdate,
    onTogglePlay,
    onSeek,
    setVideoRef,
}: VideoPlayerProps) {
    const videoElementRef = useRef<HTMLVideoElement>(null);
    const { state } = useSmartHumanEffects();
    const [aiSegments, setAiSegments] = useState<AISegment[]>([]);

    // Load Smart Human metadata
    useEffect(() => {
        if (!video?.video_id) return;

        fetch(`http://127.0.0.1:8000/ai/mediapipe/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                video_id: video.video_id,
                frame_interval: 10,
                segment_duration: 1.0
            })
        })
            .then(res => res.json())
            .then(data => {
                if (data.segments) {
                    setAiSegments(data.segments);
                }
            })
            .catch(err => console.error("Failed to load AI metadata:", err));
    }, [video?.video_id]);

    // Apply effects dynamically
    const effectStyles = useMemo(() => {
        const filterList: string[] = [];
        let transformStr = "";

        // Base filters from FiltersPanel
        if (filters) {
            filterList.push(getFilterString(filters));
        }

        if (!video) return { filter: filterList.join(" ") };

        if (aiSegments.length > 0) {
            const seg = aiSegments.find(s => currentTime >= s.start && currentTime < s.end);
            if (seg) {

                // Face Focus
                if (state.faceFocus.enabled && seg.face_detected) {
                    const intensity = state.faceFocus.intensity / 100;
                    const zoom = 1 + (intensity * 0.2); // Up to 1.2x
                    const brightness = 1 + (intensity * 0.3); // Up to 1.3x
                    filterList.push(`brightness(${brightness})`);
                    transformStr += `scale(${zoom}) `;

                    // If Auto Reframe is also enabled, it will take over transform
                    if (state.autoReframe.enabled) {
                        const { x, y, w, h } = seg.face_box;
                        const shiftX = (0.5 - (x + w / 2)) * 100 * intensity;
                        const shiftY = (0.5 - (y + h / 2)) * 100 * intensity;
                        transformStr = `scale(${zoom}) translate(${shiftX}%, ${shiftY}%) `;
                    }
                }

                // Background Blur (simplified CSS approximation)
                if (state.backgroundBlur.enabled && seg.face_detected) {
                    const blur = (state.backgroundBlur.intensity / 100) * 4;
                    filterList.push(`blur(${blur}px)`);
                }

                // Motion Emphasis
                if (state.motionEmphasis.enabled && seg.motion_score > 0.3) {
                    const contrast = 1 + (state.motionEmphasis.intensity / 100) * 0.5;
                    filterList.push(`contrast(${contrast})`);
                }
            }
        }

        return {
            filter: filterList.join(" "),
            transform: transformStr,
            transition: 'all 0.3s ease-out'
        };
    }, [currentTime, aiSegments, state, filters, video]);

    // Get active caption
    const activeCaption = useMemo(() => {
        if (!showCaptions || !captions.length) return null;
        return captions.find(c => currentTime >= c.start && currentTime <= c.end);
    }, [captions, showCaptions, currentTime]);

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
            <div className="video-container overflow-hidden">
                {video?.url ? (
                    <>
                        <video
                            ref={videoElementRef}
                            src={video.url}
                            style={effectStyles}
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
                            className="w-full h-full object-contain"
                        />
                        {/* Caption Overlay */}
                        {activeCaption && (
                            <div className="caption-overlay">
                                <span className="caption-text-overlay">{activeCaption.text}</span>
                            </div>
                        )}
                    </>
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
