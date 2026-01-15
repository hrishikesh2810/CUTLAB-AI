/**
 * Timeline Component
 * ==================
 * Bottom panel with timeline tracks and clips.
 * Scales with time using pixels-per-second zoom.
 */

import { useRef, useMemo } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { TimelineClip } from './TimelineClip';
import type { TimelineClip as TimelineClipType } from './types';

interface TimelineProps {
    clips: TimelineClipType[];
    duration: number;
    currentTime: number;
    zoom: number;
    selectedClipId: string | null;
    onClipClick: (clipId: string) => void;
    onSeek: (time: number) => void;
    onZoomChange: (zoom: number) => void;
}

function formatTimeMarker(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function Timeline({
    clips,
    duration,
    currentTime,
    zoom,
    selectedClipId,
    onClipClick,
    onSeek,
    onZoomChange,
}: TimelineProps) {
    const trackRef = useRef<HTMLDivElement>(null);

    // Calculate timeline width based on zoom
    const timelineWidth = Math.max(duration * zoom, 600);

    // Generate time markers
    const timeMarkers = useMemo(() => {
        const markers: number[] = [];
        // Determine interval based on zoom
        let interval = 5; // 5 second intervals
        if (zoom > 100) interval = 1;
        else if (zoom > 50) interval = 2;
        else if (zoom < 30) interval = 10;

        for (let t = 0; t <= duration; t += interval) {
            markers.push(t);
        }
        return markers;
    }, [duration, zoom]);

    // Handle track click to seek
    const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('timeline-track-bg')) {
            return; // Ignore clicks on clips
        }

        const rect = trackRef.current?.getBoundingClientRect();
        if (rect) {
            const scrollLeft = trackRef.current?.parentElement?.scrollLeft || 0;
            const x = e.clientX - rect.left + scrollLeft;
            const time = x / zoom;
            onSeek(Math.max(0, Math.min(duration, time)));
        }
    };

    // Playhead position
    const playheadPosition = currentTime * zoom;

    return (
        <div className="timeline">
            {/* Timeline Header */}
            <div className="timeline-header">
                <div className="timeline-title">
                    <span>🎞️ Timeline</span>
                    <span className="clip-count">{clips.length} clips</span>
                </div>

                {/* Zoom Controls */}
                <div className="zoom-controls">
                    <button
                        className="zoom-btn"
                        onClick={() => onZoomChange(zoom - 10)}
                        disabled={zoom <= 10}
                        title="Zoom out"
                    >
                        <ZoomOut size={16} />
                    </button>
                    <span className="zoom-level">{zoom} px/s</span>
                    <button
                        className="zoom-btn"
                        onClick={() => onZoomChange(zoom + 10)}
                        disabled={zoom >= 200}
                        title="Zoom in"
                    >
                        <ZoomIn size={16} />
                    </button>
                </div>
            </div>

            {/* Timeline Content */}
            <div className="timeline-content">
                {/* Time Ruler */}
                <div className="time-ruler" style={{ width: `${timelineWidth}px` }}>
                    {timeMarkers.map(time => (
                        <div
                            key={time}
                            className="time-marker"
                            style={{ left: `${time * zoom}px` }}
                        >
                            <div className="marker-line" />
                            <span className="marker-label">{formatTimeMarker(time)}</span>
                        </div>
                    ))}
                </div>

                {/* Track */}
                <div
                    ref={trackRef}
                    className="timeline-track"
                    style={{ width: `${timelineWidth}px` }}
                    onClick={handleTrackClick}
                >
                    <div className="timeline-track-bg" />

                    {/* Clips */}
                    {clips.map(clip => (
                        <TimelineClip
                            key={clip.clip_id}
                            clip={clip}
                            pixelsPerSecond={zoom}
                            isSelected={clip.clip_id === selectedClipId}
                            onClick={() => onClipClick(clip.clip_id)}
                        />
                    ))}

                    {/* Playhead */}
                    <div
                        className="playhead"
                        style={{ left: `${playheadPosition}px` }}
                    >
                        <div className="playhead-head" />
                        <div className="playhead-line" />
                    </div>
                </div>

                {/* Empty State */}
                {clips.length === 0 && duration === 0 && (
                    <div className="timeline-empty">
                        <p>No clips on timeline</p>
                        <p className="hint">Import a video and detect scenes to populate the timeline</p>
                    </div>
                )}
            </div>
        </div>
    );
}
