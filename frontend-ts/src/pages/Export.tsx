import { useState } from 'react';
import { Download, FileJson, FileCode, AlertCircle, CheckCircle } from 'lucide-react';
import { useProject } from '../store/ProjectContext';
import * as api from '../services/api';

export function ExportPage() {
    const { state } = useProject();
    const { projectId, suggestions, acceptedSuggestions, timeline } = state;

    const [format, setFormat] = useState<'json' | 'xml'>('json');
    const [isExporting, setIsExporting] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(false);

    const handleExport = async () => {
        if (!projectId) return;

        setIsExporting(true);
        setExportSuccess(false);

        try {
            const acceptedIds = Array.from(acceptedSuggestions);
            const blob = await api.exportTimeline(projectId, format, acceptedIds.length > 0 ? acceptedIds : undefined);

            // Download the file
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cutlab_timeline_${projectId.slice(0, 8)}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setExportSuccess(true);
            setTimeout(() => setExportSuccess(false), 3000);
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setIsExporting(false);
        }
    };

    if (!projectId) {
        return (
            <div className="empty-state">
                <AlertCircle size={64} />
                <h3>No Project Loaded</h3>
                <p>Please upload a video first in the Upload tab.</p>
            </div>
        );
    }

    return (
        <div className="fade-in">
            <div className="card">
                <div className="card-header">
                    <div>
                        <h2 className="card-title">📦 Export Timeline</h2>
                        <p className="card-subtitle">Export your edited timeline for use in other applications</p>
                    </div>
                </div>

                {/* Export Format Selection */}
                <div style={{ marginBottom: 'var(--space-xl)' }}>
                    <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Select Format
                    </h3>
                    <div className="export-options">
                        <div
                            className={`export-option ${format === 'json' ? 'selected' : ''}`}
                            onClick={() => setFormat('json')}
                        >
                            <FileJson />
                            <h4>JSON</h4>
                            <p>Universal format for web and custom tools</p>
                        </div>
                        <div
                            className={`export-option ${format === 'xml' ? 'selected' : ''}`}
                            onClick={() => setFormat('xml')}
                        >
                            <FileCode />
                            <h4>XML (FCP)</h4>
                            <p>Compatible with Final Cut Pro and other NLEs</p>
                        </div>
                    </div>
                </div>

                {/* Export Summary */}
                <div style={{ marginBottom: 'var(--space-xl)' }}>
                    <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Export Summary
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)' }}>
                        <div className="stat-item">
                            <span className="stat-label">Clips in Timeline</span>
                            <span className="stat-value">{timeline?.clips.length || 0}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Timeline Duration</span>
                            <span className="stat-value">{(timeline?.duration || 0).toFixed(1)}s</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Accepted Suggestions</span>
                            <span className="stat-value">{acceptedSuggestions.size} / {suggestions?.length || 0}</span>
                        </div>
                    </div>
                </div>

                {/* What's Included */}
                <div style={{ marginBottom: 'var(--space-xl)' }}>
                    <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        What's Included
                    </h3>
                    <div className="scene-list">
                        <div className="scene-item">
                            <div className="scene-thumbnail" style={{ background: 'var(--accent-success)', color: 'white' }}>
                                <CheckCircle size={20} />
                            </div>
                            <div className="scene-info">
                                <div className="scene-label">Project Metadata</div>
                                <div className="scene-time">Video file info, resolution, FPS, duration</div>
                            </div>
                        </div>
                        <div className="scene-item">
                            <div className="scene-thumbnail" style={{ background: 'var(--accent-secondary)', color: 'white' }}>
                                <CheckCircle size={20} />
                            </div>
                            <div className="scene-info">
                                <div className="scene-label">Timeline Clips</div>
                                <div className="scene-time">All clips with in/out points, speed, and labels</div>
                            </div>
                        </div>
                        <div className="scene-item">
                            <div className="scene-thumbnail" style={{ background: 'var(--accent-info)', color: 'white' }}>
                                <CheckCircle size={20} />
                            </div>
                            <div className="scene-info">
                                <div className="scene-label">Transitions</div>
                                <div className="scene-time">Transition types and durations between clips</div>
                            </div>
                        </div>
                        <div className="scene-item">
                            <div className="scene-thumbnail" style={{ background: 'var(--accent-primary)', color: 'white' }}>
                                <CheckCircle size={20} />
                            </div>
                            <div className="scene-info">
                                <div className="scene-label">AI Suggestions</div>
                                <div className="scene-time">Accepted cut suggestions with confidence scores</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Export Button */}
                <button
                    className="btn btn-success btn-lg btn-full"
                    onClick={handleExport}
                    disabled={isExporting}
                >
                    {isExporting ? (
                        <>
                            <span className="loading-spinner" />
                            Exporting...
                        </>
                    ) : exportSuccess ? (
                        <>
                            <CheckCircle size={20} />
                            Export Complete!
                        </>
                    ) : (
                        <>
                            <Download size={20} />
                            Export {format.toUpperCase()} Timeline
                        </>
                    )}
                </button>
            </div>

            {/* Additional Info */}
            <div className="card slide-up">
                <div className="card-header">
                    <h2 className="card-title">ℹ️ Export Tips</h2>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.8 }}>
                    <p><strong>JSON Format:</strong> Best for web applications, custom processing scripts, and integration with other tools. The JSON file contains all timeline data in a structured format that can be easily parsed and manipulated.</p>
                    <br />
                    <p><strong>XML (FCP) Format:</strong> Compatible with Final Cut Pro, DaVinci Resolve, and other professional video editing software that supports FCPXML import. Note that some advanced features may not be fully supported in all NLEs.</p>
                    <br />
                    <p><strong>Non-Destructive:</strong> The export only contains edit decisions (EDL). Your original video files are never modified. The exported timeline references the original video file path for re-linking in your NLE.</p>
                </div>
            </div>
        </div>
    );
}
