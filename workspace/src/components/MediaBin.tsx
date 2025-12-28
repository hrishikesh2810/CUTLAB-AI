import { useRef, useEffect, useState } from 'react';
import { useMedia } from '../store';
import { MediaItem } from '../types';
import './MediaBin.css';

interface MediaBinProps {
    onItemDrop?: (item: MediaItem) => void;
}

export function MediaBin({ onItemDrop }: MediaBinProps) {
    const { state, importFiles, removeItem, selectItem, dispatch } = useMedia();
    const { items, selectedItemId, isLoading } = state;

    // Refs for getting video duration
    const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

    const formatDuration = (seconds: number): string => {
        if (seconds === 0) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '';
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(1)} MB`;
    };

    const handleImport = async () => {
        await importFiles();
    };

    const handleDoubleClick = (item: MediaItem) => {
        if (onItemDrop) {
            onItemDrop(item);
        }
    };

    const handleRemove = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        removeItem(id);
    };

    // Update duration when video metadata loads
    const handleVideoLoadedMetadata = (id: string, video: HTMLVideoElement) => {
        const duration = video.duration;
        const width = video.videoWidth;
        const height = video.videoHeight;

        if (!isNaN(duration)) {
            dispatch({
                type: 'UPDATE_ITEM',
                payload: {
                    id,
                    updates: { duration, width, height },
                },
            });
        }
    };

    return (
        <div className="media-bin">
            <div className="panel-header">
                <span>📁 Media Bin</span>
                <button
                    className="btn-icon"
                    title="Import Media"
                    onClick={handleImport}
                    disabled={isLoading}
                >
                    {isLoading ? '⏳' : '+'}
                </button>
            </div>

            <div className="panel-content">
                <div className="media-hint">
                    {items.length === 0
                        ? 'Click + to import video files'
                        : 'Double-click to add to timeline'
                    }
                </div>

                <div className="media-list">
                    {items.length === 0 ? (
                        <div className="media-empty">
                            <div className="empty-icon">📽️</div>
                            <p>No media imported</p>
                            <button className="btn btn-primary" onClick={handleImport}>
                                + Import Videos
                            </button>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div
                                key={item.id}
                                className={`media-item ${selectedItemId === item.id ? 'selected' : ''}`}
                                onClick={() => selectItem(item.id)}
                                onDoubleClick={() => handleDoubleClick(item)}
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('application/json', JSON.stringify(item));
                                    e.dataTransfer.effectAllowed = 'copy';
                                }}
                            >
                                <div className="media-thumbnail">
                                    {/* Hidden video to get metadata */}
                                    <video
                                        ref={(el) => {
                                            if (el) {
                                                videoRefs.current.set(item.id, el);
                                            }
                                        }}
                                        src={item.path}
                                        className="thumbnail-video"
                                        muted
                                        preload="metadata"
                                        onLoadedMetadata={(e) =>
                                            handleVideoLoadedMetadata(item.id, e.currentTarget)
                                        }
                                    />
                                    <div className="media-placeholder">
                                        🎬
                                    </div>
                                    <span className="media-duration">
                                        {formatDuration(item.duration)}
                                    </span>
                                </div>
                                <div className="media-info">
                                    <span className="media-name" title={item.filename}>
                                        {item.filename}
                                    </span>
                                    <span className="media-meta">
                                        {item.width > 0 && `${item.width}x${item.height}`}
                                        {item.hasAudio && ' • 🔊'}
                                    </span>
                                </div>
                                <button
                                    className="media-remove"
                                    onClick={(e) => handleRemove(e, item.id)}
                                    title="Remove from bin"
                                >
                                    ×
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
