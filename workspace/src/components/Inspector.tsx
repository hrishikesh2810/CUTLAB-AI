import { TimelineClip } from '../types';
import './Inspector.css';

interface InspectorProps {
    selectedClip: TimelineClip | null;
    onUpdate: (updates: Partial<TimelineClip>) => void;
}

export function Inspector({ selectedClip, onUpdate }: InspectorProps) {
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    };

    return (
        <div className="inspector">
            <div className="panel-header">
                <span>⚙️ Inspector</span>
            </div>

            <div className="panel-content">
                {selectedClip ? (
                    <div className="inspector-content">
                        {/* Clip Info */}
                        <section className="inspector-section">
                            <h3 className="section-title">Clip Info</h3>
                            <div className="property-row">
                                <label>Name</label>
                                <input
                                    type="text"
                                    value={selectedClip.label}
                                    onChange={(e) => onUpdate({ label: e.target.value })}
                                />
                            </div>
                            <div className="property-row">
                                <label>Source</label>
                                <span className="property-value">{selectedClip.sourceFilename}</span>
                            </div>
                        </section>

                        {/* Timing */}
                        <section className="inspector-section">
                            <h3 className="section-title">Timing</h3>
                            <div className="property-grid">
                                <div className="property-item">
                                    <label>In</label>
                                    <span className="property-value mono">
                                        {formatTime(selectedClip.inPoint)}
                                    </span>
                                </div>
                                <div className="property-item">
                                    <label>Out</label>
                                    <span className="property-value mono">
                                        {formatTime(selectedClip.outPoint)}
                                    </span>
                                </div>
                                <div className="property-item">
                                    <label>Duration</label>
                                    <span className="property-value mono">
                                        {formatTime(selectedClip.outPoint - selectedClip.inPoint)}
                                    </span>
                                </div>
                            </div>
                        </section>

                        {/* Speed */}
                        <section className="inspector-section">
                            <h3 className="section-title">Speed</h3>
                            <div className="speed-control">
                                <input
                                    type="range"
                                    min="0.25"
                                    max="4"
                                    step="0.25"
                                    value={selectedClip.speed}
                                    onChange={(e) => onUpdate({ speed: parseFloat(e.target.value) })}
                                    className="speed-slider"
                                />
                                <span className="speed-value">{selectedClip.speed}x</span>
                            </div>
                            <div className="speed-presets">
                                {[0.5, 1, 1.5, 2].map((speed) => (
                                    <button
                                        key={speed}
                                        className={`preset-btn ${selectedClip.speed === speed ? 'active' : ''}`}
                                        onClick={() => onUpdate({ speed })}
                                    >
                                        {speed}x
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Transitions (Placeholder) */}
                        <section className="inspector-section">
                            <h3 className="section-title">Transitions</h3>
                            <div className="placeholder-box">
                                <span>Transition controls will appear here</span>
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="inspector-empty">
                        <span className="empty-icon">📋</span>
                        <p>No clip selected</p>
                        <p className="hint">Select a clip on the timeline to edit its properties</p>
                    </div>
                )}
            </div>
        </div>
    );
}
