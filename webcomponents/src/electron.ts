
/**
 *
 */
export interface IpcRendererApi {
  send: (channel: string) => void,
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => this;
  newMailSync: (title: string, body: string)  => unknown,
  startingInfo: (startingHandle, dnaHash)  => string,
  newCountAsync: (newCount)  => unknown,
  DEV_MODE: string,
  versions: {
    node: string,
    chrome: string,
    electron: string,
  }
}


/** APP SETUP */

export let DEV_MODE: string;
export const MY_ELECTRON_API = 'electronBridge' in window? window.electronBridge as IpcRendererApi : undefined;
console.log("MY_ELECTRON_API = ", MY_ELECTRON_API);
 if (MY_ELECTRON_API) {
   DEV_MODE = MY_ELECTRON_API.DEV_MODE;
 } else {
   if (typeof process === 'undefined') {
     console.warn("DEV_MODE not defined");
   } else {
     DEV_MODE = process.env.DEV_MODE
   }
}
 console.log("DEV_MODE =", DEV_MODE)


/** Remove console.log() in PROD */
if (DEV_MODE !== 'dev') {
  console.log = () => {};
}


/** */
export function updateTray(newCount: number): void {
  if (!MY_ELECTRON_API) {
    return;
  }
  const reply = MY_ELECTRON_API.newCountAsync(newCount);
  console.log({reply});

}
