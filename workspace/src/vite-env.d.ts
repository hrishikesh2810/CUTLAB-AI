/// <reference types="vite/client" />

interface VideoFileInfo {
    path: string;
    name: string;
    size: number;
    url: string;
    exists?: boolean;
    error?: string;
}

interface ElectronAPI {
    selectVideoFiles: () => Promise<VideoFileInfo[]>;
    getVideoInfo: (filePath: string) => Promise<VideoFileInfo>;
    fileExists: (filePath: string) => Promise<boolean>;
    platform: string;
    isElectron: boolean;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export { };
