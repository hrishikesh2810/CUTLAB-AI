import axios from 'axios';
import type {
    ProjectsResponse,
    ProjectResponse,
    UploadResponse,
    ScenesResponse,
    SuggestionsResponse,
    TimelineResponse,
    TimelineClip,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Project APIs
export const getProjects = async (): Promise<ProjectsResponse> => {
    // Current main.py returns { status: "success", count: X, projects: [...] }
    const response = await api.get<any>('/projects');
    return {
        status: response.data.status,
        projects: response.data.projects || []
    } as ProjectsResponse;
};

export const getProject = async (projectId: string): Promise<ProjectResponse> => {
    // Legacy main.py endpoint is /project/{id} (note: singular project)
    const response = await api.get<ProjectResponse>(`/project/${projectId}`);
    return response.data;
};

export const createProject = async (name: string, videoId?: string): Promise<ProjectResponse> => {
    const response = await api.post<ProjectResponse>('/projects', { name, video_id: videoId });
    return response.data;
};

export const updateProjectState = async (projectId: string, state: any): Promise<ProjectResponse> => {
    const response = await api.put<ProjectResponse>(`/projects/${projectId}`, {
        editor_state: state
    });
    return response.data;
};

export const uploadVideo = async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<UploadResponse>('/upload-video', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

// Analysis APIs
export const analyzeScenes = async (projectId: string): Promise<ScenesResponse> => {
    const response = await api.post<ScenesResponse>(`/analyze-scenes/${projectId}`);
    return response.data;
};

export const suggestCuts = async (projectId: string): Promise<SuggestionsResponse> => {
    const response = await api.post<SuggestionsResponse>(`/suggest-cuts/${projectId}`);
    return response.data;
};

// Timeline APIs
export const getTimeline = async (projectId: string): Promise<TimelineResponse> => {
    const response = await api.get<TimelineResponse>(`/workspace/${projectId}/timeline`);
    return response.data;
};

export const addClip = async (
    projectId: string,
    clip: Omit<TimelineClip, 'clip_id' | 'duration'>
): Promise<TimelineResponse> => {
    const response = await api.post<TimelineResponse>(`/workspace/${projectId}/timeline/clip`, clip);
    return response.data;
};

export const updateClip = async (
    projectId: string,
    clipId: string,
    updates: Partial<TimelineClip>
): Promise<TimelineResponse> => {
    const response = await api.put<TimelineResponse>(
        `/workspace/${projectId}/timeline/clip/${clipId}`,
        updates
    );
    return response.data;
};

export const deleteClip = async (projectId: string, clipId: string): Promise<TimelineResponse> => {
    const response = await api.delete<TimelineResponse>(
        `/workspace/${projectId}/timeline/clip/${clipId}`
    );
    return response.data;
};

export const clearTimeline = async (projectId: string): Promise<TimelineResponse> => {
    const response = await api.delete<TimelineResponse>(`/workspace/${projectId}/timeline`);
    return response.data;
};

export const populateFromSuggestions = async (projectId: string): Promise<TimelineResponse> => {
    const response = await api.post<TimelineResponse>(
        `/workspace/${projectId}/timeline/from-suggestions`
    );
    return response.data;
};

// Editing Tools
export const splitClip = async (
    projectId: string,
    clipId: string,
    splitPosition: number
): Promise<TimelineResponse> => {
    const response = await api.post<TimelineResponse>(
        `/workspace/${projectId}/timeline/clip/${clipId}/split`,
        { split_position: splitPosition }
    );
    return response.data;
};

export const trimClipIn = async (
    projectId: string,
    clipId: string,
    newPosition: number
): Promise<TimelineResponse> => {
    const response = await api.post<TimelineResponse>(
        `/workspace/${projectId}/timeline/clip/${clipId}/trim-in`,
        { new_position: newPosition }
    );
    return response.data;
};

export const trimClipOut = async (
    projectId: string,
    clipId: string,
    newPosition: number
): Promise<TimelineResponse> => {
    const response = await api.post<TimelineResponse>(
        `/workspace/${projectId}/timeline/clip/${clipId}/trim-out`,
        { new_position: newPosition }
    );
    return response.data;
};

export const setClipSpeed = async (
    projectId: string,
    clipId: string,
    speed: number
): Promise<TimelineResponse> => {
    const response = await api.post<TimelineResponse>(
        `/workspace/${projectId}/timeline/clip/${clipId}/speed`,
        { speed }
    );
    return response.data;
};

// Transition APIs
export const setTransition = async (
    projectId: string,
    fromClipId: string,
    toClipId: string,
    type: string,
    duration: number
): Promise<TimelineResponse> => {
    const response = await api.post<TimelineResponse>(
        `/workspace/${projectId}/timeline/transition`,
        {
            from_clip_id: fromClipId,
            to_clip_id: toClipId,
            transition_type: type,
            duration,
        }
    );
    return response.data;
};

export const getTransitions = async (projectId: string) => {
    const response = await api.get(`/workspace/${projectId}/timeline/transitions`);
    return response.data;
};

// Export APIs
export const exportTimeline = async (
    projectId: string,
    format: 'json' | 'xml' = 'json',
    acceptedIds?: number[]
): Promise<Blob> => {
    const params = new URLSearchParams({ format });
    if (acceptedIds && acceptedIds.length > 0) {
        params.append('accepted_ids', acceptedIds.join(','));
    }

    const response = await api.get(`/export-timeline/${projectId}?${params.toString()}`, {
        responseType: 'blob',
    });
    return response.data;
};

export const analyzeContent = async (data: {
    captions: any[];
    timeline: any[];
    video_duration: number;
}): Promise<any> => {
    const response = await api.post('/ai/content/analyze', data);
    return response.data;
};

export default api;
