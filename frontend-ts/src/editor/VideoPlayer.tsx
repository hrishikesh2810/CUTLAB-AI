/**
 * Video Player Component
 * ======================
 * Center panel with HTML5 video player and controls.
 * Implements "Video Overlay Layer" strategy for ratio-aware caption positioning.
 */

import { Play, Pause, Square, SkipBack, SkipForward } from 'lucide-react';
import { useRef, useEffect, useCallback, useMemo, useState, useLayoutEffect } from 'react';
import type { VideoFile, VideoFilters, Caption, CaptionSettings, AIContentAnalysis, AIContentEffectsState, TextOverlay } from './types';
import { getFilterString } from './filterUtils';
import { useSmartHumanEffects } from '../context/SmartHumanEffectsContext';

interface VideoPlayerProps {
    video: VideoFile | null;
    currentTime: number;
    isPlaying: boolean;
    filters?: VideoFilters;
    captions?: Caption[];
    textOverlays?: TextOverlay[];
    showCaptions?: boolean;
    captionSettings?: CaptionSettings;
    aiContentAnalysis?: AIContentAnalysis | null;
    aiContentEffects?: AIContentEffectsState;
    onUpdateCaption: (index: number, updates: Partial<Caption>) => void;
    onUpdateTextOverlay: (id: string, updates: Partial<TextOverlay>) => void;
    onTimeUpdate: (time: number) => void;
    onTogglePlay: () => void;
    onStop: () => void;
    onSeek: (time: number) => void;
    setVideoRef: (ref: HTMLVideoElement | null) => void;
}

// Helper to format timecode
function formatTimecode(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}

