import { MediaItem } from '../types';
import './MediaBin.css';

interface MediaBinProps {
    items: MediaItem[];
    onItemSelect: (item: MediaItem) => void;
    onItemDrop?: (item: MediaItem) => void;
}

export function MediaBin({ items, onItemSelect, onItemDrop }: MediaBinProps) {
    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleDoubleClick = (item: MediaItem) => {
        if (onItemDrop) {
            onItemDrop(item);
        }
    };

    return (
        <div className="media-bin">
            <div className="panel-header">
                <span>📁 Media Bin</span>
                <button className="btn-icon" title="Import Media">+</button>
            </div>

            <div className="panel-content">
                <div className="media-hint">
                    Double-click to add to timeline
                </div>
                <div className="media-list">
                    {items.length === 0 ? (
                        <div className="media-empty">
                            <p>No media imported</p>
                            <p className="hint">Drag files here or click + to import</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div
                                key={item.id}
                                className="media-item"
                                onClick={() => onItemSelect(item)}
                                onDoubleClick={() => handleDoubleClick(item)}
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('application/json', JSON.stringify(item));
                                    e.dataTransfer.effectAllowed = 'copy';
                                }}
                            >
                                <div className="media-thumbnail">
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
                                        {item.width}x{item.height} • {item.fps}fps
                                        {item.hasAudio && ' • 🔊'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
