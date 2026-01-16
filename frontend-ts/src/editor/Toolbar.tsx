/**
 * Toolbar Component
 * =================
 * Top bar with action buttons: Import Video, Detect Scenes
 */

import { Upload, Scan, Loader2, Download } from 'lucide-react';
import { useRef } from 'react';
import type { VideoFile } from './types';

interface ToolbarProps {
    video: VideoFile | null;
    isLoading: boolean;
    onImport: (file: File) => void;
    onDetectScenes: () => void;
    onExport: () => void;
}

export function Toolbar({ video, isLoading, onImport, onDetectScenes, onExport }: ToolbarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImport(file);
            e.target.value = ''; // Reset input
        }
    };

    return (
        <div className="editor-toolbar">
            <div className="toolbar-left">
                <h1 className="toolbar-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src="/assets/logo-symbol.png" alt="Logo" style={{ height: '24px', width: 'auto' }} />
                    Video Editor
                </h1>
                {video && (
                    <span className="toolbar-filename">{video.filename}</span>
                )}
            </div>

            <div className="toolbar-right">
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/mov,video/avi,video/webm"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />

                {/* Import Video Button */}
                <button
                    className="toolbar-btn primary"
                    onClick={handleFileSelect}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="spin" size={18} />
                    ) : (
                        <Upload size={18} />
                    )}
                    Import Video
                </button>

                {/* Detect Scenes Button */}
                <button
                    className="toolbar-btn secondary"
                    onClick={onDetectScenes}
                    disabled={!video || isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="spin" size={18} />
                    ) : (
                        <Scan size={18} />
                    )}
                    Detect Scenes
                </button>

                {/* Export Button */}
                <button
                    className="toolbar-btn action-tint"
                    onClick={onExport}
                    disabled={!video || isLoading}
                >
                    <Download size={18} />
                    Export
                </button>
            </div>
        </div>
    );
}
