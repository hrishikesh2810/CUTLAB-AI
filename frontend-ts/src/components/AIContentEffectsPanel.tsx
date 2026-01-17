
import { Sparkles, Scissors, Zap, Quote, Loader2 } from 'lucide-react';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import type { AIContentEffectsState, AIContentAnalysis } from '../editor/types';
import './AIContentEffectsPanel.css';

interface AIContentEffectsPanelProps {
    effects: AIContentEffectsState;
    analysis: AIContentAnalysis | null;
    isLoading: boolean;
    onToggleEffect: (effect: keyof AIContentEffectsState) => void;
    onRunAnalysis: () => void;
    hasCaptions: boolean;
}

export function AIContentEffectsPanel({
    effects,
    analysis,
    isLoading,
    onToggleEffect,
    onRunAnalysis,
    hasCaptions
}: AIContentEffectsPanelProps) {

    const renderToggle = (key: keyof AIContentEffectsState, label: string, icon: React.ReactNode, description: string) => (
        <div className={`ai-effect-card ${effects[key] ? 'active' : ''}`}>
            <div className="effect-header">
                <div className="effect-title">
                    {icon}
                    <span>{label}</span>
                </div>
                <button
                    className="toggle-btn"
                    onClick={() => onToggleEffect(key)}
                    disabled={!analysis}
                    title={!analysis ? "Run analysis first" : "Toggle Effect"}
                >
                    {effects[key] ? <ToggleRight size={28} color="#84cc16" /> : <ToggleLeft size={28} color="#52525b" />}
                </button>
            </div>
            <p className="effect-description">{description}</p>

            {/* Contextual Stats if analysis exists */}
            {analysis && effects[key] && (
                <div className="effect-stats">
                    {key === 'smartJumpCuts' && (
                        <span>✂️ {analysis.smart_jump_cuts.length} cuts applied</span>
                    )}
                    {key === 'highlightMoments' && (
                        <span>✨ {analysis.highlight_segments.length} highlights found</span>
                    )}
                    {key === 'engagementBoost' && (
                        <span>⚡ {analysis.engagement_segments.length} segments boosted</span>
                    )}
                    {key === 'captionPunchUp' && (
                        <span>📝 {analysis.punched_up_captions.length} captions punched up (visible in Text tab)</span>
                    )}
                    {key === 'autoIntroTrim' && analysis.intro_segment && (
                        <span>🎬 Start trimmed by {analysis.intro_segment.end.toFixed(1)}s</span>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="ai-content-panel">
            <div className="panel-header">
                <h2>AI Content Effects</h2>
                <div className="beta-tag">BETA (HF)</div>
            </div>

            <div className="analysis-section">
                {!analysis ? (
                    <div className="analysis-empty">
                        <p>Analyze your video content to unlock AI effects.</p>
                        <p className="sub-text">Requires captions (Hugging Face powered)</p>
                        <button
                            className="analyze-btn"
                            onClick={onRunAnalysis}
                            disabled={isLoading || !hasCaptions}
                        >
                            {isLoading ? <Loader2 className="spin" /> : <Sparkles size={16} />}
                            {isLoading ? 'Analyzing...' : 'Analyze Content'}
                        </button>
                        {!hasCaptions && <p className="error-text">Please generate captions first (Text Tab)</p>}
                    </div>
                ) : (
                    <div className="analysis-complete">
                        <span className="success-badge">Analysis Complete</span>
                        <button className="reanalyze-btn" onClick={onRunAnalysis} disabled={isLoading}>
                            {isLoading ? <Loader2 size={14} className="spin" /> : 'Refresh'}
                        </button>
                    </div>
                )}
            </div>

            <div className="effects-list">
                {renderToggle('smartJumpCuts', 'Smart Jump Cuts', <Scissors size={18} />, 'Automatically remove silence and filler words to keep it punchy.')}
                {renderToggle('highlightMoments', 'Highlight Moments', <Sparkles size={18} />, 'Subtly zooms in during exciting or emotional moments.')}
                {renderToggle('engagementBoost', 'Engagement Boost', <Zap size={18} />, 'Speed up slow/neutral segments to 1.2x to maintain retention.')}
                {renderToggle('captionPunchUp', 'Caption Punch-Up', <Quote size={18} />, 'Rewrite captions with emojis and emphasis for social media.')}
                {renderToggle('autoIntroTrim', 'Auto Intro Trim', <Scissors size={18} className="rotate-90" />, 'Detect and remove boring "Welcome back" intros.')}
            </div>
        </div>
    );
}
