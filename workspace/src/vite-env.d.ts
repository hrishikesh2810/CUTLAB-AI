/// <reference types="vite/client" />

interface ElectronAPI {
    loadTimeline: (projectId: string) => Promise<TimelineData>;
    saveTimeline: (projectId: string, data: TimelineData) => Promise<boolean>;
    selectVideoFile: () => Promise<string | null>;
    platform: string;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export { };
