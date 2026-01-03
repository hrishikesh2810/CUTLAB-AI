/**
 * Analysis Page
 * 
 * Main hub for AI analysis. Has sub-routes for:
 * - /analysis (overview)
 * - /analysis/cuts (cut suggestions)
 * - /analysis/audio (audio analysis)
 * 
 * AI runs ONLY on these pages.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { useMedia } from '../store';
import { useAIInsights, createMockAIInsights } from '../store/AIInsightsStore';
import type { AIInsights, AISuggestion } from '../types/ai-insights';
import './PageStyles.css';

export function AnalysisPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { state: mediaState } = useMedia();
    const { state: insightsState, loadInsights } = useAIInsights();

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState(0);
    const [analysisStage, setAnalysisStage] = useState('');

    const currentVideo = mediaState.items[mediaState.items.length - 1];

    // Determine active tab
    const getActiveTab = () => {
        if (location.pathname === '/analysis/cuts') return 'cuts';
        if (location.pathname === '/analysis/audio') return 'audio';
        return 'overview';
    };

    const runAnalysis = async () => {
        if (!currentVideo) return;

        setIsAnalyzing(true);
        setAnalysisProgress(0);

        const stages = [
            { name: 'Extracting frames...', duration: 800 },
            { name: 'Detecting scenes...', duration: 1200 },
            { name: 'Analyzing motion...', duration: 1000 },
            { name: 'Processing audio...', duration: 1500 },
            { name: 'Detecting faces...', duration: 800 },
            { name: 'Generating suggestions...', duration: 600 },
        ];

        let progress = 0;
        for (const stage of stages) {
            setAnalysisStage(stage.name);
            await new Promise(resolve => setTimeout(resolve, stage.duration));
            progress += 100 / stages.length;
            setAnalysisProgress(Math.min(progress, 100));
        }

        // Load mock insights for demo (in production, this would come from backend)
        const mockInsights = createMockAIInsights(currentVideo.id);
        mockInsights.videoPath = currentVideo.path;
        mockInsights.summary.totalDuration = currentVideo.duration;
        loadInsights(mockInsights);

        setIsAnalyzing(false);
    };

    useEffect(() => {
        // Auto-run analysis if we have a video but no insights
        if (currentVideo && !insightsState.insights && !isAnalyzing) {
            // runAnalysis(); // Uncomment to auto-run
        }
    }, [currentVideo, insightsState.insights]);

    if (!currentVideo) {
        return (
            <div className="page analysis-page">
                <div className="empty-state">
                    <span className="empty-icon">📹</span>
                    <h2>No Video Selected</h2>
                    <p>Upload a video to start AI analysis</p>
                    <button className="btn btn-primary" onClick={() => navigate('/upload')}>
                        Upload Video
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page analysis-page">
            <header className="analysis-header">
                <div className="header-left">
                    <Link to="/upload" className="back-link">← Back</Link>
                    <div className="video-info">
                        <span className="video-icon">🎬</span>
                        <span className="video-name">{currentVideo.filename}</span>
                    </div>
                </div>
                <div className="header-right">
                    <button
                        className="btn btn-secondary"
                        onClick={runAnalysis}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? 'Analyzing...' : '🔄 Re-analyze'}
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/workspace')}
                        disabled={!insightsState.insights}
                    >
                        Open Workspace →
                    </button>
                </div>
            </header>

            {isAnalyzing && (
                <div className="analysis-progress-bar">
                    <div className="progress-info">
                        <span className="stage-name">{analysisStage}</span>
                        <span className="progress-percent">{Math.round(analysisProgress)}%</span>
                    </div>
                    <div className="progress-track">
                        <div
                            className="progress-fill"
                            style={{ width: `${analysisProgress}%` }}
                        />
                    </div>
                </div>
            )}

            <nav className="analysis-tabs">
                <Link
                    to="/analysis"
                    className={`tab ${getActiveTab() === 'overview' ? 'active' : ''}`}
                >
                    📊 Overview
                </Link>
                <Link
                    to="/analysis/cuts"
                    className={`tab ${getActiveTab() === 'cuts' ? 'active' : ''}`}
                >
                    ✂️ Cut Suggestions
                </Link>
                <Link
                    to="/analysis/audio"
                    className={`tab ${getActiveTab() === 'audio' ? 'active' : ''}`}
                >
                    🎵 Audio Analysis
                </Link>
            </nav>

            <div className="analysis-content">
                {getActiveTab() === 'overview' && (
                    <AnalysisOverview
                        insights={insightsState.insights}
                        isAnalyzing={isAnalyzing}
                        onRunAnalysis={runAnalysis}
                    />
                )}
                <Outlet />
            </div>
        </div>
    );
}

// Overview sub-component
function AnalysisOverview({
    insights,
    isAnalyzing,
    onRunAnalysis
}: {
    insights: AIInsights | null;
    isAnalyzing: boolean;
    onRunAnalysis: () => void;
}) {
    if (!insights && !isAnalyzing) {
        return (
            <div className="start-analysis">
                <div className="start-card">
                    <span className="start-icon">🤖</span>
                    <h2>Ready to Analyze</h2>
                    <p>Run AI analysis to detect scenes, suggest cuts, and analyze audio</p>
                    <button className="btn btn-primary btn-large" onClick={onRunAnalysis}>
                        Start AI Analysis
                    </button>
                </div>
            </div>
        );
    }

    if (!insights) return null;

    const { summary } = insights;

    return (
        <div className="analysis-overview">
            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-value">{summary.sceneCount}</span>
                    <span className="stat-label">Scenes Detected</span>
                </div>
                <div className="stat-card highlight">
                    <span className="stat-value">{summary.suggestedCuts}</span>
                    <span className="stat-label">Cut Suggestions</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{summary.suggestedKeeps}</span>
                    <span className="stat-label">Keep Suggestions</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{Math.round(summary.averageConfidence * 100)}%</span>
                    <span className="stat-label">Avg Confidence</span>
                </div>
            </div>

            <div className="overview-sections">
                <div className="section suggestions-preview">
                    <h3>Top Suggestions</h3>
                    <div className="suggestion-list">
                        {insights.suggestions.slice(0, 3).map(sug => (
                            <SuggestionCard key={sug.id} suggestion={sug} compact />
                        ))}
                    </div>
                    <Link to="/analysis/cuts" className="view-all-link">
                        View all {insights.suggestions.length} suggestions →
                    </Link>
                </div>

                <div className="section timeline-preview">
                    <h3>Scene Timeline</h3>
                    <div className="mini-timeline">
                        {insights.sceneBoundaries.map((scene, i, arr) => {
                            const nextTime = arr[i + 1]?.time || summary.totalDuration;
                            const width = ((nextTime - scene.time) / summary.totalDuration) * 100;
                            const hasCut = insights.suggestions.some(
                                s => s.type === 'cut' && s.startTime >= scene.time && s.startTime < nextTime
                            );
                            return (
                                <div
                                    key={scene.id}
                                    className={`scene-block ${hasCut ? 'has-cut' : ''}`}
                                    style={{ width: `${width}%` }}
                                    title={`Scene at ${scene.time.toFixed(1)}s`}
                                />
                            );
                        })}
                    </div>
                    <div className="timeline-legend">
                        <span><span className="legend-dot keep"></span> Keep</span>
                        <span><span className="legend-dot cut"></span> Suggested Cut</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Suggestion card component
function SuggestionCard({ suggestion, compact = false }: { suggestion: AISuggestion; compact?: boolean }) {
    const getTypeIcon = () => {
        switch (suggestion.type) {
            case 'cut': return '✂️';
            case 'keep': return '✅';
            case 'trim': return '📏';
            case 'transition': return '🔄';
            default: return '📌';
        }
    };

    const getConfidenceColor = () => {
        switch (suggestion.confidence) {
            case 'high': return 'var(--success)';
            case 'medium': return 'var(--warning)';
            case 'low': return 'var(--text-muted)';
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    return (
        <div className={`suggestion-card ${suggestion.type} ${compact ? 'compact' : ''}`}>
            <div className="suggestion-header">
                <span className="suggestion-icon">{getTypeIcon()}</span>
                <span className="suggestion-type">{suggestion.type.toUpperCase()}</span>
                <span
                    className="suggestion-confidence"
                    style={{ color: getConfidenceColor() }}
                >
                    {Math.round(suggestion.score * 100)}%
                </span>
            </div>
            <div className="suggestion-body">
                <div className="time-range">
                    {formatTime(suggestion.startTime)} - {formatTime(suggestion.endTime)}
                </div>
                <p className="suggestion-reason">{suggestion.reason}</p>
            </div>
            {!compact && (
                <div className="suggestion-meta">
                    {suggestion.motionScore !== undefined && (
                        <span className="meta-item">🏃 {Math.round(suggestion.motionScore * 100)}%</span>
                    )}
                    {suggestion.audioEnergy !== undefined && (
                        <span className="meta-item">🔊 {Math.round(suggestion.audioEnergy * 100)}%</span>
                    )}
                    {suggestion.faceCount !== undefined && (
                        <span className="meta-item">👤 {suggestion.faceCount}</span>
                    )}
                </div>
            )}
        </div>
    );
}

export { SuggestionCard };
