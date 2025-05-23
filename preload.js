const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  deleteImage: (imagePath) => ipcRenderer.invoke('delete-image', imagePath),
  openExplorer: (imagePath) => ipcRenderer.invoke('open-explorer', imagePath), 
  parsePngMetadata: (imagePath) => ipcRenderer.invoke('parse-png-metadata', imagePath),
  copyImageToClipboard2: (imagePath) => ipcRenderer.invoke('sharp-copy-Image', imagePath),
  moveImage: (currentPath, targetFolder) => ipcRenderer.invoke('move-image', currentPath, targetFolder),
  selectTargetFolder: () => ipcRenderer.invoke('select-target-folder'),
  selectLast100Images: () => ipcRenderer.invoke('select-last-100-images'),
});


