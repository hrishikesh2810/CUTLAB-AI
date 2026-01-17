import { Search, Film, Clock, AlertCircle } from 'lucide-react';
import { useProject } from '../store/ProjectContext';
import type { Scene } from '../types';

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function SceneItem({ scene, maxDuration }: { scene: Scene; maxDuration: number }) {
    const duration = scene.end_time - scene.start_time;
    const percentage = (duration / maxDuration) * 100;

    return (
        <div className="scene-item">
            <div className="scene-thumbnail">
                <Film size={24} />
            </div>
            <div className="scene-info">
                <div className="scene-label">Scene {scene.scene_id}</div>
                <div className="scene-time">
                    {formatTime(scene.start_time)} → {formatTime(scene.end_time)}
                </div>
            </div>
            <div style={{ flex: 1, maxWidth: '200px' }}>
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${percentage}%` }} />
                </div>
            </div>
            <div className="scene-duration">{duration?.toFixed(3) || '0.000'}s</div>
        </div>
    );
}

function SceneBarChart({ scenes }: { scenes: Scene[] }) {
    const maxDuration = Math.max(...scenes.map(s => s.end_time - s.start_time));

    return (
        <div className="bar-chart">
            {scenes.map((scene) => {
                const duration = scene.end_time - scene.start_time;
                const height = (duration / maxDuration) * 100;

                return (
                    <div
                        key={scene.scene_id}
                        className="bar"
                        style={{ height: `${height}%` }}
                        title={`Scene ${scene.scene_id}: ${duration.toFixed(2)}s`}
                    >
                        <span className="bar-label">{scene.scene_id}</span>
                    </div>
                );
            })}
        </div>
    );
}

export function AnalysisPage() {
    const { state, analyzeScenes } = useProject();

    const handleAnalyze = async () => {
        try {
            await analyzeScenes();
        } catch {
            // Error handled in context
        }
    };

    if (!state.projectId) {
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
                        <h2 className="card-title">Scene Detection</h2>
                        <p className="card-subtitle">Analyze your video to detect scene changes</p>
                    </div>
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleAnalyze}
                        disabled={state.isLoading}
                    >
                        {state.isLoading ? (
                            <>
                                <span className="loading-spinner" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Search size={20} />
                                Detect Scenes
                            </>
                        )}
                    </button>
                </div>

                {state.isLoading && (
                    <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                        <div className="loading-spinner" style={{ width: 40, height: 40, margin: '0 auto' }} />
                        <p style={{ marginTop: 'var(--space-md)', color: 'var(--text-secondary)' }}>
                            Analyzing video for scene changes...
                        </p>
                    </div>
                )}
            </div>

            {state.scenes && state.scenes.length > 0 && (
                <>
                    <div className="card slide-up">
                        <div className="card-header">
                            <div>
                                <h2 className="card-title">📊 Scene Duration Chart</h2>
                                <p className="card-subtitle">{state.scenes.length} scenes detected</p>
                            </div>
                        </div>
                        <SceneBarChart scenes={state.scenes} />
                    </div>

                    <div className="card slide-up">
                        <div className="card-header">
                            <div>
                                <h2 className="card-title">🎬 Scene Timeline</h2>
                                <p className="card-subtitle">Click on a scene to view details</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--text-muted)' }}>
                                <Clock size={16} />
                                <span style={{ fontSize: '0.875rem' }}>
                                    Total: {formatTime(state.scenes[state.scenes.length - 1]?.end_time || 0)}
                                </span>
                            </div>
                        </div>

                        <div className="scene-list">
                            {state.scenes.map((scene) => (
                                <SceneItem
                                    key={scene.scene_id}
                                    scene={scene}
                                    maxDuration={Math.max(...state.scenes!.map(s => s.end_time - s.start_time))}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="card slide-up">
                        <div className="card-header">
                            <h2 className="card-title">📋 Scene Data</h2>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Scene</th>
                                        <th>Start Time</th>
                                        <th>End Time</th>
                                        <th>Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {state.scenes.map((scene) => (
                                        <tr key={scene.scene_id}>
                                            <td style={{ fontWeight: 600 }}>Scene {scene.scene_id}</td>
                                            <td>{formatTime(scene.start_time)}</td>
                                            <td>{formatTime(scene.end_time)}</td>
                                            <td style={{ color: 'var(--accent-secondary)' }}>
                                                {(scene.end_time - scene.start_time)?.toFixed(3) || '0.000'}s
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {state.scenes && state.scenes.length === 0 && (
                <div className="card">
                    <div className="empty-state">
                        <Film size={64} />
                        <h3>No Scenes Detected</h3>
                        <p>The video appears to be a single continuous scene.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
