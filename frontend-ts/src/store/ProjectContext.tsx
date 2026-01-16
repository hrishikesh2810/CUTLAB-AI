import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type {
    Project,
    ProjectMetadata,
    Scene,
    CutSuggestion,
    Timeline,
    SequenceSettings,
    TabType,
} from '../types';
import * as api from '../services/api';

// State
interface ProjectState {
    // Project data
    projectId: string | null;
    metadata: ProjectMetadata | null;
    scenes: Scene[] | null;
    suggestions: CutSuggestion[] | null;
    timeline: Timeline | null;

    // Project list
    projects: Project[];

    // UI state
    activeTab: TabType;
    isLoading: boolean;
    error: string | null;

    // Sequence settings
    sequence: SequenceSettings;

    // Selection state
    selectedClipId: string | null;
    acceptedSuggestions: Set<number>;
}

// Actions
type ProjectAction =
    | { type: 'SET_PROJECT'; payload: { projectId: string; metadata: ProjectMetadata; scenes?: Scene[] | null; suggestions?: CutSuggestion[] | null } }
    | { type: 'SET_PROJECTS'; payload: Project[] }
    | { type: 'SET_SCENES'; payload: Scene[] }
    | { type: 'SET_SUGGESTIONS'; payload: CutSuggestion[] }
    | { type: 'SET_TIMELINE'; payload: Timeline }
    | { type: 'SET_ACTIVE_TAB'; payload: TabType }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'SET_SEQUENCE'; payload: Partial<SequenceSettings> }
    | { type: 'SELECT_CLIP'; payload: string | null }
    | { type: 'TOGGLE_SUGGESTION'; payload: number }
    | { type: 'SET_ALL_SUGGESTIONS'; payload: boolean }
    | { type: 'CLEAR_PROJECT' };

const initialState: ProjectState = {
    projectId: null,
    metadata: null,
    scenes: null,
    suggestions: null,
    timeline: null,
    projects: [],
    activeTab: 'upload',
    isLoading: false,
    error: null,
    sequence: { width: 1920, height: 1080, fps: 30 },
    selectedClipId: null,
    acceptedSuggestions: new Set(),
};

function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
    switch (action.type) {
        case 'SET_PROJECT':
            return {
                ...state,
                projectId: action.payload.projectId,
                metadata: action.payload.metadata,
                scenes: action.payload.scenes ?? null,
                suggestions: action.payload.suggestions ?? null,
                error: null,
            };
        case 'SET_PROJECTS':
            return { ...state, projects: action.payload };
        case 'SET_SCENES':
            return { ...state, scenes: action.payload };
        case 'SET_SUGGESTIONS':
            return {
                ...state,
                suggestions: action.payload,
                acceptedSuggestions: new Set(action.payload.map(s => s.scene_id)),
            };
        case 'SET_TIMELINE':
            return { ...state, timeline: action.payload };
        case 'SET_ACTIVE_TAB':
            return { ...state, activeTab: action.payload };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload, isLoading: false };
        case 'SET_SEQUENCE':
            return { ...state, sequence: { ...state.sequence, ...action.payload } };
        case 'SELECT_CLIP':
            return { ...state, selectedClipId: action.payload };
        case 'TOGGLE_SUGGESTION':
            const newSet = new Set(state.acceptedSuggestions);
            if (newSet.has(action.payload)) {
                newSet.delete(action.payload);
            } else {
                newSet.add(action.payload);
            }
            return { ...state, acceptedSuggestions: newSet };
        case 'SET_ALL_SUGGESTIONS':
            if (action.payload && state.suggestions) {
                return { ...state, acceptedSuggestions: new Set(state.suggestions.map(s => s.scene_id)) };
            }
            return { ...state, acceptedSuggestions: new Set() };
        case 'CLEAR_PROJECT':
            return {
                ...initialState,
                projects: state.projects,
            };
        default:
            return state;
    }
}

// Context
interface ProjectContextType {
    state: ProjectState;
    dispatch: React.Dispatch<ProjectAction>;
    // Actions
    loadProjects: () => Promise<void>;
    loadProject: (projectId: string) => Promise<void>;
    uploadVideo: (file: File) => Promise<void>;
    analyzeScenes: () => Promise<void>;
    generateSuggestions: () => Promise<void>;
    loadTimeline: () => Promise<void>;
    refreshTimeline: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

// Provider
export function ProjectProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(projectReducer, initialState);

    // Load projects on mount
    useEffect(() => {
        loadProjects();
    }, []);

    // Load saved project from localStorage
    useEffect(() => {
        const savedProjectId = localStorage.getItem('cutlab_active_project');
        if (savedProjectId && !state.projectId) {
            loadProject(savedProjectId);
        }
    }, []);

    const loadProjects = async () => {
        try {
            const data = await api.getProjects();
            dispatch({ type: 'SET_PROJECTS', payload: data.projects });
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    };

    const loadProject = async (projectId: string) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const data = await api.getProject(projectId);
            dispatch({
                type: 'SET_PROJECT',
                payload: {
                    projectId,
                    metadata: data.metadata,
                    scenes: data.scenes,
                    suggestions: data.suggestions,
                },
            });
            localStorage.setItem('cutlab_active_project', projectId);

            // Load timeline too
            try {
                const timelineData = await api.getTimeline(projectId);
                dispatch({ type: 'SET_TIMELINE', payload: timelineData.timeline });
            } catch {
                // Timeline might not exist yet
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to load project' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const uploadVideo = async (file: File) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const data = await api.uploadVideo(file);
            dispatch({
                type: 'SET_PROJECT',
                payload: {
                    projectId: data.project_id,
                    metadata: data.metadata,
                },
            });
            localStorage.setItem('cutlab_active_project', data.project_id);
            await loadProjects();
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to upload video' });
            throw error;
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const analyzeScenes = async () => {
        if (!state.projectId) return;
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const data = await api.analyzeScenes(state.projectId);
            dispatch({ type: 'SET_SCENES', payload: data.scenes });
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to analyze scenes' });
            throw error;
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const generateSuggestions = async () => {
        if (!state.projectId) return;
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const data = await api.suggestCuts(state.projectId);
            dispatch({ type: 'SET_SUGGESTIONS', payload: data.suggestions });
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to generate suggestions' });
            throw error;
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const loadTimeline = async () => {
        if (!state.projectId) return;
        try {
            const data = await api.getTimeline(state.projectId);
            dispatch({ type: 'SET_TIMELINE', payload: data.timeline });
        } catch (error) {
            console.error('Failed to load timeline:', error);
        }
    };

    const refreshTimeline = async () => {
        await loadTimeline();
    };

    return (
        <ProjectContext.Provider
            value={{
                state,
                dispatch,
                loadProjects,
                loadProject,
                uploadVideo,
                analyzeScenes,
                generateSuggestions,
                loadTimeline,
                refreshTimeline,
            }}
        >
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
}
