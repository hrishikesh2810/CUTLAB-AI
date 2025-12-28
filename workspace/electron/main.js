const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        title: 'CUTLAB Workspace',
        backgroundColor: '#0a0a0f',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            // Enable loading local files
            webSecurity: false,
        },
    });

    // In development, load from Vite dev server
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ============================================================
// IPC HANDLERS
// ============================================================

// Handle video file selection
ipcMain.handle('select-video-files', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Import Video Files',
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: 'Video Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (result.canceled) {
        return [];
    }

    // Return file info for each selected file
    const files = result.filePaths.map(filePath => {
        const stats = fs.statSync(filePath);
        return {
            path: filePath,
            name: path.basename(filePath),
            size: stats.size,
            // Convert to file:// URL for video element
            url: `file://${filePath}`,
        };
    });

    return files;
});

// Get video metadata using ffprobe (if available) or basic file info
ipcMain.handle('get-video-info', async (event, filePath) => {
    try {
        const stats = fs.statSync(filePath);
        return {
            path: filePath,
            name: path.basename(filePath),
            size: stats.size,
            url: `file://${filePath}`,
            exists: true,
        };
    } catch (error) {
        return {
            path: filePath,
            exists: false,
            error: error.message,
        };
    }
});

// Check if file exists
ipcMain.handle('file-exists', async (event, filePath) => {
    return fs.existsSync(filePath);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
