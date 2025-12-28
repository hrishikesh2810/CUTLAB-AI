import { TimelineClip } from '../types';
import { useTimeline, formatTime } from '../store';
import './Inspector.css';

interface InspectorProps {
    selectedClip: TimelineClip | null;
    onUpdate: (updates: Partial<TimelineClip>) => void;
}

export function Inspector({ selectedClip, onUpdate }: InspectorProps) {
    const {
        state,
        splitClipAtPlayhead,
        trimClipIn,
        trimClipOut
    } = useTimeline();

    const { playhead } = state;

    const formatTimeDisplay = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    };

    // Check if playhead is within the selected clip (enables split button)
    const canSplit = selectedClip
        ? playhead > selectedClip.inPoint && playhead < selectedClip.outPoint
        : false;

    const handleSplit = () => {
        if (selectedClip && canSplit) {
            splitClipAtPlayhead(selectedClip.id);
        }
    };

    const handleTrimIn = () => {
        if (selectedClip && playhead < selectedClip.outPoint && playhead >= 0) {
            trimClipIn(selectedClip.id, playhead);
        }
    };

    const handleTrimOut = () => {
        if (selectedClip && playhead > selectedClip.inPoint) {
            trimClipOut(selectedClip.id, playhead);
        }
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
                                        {formatTimeDisplay(selectedClip.inPoint)}
                                    </span>
                                </div>
                                <div className="property-item">
                                    <label>Out</label>
                                    <span className="property-value mono">
                                        {formatTimeDisplay(selectedClip.outPoint)}
                                    </span>
                                </div>
                                <div className="property-item">
                                    <label>Duration</label>
                                    <span className="property-value mono">
                                        {formatTimeDisplay(selectedClip.outPoint - selectedClip.inPoint)}
                                    </span>
                                </div>
                            </div>
                        </section>

                        {/* Editing Tools */}
                        <section className="inspector-section">
                            <h3 className="section-title">Edit at Playhead ({formatTime(playhead)})</h3>
                            <div className="editing-tools">
                                <button
                                    className="edit-btn split-btn"
                                    onClick={handleSplit}
                                    disabled={!canSplit}
                                    title={canSplit ? 'Split clip at playhead (S)' : 'Move playhead inside clip to split'}
                                >
                                    ✂️ Split
                                </button>
                                <button
                                    className="edit-btn trim-in-btn"
                                    onClick={handleTrimIn}
                                    disabled={!selectedClip || playhead >= selectedClip.outPoint}
                                    title="Set In point to playhead"
                                >
                                    ◀ Trim In
                                </button>
                                <button
                                    className="edit-btn trim-out-btn"
                                    onClick={handleTrimOut}
                                    disabled={!selectedClip || playhead <= selectedClip.inPoint}
                                    title="Set Out point to playhead"
                                >
                                    Trim Out ▶
                                </button>
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

                        {/* Transitions */}
                        <section className="inspector-section">
                            <h3 className="section-title">Transitions</h3>
                            <div className="transition-controls">
                                <div className="transition-row">
                                    <label>In:</label>
                                    <select
                                        className="transition-select"
                                        defaultValue="cut"
                                    >
                                        <option value="cut">Cut (None)</option>
                                        <option value="cross-dissolve">Cross Dissolve</option>
                                        <option value="fade-in">Fade In</option>
                                    </select>
                                </div>
                                <div className="transition-row">
                                    <label>Out:</label>
                                    <select
                                        className="transition-select"
                                        defaultValue="cut"
                                    >
                                        <option value="cut">Cut (None)</option>
                                        <option value="cross-dissolve">Cross Dissolve</option>
                                        <option value="fade-out">Fade Out</option>
                                    </select>
                                </div>
                                <div className="transition-row">
                                    <label>Duration:</label>
                                    <div className="duration-input-group">
                                        <input
                                            type="number"
                                            className="duration-input"
                                            defaultValue="0.5"
                                            min="0.1"
                                            max="3"
                                            step="0.1"
                                        />
                                        <span className="duration-unit">sec</span>
                                    </div>
                                </div>
                            </div>
                            <p className="transition-hint">
                                Transitions render via Remotion on preview
                            </p>
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
