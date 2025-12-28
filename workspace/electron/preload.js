const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // File operations
    selectVideoFiles: () => ipcRenderer.invoke('select-video-files'),
    getVideoInfo: (filePath) => ipcRenderer.invoke('get-video-info', filePath),
    fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),

    // Platform info
    platform: process.platform,
    isElectron: true,
});
