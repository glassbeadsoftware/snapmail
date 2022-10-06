import * as path from 'path'
import { app } from 'electron'
import { ElectronHolochainOptions, StateSignal } from "@lightningrodlabs/electron-holochain"
import {DNA_PATH, DNA_VERSION_FILENAME, SNAPMAIL_APP_ID} from './constants'
import {NetworkSettings} from "./networkSettings";
import fs from "fs";
import {log} from "./logger";
import {bytesToBase64} from "byte-base64";


/** Convert holo hash to readable string */
export function htos(u8array: number[] | Uint8Array): string {
  return bytesToBase64(u8array)
}


/** Messages displayed on the splashscreen */
export enum StateSignalText {
  IsFirstRun = 'Welcome to Snapmail...',
  IsNotFirstRun = 'Loading...',
  CreatingKeys = 'Creating cryptographic keys...',
  RegisteringDna = 'Registering Profiles DNA to Holochain...',
  InstallingApp = 'Installing DNA bundle to Holochain...',
  EnablingApp = 'Enabling DNA...',
  AddingAppInterface = 'Attaching API network port...',
  UnknownState = 'Application is in an unknown state...',
}


/** */
export function stateSignalToText(state: StateSignal): StateSignalText {
  switch (state) {
    case StateSignal.IsFirstRun:
      return StateSignalText.IsFirstRun
    case StateSignal.IsNotFirstRun:
      return StateSignalText.IsNotFirstRun
    case StateSignal.CreatingKeys:
      return StateSignalText.CreatingKeys
    case StateSignal.RegisteringDna:
      return StateSignalText.RegisteringDna
    case StateSignal.InstallingApp:
      return StateSignalText.InstallingApp
    case StateSignal.EnablingApp:
      return StateSignalText.EnablingApp
    case StateSignal.AddingAppInterface:
      return StateSignalText.AddingAppInterface
  }
  log('error', 'Unknown state: ' + JSON.stringify(state))
  return StateSignalText.UnknownState
}


/** */
export function createHolochainOptions(uid: string, storagePath: string, networkSettings: NetworkSettings): ElectronHolochainOptions {
  const keystorePath = path.join(storagePath, 'keystore-' + app.getVersion())
  const datastorePath =  path.join(storagePath, 'databases-' + app.getVersion())
  //console.log('info', {__dirname});
  const options: ElectronHolochainOptions = {
    happPath: DNA_PATH,
    datastorePath,
    keystorePath,
    //happPath: "C:\\github\\snapmail\\electron\\bin\\snapmail.happ\\",
    //happPath: "snapmail.happ",
    //happPath: DNA_PATH.replace(/\\/g, "/").replace(/:/g, ""),
    appId: SNAPMAIL_APP_ID + '-' + uid,
    //appId: MAIN_APP_ID,
    appWsPort: 0,
    adminWsPort: 1235,
    proxyUrl: networkSettings.proxyUrl,
    bootstrapUrl: networkSettings.canProxy? networkSettings.bootstrapUrl : '',
    passphrase: "test-passphrase",
  }
  //console.log('info', {keystorePath: options.keystorePath});
  return options;
}


/** */
export function loadDnaVersion(sessionDataPath: string): string | undefined  {
  let dnaVersion = undefined;
  //const configFilePath = path.join(sessionDataPath, '../');
  const configFilePath = path.join(sessionDataPath, DNA_VERSION_FILENAME);
  //log('debug', "loadDnaVersion() configFilePath = " + configFilePath);
  try {
    dnaVersion = fs.readFileSync(configFilePath).toString();
  } catch(error) {
    log("warn", "File not found ; " + configFilePath)
    return undefined;
  }
  return dnaVersion;
}
