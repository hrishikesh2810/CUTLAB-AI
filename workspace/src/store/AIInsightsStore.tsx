/**
 * AI Insights Store
 * 
 * Manages AI insights data loaded from ai_insights.json.
 * This store is READ-ONLY from the AI perspective.
 * The workspace can only update suggestion status (applied/ignored).
 */

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import type { AIInsights, AISuggestion, SuggestionAction } from '../types/ai-insights';
import { createEmptyAIInsights } from '../types/ai-insights';

// State interface
export interface AIInsightsState {
    insights: AIInsights | null;
    isLoading: boolean;
    error: string | null;
    lastLoadedAt: string | null;
    suggestionStatuses: Map<string, 'pending' | 'applied' | 'ignored'>;
}

// Action types
type AIInsightsAction =
    | { type: 'LOAD_START' }
    | { type: 'LOAD_SUCCESS'; payload: AIInsights }
    | { type: 'LOAD_ERROR'; payload: string }
    | { type: 'CLEAR_INSIGHTS' }
    | { type: 'SET_SUGGESTION_STATUS'; payload: { id: string; status: 'pending' | 'applied' | 'ignored' } }
    | { type: 'BATCH_UPDATE_STATUS'; payload: SuggestionAction[] }
    | { type: 'RESET_ALL_STATUSES' };

// Initial state
const initialState: AIInsightsState = {
    insights: null,
    isLoading: false,
    error: null,
    lastLoadedAt: null,
    suggestionStatuses: new Map(),
};

// Reducer
function aiInsightsReducer(state: AIInsightsState, action: AIInsightsAction): AIInsightsState {
    switch (action.type) {
        case 'LOAD_START':
            return {
                ...state,
                isLoading: true,
                error: null,
            };

        case 'LOAD_SUCCESS': {
            // Initialize suggestion statuses from loaded data
            const statusMap = new Map<string, 'pending' | 'applied' | 'ignored'>();
            action.payload.suggestions.forEach(s => {
                statusMap.set(s.id, s.status || 'pending');
            });

            return {
                ...state,
                insights: action.payload,
                isLoading: false,
                error: null,
                lastLoadedAt: new Date().toISOString(),
                suggestionStatuses: statusMap,
            };
        }

        case 'LOAD_ERROR':
            return {
                ...state,
                isLoading: false,
                error: action.payload,
            };

        case 'CLEAR_INSIGHTS':
            return {
                ...initialState,
            };

        case 'SET_SUGGESTION_STATUS': {
            const newStatuses = new Map(state.suggestionStatuses);
            newStatuses.set(action.payload.id, action.payload.status);
            return {
                ...state,
                suggestionStatuses: newStatuses,
            };
        }

        case 'BATCH_UPDATE_STATUS': {
            const newStatuses = new Map(state.suggestionStatuses);
            action.payload.forEach(({ suggestionId, action: statusAction }) => {
                if (statusAction === 'reset') {
                    newStatuses.set(suggestionId, 'pending');
                } else if (statusAction === 'apply') {
                    newStatuses.set(suggestionId, 'applied');
                } else if (statusAction === 'ignore') {
                    newStatuses.set(suggestionId, 'ignored');
                }
            });
            return {
                ...state,
                suggestionStatuses: newStatuses,
            };
        }

        case 'RESET_ALL_STATUSES': {
            const newStatuses = new Map<string, 'pending' | 'applied' | 'ignored'>();
            state.suggestionStatuses.forEach((_, key) => {
                newStatuses.set(key, 'pending');
            });
            return {
                ...state,
                suggestionStatuses: newStatuses,
            };
        }

        default:
            return state;
    }
}

// Context
interface AIInsightsContextType {
    state: AIInsightsState;
    loadInsights: (insights: AIInsights) => void;
    loadInsightsFromUrl: (url: string) => Promise<void>;
    clearInsights: () => void;
    applySuggestion: (id: string) => void;
    ignoreSuggestion: (id: string) => void;
    resetSuggestion: (id: string) => void;
    resetAllSuggestions: () => void;
    getSuggestionStatus: (id: string) => 'pending' | 'applied' | 'ignored';
    getPendingSuggestions: () => AISuggestion[];
    getAppliedSuggestions: () => AISuggestion[];
    getSuggestionsAtTime: (time: number) => AISuggestion[];
}

const AIInsightsContext = createContext<AIInsightsContextType | null>(null);

