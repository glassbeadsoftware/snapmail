const { contextBridge, ipcRenderer } = require('electron')

// contextBridge.exposeInMainWorld('versions', {
//   node: () => process.versions.node,
//   chrome: () => process.versions.chrome,
//   electron: () => process.versions.electron,
// })

console.log("HI MOM");
console.log("preload DEV_MODE =" + JSON.stringify(process.env.DEV_MODE));

const electronAPI = {
  newMailSync: (title, body) => { return ipcRenderer.sendSync('newMailSync', title, body) },
  startingInfo: (startingHandle, dnaHash) => { return ipcRenderer.sendSync('startingInfo', startingHandle, dnaHash)},
  newCountAsync: (newCount) => ipcRenderer.send('newCountAsync', newCount),
  DEV_MODE: process.env.DEV_MODE,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
