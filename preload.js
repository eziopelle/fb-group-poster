const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  runScript: (scriptName) => ipcRenderer.invoke('run-script', scriptName),
  onLog: (callback) => ipcRenderer.on('log', (_event, value) => callback(value)),
  updateEnv: (email, password) => ipcRenderer.invoke('update-env', { email, password }),
  preparePost: (message, imagePaths) => ipcRenderer.invoke('prepare-post', { message, imagePaths })
});
