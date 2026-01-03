/**
 * Audio Analysis Page
 * 
 * Displays AI audio analysis including speech, music, silence,
 * and peak detection.
 * Route: /analysis/audio
 */

import { useState } from 'react';
import { useAIInsights } from '../store/AIInsightsStore';
import type { AudioSegment } from '../types/ai-insights';
import './PageStyles.css';

export function AudioPage() {
    const { state } = useAIInsights();
    const [selectedSegment, setSelectedSegment] = useState<AudioSegment | null>(null);

    if (!state.insights) {
        return (
            <div className="audio-page empty">
                <div className="empty-state">
                    <span className="empty-icon">🎵</span>
                    <h3>No Audio Analysis Available</h3>
                    <p>Run AI analysis to see audio segments</p>
                </div>
            </div>
        );
    }

    const { audioSegments, summary } = state.insights;

    const getSegmentIcon = (type: AudioSegment['type']) => {
        switch (type) {
            case 'speech': return '🗣️';
            case 'music': return '🎵';
            case 'silence': return '🔇';
            case 'peak': return '📈';
            case 'ambient': return '🌊';
            default: return '🔊';
        }
    };

    const getSegmentColor = (type: AudioSegment['type']) => {
        switch (type) {
            case 'speech': return '#3b82f6';
            case 'music': return '#8b5cf6';
            case 'silence': return '#64748b';
            case 'peak': return '#ef4444';
            case 'ambient': return '#22c55e';
            default: return '#94a3b8';
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    // Calculate segment stats
    const stats = {
        speech: audioSegments.filter(s => s.type === 'speech').reduce((sum, s) => sum + (s.endTime - s.startTime), 0),
        music: audioSegments.filter(s => s.type === 'music').reduce((sum, s) => sum + (s.endTime - s.startTime), 0),
        silence: audioSegments.filter(s => s.type === 'silence').reduce((sum, s) => sum + (s.endTime - s.startTime), 0),
        ambient: audioSegments.filter(s => s.type === 'ambient').reduce((sum, s) => sum + (s.endTime - s.startTime), 0),
    };

    return (
        <div className="audio-page">
            <div className="audio-stats">
                <div className="stat-bar">
                    <div
                        className="stat-segment speech"
                        style={{ width: `${(stats.speech / summary.totalDuration) * 100}%` }}
                        title={`Speech: ${stats.speech.toFixed(1)}s`}
                    />
                    <div
                        className="stat-segment music"
                        style={{ width: `${(stats.music / summary.totalDuration) * 100}%` }}
                        title={`Music: ${stats.music.toFixed(1)}s`}
                    />
                    <div
                        className="stat-segment silence"
                        style={{ width: `${(stats.silence / summary.totalDuration) * 100}%` }}
                        title={`Silence: ${stats.silence.toFixed(1)}s`}
                    />
                    <div
                        className="stat-segment ambient"
                        style={{ width: `${(stats.ambient / summary.totalDuration) * 100}%` }}
                        title={`Ambient: ${stats.ambient.toFixed(1)}s`}
                    />
                </div>
                <div className="stat-legend">
                    <span className="legend-item">
                        <span className="dot speech"></span>
                        Speech {((stats.speech / summary.totalDuration) * 100).toFixed(0)}%
                    </span>
                    <span className="legend-item">
                        <span className="dot music"></span>
                        Music {((stats.music / summary.totalDuration) * 100).toFixed(0)}%
                    </span>
                    <span className="legend-item">
                        <span className="dot silence"></span>
                        Silence {((stats.silence / summary.totalDuration) * 100).toFixed(0)}%
                    </span>
                    <span className="legend-item">
                        <span className="dot ambient"></span>
                        Ambient {((stats.ambient / summary.totalDuration) * 100).toFixed(0)}%
                    </span>
                </div>
            </div>

            <div className="audio-timeline">
                <h3>Audio Timeline</h3>
                <div className="waveform-container">
                    <div className="waveform-track">
                        {audioSegments.map(segment => {
                            const left = (segment.startTime / summary.totalDuration) * 100;
                            const width = ((segment.endTime - segment.startTime) / summary.totalDuration) * 100;
                            return (
                                <div
                                    key={segment.id}
                                    className={`waveform-segment ${segment.type} ${selectedSegment?.id === segment.id ? 'selected' : ''}`}
                                    style={{
                                        left: `${left}%`,
                                        width: `${width}%`,
                                        backgroundColor: getSegmentColor(segment.type),
                                        opacity: 0.3 + segment.energy * 0.7,
                                    }}
                                    onClick={() => setSelectedSegment(segment)}
                                    title={`${segment.type}: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`}
                                >
                                    <div
                                        className="energy-bar"
                                        style={{ height: `${segment.energy * 100}%` }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    <div className="time-labels">
                        <span>0:00</span>
                        <span>{formatTime(summary.totalDuration / 4)}</span>
                        <span>{formatTime(summary.totalDuration / 2)}</span>
                        <span>{formatTime(summary.totalDuration * 3 / 4)}</span>
                        <span>{formatTime(summary.totalDuration)}</span>
                    </div>
                </div>
            </div>

            <div className="audio-segments-list">
                <h3>Audio Segments ({audioSegments.length})</h3>
                <div className="segments-grid">
                    {audioSegments.map(segment => (
                        <div
                            key={segment.id}
                            className={`segment-card ${segment.type} ${selectedSegment?.id === segment.id ? 'selected' : ''}`}
                            onClick={() => setSelectedSegment(segment)}
                        >
                            <div className="segment-header">
                                <span className="segment-icon">{getSegmentIcon(segment.type)}</span>
                                <span className="segment-type">{segment.type}</span>
                            </div>
                            <div className="segment-time">
                                {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                            </div>
                            <div className="energy-meter">
                                <div className="energy-label">Energy</div>
                                <div className="energy-track">
                                    <div
                                        className="energy-fill"
                                        style={{
                                            width: `${segment.energy * 100}%`,
                                            backgroundColor: getSegmentColor(segment.type),
                                        }}
                                    />
                                </div>
                                <div className="energy-value">{Math.round(segment.energy * 100)}%</div>
                            </div>
                            {segment.label && (
                                <div className="segment-label">{segment.label}</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {selectedSegment && (
                <div className="segment-detail-panel">
                    <h4>Segment Details</h4>
                    <button
                        className="close-btn"
                        onClick={() => setSelectedSegment(null)}
                    >
                        ×
                    </button>
                    <div className="detail-content">
                        <div className="detail-row">
                            <span className="label">Type</span>
                            <span className="value">
                                {getSegmentIcon(selectedSegment.type)} {selectedSegment.type}
                            </span>
                        </div>
                        <div className="detail-row">
                            <span className="label">Time Range</span>
                            <span className="value">
                                {formatTime(selectedSegment.startTime)} - {formatTime(selectedSegment.endTime)}
                            </span>
                        </div>
                        <div className="detail-row">
                            <span className="label">Duration</span>
                            <span className="value">
                                {(selectedSegment.endTime - selectedSegment.startTime).toFixed(2)}s
                            </span>
                        </div>
                        <div className="detail-row">
                            <span className="label">Energy Level</span>
                            <span className="value">{Math.round(selectedSegment.energy * 100)}%</span>
                        </div>
                        {selectedSegment.label && (
                            <div className="detail-row">
                                <span className="label">Label</span>
                                <span className="value">{selectedSegment.label}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
