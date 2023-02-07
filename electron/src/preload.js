const { contextBridge, ipcRenderer } = require('electron')

const DEV_MODE = process.env.DEV_MODE? process.env.DEV_MODE : 'prod';

console.log("preload DEV_MODE = " + JSON.stringify(process.env.DEV_MODE));

const myElectronAPI = {
  dnaHashSync: (dnaHashB64) => { return ipcRenderer.sendSync('dnaHash', dnaHashB64); },
  newMailSync: (title, body) => { return ipcRenderer.sendSync('newMailSync', title, body); },
  startingInfo: (startingHandle, dnaHash) => { return ipcRenderer.sendSync('startingInfo', startingHandle, dnaHash); },
  newCountAsync: (newCount) => { return ipcRenderer.send('newCountAsync', newCount); },
  DEV_MODE,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  }
};

contextBridge.exposeInMainWorld('myElectronAPI', myElectronAPI)
