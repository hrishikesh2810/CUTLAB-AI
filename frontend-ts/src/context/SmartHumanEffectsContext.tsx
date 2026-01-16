import React, { createContext, useContext, useState } from "react";

export type EffectConfig = {
    enabled: boolean;
    intensity: number; // 0‑100
};

export type SmartHumanEffectsState = {
    faceFocus: EffectConfig;
    autoReframe: EffectConfig;
    backgroundBlur: EffectConfig;
    motionEmphasis: EffectConfig;
};

const defaultState: SmartHumanEffectsState = {
    faceFocus: { enabled: false, intensity: 60 },
    autoReframe: { enabled: false, intensity: 50 },
    backgroundBlur: { enabled: false, intensity: 40 },
    motionEmphasis: { enabled: false, intensity: 70 },
};

const SmartHumanEffectsContext = createContext<{
    state: SmartHumanEffectsState;
    setState: React.Dispatch<React.SetStateAction<SmartHumanEffectsState>>;
}>({
    state: defaultState,
    setState: () => { },
});

export const SmartHumanEffectsProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [state, setState] = useState<SmartHumanEffectsState>(defaultState);
    return (
        <SmartHumanEffectsContext.Provider value={{ state, setState }}>
            {children}
        </SmartHumanEffectsContext.Provider>
    );
};

export const useSmartHumanEffects = () => useContext(SmartHumanEffectsContext);
