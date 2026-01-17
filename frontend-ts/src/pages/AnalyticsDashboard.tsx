import { LayoutDashboard, TrendingUp, Music, Zap, Clock, Info } from 'lucide-react';
import { useProject } from '../store/ProjectContext';
import './AnalyticsDashboard.css';

export function AnalyticsDashboard() {
    const { state } = useProject();
    const { metadata, scenes, suggestions } = state;

    if (!metadata) {
        return (
            <div className="analytics-dashboard">
                <div className="empty-screen" style={{ padding: '4rem', textAlign: 'center' }}>
                    <LayoutDashboard size={64} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <h2>No Project Selected</h2>
                    <p>Please upload a video to see analysis analytics.</p>
                </div>
            </div>
        );
    }

    const sceneCount = scenes?.length || 0;
    const suggestionCount = suggestions?.length || 0;
    const duration = metadata.duration;

    // Mock scores for display
    const engagementScore = 85;
    const rhythmScore = 72;
    const densityScore = 64;

    return (
        <div className="analytics-dashboard fade-in">
            <header className="dashboard-header">
                <div className="left-group">
                    <h1>Analysis Dashboard</h1>
                    <span className="project-id">{state.projectId?.slice(0, 8)}</span>
                </div>
                <div className="export-buttons">
                    <button className="export-btn">Download Report</button>
                    <button className="export-btn primary">Save Snapshot</button>
                </div>
            </header>

            <main className="dashboard-content">
                <div className="metrics-grid">
                    <div className="metric-card engagement">
                        <div className="card-icon"><TrendingUp size={20} /></div>
                        <div className="card-content">
                            <span className="metric-label">Engagement</span>
                            <div className="metric-value-row">
                                <span className="metric-value">{engagementScore}</span>
                                <span className="metric-unit">/100</span>
                            </div>
                            <span className="metric-desc">Based on motion intensity</span>
                        </div>
                        <div className="score-bar-container">
                            <div className="score-bar high" style={{ width: `${engagementScore}%` }} />
                        </div>
                    </div>

                    <div className="metric-card rhythm">
                        <div className="card-icon"><Music size={20} /></div>
                        <div className="card-content">
                            <span className="metric-label">Rhythm</span>
                            <div className="metric-value-row">
                                <span className="metric-value">{rhythmScore}</span>
                                <span className="metric-unit">/100</span>
                            </div>
                            <span className="metric-desc">Audio-visual sync score</span>
                        </div>
                        <div className="score-bar-container">
                            <div className="score-bar medium" style={{ width: `${rhythmScore}%` }} />
                        </div>
                    </div>

                    <div className="metric-card density">
                        <div className="card-icon"><Zap size={20} /></div>
                        <div className="card-content">
                            <span className="metric-label">Cut Density</span>
                            <div className="metric-value-row">
                                <span className="metric-value">{densityScore}</span>
                                <span className="metric-unit">%</span>
                            </div>
                            <span className="metric-desc">Suggested frequency</span>
                        </div>
                        <div className="score-bar-container">
                            <div className="score-bar medium" style={{ width: `${densityScore}%` }} />
                        </div>
                    </div>

                    <div className="metric-card duration">
                        <div className="card-icon"><Clock size={20} /></div>
                        <div className="card-content">
                            <span className="metric-label">Total Time</span>
                            <div className="metric-value-row">
                                <span className="metric-value">{duration?.toFixed(1) || '0.0'}</span>
                                <span className="metric-unit">s</span>
                            </div>
                            <span className="metric-desc">Input video length</span>
                        </div>
                    </div>
                </div>

                <div className="chart-section">
                    <h2>AI Insights Summary</h2>
                    <div className="bar-chart">
                        <div className="chart-row">
                            <span className="chart-label">Detected Scenes</span>
                            <div className="chart-bar-bg">
                                <div className="chart-bar" style={{ width: `${Math.min(sceneCount * 5, 100)}%`, background: 'var(--accent-info)' }}>
                                    <span>{sceneCount}</span>
                                </div>
                            </div>
                        </div>
                        <div className="chart-row">
                            <span className="chart-label">AI Suggestions</span>
                            <div className="chart-bar-bg">
                                <div className="chart-bar" style={{ width: `${Math.min(suggestionCount * 10, 100)}%`, background: 'var(--accent-secondary)' }}>
                                    <span>{suggestionCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="insights-section">
                    <h2><Info size={18} /> Smart Recommendations</h2>
                    <div className="insights-list">
                        <div className="insight-card">
                            <div className="insight-icon"><Zap size={16} /></div>
                            <p>High motion variation detected. Suggesting {suggestionCount} cuts to improve pacing.</p>
                        </div>
                        {metadata.has_audio && (
                            <div className="insight-card">
                                <div className="insight-icon"><Music size={16} /></div>
                                <p>Audio peaks align with {Math.floor(suggestionCount * 0.7)} suggested cut points for better impact.</p>
                            </div>
                        )}
                        <div className="insight-card empty">
                            <p>Pro Detail: Video resolution {metadata.width}x{metadata.height} is optimal for export.</p>
                        </div>
                    </div>
                </div>

                <section className="summary-section">
                    <h2>Project Overview</h2>
                    <div className="summary-grid">
                        <div className="summary-item">
                            <span className="summary-label">Status</span>
                            <span className="summary-value" style={{ color: 'var(--accent-success)' }}>Analyzed</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">AI Rating</span>
                            <span className="summary-value rating-high">Premium</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Frames</span>
                            <span className="summary-value">{Math.floor((duration || 0) * (metadata.fps || 0))}</span>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
