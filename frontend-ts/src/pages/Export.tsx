import { useState } from 'react';
import { Download, FileText, FileCode, Video, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useProject } from '../store/ProjectContext';

type ExportMode = 'video' | 'report' | 'data';

export function ExportPage() {
    const { state: projectState } = useProject();
    const { projectId, metadata } = projectState;

    const [activeTab, setActiveTab] = useState<ExportMode>('video');
    const [resolution, setResolution] = useState('720p (HD)');

    // Export Status
    const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
    const [progress, setProgress] = useState(0);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

    const handleStartExport = async () => {
        if (!projectId) return;

        setStatus('processing');
        setProgress(0);
        setError(null);
        setDownloadUrl(null);

        try {
            const body = {
                video_id: projectId,
                editor_state: {
                    // Pulling what we have from project context
                    // Ideally this would be the full editor state synced from the editor tab
                    filters: {},
                    captions: [],
                    clips: projectState.timeline?.clips || []
                },
                export_settings: {
                    resolution,
                    timestamp: new Date().toISOString()
                }
            };

            const endpoint = activeTab === 'video' ? '/export/video' : activeTab === 'report' ? '/export/report' : '/export/data';

            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error('Export request failed');
            const data = await res.json();

            if (activeTab === 'video') {
                pollExportStatus(data.export_id);
            } else {
                setStatus('completed');
                setDownloadUrl(data.download_url);
                setProgress(100);
            }
        } catch (_err: unknown) {
            setStatus('failed');
            setError(_err instanceof Error ? _err.message : 'Export failed');
        }
    };

    const pollExportStatus = async (exportId: string) => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/export/status/${exportId}`);
                if (!res.ok) throw new Error('Status check failed');
                const data = await res.json();

                setProgress(data.progress);

                if (data.status === 'completed') {
                    clearInterval(interval);
                    setStatus('completed');
                    setDownloadUrl(data.download_url);
                } else if (data.status === 'failed') {
                    clearInterval(interval);
                    setStatus('failed');
                    setError(data.error || 'FFmpeg processing failed');
                }
            } catch {
                clearInterval(interval);
                setStatus('failed');
                setError('Failed to poll export status');
            }
        }, 2000);
    };

    if (!projectId) {
        return (
            <div className="empty-state">
                <AlertCircle size={64} color="var(--text-muted)" />
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
                        <h2 className="card-title">📦 Export Center</h2>
                        <p className="card-subtitle">Finalize and download your project in various formats</p>
                    </div>
                </div>

                {/* Project Brief */}
                <div className="info-panel" style={{ marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>PROJECT NAME</span>
                            <span style={{ fontWeight: 600 }}>{metadata?.filename || 'Untitled'}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>DURATION</span>
                            <span style={{ fontWeight: 600 }}>{metadata?.duration?.toFixed(1) || '0.0'}s</span>
                        </div>
                    </div>
                </div>

                {/* Mode Tabs */}
                <div className="export-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                    {(['video', 'report', 'data'] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setActiveTab(mode)}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: activeTab === mode ? 'var(--accent-hover)' : 'transparent',
                                color: activeTab === mode ? 'white' : 'var(--text-secondary)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {mode === 'video' && <Video size={20} />}
                            {mode === 'report' && <FileText size={20} />}
                            {mode === 'data' && <FileCode size={20} />}
                            <span style={{ fontSize: '11px', fontWeight: 600 }}>{mode.toUpperCase()}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="tab-panel" style={{ minHeight: '200px', marginBottom: '32px' }}>
                    {activeTab === 'video' && (
                        <div className="video-options">
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Video Export Settings</h3>
                            <div className="control-group" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Target Resolution</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    {['480p (Small)', '720p (HD)', '1080p (Full HD)', 'Original Quality'].map(res => (
                                        <button
                                            key={res}
                                            onClick={() => setResolution(res)}
                                            style={{
                                                padding: '10px',
                                                borderRadius: '6px',
                                                border: '1px solid',
                                                borderColor: resolution === res ? 'var(--accent-primary)' : 'var(--border-color)',
                                                background: resolution === res ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                color: resolution === res ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                                fontSize: '12px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {res}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                <AlertCircle size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                Video export will bake in all timeline edits, transitions, and filters using high-quality H.264 encoding.
                            </p>
                        </div>
                    )}

                    {activeTab === 'report' && (
                        <div className="report-options">
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Project Report (PDF)</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                Generates a professional PDF document containing:
                            </p>
                            <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '20px', lineHeight: '1.8' }}>
                                <li>File Metadata (Resolution, FPS, Bitrate)</li>
                                <li>Edit Summary (Number of cuts, total duration)</li>
                                <li>Timeline Data (In/Out points for every clip)</li>
                                <li>AI Insights & Recommendations history</li>
                            </ul>
                        </div>
                    )}

                    {activeTab === 'data' && (
                        <div className="data-options">
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Raw Project Data (JSON)</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                Download the complete "Source of Truth" for this project. This file can be imported back into CUTLAB or used with 3rd-party pipeline tools.
                            </p>
                            <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontFamily: 'monospace', fontSize: '11px', color: '#888' }}>
                                {'{ "version": "1.0.0", "project_id": "' + projectId + '", ... }'}
                            </div>
                        </div>
                    )}
                </div>

                {/* Export Action / Status */}
                <div className="export-action-container">
                    {status === 'idle' && (
                        <button
                            className="btn btn-primary btn-lg btn-full"
                            onClick={handleStartExport}
                        >
                            <Download size={20} />
                            START {activeTab.toUpperCase()} EXPORT
                        </button>
                    )}

                    {status === 'processing' && (
                        <div className="export-status-box" style={{ padding: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', textAlign: 'center' }}>
                            <div style={{ position: 'relative', width: '64px', height: '64px', margin: '0 auto 16px' }}>
                                <Loader2 size={64} className="spin" style={{ color: 'var(--accent-primary)', opacity: 0.2 }} />
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                                    {progress}%
                                </div>
                            </div>
                            <h4 style={{ marginBottom: '8px' }}>Rendering in Progress...</h4>
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
                                <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.3s ease' }} />
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Building your file. Please do not close this tab.</p>
                        </div>
                    )}

                    {status === 'completed' && (
                        <div className="export-success-box" style={{ padding: '24px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                            <CheckCircle size={48} color="#22c55e" style={{ margin: '0 auto 16px' }} />
                            <h4 style={{ color: '#22c55e', marginBottom: '8px' }}>Export Complete!</h4>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Your file is ready for download.</p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <a
                                    href={`${API_BASE_URL}${downloadUrl}`}
                                    className="btn btn-success"
                                    style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    download
                                >
                                    <Download size={18} /> DOWNLOAD NOW
                                </a>
                                <button
                                    onClick={() => setStatus('idle')}
                                    className="btn btn-secondary"
                                    style={{ padding: '0 20px' }}
                                >
                                    New Export
                                </button>
                            </div>
                        </div>
                    )}

                    {status === 'failed' && (
                        <div className="export-error-box" style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
                            <h4 style={{ color: '#ef4444', marginBottom: '8px' }}>Export Failed</h4>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>{error || 'An unexpected error occurred during rendering.'}</p>
                            <button
                                onClick={() => setStatus('idle')}
                                className="btn btn-primary"
                                style={{ padding: '0 32px' }}
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
