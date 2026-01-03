/**
 * Export Page
 * 
 * Final export options for the edited video/timeline.
 * Route: /export
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTimeline } from '../store';
import { useAIInsights } from '../store/AIInsightsStore';
import './PageStyles.css';

type ExportFormat = 'json' | 'xml' | 'edl' | 'fcpxml';
type ExportQuality = 'draft' | 'standard' | 'high';

interface ExportSettings {
    format: ExportFormat;
    quality: ExportQuality;
    includeAIMetadata: boolean;
    includeMarkers: boolean;
}

export function ExportPage() {
    const navigate = useNavigate();
    const { state: timelineState } = useTimeline();
    const { state: insightsState, getAppliedSuggestions } = useAIInsights();

    const [settings, setSettings] = useState<ExportSettings>({
        format: 'json',
        quality: 'standard',
        includeAIMetadata: true,
        includeMarkers: true,
    });

    const [isExporting, setIsExporting] = useState(false);
    const [exportComplete, setExportComplete] = useState(false);

    const appliedSuggestions = getAppliedSuggestions();

    const handleExport = async () => {
        setIsExporting(true);

        // Simulate export process
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Create export data
        const exportData = {
            timeline: {
                ...timelineState.timeline,
                updatedAt: new Date().toISOString(),
            },
            aiMetadata: settings.includeAIMetadata ? {
                appliedSuggestions: appliedSuggestions.map(s => ({
                    id: s.id,
                    type: s.type,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    reason: s.reason,
                })),
                analysisDate: insightsState.insights?.createdAt,
                modelVersion: insightsState.insights?.summary.modelVersion,
            } : undefined,
            exportSettings: settings,
            exportedAt: new Date().toISOString(),
        };

        // Download file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cutlab-timeline-${Date.now()}.${settings.format}`;
        a.click();
        URL.revokeObjectURL(url);

        setIsExporting(false);
        setExportComplete(true);
    };

    const formatInfo: Record<ExportFormat, { name: string; desc: string; icon: string }> = {
        json: {
            name: 'JSON Timeline',
            desc: 'Native CUTLAB format with full fidelity',
            icon: '📄'
        },
        xml: {
            name: 'XML Timeline',
            desc: 'Universal NLE interchange format',
            icon: '📋'
        },
        edl: {
            name: 'EDL (CMX 3600)',
            desc: 'Industry standard edit decision list',
            icon: '📝'
        },
        fcpxml: {
            name: 'Final Cut Pro XML',
            desc: 'Compatible with Final Cut Pro X',
            icon: '🎬'
        },
    };

    return (
        <div className="page export-page">
            <header className="export-header">
                <Link to="/workspace" className="back-link">← Back to Workspace</Link>
                <h1>Export Project</h1>
            </header>

            {exportComplete ? (
                <div className="export-complete">
                    <div className="success-card">
                        <span className="success-icon">✅</span>
                        <h2>Export Complete!</h2>
                        <p>Your timeline has been exported successfully.</p>
                        <div className="complete-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setExportComplete(false)}
                            >
                                Export Again
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate('/workspace')}
                            >
                                Back to Workspace
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="export-content">
                    <div className="export-summary">
                        <h3>Project Summary</h3>
                        <div className="summary-grid">
                            <div className="summary-item">
                                <span className="summary-value">{timelineState.timeline.clips.length}</span>
                                <span className="summary-label">Clips</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-value">
                                    {Math.floor(timelineState.timeline.duration / 60)}:{String(Math.floor(timelineState.timeline.duration % 60)).padStart(2, '0')}
                                </span>
                                <span className="summary-label">Duration</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-value">{timelineState.timeline.transitions.length}</span>
                                <span className="summary-label">Transitions</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-value">{appliedSuggestions.length}</span>
                                <span className="summary-label">AI Edits Applied</span>
                            </div>
                        </div>
                    </div>

                    <div className="export-options">
                        <div className="option-section">
                            <h3>Export Format</h3>
                            <div className="format-grid">
                                {(Object.keys(formatInfo) as ExportFormat[]).map(format => (
                                    <button
                                        key={format}
                                        className={`format-card ${settings.format === format ? 'selected' : ''}`}
                                        onClick={() => setSettings(s => ({ ...s, format }))}
                                    >
                                        <span className="format-icon">{formatInfo[format].icon}</span>
                                        <span className="format-name">{formatInfo[format].name}</span>
                                        <span className="format-desc">{formatInfo[format].desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="option-section">
                            <h3>Quality Preset</h3>
                            <div className="quality-options">
                                {(['draft', 'standard', 'high'] as ExportQuality[]).map(quality => (
                                    <label key={quality} className="quality-option">
                                        <input
                                            type="radio"
                                            name="quality"
                                            checked={settings.quality === quality}
                                            onChange={() => setSettings(s => ({ ...s, quality }))}
                                        />
                                        <span className="quality-label">{quality.charAt(0).toUpperCase() + quality.slice(1)}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="option-section">
                            <h3>Include Options</h3>
                            <div className="checkbox-options">
                                <label className="checkbox-option">
                                    <input
                                        type="checkbox"
                                        checked={settings.includeAIMetadata}
                                        onChange={e => setSettings(s => ({ ...s, includeAIMetadata: e.target.checked }))}
                                    />
                                    <div className="option-content">
                                        <span className="option-name">AI Metadata</span>
                                        <span className="option-desc">Include applied AI suggestions and analysis data</span>
                                    </div>
                                </label>
                                <label className="checkbox-option">
                                    <input
                                        type="checkbox"
                                        checked={settings.includeMarkers}
                                        onChange={e => setSettings(s => ({ ...s, includeMarkers: e.target.checked }))}
                                    />
                                    <div className="option-content">
                                        <span className="option-name">Timeline Markers</span>
                                        <span className="option-desc">Include all markers and annotations</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="export-actions">
                        <button
                            className="btn btn-primary btn-large"
                            onClick={handleExport}
                            disabled={isExporting}
                        >
                            {isExporting ? (
                                <>
                                    <span className="spinner"></span>
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    📤 Export {formatInfo[settings.format].name}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
