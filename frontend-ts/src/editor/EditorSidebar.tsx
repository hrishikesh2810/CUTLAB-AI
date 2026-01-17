/**
 * Editor Sidebar
 * ==============
 * Multi-tab sidebar containing Media Library, Filters, and Info.
 */
import { useState, useEffect } from 'react';
import { Layers, Sliders, Info, Wand2, Type, ToggleLeft, ToggleRight, Loader2, Bold, Italic, Sparkles, Plus, Trash2 } from 'lucide-react';
import { MediaLibrary } from './MediaLibrary';
import { FiltersPanel } from './FiltersPanel';
import { SmartHumanEffectsPanel } from '../components/SmartHumanEffectsPanel';
import { AIContentEffectsPanel } from '../components/AIContentEffectsPanel';
import type { VideoFile, Scene, VideoFilters, Caption, CaptionSettings, AIContentAnalysis, AIContentEffectsState, TextOverlay } from './types';
import './VideoEditor.css';
import './TextPanel.css';

interface EditorSidebarProps {
    video: VideoFile | null;
    scenes: Scene[];
    filters: VideoFilters;
    captions: Caption[];
    textOverlays?: TextOverlay[];
    isGeneratingCaptions: boolean;
    showCaptions: boolean;
    captionSettings?: CaptionSettings;
    aiContentAnalysis: AIContentAnalysis | null;
    aiContentEffects: AIContentEffectsState;
    onSceneClick: (scene: { start: number; end: number }) => void;
    onUpdateFilters: (filters: VideoFilters) => void;
    onGenerateCaptions: () => void;
    onToggleCaptions: () => void;
    onUpdateCaption: (index: number, updates: Partial<Caption>) => void;
    onUpdateCaptionSettings?: (settings: Partial<CaptionSettings['style']>) => void;
    onToggleAIContentEffect: (effect: keyof AIContentEffectsState) => void;
    onRunContentAnalysis: () => void;
    onAddTextOverlay?: (text?: string) => void;
    onUpdateTextOverlay?: (id: string, updates: Partial<TextOverlay>) => void;
    onRemoveTextOverlay?: (id: string) => void;
    metadata?: any;
    width?: number; // Added for resize capability
}

type Tab = 'media' | 'filters' | 'text' | 'aiContent' | 'effects' | 'info';

const DEFAULT_FONTS = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Arial',
    'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Impact', 'Comic Sans MS'
];

