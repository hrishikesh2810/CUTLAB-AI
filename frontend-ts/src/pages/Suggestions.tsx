import { memo, useMemo, useCallback } from 'react';
import { Scissors, AlertCircle, CheckCircle, XCircle, Volume2, VolumeX, Music, Activity } from 'lucide-react';
import { useProject } from '../store/ProjectContext';
import type { CutSuggestion } from '../types';

function getAudioEmoji(label: string): string {
    const labelLower = label.toLowerCase();
    if (labelLower.includes('silence')) return '🔇';
    if (labelLower.includes('peak')) return '🎵';
    if (labelLower.includes('high')) return '🔊';
    if (labelLower.includes('low')) return '📉';
    return '🎧';
}

// Memoized Suggestion Card - only re-renders when props change
const SuggestionCard = memo(function SuggestionCard({
    suggestion,
    isAccepted,
    onToggle,
}: {
    suggestion: CutSuggestion;
    isAccepted: boolean;
    onToggle: () => void;
}) {
    const { metrics } = suggestion;

    return (
        <div className={`suggestion-card ${!isAccepted ? 'rejected' : ''}`}>
            <div className="suggestion-header">
                <div className="suggestion-title">
                    🎬 Scene {suggestion.scene_id}
                    <span className={`suggestion-badge ${suggestion.suggestion_type === 'CUT' ? 'badge-cut' : 'badge-keep'}`}>
                        {suggestion.suggestion_type === 'CUT' ? <Scissors size={12} /> : <CheckCircle size={12} />}
                        {suggestion.suggestion_type}
                    </span>
                    <span className="suggestion-badge" style={{ background: 'rgba(0, 180, 216, 0.2)', color: 'var(--accent-info)' }}>
                        {getAudioEmoji(suggestion.audio_label)} {suggestion.audio_label}
                    </span>
                </div>
                <span className="suggestion-badge badge-confidence">
                    {(suggestion.confidence * 100)?.toFixed(0) || '0'}% Confidence
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div className="stat-item">
                    <span className="stat-label">Start</span>
                    <span className="stat-value">{suggestion.cut_start}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">End</span>
                    <span className="stat-value">{suggestion.cut_end}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Duration</span>
                    <span className="stat-value">{metrics.duration?.toFixed(2) || '0.00'}s</span>
                </div>
            </div>

            <div style={{ marginBottom: 'var(--space-md)' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📊 Analysis Metrics
                </h4>
                <div className="suggestion-metrics">
                    <div className="metric-item">
                        <div className="metric-icon">🏃</div>
                        <div className="metric-value">{(metrics.motion_intensity * 100)?.toFixed(0) || '0'}%</div>
                        <div className="metric-label">Motion</div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-icon">
                            {metrics.silence_level > 0.5 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </div>
                        <div className="metric-value">{(metrics.silence_level * 100)?.toFixed(0) || '0'}%</div>
                        <div className="metric-label">Silence</div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-icon"><Music size={16} /></div>
                        <div className="metric-value">{(metrics.audio_energy * 100)?.toFixed(0) || '0'}%</div>
                        <div className="metric-label">Energy</div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-icon">👤</div>
                        <div className="metric-value">{metrics.has_faces ? 'Yes' : 'No'}</div>
                        <div className="metric-label">Face</div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-icon"><Activity size={16} /></div>
                        <div className="metric-value">{(metrics.repetitiveness * 100)?.toFixed(0) || '0'}%</div>
                        <div className="metric-label">Repetitive</div>
                    </div>
                </div>
            </div>

            {metrics.has_audio_peaks && (
                <div style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    background: 'rgba(0, 180, 216, 0.1)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: 'var(--space-md)',
                    fontSize: '0.875rem',
                    color: 'var(--accent-info)'
                }}>
                    🎵 {metrics.peak_count} audio peak(s) detected
                </div>
            )}

            <div className="suggestion-reason">
                💡 <strong>Reason:</strong> {suggestion.reason}
            </div>

            <div className="suggestion-actions">
                <label className="checkbox-wrapper">
                    <input
                        type="checkbox"
                        checked={isAccepted}
                        onChange={onToggle}
                    />
                    <span style={{ fontSize: '0.875rem', color: isAccepted ? 'var(--accent-success)' : 'var(--text-muted)' }}>
                        {isAccepted ? '✅ Accepted' : '❌ Rejected'}
                    </span>
                </label>
            </div>
        </div>
    );
});

export function SuggestionsPage() {
    const { state, dispatch, generateSuggestions } = useProject();
    const { suggestions, acceptedSuggestions, isLoading, scenes } = state;

    const handleGenerate = useCallback(async () => {
        try {
            await generateSuggestions();
        } catch {
            // Error handled in context
        }
    }, [generateSuggestions]);

    const toggleSuggestion = useCallback((sceneId: number) => {
        dispatch({ type: 'TOGGLE_SUGGESTION', payload: sceneId });
    }, [dispatch]);

    const selectAll = useCallback(() => {
        dispatch({ type: 'SET_ALL_SUGGESTIONS', payload: true });
    }, [dispatch]);

    const deselectAll = useCallback(() => {
        dispatch({ type: 'SET_ALL_SUGGESTIONS', payload: false });
    }, [dispatch]);

    // Memoize expensive calculations
    const stats = useMemo(() => {
        if (!suggestions || suggestions.length === 0) {
            return { accepted: 0, total: 0, cutTime: 0, avgConfidence: 0 };
        }

        const acceptedList = suggestions.filter(s => acceptedSuggestions.has(s.scene_id));
        const cutTime = acceptedList.reduce((sum, s) => sum + s.metrics.duration, 0);
        const avgConfidence = acceptedList.length > 0
            ? acceptedList.reduce((sum, s) => sum + s.confidence, 0) / acceptedList.length * 100
            : 0;

        return {
            accepted: acceptedSuggestions.size,
            total: suggestions.length,
            cutTime,
            avgConfidence
        };
    }, [suggestions, acceptedSuggestions]);

    if (!state.projectId) {
        return (
            <div className="empty-state">
                <AlertCircle size={64} />
                <h3>No Project Loaded</h3>
                <p>Please upload a video first in the Upload tab.</p>
            </div>
        );
    }

    if (!scenes || scenes.length === 0) {
        return (
            <div className="empty-state">
                <AlertCircle size={64} />
                <h3>No Scenes Detected</h3>
                <p>Please run scene detection first in the Analysis tab.</p>
            </div>
        );
    }

    return (
        <div className="fade-in">
            <div className="card">
                <div className="card-header">
                    <div>
                        <h2 className="card-title">✂️ Smart Cut Suggestions</h2>
                        <p className="card-subtitle">🎵 Audio-aware analysis • Motion detection • Face recognition</p>
                    </div>
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleGenerate}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="loading-spinner" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Scissors size={20} />
                                Generate Suggestions
                            </>
                        )}
                    </button>
                </div>

                {isLoading && (
                    <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                        <div className="loading-spinner" style={{ width: 40, height: 40, margin: '0 auto' }} />
                        <p style={{ marginTop: 'var(--space-md)', color: 'var(--text-secondary)' }}>
                            Analyzing scenes... This is optimized and should be fast!
                        </p>
                    </div>
                )}
            </div>

            {suggestions && suggestions.length > 0 && (
                <>
                    {/* Legend */}
                    <div className="card slide-up">
                        <div style={{ display: 'flex', gap: 'var(--space-xl)', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                <strong>Audio Labels:</strong>
                            </span>
                            <span>🔇 Silence</span>
                            <span>🎵 Peak</span>
                            <span>🔊 High Energy</span>
                            <span>📉 Low Energy</span>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="card slide-up">
                        <div className="card-header">
                            <h2 className="card-title">📋 {suggestions.length} Suggestions</h2>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                <button className="btn btn-secondary" onClick={selectAll}>
                                    <CheckCircle size={16} />
                                    Accept All
                                </button>
                                <button className="btn btn-secondary" onClick={deselectAll}>
                                    <XCircle size={16} />
                                    Reject All
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Suggestion Cards - memoized */}
                    {suggestions.map((suggestion) => (
                        <SuggestionCard
                            key={suggestion.scene_id}
                            suggestion={suggestion}
                            isAccepted={acceptedSuggestions.has(suggestion.scene_id)}
                            onToggle={() => toggleSuggestion(suggestion.scene_id)}
                        />
                    ))}

                    {/* Summary Stats - uses memoized calculations */}
                    <div className="card slide-up">
                        <div className="card-header">
                            <h2 className="card-title">📈 Summary</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)' }}>
                            <div className="stat-item">
                                <span className="stat-label">Accepted</span>
                                <span className="stat-value" style={{ color: 'var(--accent-success)' }}>
                                    {stats.accepted} / {stats.total}
                                </span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Total Cut Time</span>
                                <span className="stat-value" style={{ color: 'var(--accent-primary)' }}>
                                    {stats.cutTime?.toFixed(1) || '0.0'}s
                                </span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Avg Confidence</span>
                                <span className="stat-value" style={{ color: 'var(--accent-secondary)' }}>
                                    {stats.avgConfidence?.toFixed(0) || '0'}%
                                </span>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {suggestions && suggestions.length === 0 && (
                <div className="card">
                    <div className="empty-state">
                        <CheckCircle size={64} style={{ color: 'var(--accent-success)' }} />
                        <h3>🎉 No Cuts Suggested</h3>
                        <p>Your video content appears engaging throughout!</p>
                    </div>
                </div>
            )}
        </div>
    );
}
