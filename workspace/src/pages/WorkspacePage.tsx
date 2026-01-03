/**
 * Workspace Page
 * 
 * Main editing workspace that loads the existing WorkspaceLayout component.
 * Adds AI suggestion markers and apply/ignore controls.
 * Route: /workspace
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { WorkspaceLayout } from '../components/WorkspaceLayout';
import { AISuggestionsPanel } from '../components/AISuggestionsPanel';
import { useAIInsights } from '../store/AIInsightsStore';
import './PageStyles.css';

export function WorkspacePage() {
    const { state: insightsState } = useAIInsights();
    const hasSuggestions = insightsState.insights && insightsState.insights.suggestions.length > 0;

    return (
        <div className="workspace-page">
            <nav className="workspace-nav">
                <div className="nav-left">
                    <Link to="/analysis" className="nav-link back">
                        ← Analysis
                    </Link>
                    <div className="nav-separator" />
                    <span className="workspace-title">
                        ✂️ CUTLAB Workspace
                    </span>
                </div>
                <div className="nav-center">
                    {hasSuggestions && (
                        <div className="ai-badge">
                            <span className="badge-icon">🤖</span>
                            <span className="badge-text">
                                {insightsState.insights!.suggestions.filter(
                                    s => insightsState.suggestionStatuses.get(s.id) === 'pending' ||
                                        !insightsState.suggestionStatuses.has(s.id)
                                ).length} AI Suggestions
                            </span>
                        </div>
                    )}
                </div>
                <div className="nav-right">
                    <Link to="/export" className="btn btn-primary">
                        Export →
                    </Link>
                </div>
            </nav>

            <div className={`workspace-content ${hasSuggestions ? 'with-ai-panel' : ''}`}>
                <div className="editor-area">
                    <WorkspaceLayout />
                </div>

                {hasSuggestions && (
                    <AISuggestionsPanel />
                )}
            </div>
        </div>
    );
}