// Provider component
export function AIInsightsProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(aiInsightsReducer, initialState);

    const loadInsights = useCallback((insights: AIInsights) => {
        dispatch({ type: 'LOAD_SUCCESS', payload: insights });
    }, []);

    const loadInsightsFromUrl = useCallback(async (url: string) => {
        dispatch({ type: 'LOAD_START' });
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load AI insights: ${response.statusText}`);
            }
            const data = await response.json();
            dispatch({ type: 'LOAD_SUCCESS', payload: data });
        } catch (error) {
            dispatch({ type: 'LOAD_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
        }
    }, []);

    const clearInsights = useCallback(() => {
        dispatch({ type: 'CLEAR_INSIGHTS' });
    }, []);

    const applySuggestion = useCallback((id: string) => {
        dispatch({ type: 'SET_SUGGESTION_STATUS', payload: { id, status: 'applied' } });
    }, []);

    const ignoreSuggestion = useCallback((id: string) => {
        dispatch({ type: 'SET_SUGGESTION_STATUS', payload: { id, status: 'ignored' } });
    }, []);

    const resetSuggestion = useCallback((id: string) => {
        dispatch({ type: 'SET_SUGGESTION_STATUS', payload: { id, status: 'pending' } });
    }, []);

    const resetAllSuggestions = useCallback(() => {
        dispatch({ type: 'RESET_ALL_STATUSES' });
    }, []);

    const getSuggestionStatus = useCallback((id: string): 'pending' | 'applied' | 'ignored' => {
        return state.suggestionStatuses.get(id) || 'pending';
    }, [state.suggestionStatuses]);

    const getPendingSuggestions = useCallback((): AISuggestion[] => {
        if (!state.insights) return [];
        return state.insights.suggestions.filter(
            s => state.suggestionStatuses.get(s.id) === 'pending' || !state.suggestionStatuses.has(s.id)
        );
    }, [state.insights, state.suggestionStatuses]);

    const getAppliedSuggestions = useCallback((): AISuggestion[] => {
        if (!state.insights) return [];
        return state.insights.suggestions.filter(
            s => state.suggestionStatuses.get(s.id) === 'applied'
        );
    }, [state.insights, state.suggestionStatuses]);

    const getSuggestionsAtTime = useCallback((time: number): AISuggestion[] => {
        if (!state.insights) return [];
        return state.insights.suggestions.filter(
            s => time >= s.startTime && time <= s.endTime
        );
    }, [state.insights]);

    const contextValue: AIInsightsContextType = {
        state,
        loadInsights,
        loadInsightsFromUrl,
        clearInsights,
        applySuggestion,
        ignoreSuggestion,
        resetSuggestion,
        resetAllSuggestions,
        getSuggestionStatus,
        getPendingSuggestions,
        getAppliedSuggestions,
        getSuggestionsAtTime,
    };

    return (
        <AIInsightsContext.Provider value={contextValue}>
            {children}
        </AIInsightsContext.Provider>
    );
}

// Hook to use AI insights
export function useAIInsights(): AIInsightsContextType {
    const context = useContext(AIInsightsContext);
    if (!context) {
        throw new Error('useAIInsights must be used within an AIInsightsProvider');
    }
    return context;
}

// Export demo/mock AI insights for testing
export function createMockAIInsights(projectId: string): AIInsights {
    return {
        version: '1.0',
        projectId,
        videoPath: '/storage/videos/sample.mp4',
        createdAt: new Date().toISOString(),
        summary: {
            totalDuration: 120,
            sceneCount: 8,
            suggestedCuts: 3,
            suggestedKeeps: 5,
            averageConfidence: 0.78,
            processingTime: 4.2,
            modelVersion: 'cutlab-ai-v1',
        },
        suggestions: [
            {
                id: 'sug_1',
                type: 'cut',
                startTime: 15.5,
                endTime: 22.3,
                confidence: 'high',
                score: 0.92,
                reason: 'Low motion static scene with silence detected',
                sceneType: 'static',
                motionScore: 0.12,
                audioEnergy: 0.05,
                status: 'pending',
            },
            {
                id: 'sug_2',
                type: 'keep',
                startTime: 30.0,
                endTime: 45.0,
                confidence: 'high',
                score: 0.88,
                reason: 'High energy action scene with faces detected',
                sceneType: 'action',
                motionScore: 0.85,
                audioEnergy: 0.72,
                faceCount: 2,
                status: 'pending',
            },
            {
                id: 'sug_3',
                type: 'transition',
                startTime: 45.0,
                endTime: 47.0,
                confidence: 'medium',
                score: 0.65,
                reason: 'Scene boundary - suggest cross-dissolve',
                transitionType: 'cross-dissolve',
                transitionDuration: 1.5,
                status: 'pending',
            },
            {
                id: 'sug_4',
                type: 'trim',
                startTime: 60.0,
                endTime: 68.0,
                confidence: 'medium',
                score: 0.71,
                reason: 'Redundant content - consider trimming',
                sceneType: 'dialogue',
                motionScore: 0.25,
                audioEnergy: 0.45,
                status: 'pending',
            },
            {
                id: 'sug_5',
                type: 'cut',
                startTime: 95.0,
                endTime: 102.0,
                confidence: 'low',
                score: 0.52,
                reason: 'Repetitive frames with ambient audio',
                sceneType: 'static',
                motionScore: 0.08,
                audioEnergy: 0.15,
                status: 'pending',
            },
        ],
        audioSegments: [
            { id: 'aud_1', startTime: 0, endTime: 15, type: 'speech', energy: 0.6 },
            { id: 'aud_2', startTime: 15.5, endTime: 22.3, type: 'silence', energy: 0.05 },
            { id: 'aud_3', startTime: 30, endTime: 45, type: 'music', energy: 0.75, label: 'Action Score' },
            { id: 'aud_4', startTime: 45, endTime: 95, type: 'speech', energy: 0.55 },
            { id: 'aud_5', startTime: 95, endTime: 102, type: 'ambient', energy: 0.15 },
        ],
        sceneBoundaries: [
            { id: 'scene_1', time: 0, type: 'content', confidence: 1.0 },
            { id: 'scene_2', time: 15.5, type: 'threshold', confidence: 0.85 },
            { id: 'scene_3', time: 30.0, type: 'content', confidence: 0.92 },
            { id: 'scene_4', time: 45.0, type: 'adaptive', confidence: 0.78 },
            { id: 'scene_5', time: 60.0, type: 'content', confidence: 0.88 },
            { id: 'scene_6', time: 95.0, type: 'threshold', confidence: 0.65 },
        ],
    };
}
