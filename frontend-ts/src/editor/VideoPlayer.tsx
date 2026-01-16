/**
 * Video Player Component
 * ======================
 * Center panel with HTML5 video player and controls.
 * Implements "Video Overlay Layer" strategy for ratio-aware caption positioning.
 */

import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
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

    // Draggable Logic - Centralized
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

            // Calculate delta in normalized coordinates
            // deltaX pixels / videoRect.width = deltaX normalized
            const deltaX = (e.clientX - startX) / videoRect.width * 100; // *100 because positions are 0-100
            const deltaY = (e.clientY - startY) / videoRect.height * 100;

            const newX = Math.max(0, Math.min(100, initialPos.x + deltaX));
            const newY = Math.max(0, Math.min(100, initialPos.y + deltaY));

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


    // Effect Styles from Filters
    const effectStyles = useMemo(() => {
        const filterList: string[] = [];
        if (filters && Object.keys(filters).length > 0) {
            filterList.push(getFilterString(filters));
        }
        return {
            filter: filterList.join(" "),
            width: '100%',
            height: '100%',
            objectFit: 'contain' as const
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

    // Format handling for older captions without explicit position
    const getCaptionStyle = (capStyle?: any) => {
        const defaults = captionSettings?.style || {
            fontFamily: 'Inter',
            fontSize: 24,
            color: 'white',
            backgroundColor: 'rgba(0,0,0,0.5)',
            fontWeight: 'normal',
            fontStyle: 'normal'
        };
        return { ...defaults, ...capStyle };
    };

    const getCaptionPosition = (capPos?: any) => {
        return capPos || captionSettings?.position || { x: 50, y: 90 };
    };

    // Video refs setup
    useEffect(() => {
        if (videoElementRef.current) setVideoRef(videoElementRef.current);
        return () => setVideoRef(null);
    }, [setVideoRef]);

    // Play/Pause Sync
    useEffect(() => {
        const el = videoElementRef.current;
        if (!el || !video?.url) return;
        if (isPlaying) el.play().catch(e => console.log(e));
        else el.pause();
    }, [isPlaying, video?.url]);

    const handleSeek = (time: number) => {
        if (videoElementRef.current) videoElementRef.current.currentTime = time;
        onSeek(time);
    };

    const skip = (seconds: number) => {
        if (video && videoElementRef.current) {
            const newTime = Math.max(0, Math.min(video.duration, currentTime + seconds));
            videoElementRef.current.currentTime = newTime;
            onSeek(newTime);
        }
    };

    return (
        <div className="video-player flex flex-col h-full bg-black/20 rounded-lg overflow-hidden">
            {/* Main Video Area */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black" ref={containerRef}>
                {video?.url ? (
                    <>
                        <video
                            ref={videoElementRef}
                            src={video.url}
                            style={effectStyles}
                            onTimeUpdate={() => onTimeUpdate(videoElementRef.current?.currentTime || 0)}
                            onLoadedMetadata={updateVideoRect}
                            onResize={updateVideoRect}
                            playsInline
                            className="max-w-full max-h-full"
                        />

                        {/* OVERLAY LAYER - Matches Video Rect Exactly */}
                        <div
                            className="absolute pointer-events-none" // Helper layer
                            style={{
                                width: videoRect.width,
                                height: videoRect.height,
                                left: videoRect.left,
                                top: videoRect.top,
                                // border: '1px solid rgba(255,255,0,0.3)' // Debug boundary
                            }}
                        >
                            <div className="relative w-full h-full pointer-events-auto"> {/* Interactive Area */}

                                {/* 1. Active Auto Caption */}
                                {activeCaptionIndex !== -1 && (
                                    <div
                                        className="absolute cursor-move select-none p-2 rounded hover:ring-1 ring-white/50"
                                        style={{
                                            left: `${getCaptionPosition(captions[activeCaptionIndex].position).x}%`,
                                            top: `${getCaptionPosition(captions[activeCaptionIndex].position).y}%`,
                                            transform: 'translate(-50%, -50%)',
                                            zIndex: 50
                                        }}
                                        onMouseDown={(e) => handleDragStart(e, activeCaptionIndex.toString(), 'caption', getCaptionPosition(captions[activeCaptionIndex].position).x, getCaptionPosition(captions[activeCaptionIndex].position).y)}
                                    >
                                        <span style={{
                                            ...getCaptionStyle(captions[activeCaptionIndex].style),
                                            display: 'inline-block',
                                            padding: '4px 12px',
                                            borderRadius: '4px',
                                            textAlign: 'center',
                                            whiteSpace: 'pre-wrap'
                                        }}>
                                            {captions[activeCaptionIndex].text}
                                        </span>
                                    </div>
                                )}

                                {/* 2. Custom Text Overlays */}
                                {activeTextOverlays.map(overlay => (
                                    <div
                                        key={overlay.id}
                                        className="absolute cursor-move select-none p-2 rounded hover:ring-1 ring-blue-500/50"
                                        style={{
                                            left: `${overlay.position?.x ?? 50}%`,
                                            top: `${overlay.position?.y ?? 50}%`,
                                            transform: 'translate(-50%, -50%)',
                                            zIndex: 60
                                        }}
                                        onMouseDown={(e) => handleDragStart(e, overlay.id, 'text', overlay.position?.x ?? 50, overlay.position?.y ?? 50)}
                                    >
                                        <span style={{
                                            fontFamily: overlay.style?.fontFamily || 'Inter',
                                            fontSize: `${overlay.style?.fontSize || 24}px`,
                                            color: overlay.style?.color || 'white',
                                            backgroundColor: overlay.style?.backgroundColor || 'transparent',
                                            fontWeight: overlay.style?.fontWeight as any || 'normal',
                                            fontStyle: overlay.style?.fontStyle as any || 'normal',
                                            display: 'inline-block',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            textAlign: 'center',
                                            whiteSpace: 'pre-wrap'
                                        }}>
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

            {/* Controls */}
            <div className="h-12 bg-black/40 backdrop-blur flex items-center px-4 gap-4 border-t border-white/10 shrink-0">
                {/* Skip Back */}
                <button onClick={() => skip(-5)} className="hover:text-blue-400">
                    <SkipBack size={20} />
                </button>

                {/* Play/Pause */}
                <button onClick={onTogglePlay} className="hover:text-blue-400">
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>

                {/* Skip Forward */}
                <button onClick={() => skip(5)} className="hover:text-blue-400">
                    <SkipForward size={20} />
                </button>

                {/* Progress */}
                <div className="flex-1 relative h-8 flex items-center group cursor-pointer"
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = (e.clientX - rect.left) / rect.width;
                        handleSeek(pct * (video?.duration || 1));
                    }}>
                    <div className="absolute inset-x-0 h-1 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${(currentTime / (video?.duration || 1)) * 100}%` }} />
                    </div>
                    <div className="absolute h-3 w-3 bg-white rounded-full shadow transition-opacity opacity-0 group-hover:opacity-100"
                        style={{ left: `${(currentTime / (video?.duration || 1)) * 100}%`, transform: 'translateX(-50%)' }} />
                </div>

                {/* Time */}
                <div className="text-xs font-mono text-gray-400">
                    {formatTimecode(currentTime)} / {formatTimecode(video?.duration || 0)}
                </div>
            </div>
        </div>
    );
}
