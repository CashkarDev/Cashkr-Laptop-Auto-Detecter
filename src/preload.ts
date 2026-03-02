import { contextBridge, ipcRenderer } from 'electron';

// Expose a safe, limited API to the renderer process
contextBridge.exposeInMainWorld('api', {
    detectHardware: (): Promise<unknown> => ipcRenderer.invoke('detect-hardware'),
    getApiBase: (): Promise<string> => ipcRenderer.invoke('get-api-base'),
    closeApp: (): void => ipcRenderer.send('close-app')
});