export function VideoPlayer({
    video,
    currentTime,
    isPlaying,
    filters,
    captions = [],
    textOverlays = [],
    showCaptions = false,
    captionSettings,
    /* aiContentAnalysis,
    aiContentEffects, */
    onUpdateCaption,
    onUpdateTextOverlay,
    onTimeUpdate,
    onTogglePlay,
    onStop,
    onSeek,
    setVideoRef,
}: VideoPlayerProps) {
    const videoElementRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [videoRect, setVideoRect] = useState({ width: 0, height: 0, left: 0, top: 0 });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { state: _smartHumanState } = useSmartHumanEffects();

    // Resize Observer to keep overlay synced with video dimensions
    const updateVideoRect = useCallback(() => {
        if (!videoElementRef.current || !containerRef.current) return;

        const videoEl = videoElementRef.current;
        const container = containerRef.current;

        const vWidth = videoEl.videoWidth;
        const vHeight = videoEl.videoHeight;

        if (!vWidth || !vHeight) return;

        const cWidth = container.clientWidth;
        const cHeight = container.clientHeight;

        const vRatio = vWidth / vHeight;
        const cRatio = cWidth / cHeight;

        let renderWidth, renderHeight;

        // Calculate rendered dimensions (contain)
        if (cRatio > vRatio) {
            // Container is wider (pillarbox)
            renderHeight = cHeight;
            renderWidth = cHeight * vRatio;
        } else {
            // Container is taller (letterbox)
            renderWidth = cWidth;
            renderHeight = cWidth / vRatio;
        }

        const left = (cWidth - renderWidth) / 2;
        const top = (cHeight - renderHeight) / 2;

        setVideoRect({
            width: renderWidth,
            height: renderHeight,
            left,
            top
        });
    }, []);

    useLayoutEffect(() => {
        updateVideoRect();
        window.addEventListener('resize', updateVideoRect);
        return () => window.removeEventListener('resize', updateVideoRect);
    }, [updateVideoRect, video?.video_id]); // Re-calc when video changes

    // Draggable Logic - Centralized with boundary awareness
    const draggingRef = useRef<{ id: string, type: 'caption' | 'text', startX: number, startY: number, initialPos: { x: number, y: number } } | null>(null);

    const handleDragStart = (e: React.MouseEvent, id: string, type: 'caption' | 'text', currentX: number, currentY: number) => {
        e.preventDefault();
        e.stopPropagation();
        draggingRef.current = {
            id,
            type,
            startX: e.clientX,
            startY: e.clientY,
            initialPos: { x: currentX, y: currentY }
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!draggingRef.current || videoRect.width === 0) return;

            const { startX, startY, initialPos, id, type } = draggingRef.current;

            // Calculate delta in normalized coordinates (0-100%)
            const deltaX = (e.clientX - startX) / videoRect.width * 100;
            const deltaY = (e.clientY - startY) / videoRect.height * 100;

            // Clamp with padding to keep text inside video bounds
            // Use 5% and 95% to prevent text from touching edges
            const PADDING = 5;
            const newX = Math.max(PADDING, Math.min(100 - PADDING, initialPos.x + deltaX));
            const newY = Math.max(PADDING, Math.min(100 - PADDING, initialPos.y + deltaY));

            if (type === 'caption') {
                onUpdateCaption(parseInt(id), { position: { x: newX, y: newY } });
            } else {
                onUpdateTextOverlay(id, { position: { x: newX, y: newY } });
            }
        };

        const handleMouseUp = () => {
            draggingRef.current = null;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [videoRect, onUpdateCaption, onUpdateTextOverlay]);


    // Effect Styles from Filters - ensure video fits container completely
    const effectStyles = useMemo(() => {
        const filterList: string[] = [];
        if (filters && Object.keys(filters).length > 0) {
            filterList.push(getFilterString(filters));
        }
        return {
            filter: filterList.length > 0 ? filterList.join(" ") : 'none',
            width: '100%',
            height: '100%',
            objectFit: 'contain' as const,
        };
    }, [filters]);

    // Active Caption Logic
    const activeCaptionIndex = useMemo(() => {
        if (!showCaptions) return -1;
        return captions.findIndex(c => currentTime >= c.start && currentTime <= c.end);
    }, [captions, showCaptions, currentTime]);

    const activeTextOverlays = useMemo(() => {
        return textOverlays.filter(t => currentTime >= t.start && currentTime <= t.end);
    }, [textOverlays, currentTime]);

    // Calculate scaled font size based on video dimensions
    // This ensures captions look proportional regardless of viewport size
    const getScaledFontSize = useCallback((baseFontSize: number) => {
        if (videoRect.height === 0) return baseFontSize;
        // Scale relative to a reference height of 720px
        const scaleFactor = videoRect.height / 720;
        return Math.max(12, Math.round(baseFontSize * scaleFactor));
    }, [videoRect.height]);

    // Format handling for captions with proper styling
    const getCaptionStyle = useCallback((capStyle?: any): React.CSSProperties => {
        const defaults = captionSettings?.style || {
            fontFamily: 'Inter',
            fontSize: 24,
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            fontWeight: 'bold',
            fontStyle: 'normal'
        };
        const merged = { ...defaults, ...capStyle };

        return {
            fontFamily: merged.fontFamily,
            fontSize: `${getScaledFontSize(merged.fontSize)}px`,
            color: merged.color,
            backgroundColor: merged.backgroundColor,
            fontWeight: merged.fontWeight as any,
            fontStyle: merged.fontStyle as any,
            // Professional caption styling
            display: 'inline-block',
            padding: '6px 16px',
            borderRadius: '4px',
            textAlign: 'center' as const,
            whiteSpace: 'pre-wrap' as const,
            maxWidth: '90%',
            lineHeight: 1.4,
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            letterSpacing: '0.02em'
        };
    }, [captionSettings?.style, getScaledFontSize]);

    // Get text overlay style with scaling
    const getTextOverlayStyle = useCallback((style?: any): React.CSSProperties => {
        const fontSize = getScaledFontSize(style?.fontSize || 24);
        return {
            fontFamily: style?.fontFamily || 'Inter',
            fontSize: `${fontSize}px`,
            color: style?.color || 'white',
            backgroundColor: style?.backgroundColor || 'transparent',
            fontWeight: (style?.fontWeight as any) || 'normal',
            fontStyle: (style?.fontStyle as any) || 'normal',
            display: 'inline-block',
            padding: '6px 12px',
            borderRadius: '4px',
            textAlign: 'center' as const,
            whiteSpace: 'pre-wrap' as const,
            maxWidth: '90%',
            lineHeight: 1.4,
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        };
    }, [getScaledFontSize]);

    // Default position for auto-captions (center-bottom)
    const getCaptionPosition = useCallback((capPos?: any) => {
        // Default: center horizontally, near bottom (85% from top)
        return capPos || captionSettings?.position || { x: 50, y: 85 };
    }, [captionSettings?.position]);

    // Video refs setup
    useEffect(() => {
        if (videoElementRef.current) setVideoRef(videoElementRef.current);
        return () => setVideoRef(null);
    }, [setVideoRef, video?.url]);

    // Play/Pause Sync
    useEffect(() => {
        const el = videoElementRef.current;
        if (!el || !video?.url) return;
        if (isPlaying) el.play().catch(e => console.log(e));
        else el.pause();
    }, [isPlaying, video?.url]);

    const handleSeek = (time: number) => {
        if (videoElementRef.current) {
            videoElementRef.current.currentTime = time;
            onTimeUpdate(time);
        }
        onSeek(time);
    };

    const handleStop = () => {
        if (videoElementRef.current) {
            videoElementRef.current.pause();
            videoElementRef.current.currentTime = 0;
            onTimeUpdate(0);
        }
        onStop();
    };

    const skip = (seconds: number) => {
        if (video && videoElementRef.current) {
            const newTime = Math.max(0, Math.min(video.duration, currentTime + seconds));
            videoElementRef.current.currentTime = newTime;
            onTimeUpdate(newTime);
            onSeek(newTime);
        }
    };

    // Handle video ended
    const handleEnded = () => {
        if (videoElementRef.current) {
            onTimeUpdate(videoElementRef.current.duration);
        }
    };

    return (
        <div className="video-player">
            {/* Main Video Area - acts as professional editor viewport */}
            <div className="video-viewport" ref={containerRef}>
                {video?.url ? (
                    <>
                        <video
                            ref={videoElementRef}
                            src={video.url}
                            style={effectStyles}
                            onTimeUpdate={() => onTimeUpdate(videoElementRef.current?.currentTime || 0)}
                            onLoadedMetadata={() => {
                                updateVideoRect();
                                if (videoElementRef.current) {
                                    setVideoRef(videoElementRef.current);
                                }
                            }}
                            onEnded={handleEnded}
                            playsInline
                            preload="auto"
                        />

                        {/* OVERLAY LAYER - Matches Video Rect Exactly, Clips Content */}
                        <div
                            className="video-caption-overlay"
                            style={{
                                position: 'absolute',
                                width: videoRect.width,
                                height: videoRect.height,
                                left: videoRect.left,
                                top: videoRect.top,
                                overflow: 'hidden', // CRITICAL: Clip any content outside video bounds
                                pointerEvents: 'none'
                            }}
                        >
                            {/* Interactive container - full size of video */}
                            <div
                                className="caption-interactive-area"
                                style={{
                                    position: 'relative',
                                    width: '100%',
                                    height: '100%',
                                    pointerEvents: 'auto'
                                }}
                            >
                                {/* 1. Active Auto Caption */}
                                {activeCaptionIndex !== -1 && (
                                    <div
                                        className="caption-draggable"
                                        style={{
                                            position: 'absolute',
                                            left: `${getCaptionPosition(captions[activeCaptionIndex].position).x}%`,
                                            top: `${getCaptionPosition(captions[activeCaptionIndex].position).y}%`,
                                            transform: 'translate(-50%, -50%)',
                                            zIndex: 50,
                                            cursor: 'move',
                                            userSelect: 'none',
                                            display: 'flex',
                                            justifyContent: 'center'
                                        }}
                                        onMouseDown={(e) => handleDragStart(
                                            e,
                                            activeCaptionIndex.toString(),
                                            'caption',
                                            getCaptionPosition(captions[activeCaptionIndex].position).x,
                                            getCaptionPosition(captions[activeCaptionIndex].position).y
                                        )}
                                    >
                                        <span style={getCaptionStyle(captions[activeCaptionIndex].style)}>
                                            {captions[activeCaptionIndex].text}
                                        </span>
                                    </div>
                                )}

                                {/* 2. Custom Text Overlays */}
                                {activeTextOverlays.map(overlay => (
                                    <div
                                        key={overlay.id}
                                        className="text-overlay-draggable"
                                        style={{
                                            position: 'absolute',
                                            left: `${overlay.position?.x ?? 50}%`,
                                            top: `${overlay.position?.y ?? 50}%`,
                                            transform: 'translate(-50%, -50%)',
                                            zIndex: 60,
                                            cursor: 'move',
                                            userSelect: 'none',
                                            display: 'flex',
                                            justifyContent: 'center'
                                        }}
                                        onMouseDown={(e) => handleDragStart(
                                            e,
                                            overlay.id,
                                            'text',
                                            overlay.position?.x ?? 50,
                                            overlay.position?.y ?? 50
                                        )}
                                    >
                                        <span style={getTextOverlayStyle(overlay.style)}>
                                            {overlay.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-gray-500 flex flex-col items-center">
                        <Play size={48} className="mb-2 opacity-50" />
                        <p>No video loaded</p>
                    </div>
                )}
            </div>

            {/* Transport Controls */}
            <div className="video-controls">
                <div className="transport-controls">
                    {/* Skip Back 5s */}
                    <button
                        className="control-btn"
                        onClick={() => skip(-5)}
                        title="Skip back 5 seconds"
                    >
                        <SkipBack size={18} />
                    </button>

                    {/* Stop Button */}
                    <button
                        className="control-btn"
                        onClick={handleStop}
                        title="Stop and reset to beginning"
                    >
                        <Square size={18} />
                    </button>

                    {/* Play/Pause Button */}
                    <button
                        className="control-btn control-btn-primary"
                        onClick={onTogglePlay}
                        title={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying ? <Pause size={22} /> : <Play size={22} />}
                    </button>

                    {/* Skip Forward 5s */}
                    <button
                        className="control-btn"
                        onClick={() => skip(5)}
                        title="Skip forward 5 seconds"
                    >
                        <SkipForward size={18} />
                    </button>
                </div>

                {/* Timeline Seek Bar */}
                <div
                    className="seek-bar-container"
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = (e.clientX - rect.left) / rect.width;
                        handleSeek(Math.max(0, pct * (video?.duration || 1)));
                    }}
                >
                    <div className="seek-bar-track">
                        <div
                            className="seek-bar-progress"
                            style={{ width: `${(currentTime / (video?.duration || 1)) * 100}%` }}
                        />
                    </div>
                    <div
                        className="seek-bar-thumb"
                        style={{ left: `${(currentTime / (video?.duration || 1)) * 100}%` }}
                    />
                </div>

                {/* Timecode Display */}
                <div className="timecode-display">
                    <span className="timecode-current">{formatTimecode(currentTime)}</span>
                    <span className="timecode-separator">/</span>
                    <span className="timecode-duration">{formatTimecode(video?.duration || 0)}</span>
                </div>
            </div>
        </div>
    );
}
