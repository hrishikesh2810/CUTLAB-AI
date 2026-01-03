/**
 * AI Suggestions Panel
 * 
 * Side panel in workspace that shows AI suggestions as timeline markers.
 * Provides Apply/Ignore controls that update timeline.json only.
 */

import { useState } from 'react';
import { useAIInsights } from '../store/AIInsightsStore';
import { useTimeline, generateId } from '../store/TimelineStore';
import type { AISuggestion } from '../types/ai-insights';
import './AISuggestionsPanel.css';

export function AISuggestionsPanel() {
    const {
        state: insightsState,
        getSuggestionStatus,
        applySuggestion,
        ignoreSuggestion,
        resetSuggestion,
        getPendingSuggestions,
    } = useAIInsights();

    const { dispatch: timelineDispatch } = useTimeline();

    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'applied' | 'ignored'>('pending');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (!insightsState.insights) {
        return null;
    }

    const { suggestions } = insightsState.insights;

    // Filter suggestions
    const filtered = suggestions.filter(s => {
        const status = getSuggestionStatus(s.id);
        if (filterStatus === 'all') return true;
        return status === filterStatus;
    });

    const pendingCount = getPendingSuggestions().length;

    // Handle applying a suggestion to timeline
    const handleApply = (suggestion: AISuggestion) => {
        switch (suggestion.type) {
            case 'cut':
                // Add a marker indicating a cut suggestion was applied
                timelineDispatch({
                    type: 'ADD_MARKER',
                    payload: {
                        id: generateId('marker'),
                        position: suggestion.startTime,
                        label: `AI Cut: ${suggestion.reason.slice(0, 30)}...`,
                        color: '#ef4444',
                        type: 'ai-suggestion',
                    },
                });
                break;

            case 'keep':
                // Add a marker indicating a keep suggestion
                timelineDispatch({
                    type: 'ADD_MARKER',
                    payload: {
                        id: generateId('marker'),
                        position: suggestion.startTime,
                        label: `AI Keep: ${suggestion.reason.slice(0, 30)}...`,
                        color: '#22c55e',
                        type: 'ai-suggestion',
                    },
                });
                break;

            case 'transition':
                // Find clips at this position and add transition
                // (simplified - in real impl would find adjacent clips)
                timelineDispatch({
                    type: 'ADD_MARKER',
                    payload: {
                        id: generateId('marker'),
                        position: suggestion.startTime,
                        label: `AI Transition: ${suggestion.transitionType}`,
                        color: '#8b5cf6',
                        type: 'ai-suggestion',
                    },
                });
                break;

            case 'trim':
                // Add marker for trim suggestion
                timelineDispatch({
                    type: 'ADD_MARKER',
                    payload: {
                        id: generateId('marker'),
                        position: suggestion.startTime,
                        label: `AI Trim: ${(suggestion.endTime - suggestion.startTime).toFixed(1)}s`,
                        color: '#f59e0b',
                        type: 'ai-suggestion',
                    },
                });
                break;
        }

        applySuggestion(suggestion.id);
    };

    const handleIgnore = (suggestion: AISuggestion) => {
        ignoreSuggestion(suggestion.id);
    };

    const handleReset = (suggestion: AISuggestion) => {
        resetSuggestion(suggestion.id);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    const getTypeIcon = (type: AISuggestion['type']) => {
        switch (type) {
            case 'cut': return '✂️';
            case 'keep': return '✅';
            case 'trim': return '📏';
            case 'transition': return '🔄';
            default: return '📌';
        }
    };

    const seekToPosition = (time: number) => {
        timelineDispatch({ type: 'SET_PLAYHEAD', payload: time });
    };

    return (
        <div className="ai-suggestions-panel">
            <div className="panel-header">
                <div className="header-title">
                    <span className="ai-icon">🤖</span>
                    <span>AI Suggestions</span>
                </div>
                {pendingCount > 0 && (
                    <span className="pending-badge">{pendingCount}</span>
                )}
            </div>

            <div className="panel-filters">
                <button
                    className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('pending')}
                >
                    Pending ({pendingCount})
                </button>
                <button
                    className={`filter-btn ${filterStatus === 'applied' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('applied')}
                >
                    Applied
                </button>
                <button
                    className={`filter-btn ${filterStatus === 'ignored' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('ignored')}
                >
                    Ignored
                </button>
                <button
                    className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('all')}
                >
                    All
                </button>
            </div>

            <div className="suggestions-scroll">
                {filtered.length === 0 ? (
                    <div className="no-suggestions">
                        <span>
                            {filterStatus === 'pending'
                                ? '🎉 All suggestions reviewed!'
                                : '📭 No suggestions'}
                        </span>
                    </div>
                ) : (
                    filtered.map(suggestion => {
                        const status = getSuggestionStatus(suggestion.id);
                        const isExpanded = expandedId === suggestion.id;

                        return (
                            <div
                                key={suggestion.id}
                                className={`suggestion-item ${suggestion.type} status-${status} ${isExpanded ? 'expanded' : ''}`}
                            >
                                <div
                                    className="suggestion-main"
                                    onClick={() => setExpandedId(isExpanded ? null : suggestion.id)}
                                >
                                    <span className="type-icon">{getTypeIcon(suggestion.type)}</span>

                                    <div className="suggestion-info">
                                        <div className="suggestion-type-row">
                                            <span className="type-label">{suggestion.type}</span>
                                            <span className={`confidence ${suggestion.confidence}`}>
                                                {Math.round(suggestion.score * 100)}%
                                            </span>
                                        </div>
                                        <button
                                            className="time-link"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                seekToPosition(suggestion.startTime);
                                            }}
                                        >
                                            {formatTime(suggestion.startTime)}
                                        </button>
                                    </div>

                                    <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                                </div>

                                {isExpanded && (
                                    <div className="suggestion-details">
                                        <p className="reason">{suggestion.reason}</p>

                                        <div className="time-range">
                                            <span>Range: </span>
                                            <span className="time-value">
                                                {formatTime(suggestion.startTime)} - {formatTime(suggestion.endTime)}
                                            </span>
                                            <span className="duration">
                                                ({(suggestion.endTime - suggestion.startTime).toFixed(1)}s)
                                            </span>
                                        </div>

                                        {suggestion.motionScore !== undefined && (
                                            <div className="metric">
                                                <span className="metric-label">Motion:</span>
                                                <div className="metric-bar">
                                                    <div
                                                        className="metric-fill"
                                                        style={{ width: `${suggestion.motionScore * 100}%` }}
                                                    />
                                                </div>
                                                <span className="metric-value">
                                                    {Math.round(suggestion.motionScore * 100)}%
                                                </span>
                                            </div>
                                        )}

                                        {suggestion.audioEnergy !== undefined && (
                                            <div className="metric">
                                                <span className="metric-label">Audio:</span>
                                                <div className="metric-bar">
                                                    <div
                                                        className="metric-fill audio"
                                                        style={{ width: `${suggestion.audioEnergy * 100}%` }}
                                                    />
                                                </div>
                                                <span className="metric-value">
                                                    {Math.round(suggestion.audioEnergy * 100)}%
                                                </span>
                                            </div>
                                        )}

                                        <div className="action-buttons">
                                            {status === 'pending' && (
                                                <>
                                                    <button
                                                        className="action-btn apply"
                                                        onClick={() => handleApply(suggestion)}
                                                    >
                                                        ✓ Apply
                                                    </button>
                                                    <button
                                                        className="action-btn ignore"
                                                        onClick={() => handleIgnore(suggestion)}
                                                    >
                                                        ✗ Ignore
                                                    </button>
                                                </>
                                            )}
                                            {status !== 'pending' && (
                                                <button
                                                    className="action-btn reset"
                                                    onClick={() => handleReset(suggestion)}
                                                >
                                                    ↩ Reset
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <div className="panel-footer">
                <div className="summary">
                    <span className="applied-count">
                        ✓ {suggestions.filter(s => getSuggestionStatus(s.id) === 'applied').length}
                    </span>
                    <span className="ignored-count">
                        ✗ {suggestions.filter(s => getSuggestionStatus(s.id) === 'ignored').length}
                    </span>
                </div>
            </div>
        </div>
    );
}
