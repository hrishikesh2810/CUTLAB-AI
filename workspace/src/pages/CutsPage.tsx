/**
 * Cuts Analysis Page
 * 
 * Displays AI-generated cut suggestions with interactive controls.
 * Route: /analysis/cuts
 */

import React, { useState } from 'react';
import { useAIInsights } from '../store/AIInsightsStore';
import type { AISuggestion } from '../types/ai-insights';
import './PageStyles.css';

export function CutsPage() {
    const { state, getSuggestionStatus, applySuggestion, ignoreSuggestion, resetSuggestion } = useAIInsights();
    const [filterType, setFilterType] = useState<'all' | 'cut' | 'keep' | 'trim' | 'transition'>('all');
    const [sortBy, setSortBy] = useState<'time' | 'confidence' | 'type'>('time');
    const [showApplied, setShowApplied] = useState(true);
    const [showIgnored, setShowIgnored] = useState(false);

    if (!state.insights) {
        return (
            <div className="cuts-page empty">
                <div className="empty-state">
                    <span className="empty-icon">✂️</span>
                    <h3>No Analysis Available</h3>
                    <p>Run AI analysis to see cut suggestions</p>
                </div>
            </div>
        );
    }

    const { suggestions } = state.insights;

    // Filter and sort suggestions
    let filtered = suggestions.filter(s => {
        if (filterType !== 'all' && s.type !== filterType) return false;
        const status = getSuggestionStatus(s.id);
        if (status === 'applied' && !showApplied) return false;
        if (status === 'ignored' && !showIgnored) return false;
        return true;
    });

    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'time': return a.startTime - b.startTime;
            case 'confidence': return b.score - a.score;
            case 'type': return a.type.localeCompare(b.type);
            default: return 0;
        }
    });

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
    };

    return (
        <div className="cuts-page">
            <div className="cuts-toolbar">
                <div className="filter-group">
                    <label>Type:</label>
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value as any)}
                    >
                        <option value="all">All Types</option>
                        <option value="cut">✂️ Cut</option>
                        <option value="keep">✅ Keep</option>
                        <option value="trim">📏 Trim</option>
                        <option value="transition">🔄 Transition</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Sort:</label>
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as any)}
                    >
                        <option value="time">Time</option>
                        <option value="confidence">Confidence</option>
                        <option value="type">Type</option>
                    </select>
                </div>

                <div className="checkbox-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={showApplied}
                            onChange={e => setShowApplied(e.target.checked)}
                        />
                        Show Applied
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={showIgnored}
                            onChange={e => setShowIgnored(e.target.checked)}
                        />
                        Show Ignored
                    </label>
                </div>

                <div className="suggestions-count">
                    {filtered.length} of {suggestions.length} suggestions
                </div>
            </div>

            <div className="suggestions-list">
                {filtered.map(suggestion => (
                    <CutSuggestionItem
                        key={suggestion.id}
                        suggestion={suggestion}
                        status={getSuggestionStatus(suggestion.id)}
                        onApply={() => applySuggestion(suggestion.id)}
                        onIgnore={() => ignoreSuggestion(suggestion.id)}
                        onReset={() => resetSuggestion(suggestion.id)}
                        formatTime={formatTime}
                    />
                ))}

                {filtered.length === 0 && (
                    <div className="no-results">
                        <span>🔍</span>
                        <p>No suggestions match your filters</p>
                    </div>
                )}
            </div>
        </div>
    );
}

interface CutSuggestionItemProps {
    suggestion: AISuggestion;
    status: 'pending' | 'applied' | 'ignored';
    onApply: () => void;
    onIgnore: () => void;
    onReset: () => void;
    formatTime: (s: number) => string;
}

function CutSuggestionItem({
    suggestion,
    status,
    onApply,
    onIgnore,
    onReset,
    formatTime
}: CutSuggestionItemProps) {
    const getTypeIcon = () => {
        switch (suggestion.type) {
            case 'cut': return '✂️';
            case 'keep': return '✅';
            case 'trim': return '📏';
            case 'transition': return '🔄';
            default: return '📌';
        }
    };

    const getConfidenceBadge = () => {
        const colors = {
            high: '#4ade80',
            medium: '#fbbf24',
            low: '#94a3b8',
        };
        return (
            <span
                className="confidence-badge"
                style={{ backgroundColor: colors[suggestion.confidence] }}
            >
                {suggestion.confidence}
            </span>
        );
    };

    const duration = suggestion.endTime - suggestion.startTime;

    return (
        <div className={`cut-suggestion-item ${suggestion.type} status-${status}`}>
            <div className="item-icon">
                {getTypeIcon()}
            </div>

            <div className="item-content">
                <div className="item-header">
                    <span className="type-label">{suggestion.type.toUpperCase()}</span>
                    {getConfidenceBadge()}
                    <span className="score">{Math.round(suggestion.score * 100)}%</span>
                </div>

                <div className="time-info">
                    <span className="time-range">
                        {formatTime(suggestion.startTime)} → {formatTime(suggestion.endTime)}
                    </span>
                    <span className="duration">({duration.toFixed(1)}s)</span>
                </div>

                <p className="reason">{suggestion.reason}</p>

                <div className="meta-row">
                    {suggestion.sceneType && (
                        <span className="meta-tag scene-type">{suggestion.sceneType}</span>
                    )}
                    {suggestion.motionScore !== undefined && (
                        <span className="meta-tag">
                            Motion: {Math.round(suggestion.motionScore * 100)}%
                        </span>
                    )}
                    {suggestion.audioEnergy !== undefined && (
                        <span className="meta-tag">
                            Audio: {Math.round(suggestion.audioEnergy * 100)}%
                        </span>
                    )}
                    {suggestion.faceCount !== undefined && suggestion.faceCount > 0 && (
                        <span className="meta-tag">
                            Faces: {suggestion.faceCount}
                        </span>
                    )}
                    {suggestion.transitionType && (
                        <span className="meta-tag transition">
                            {suggestion.transitionType} ({suggestion.transitionDuration}s)
                        </span>
                    )}
                </div>
            </div>

            <div className="item-actions">
                {status === 'pending' && (
                    <>
                        <button
                            className="action-btn apply"
                            onClick={onApply}
                            title="Apply this suggestion"
                        >
                            ✓ Apply
                        </button>
                        <button
                            className="action-btn ignore"
                            onClick={onIgnore}
                            title="Ignore this suggestion"
                        >
                            ✗ Ignore
                        </button>
                    </>
                )}
                {status === 'applied' && (
                    <div className="status-indicator applied">
                        ✓ Applied
                        <button className="reset-btn" onClick={onReset}>Reset</button>
                    </div>
                )}
                {status === 'ignored' && (
                    <div className="status-indicator ignored">
                        ✗ Ignored
                        <button className="reset-btn" onClick={onReset}>Reset</button>
                    </div>
                )}
            </div>
        </div>
    );
}
