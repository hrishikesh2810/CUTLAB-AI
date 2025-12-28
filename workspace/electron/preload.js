const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Timeline operations
    loadTimeline: (projectId) => ipcRenderer.invoke('load-timeline', projectId),
    saveTimeline: (projectId, data) => ipcRenderer.invoke('save-timeline', projectId, data),

    // File operations
    selectVideoFile: () => ipcRenderer.invoke('select-video-file'),

    // Platform info
    platform: process.platform,
});