export function EditorSidebar({
    video,
    scenes,
    filters,
    captions,
    textOverlays = [],
    isGeneratingCaptions,
    showCaptions,
    captionSettings,
    onSceneClick,
    onUpdateFilters,
    onGenerateCaptions,
    onToggleCaptions,
    onUpdateCaption,
    onUpdateCaptionSettings,
    aiContentAnalysis,
    aiContentEffects,
    onToggleAIContentEffect,
    onRunContentAnalysis,
    onAddTextOverlay,
    onUpdateTextOverlay,
    onRemoveTextOverlay,
    width,
}: EditorSidebarProps) {
    const [activeTab, setActiveTab] = useState<Tab>('media');
    const [availableFonts, setAvailableFonts] = useState<string[]>(DEFAULT_FONTS);

    // Fetch fonts from backend
    useEffect(() => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        fetch(`${apiUrl}/fonts`)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success' && Array.isArray(data.fonts)) {
                    setAvailableFonts(data.fonts.map((f: any) => f.name));
                }
            })
            .catch(err => console.error("Failed to fetch fonts:", err));
    }, []);

    const handleStyleChange = (key: keyof CaptionSettings['style'], value: any) => {
        onUpdateCaptionSettings?.({ [key]: value });
    };

    return (
        <div
            className="editor-sidebar-container"
            style={width ? { width: `${width}px` } : undefined}
        >
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
                    className={`sidebar-tab ${activeTab === 'text' ? 'active' : ''}`}
                    onClick={() => setActiveTab('text')}
                    title="Text & Captions"
                >
                    <Type size={18} />
                    <span>Text</span>
                </button>
                <button
                    className={`sidebar-tab ${activeTab === 'aiContent' ? 'active' : ''}`}
                    onClick={() => setActiveTab('aiContent')}
                    title="AI Content"
                >
                    <Sparkles size={18} />
                    <span>AI Logic</span>
                </button>
                <button
                    className={`sidebar-tab ${activeTab === 'effects' ? 'active' : ''}`}
                    onClick={() => setActiveTab('effects')}
                    title="Visual Effects"
                >
                    <Wand2 size={18} />
                    <span>Visuals</span>
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

                {activeTab === 'text' && (
                    <div className="text-panel">
                        <div className="panel-header">
                            <h2>Text & Captions</h2>
                        </div>

                        {/* Styling Section (Affects new text & captions) */}
                        <div className="effect-section">
                            <div className="section-title">Global Style (Defaults)</div>

                            <div className="control-group">
                                <label>Font Family</label>
                                <select
                                    className="styled-select"
                                    value={captionSettings?.style?.fontFamily || 'Inter'}
                                    onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
                                >
                                    {availableFonts.map(font => (
                                        <option key={font} value={font}>{font}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="control-group">
                                <label>Font Size ({captionSettings?.style?.fontSize}px)</label>
                                <input
                                    type="range"
                                    min="12"
                                    max="72"
                                    value={captionSettings?.style?.fontSize || 24}
                                    onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value))}
                                    className="styled-range"
                                />
                            </div>

                            <div className="control-group" style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label>Text Color</label>
                                    <div className="color-picker-wrapper">
                                        <input
                                            type="color"
                                            value={captionSettings?.style?.color || '#ffffff'}
                                            onChange={(e) => handleStyleChange('color', e.target.value)}
                                            className="styled-color-input"
                                        />
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>Background</label>
                                    <div className="color-picker-wrapper">
                                        <input
                                            type="color"
                                            value={captionSettings?.style?.backgroundColor?.slice(0, 7) || '#000000'}
                                            onChange={(e) => handleStyleChange('backgroundColor', e.target.value + '80')}
                                            className="styled-color-input"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="style-toggles">
                                <button
                                    className={`style-toggle-btn ${captionSettings?.style?.fontWeight === 'bold' ? 'active' : ''}`}
                                    onClick={() => handleStyleChange('fontWeight', captionSettings?.style?.fontWeight === 'bold' ? 'normal' : 'bold')}
                                    title="Bold"
                                >
                                    <Bold size={16} />
                                </button>
                                <button
                                    className={`style-toggle-btn ${captionSettings?.style?.fontStyle === 'italic' ? 'active' : ''}`}
                                    onClick={() => handleStyleChange('fontStyle', captionSettings?.style?.fontStyle === 'italic' ? 'normal' : 'italic')}
                                    title="Italic"
                                >
                                    <Italic size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Custom Text Overlays */}
                        <div className="custom-text-section">
                            <div className="section-header-row">
                                <h3><Type size={16} /> Custom Text</h3>
                                <button
                                    className="add-text-btn"
                                    onClick={() => onAddTextOverlay?.()}
                                >
                                    <Plus size={14} /> Add
                                </button>
                            </div>

                            {textOverlays.length === 0 ? (
                                <p className="empty-text-msg">No custom text added.</p>
                            ) : (
                                <div className="text-overlays-list">
                                    {textOverlays.map(overlay => (
                                        <div key={overlay.id} className="text-overlay-item">
                                            <div className="text-overlay-inputs">
                                                <input
                                                    type="text"
                                                    className="text-overlay-input"
                                                    value={overlay.text}
                                                    onChange={(e) => onUpdateTextOverlay?.(overlay.id, { text: e.target.value })}
                                                />
                                                <div className="text-overlay-meta">
                                                    <span>Start: {overlay.start.toFixed(1)}s</span>
                                                    <span>Dur: {(overlay.end - overlay.start).toFixed(1)}s</span>
                                                </div>
                                            </div>
                                            <button
                                                className="delete-text-btn"
                                                onClick={() => onRemoveTextOverlay?.(overlay.id)}
                                                title="Remove"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Captions List */}
                        <div className="captions-list-container">
                            <div className="captions-header">
                                <h3><Type size={16} /> Auto Captions</h3>
                                {captions.length > 0 && (
                                    <button
                                        className="caption-toggle-btn"
                                        onClick={onToggleCaptions}
                                        title={showCaptions ? "Hide Captions" : "Show Captions"}
                                    >
                                        {showCaptions ? <ToggleRight size={24} color="#84cc16" /> : <ToggleLeft size={24} />}
                                    </button>
                                )}
                            </div>

                            {isGeneratingCaptions ? (
                                <div className="generating-state" style={{ textAlign: 'center', padding: '20px' }}>
                                    <Loader2 size={24} className="spin" style={{ margin: '0 auto 8px', color: 'var(--accent)' }} />
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Generating...</p>
                                </div>
                            ) : captions.length === 0 ? (
                                <div className="empty-captions">
                                    <p>No captions generated yet.</p>
                                    <button
                                        className="generate-btn"
                                        onClick={onGenerateCaptions}
                                        disabled={!video}
                                    >
                                        <Wand2 size={16} /> Generate Captions
                                    </button>
                                </div>
                            ) : (
                                <div className="captions-scroll-area">
                                    {captions.map((caption, idx) => (
                                        <div key={idx} className="caption-item">
                                            <div className="caption-time">
                                                {caption.start.toFixed(1)}s - {caption.end.toFixed(1)}s
                                            </div>
                                            <textarea
                                                className="caption-textarea"
                                                value={caption.text}
                                                onChange={(e) => onUpdateCaption(idx, { text: e.target.value })}
                                                rows={2}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'aiContent' && (
                    <AIContentEffectsPanel
                        effects={aiContentEffects}
                        analysis={aiContentAnalysis}
                        isLoading={false}
                        onToggleEffect={onToggleAIContentEffect}
                        onRunAnalysis={onRunContentAnalysis}
                        hasCaptions={captions.length > 0}
                    />
                )}

                {activeTab === 'effects' && (
                    <div className="effects-panel">
                        <div className="panel-header">
                            <h2>Effects & AI</h2>
                        </div>
                        <div className="panel-content">
                            {/* Removed Captions from here as moved to Text tab, but maybe keep a button or link? 
                                Actually, user asked for a "font or text section".
                                I'll keep the Smart Human Effects here. 
                            */}
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
