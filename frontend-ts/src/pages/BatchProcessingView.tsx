import { Layers, Play, CheckCircle, Trash2, RotateCcw } from 'lucide-react';
import { useProject } from '../store/ProjectContext';
import './BatchProcessingView.css';

export function BatchProcessingView() {
    const { state } = useProject();
    const { projects } = state;

    return (
        <div className="batch-view fade-in">
            <header className="batch-header">
                <div className="header-left">
                    <h1>Batch Processing</h1>
                    <p className="subtitle">Manage multiple video analysis jobs</p>
                </div>
                <div className="header-actions">
                    <button className="action-btn secondary">Clear Finished</button>
                    <button className="action-btn primary"><Layers size={18} /> New Batch Job</button>
                </div>
            </header>

            <div className="stats-bar">
                <div className="stat-item primary">
                    <span className="stat-value">{projects.length}</span>
                    <span className="stat-label">Total Jobs</span>
                </div>
                <div className="stat-item success">
                    <span className="stat-value">{projects.filter(p => p.id).length}</span>
                    <span className="stat-label">Completed</span>
                </div>
                <div className="stat-item danger">
                    <span className="stat-value">0</span>
                    <span className="stat-label">Failed</span>
                </div>
            </div>

            <div className="jobs-list">
                {projects.map((project, idx) => (
                    <div key={project.id || project.project_id} className={`job-row status-${idx === 0 ? 'primary' : 'success'}`}>
                        <div className="job-icon">
                            {idx === 0 ? <Play size={20} /> : <CheckCircle size={20} />}
                        </div>
                        <div className="job-details">
                            <span className="job-name">{project.name || project.filename}</span>
                            <div className="job-meta">
                                <span className="job-id">ID: {project.id?.slice(0, 8)}</span>
                                <span className="job-preset">Preset: 1080p AI</span>
                            </div>
                        </div>
                        <div className="job-progress-area">
                            <div className="progress-track">
                                <div className="progress-fill" style={{ width: idx === 0 ? '45%' : '100%' }} />
                            </div>
                            <span className="progress-text">{idx === 0 ? '45%' : '100%'}</span>
                        </div>
                        <div className="job-actions">
                            <button className="retry-btn" title="Restart"><RotateCcw size={14} /></button>
                            <button className="remove-btn"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}

                {projects.length === 0 && (
                    <div className="empty-state">
                        <Layers size={48} />
                        <h2>No Jobs Found</h2>
                        <p>Upload a video to start your first analysis job.</p>
                        <button className="btn btn-primary">Go to Upload</button>
                    </div>
                )}
            </div>
        </div>
    );
}
