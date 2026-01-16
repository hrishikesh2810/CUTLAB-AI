/**
 * Editor Sidebar
 * ==============
 * Multi-tab sidebar containing Media Library, Filters, and Info.
 */
import { useState } from 'react';
import { Layers, Sliders, Info, Wand2, Type, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { MediaLibrary } from './MediaLibrary';
import { FiltersPanel } from './FiltersPanel';
import { SmartHumanEffectsPanel } from '../components/SmartHumanEffectsPanel';
import type { VideoFile, Scene, VideoFilters, Caption } from './types';
import './VideoEditor.css';

interface EditorSidebarProps {
    video: VideoFile | null;
    scenes: Scene[];
    filters: VideoFilters;
    captions: Caption[];
    isGeneratingCaptions: boolean;
    showCaptions: boolean;
    onSceneClick: (scene: { start: number; end: number }) => void;
    onUpdateFilters: (filters: VideoFilters) => void;
    onGenerateCaptions: () => void;
    onToggleCaptions: () => void;
    onUpdateCaption: (index: number, text: string) => void;
    metadata?: any;
}

type Tab = 'media' | 'filters' | 'effects' | 'info';

export function EditorSidebar({
    video,
    scenes,
    filters,
    captions,
    isGeneratingCaptions,
    showCaptions,
    onSceneClick,
    onUpdateFilters,
    onGenerateCaptions,
    onToggleCaptions,
    onUpdateCaption,
}: EditorSidebarProps) {
    const [activeTab, setActiveTab] = useState<Tab>('effects'); // Default to effects for this task

    return (
        <div className="editor-sidebar-container">
            {/* Sidebar Tabs */}
            <div className="sidebar-tabs">
                <button
                    className={`sidebar-tab ${activeTab === 'media' ? 'active' : ''}`}
                    onClick={() => setActiveTab('media')}
                    title="Media Library"
                >
                    <Layers size={18} />
                    <span>Edit</span>
                </button>
                <button
                    className={`sidebar-tab ${activeTab === 'filters' ? 'active' : ''}`}
                    onClick={() => setActiveTab('filters')}
                    title="Filters"
                >
                    <Sliders size={18} />
                    <span>Filters</span>
                </button>
                <button
                    className={`sidebar-tab ${activeTab === 'effects' ? 'active' : ''}`}
                    onClick={() => setActiveTab('effects')}
                    title="Effects"
                >
                    <Wand2 size={18} />
                    <span>Effects</span>
                </button>
                <button
                    className={`sidebar-tab ${activeTab === 'info' ? 'active' : ''}`}
                    onClick={() => setActiveTab('info')}
                    title="Info"
                >
                    <Info size={18} />
                    <span>Info</span>
                </button>
            </div>

            {/* Sidebar Content */}
            <div className={`sidebar-content ${activeTab}`}>
                {activeTab === 'media' && (
                    <MediaLibrary
                        video={video}
                        scenes={scenes}
                        onSceneClick={onSceneClick}
                    />
                )}

                {activeTab === 'filters' && (
                    <FiltersPanel
                        filters={filters}
                        onUpdateFilters={onUpdateFilters}
                    />
                )}

                {activeTab === 'effects' && (
                    <div className="effects-panel">
                        <div className="panel-header">
                            <h2>Effects & AI</h2>
                        </div>
                        <div className="panel-content">
                            {/* Captions Section */}
                            <div className="effect-section">
                                <div className="effect-header">
                                    <h3><Type size={16} /> Auto Captions</h3>
                                    {captions.length > 0 && (
                                        <button
                                            className="toggle-btn"
                                            onClick={onToggleCaptions}
                                            title={showCaptions ? "Hide Captions" : "Show Captions"}
                                        >
                                            {showCaptions ? <ToggleRight size={24} color="#4ecdc4" /> : <ToggleLeft size={24} />}
                                        </button>
                                    )}
                                </div>

                                {isGeneratingCaptions ? (
                                    <div className="generating-state">
                                        <Loader2 size={24} className="spin" />
                                        <p>Generating captions with Whisper AI...</p>
                                        <small>This may take a moment (running locally)</small>
                                    </div>
                                ) : captions.length === 0 ? (
                                    <div className="empty-state">
                                        <p>Generate automatic captions for your video using local AI.</p>
                                        <button
                                            className="primary-btn full-width"
                                            onClick={onGenerateCaptions}
                                            disabled={!video}
                                        >
                                            <Wand2 size={16} /> Generate Captions
                                        </button>
                                    </div>
                                ) : (
                                    <div className="captions-list">
                                        {captions.map((caption, idx) => (
                                            <div key={idx} className="caption-item">
                                                <div className="caption-time">
                                                    {caption.start.toFixed(1)}s - {caption.end.toFixed(1)}s
                                                </div>
                                                <textarea
                                                    className="caption-text"
                                                    value={caption.text}
                                                    onChange={(e) => onUpdateCaption(idx, e.target.value)}
                                                    rows={2}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Smart Human Effects Section */}
                            <div className="effect-section">
                                <SmartHumanEffectsPanel />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'info' && (
                    <div className="info-panel">
                        <div className="panel-header">
                            <h2>Project Info</h2>
                        </div>
                        <div className="panel-content">
                            {video ? (
                                <div className="info-grid">
                                    <div className="info-item">
                                        <label>Filename</label>
                                        <span>{video.filename}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Duration</label>
                                        <span>{video.duration.toFixed(2)}s</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Resolution</label>
                                        <span>{video.width} x {video.height}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>FPS</label>
                                        <span>{video.fps}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>ID</label>
                                        <span style={{ fontSize: '10px' }}>{video.video_id}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="empty-text">No video loaded</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
