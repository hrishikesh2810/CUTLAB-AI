import { useRef, useCallback, MouseEvent, useEffect } from 'react';
import { useTimeline, formatTime, getClipAtTime } from '../store';
import './Timeline.css';

const TRACK_HEADER_WIDTH = 60;
const TRACK_HEIGHT = 60;

export function Timeline() {
    const {
        state,
        dispatch,
        seekTo,
        selectClip,
        splitClipAtPlayhead,
        deleteSelectedClip
    } = useTimeline();
    const { timeline, playhead, selectedClipId, zoom, isPlaying } = state;

    const tracksRef = useRef<HTMLDivElement>(null);

    // Calculate timeline width based on duration and zoom
    const timelineWidth = Math.max((timeline.duration || 30) * zoom, 800);
    const playheadX = playhead * zoom;

    // Generate time markers based on zoom level
    const getMarkerInterval = (): number => {
        if (zoom >= 100) return 1;      // Every 1 second
        if (zoom >= 50) return 5;       // Every 5 seconds
        if (zoom >= 20) return 10;      // Every 10 seconds
        return 30;                       // Every 30 seconds
    };

    const markerInterval = getMarkerInterval();
    const markers: number[] = [];
    const maxTime = Math.ceil(timeline.duration || 30);
    for (let i = 0; i <= maxTime; i += markerInterval) {
        markers.push(i);
    }

    // Click to seek on ruler/track
    const handleTimelineClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
        const element = e.currentTarget;
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left - TRACK_HEADER_WIDTH;

        if (x >= 0) {
            const time = x / zoom;
            seekTo(Math.max(0, Math.min(time, timeline.duration || 30)));
        }
    }, [zoom, seekTo, timeline.duration]);

    // Handle zoom controls
    const handleZoomIn = () => {
        dispatch({ type: 'SET_ZOOM', payload: zoom * 1.5 });
    };

    const handleZoomOut = () => {
        dispatch({ type: 'SET_ZOOM', payload: zoom / 1.5 });
    };

    const handleFitToWindow = () => {
        if (tracksRef.current && timeline.duration > 0) {
            const containerWidth = tracksRef.current.clientWidth - TRACK_HEADER_WIDTH;
            const newZoom = containerWidth / timeline.duration;
            dispatch({ type: 'SET_ZOOM', payload: Math.max(10, Math.min(200, newZoom)) });
        }
    };

    // Global keyboard shortcuts for editing
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't handle if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.key.toLowerCase()) {
                case 's':
                    // Split: If a clip is selected and playhead is within it
                    if (selectedClipId) {
                        const clip = timeline.clips.find(c => c.id === selectedClipId);
                        if (clip && playhead > clip.inPoint && playhead < clip.outPoint) {
                            e.preventDefault();
                            splitClipAtPlayhead(selectedClipId);
                        }
                    } else {
                        // Split clip under playhead
                        const clipAtPlayhead = getClipAtTime(timeline.clips, playhead);
                        if (clipAtPlayhead) {
                            e.preventDefault();
                            splitClipAtPlayhead(clipAtPlayhead.id);
                        }
                    }
                    break;
                case 'delete':
                case 'backspace':
                    if (selectedClipId) {
                        e.preventDefault();
                        deleteSelectedClip();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedClipId, playhead, timeline.clips, splitClipAtPlayhead, deleteSelectedClip]);

    return (
        <div className="timeline-panel">
            <div className="panel-header">
                <span>📐 Timeline</span>
                <div className="timeline-info">
                    <span className="playhead-time">{formatTime(playhead)}</span>
                    <span className="duration-time">/ {formatTime(timeline.duration)}</span>
                </div>
                <div className="timeline-tools">
                    <button className="tool-btn" onClick={handleZoomOut} title="Zoom Out">
                        🔍−
                    </button>
                    <span className="zoom-level">{Math.round(zoom)}px/s</span>
                    <button className="tool-btn" onClick={handleZoomIn} title="Zoom In">
                        🔍+
                    </button>
                    <button className="tool-btn" onClick={handleFitToWindow} title="Fit to Window">
                        ⬜
                    </button>
                </div>
            </div>

            <div className="timeline-container" ref={tracksRef}>
                {/* Time Ruler */}
                <div
                    className="time-ruler"
                    style={{ width: timelineWidth + TRACK_HEADER_WIDTH }}
                    onClick={handleTimelineClick}
                >
                    <div className="ruler-header" />
                    {markers.map((second) => (
                        <div
                            key={second}
                            className="time-marker"
                            style={{ left: TRACK_HEADER_WIDTH + (second * zoom) }}
                        >
                            <span className="marker-label">{formatTime(second)}</span>
                            <div className="marker-line" />
                        </div>
                    ))}
                </div>

                {/* Tracks Area */}
                <div className="tracks-container" onClick={handleTimelineClick}>
                    <div className="tracks-scroll" style={{ width: timelineWidth + TRACK_HEADER_WIDTH }}>
                        {/* Video Track */}
                        <div className="track" style={{ height: TRACK_HEIGHT }}>
                            <div className="track-header">
                                <span className="track-icon">🎬</span>
                                <span className="track-name">V1</span>
                            </div>
                            <div className="track-content">
                                {timeline.clips.length === 0 ? (
                                    <div className="track-empty">
                                        Drag clips from Media Bin to add to timeline
                                    </div>
                                ) : (
                                    timeline.clips.map((clip) => {
                                        const duration = clip.outPoint - clip.inPoint;
                                        const width = duration * zoom;
                                        const left = clip.inPoint * zoom; // Position by in-point

                                        return (
                                            <div
                                                key={clip.id}
                                                className={`clip-block ${selectedClipId === clip.id ? 'selected' : ''}`}
                                                style={{
                                                    width: Math.max(width, 40),
                                                    left,
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    selectClip(clip.id);
                                                }}
                                            >
                                                <div className="clip-handle left" title="Trim In" />
                                                <div className="clip-content">
                                                    <span className="clip-label">{clip.label}</span>
                                                    <span className="clip-duration">
                                                        {formatTime(duration)}
                                                    </span>
                                                </div>
                                                <div className="clip-handle right" title="Trim Out" />
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Audio Track */}
                        <div className="track audio-track" style={{ height: TRACK_HEIGHT - 20 }}>
                            <div className="track-header">
                                <span className="track-icon">🔊</span>
                                <span className="track-name">A1</span>
                            </div>
                            <div className="track-content">
                                {/* Audio waveform placeholder */}
                                <div className="audio-placeholder">
                                    Audio waveforms will appear here
                                </div>
                            </div>
                        </div>

                        {/* Playhead */}
                        <div
                            className={`playhead ${isPlaying ? 'playing' : ''}`}
                            style={{ left: TRACK_HEADER_WIDTH + playheadX }}
                        >
                            <div className="playhead-head" />
                            <div className="playhead-line" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
