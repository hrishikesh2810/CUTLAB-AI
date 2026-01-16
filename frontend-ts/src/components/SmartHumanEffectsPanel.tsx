import React from "react";
import { Info } from "lucide-react";
import { useSmartHumanEffects } from "../context/SmartHumanEffectsContext";
import "./SmartHumanEffectsPanel.css";

const effectInfos = {
    faceFocus: {
        name: "Face Focus",
        description: "Zooms toward the detected face and brightens the frame when a face is present.",
        icon: "👁️",
    },
    autoReframe: {
        name: "Auto Reframe",
        description: "Keeps the face centered for vertical Shorts/Reels (dynamic cropping).",
        icon: "↔️",
    },
    backgroundBlur: {
        name: "Background Soft Blur",
        description: "Blurs the background using MediaPipe selfie‑segmentation while keeping the subject sharp.",
        icon: "🌫️",
    },
    motionEmphasis: {
        name: "Motion Emphasis",
        description: "Boosts contrast & sharpness during high‑motion segments.",
        icon: "⚡",
    },
};

export const SmartHumanEffectsPanel: React.FC = () => {
    const { state, setState } = useSmartHumanEffects();

    const toggle = (key: keyof typeof state) => {
        setState((prev) => ({
            ...prev,
            [key]: { ...prev[key], enabled: !prev[key].enabled },
        }));
    };

    const changeIntensity = (key: keyof typeof state, value: number) => {
        setState((prev) => ({
            ...prev,
            [key]: { ...prev[key], intensity: value },
        }));
    };

    return (
        <div className="smart-human-effects-panel">
            <h3 className="smart-human-title">
                <span style={{ color: 'var(--info)' }}>✨</span> Smart Human Effects
            </h3>

            <div className="effects-list">
                {Object.entries(effectInfos).map(([key, info]) => {
                    const cfg = state[key as keyof typeof state];
                    return (
                        <div
                            key={key}
                            className={`smart-effect-item ${cfg?.enabled ? 'active' : ''}`}
                        >
                            <div className="effect-header-row">
                                <div className="effect-info-group">
                                    <span className="effect-icon">{info.icon}</span>
                                    <div className="effect-name-group">
                                        <div className="effect-name">{info.name}</div>
                                        <div className="info-tooltip-container">
                                            <Info size={12} className="info-tooltip-trigger" />
                                            <div className="effect-tooltip">{info.description}</div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    className={`apply-btn ${cfg?.enabled ? 'applied' : ''}`}
                                    onClick={() => toggle(key as keyof typeof state)}
                                >
                                    {cfg?.enabled ? 'APPLIED' : 'APPLY'}
                                </button>
                            </div>

                            {cfg?.enabled && (
                                <div className="intensity-control">
                                    <div className="intensity-label-row">
                                        <span>Intensity</span>
                                        <span>{cfg.intensity}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        className="intensity-slider"
                                        value={cfg.intensity}
                                        onChange={(e) =>
                                            changeIntensity(key as keyof typeof state, +e.target.value)
                                        }
                                        style={{
                                            background: `linear-gradient(to right, var(--accent) ${cfg.intensity}%, rgba(255,255,255,0.1) ${cfg.intensity}%)`
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
