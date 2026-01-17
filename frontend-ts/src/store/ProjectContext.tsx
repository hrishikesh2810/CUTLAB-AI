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
    BatchJob,
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

    // Batch state
    batchJobs: BatchJob[];
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
    | { type: 'SET_BATCH_JOBS'; payload: BatchJob[] }
    | { type: 'UPDATE_BATCH_JOB'; payload: { id: string; updates: Partial<BatchJob> } }
    | { type: 'REMOVE_BATCH_JOB'; payload: string }
    | { type: 'CLEAR_PROJECT' };

const initialState: ProjectState = {
    projectId: null,
    metadata: null,
    scenes: null,
    suggestions: null,
    timeline: null,
    projects: [],
    activeTab: 'dashboard',
    isLoading: false,
    error: null,
    sequence: { width: 1920, height: 1080, fps: 30 },
    selectedClipId: null,
    acceptedSuggestions: new Set(),
    batchJobs: [],
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
        case 'SET_BATCH_JOBS':
            return { ...state, batchJobs: action.payload };
        case 'UPDATE_BATCH_JOB':
            return {
                ...state,
                batchJobs: state.batchJobs.map(job =>
                    job.id === action.payload.id ? { ...job, ...action.payload.updates } : job
                )
            };
        case 'REMOVE_BATCH_JOB':
            return {
                ...state,
                batchJobs: state.batchJobs.filter(job => job.id !== action.payload)
            };
        case 'CLEAR_PROJECT':
            return {
                ...initialState,
                projects: state.projects,
                batchJobs: state.batchJobs,
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
    refreshTimeline: () => Promise<void>;
    runBatchProcess: (files: File[]) => Promise<void>;
    clearBatchJobs: () => void;
    removeBatchJob: (id: string) => void;
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
            // Map backend projects to frontend structure if needed
            // The backend /projects endpoint (from main.py list_projects) returns legacy structure.
            // The new routers/projects.py (not yet used for listing?) 
            // We should ensure we handle both. 
            // For now, assuming the API returns what we expect.
            dispatch({ type: 'SET_PROJECTS', payload: data.projects });
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    };

    const loadProject = async (projectId: string) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const data = await api.getProject(projectId);

            // Handle both new (id) and legacy (project_id) structures
            const newProjectId = data.id || data.project_id || projectId;
            const newMetadata = data.metadata || (data as any); // Fallback for pure Project object

            // Ensure editor state is loaded if available
            // if (data.editor_state) { ... } 

            dispatch({
                type: 'SET_PROJECT',
                payload: {
                    projectId: newProjectId,
                    metadata: newMetadata, // Type casting might be needed effectively
                    scenes: data.scenes || null,
                    suggestions: data.suggestions || null,
                },
            });
            localStorage.setItem('cutlab_active_project', newProjectId);

            // Load timeline
            try {
                const timelineData = await api.getTimeline(newProjectId);
                dispatch({ type: 'SET_TIMELINE', payload: timelineData.timeline });
            } catch {
                // Timeline might not exist yet
            }
        } catch {
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
                    projectId: data.project_id!,
                    metadata: data.metadata!,
                },
            });
            localStorage.setItem('cutlab_active_project', data.project_id!);
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

    // Autosave functionality
    useEffect(() => {
        if (!state.projectId) return;

        const saveState = async () => {
            try {
                // Construct the full editor state to save
                const editorState = {
                    timeline: state.timeline,
                    scenes: state.scenes,
                    suggestions: state.suggestions,
                    metadata: state.metadata,
                    updated_at: new Date().toISOString()
                };

                // Call API
                if (state.projectId) {
                    await api.updateProjectState(state.projectId, editorState);
                }
                // console.log("Autosaved project state"); // Optional logging
            } catch (error) {
                console.error("Autosave failed:", error);
            }
        };

        // Debounce or Interval? Interval is safer for "continuous" saves.
        // Let's use a 5-second interval that only saves if initialized.
        const intervalId = setInterval(saveState, 5000);

        return () => clearInterval(intervalId);
    }, [state.projectId, state.timeline, state.scenes, state.suggestions, state.metadata]);

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
                refreshTimeline,
                runBatchProcess: async (files: File[]) => {
                    // Initialize jobs
                    const newJobs: BatchJob[] = files.map(file => ({
                        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        name: file.name,
                        status: 'pending',
                        progress: 0
                    }));

                    dispatch({ type: 'SET_BATCH_JOBS', payload: [...state.batchJobs, ...newJobs] });
                    dispatch({ type: 'SET_ACTIVE_TAB', payload: 'batch' });

                    // Process each file
                    for (const job of newJobs) {
                        const file = files.find(f => f.name === job.name);
                        if (!file) continue;

                        try {
                            // 1. Upload
                            dispatch({ type: 'UPDATE_BATCH_JOB', payload: { id: job.id, updates: { status: 'uploading', progress: 10 } } });
                            const uploadData = await api.uploadVideo(file);
                            const projectId = uploadData.project_id;

                            // 2. Analyze Scenes
                            dispatch({ type: 'UPDATE_BATCH_JOB', payload: { id: job.id, updates: { status: 'analyzing', progress: 40, projectId } } });
                            await api.analyzeScenes(projectId);

                            // 3. Generate Suggestions
                            dispatch({ type: 'UPDATE_BATCH_JOB', payload: { id: job.id, updates: { progress: 70 } } });
                            await api.suggestCuts(projectId);

                            // 4. Complete
                            dispatch({ type: 'UPDATE_BATCH_JOB', payload: { id: job.id, updates: { status: 'completed', progress: 100 } } });
                        } catch (error: any) {
                            console.error(`Batch job failed for ${job.name}:`, error);
                            dispatch({
                                type: 'UPDATE_BATCH_JOB',
                                payload: {
                                    id: job.id,
                                    updates: { status: 'failed', error: error.message || 'Processing failed' }
                                }
                            });
                        }
                    }

                    // Refresh project list after all jobs are done
                    await loadProjects();
                },
                clearBatchJobs: () => dispatch({ type: 'SET_BATCH_JOBS', payload: [] }),
                removeBatchJob: (id: string) => dispatch({ type: 'REMOVE_BATCH_JOB', payload: id }),
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
