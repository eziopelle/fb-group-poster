const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  runScript: (scriptName) => ipcRenderer.invoke('run-script', scriptName),
  onLog: (callback) => ipcRenderer.on('log', (_event, value) => callback(value)),
  updateEnv: (email, password) => ipcRenderer.invoke('update-env', { email, password }),
  preparePost: async (message, files) => {
    const buffers = await Promise.all(
      files.map(async (file) => {
        const buffer = await file.arrayBuffer();
        return {
          name: file.name,
          buffer: Array.from(new Uint8Array(buffer)) // ⬅️ serialize to send via IPC
        };
      })
    );

    return ipcRenderer.invoke('prepare-post-buffers', { message, buffers });
  }
});
