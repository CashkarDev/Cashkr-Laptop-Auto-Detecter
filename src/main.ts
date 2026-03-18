import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { autoUpdater } from 'electron-updater';
import { getHardwareSpecs } from './hardwareDetection';

// Keep a global reference of the window object to prevent garbage collection
let mainWindow: BrowserWindow | null = null;


function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 600,
        height: 600,
        icon: path.join(__dirname, '..', 'assets', 'favicon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            // Security: Keep Context Isolation ENABLED and node integration DISABLED
            contextIsolation: true,
            nodeIntegration: false
        },
        autoHideMenuBar: true, // Hide default Electron menu
        show: false // Wait to show until ready
    });

    mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// IPC Handler — return API base URL from bundled package.json
ipcMain.handle('get-api-base', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require(path.join(app.getAppPath(), 'package.json'));
    return pkg.apiUrl || 'https://www.cashkr.com/api/qc/laptop';
});

// IPC Handler to close app from Renderer
ipcMain.on('close-app', () => {
    app.quit();
});

// IPC Handler to catch hardware detection requests from Renderer
ipcMain.handle('detect-hardware', async () => {
    try {
        const specs = await getHardwareSpecs();
        return specs;
    } catch (error) {
        console.error("Hardware detection error:", error);
        throw error;
    }
});

// App lifecycle
app.whenReady().then(() => {
    createWindow();
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('update-available', () => {
    mainWindow?.webContents.send('update-status', 'available');
  });
    autoUpdater.on('download-progress', (progress) => {
        mainWindow?.webContents.send('update-status', 'downloading', progress.percent);
    });

    autoUpdater.on('error', (error) => {
        mainWindow?.webContents.send('update-status', 'error', error?.message || 'Update failed');
        console.error('Update error:', error);
    });

    autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update-status', 'ready');
    autoUpdater.quitAndInstall(); // auto restart
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
