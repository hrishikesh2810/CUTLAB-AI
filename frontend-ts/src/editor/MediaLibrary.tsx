/**
 * Media Library Component
 * =======================
 * Left panel showing imported media and detected scenes.
 */

import { Film, Clock, Maximize, Layers } from 'lucide-react';
import type { VideoFile, Scene } from './types';

interface MediaLibraryProps {
    video: VideoFile | null;
    scenes: Scene[];
    onSceneClick: (scene: Scene) => void;
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export function MediaLibrary({ video, scenes, onSceneClick }: MediaLibraryProps) {
    return (
        <div className="media-library">
            <div className="panel-header">
                <h2><Film size={16} /> Media Library</h2>
            </div>

            <div className="panel-content">
                {/* Video Info Section */}
                {video ? (
                    <div className="media-section">
                        <h3 className="section-title">📹 Source Video</h3>
                        <div className="media-card">
                            <div className="media-thumbnail">
                                <Film size={32} />
                            </div>
                            <div className="media-info">
                                <div className="media-name" title={video.filename}>
                                    {video.filename}
                                </div>
                                <div className="media-meta">
                                    <span><Clock size={12} /> {formatTime(video.duration)}</span>
                                    <span><Maximize size={12} /> {video.width}x{video.height}</span>
                                    <span><Layers size={12} /> {video.fps.toFixed(0)} fps</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="empty-panel">
                        <Film size={48} strokeWidth={1} />
                        <p>No video imported</p>
                        <p className="hint">Click "Import Video" to get started</p>
                    </div>
                )}

                {/* Scenes Section */}
                {scenes.length > 0 && (
                    <div className="media-section">
                        <h3 className="section-title">🎬 Detected Scenes ({scenes.length})</h3>
                        <div className="scene-list">
                            {scenes.map((scene, index) => (
                                <div
                                    key={index}
                                    className="scene-item"
                                    onClick={() => onSceneClick(scene)}
                                >
                                    <div className="scene-number">Scene {index + 1}</div>
                                    <div className="scene-time">
                                        {formatTime(scene.start)} → {formatTime(scene.end)}
                                    </div>
                                    <div className="scene-duration">
                                        {(scene.end - scene.start).toFixed(2)}s
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
