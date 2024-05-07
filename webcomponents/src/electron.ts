import {HAPP_BUILD_MODE, HappBuildModeType} from "@ddd-qc/lit-happ";

/**
 *
 */
export interface IpcRendererApi {
  send: (channel: string) => void,
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => this;
  newMailSync: (title: string, body: string)  => unknown,
  startingInfo: (startingHandle, dnaHash)  => string,
  newCountAsync: (newCount)  => unknown,
  BUILD_MODE: string,
  versions: {
    node: string,
    chrome: string,
    electron: string,
  }
}


/** APP SETUP */
// FIXME: use HAPP_BUILD_MODE instead
export let BUILD_MODE: string;
export const MY_ELECTRON_API = 'electronBridge' in window? window.electronBridge as IpcRendererApi : undefined;
export const IS_ELECTRON = typeof MY_ELECTRON_API !== 'undefined'
 if (MY_ELECTRON_API) {
   BUILD_MODE = MY_ELECTRON_API.BUILD_MODE;
 } else {
   try {
     BUILD_MODE = process.env.BUILD_MODE;
   } catch (e) {
     console.log("[snapmail] BUILD_MODE not defined. Defaulting to " + HappBuildModeType.Retail);
     BUILD_MODE = HappBuildModeType.Retail;
   }
}


console.log("[snapmail] HAPP_BUILD_MODE =", HAPP_BUILD_MODE)
console.log("[snapmail]     IS_ELECTRON =", IS_ELECTRON);

/** Remove console.log() in Retail */
if (HAPP_BUILD_MODE === HappBuildModeType.Retail) {
  //console.log("console.log() disabled");
  //console.log = () => {};
  console.log("[snapmail] console.log() changed into console.debug()");
  console.log = console.debug
}


/** */
export function updateTray(newCount: number): void {
  if (!MY_ELECTRON_API) {
    return;
  }
  const reply = MY_ELECTRON_API.newCountAsync(newCount);
  console.log({reply});

}
