/**
 * Timeline Clip Component
 * =======================
 * Individual clip block on the timeline.
 */

import type { TimelineClip as TimelineClipType } from './types';

interface TimelineClipProps {
    clip: TimelineClipType;
    pixelsPerSecond: number;
    isSelected: boolean;
    onClick: () => void;
}

function formatDuration(seconds: number): string {
    if (seconds < 60) {
        return `${seconds.toFixed(1)}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function TimelineClip({ clip, pixelsPerSecond, isSelected, onClick }: TimelineClipProps) {
    const duration = clip.end - clip.start;
    const width = duration * pixelsPerSecond;
    const left = clip.start * pixelsPerSecond;

    return (
        <div
            className={`timeline-clip ${isSelected ? 'selected' : ''}`}
            style={{
                left: `${left}px`,
                width: `${width}px`,
                backgroundColor: clip.color,
            }}
            onClick={onClick}
            title={`${clip.name}\n${formatDuration(clip.start)} - ${formatDuration(clip.end)}`}
        >
            {/* Clip Label */}
            <div className="clip-label">
                {width > 60 ? clip.name : ''}
            </div>

            {/* Duration Badge */}
            {width > 40 && (
                <div className="clip-duration">
                    {formatDuration(duration)}
                </div>
            )}

            {/* Resize Handles */}
            <div className="clip-handle left" />
            <div className="clip-handle right" />
        </div>
    );
}
