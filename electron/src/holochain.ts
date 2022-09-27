import * as path from 'path'
import { app } from 'electron'
import { ElectronHolochainOptions, StateSignal } from "@lightningrodlabs/electron-holochain"
import {DNA_PATH, DNA_VERSION_FILENAME, NETWORK_SETTINGS_FILENAME, SNAPMAIL_APP_ID} from './constants'
import {NetworkSettings} from "./networkSettings";
import fs from "fs";
import {log} from "./logger";

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
  const options: ElectronHolochainOptions = {
    happPath: DNA_PATH,
    datastorePath,
    appId: SNAPMAIL_APP_ID + '-' + uid,
    //appId: MAIN_APP_ID,
    appWsPort: 0,
    adminWsPort: 1235,
    //keystorePath: keystorePath.replace(/\\/g, "/").replace(/:/g, ""),
    keystorePath,
    proxyUrl: networkSettings.proxyUrl,
    bootstrapUrl: networkSettings.canProxy? networkSettings.bootstrapUrl : '',
    passphrase: "test-passphrase",
  }
  return options;
}


/** */
export function loadDnaVersion(sessionDataPath: string): string | undefined  {
  let dnaVersion = undefined;
  //const configFilePath = path.join(sessionDataPath, '../');
  const configFilePath = path.join(sessionDataPath, DNA_VERSION_FILENAME);
  try {
    dnaVersion = fs.readFileSync(configFilePath).toString();
  } catch(error) {
    log("warn", "File not found ; " + configFilePath)
    return undefined;
  }
  return dnaVersion;
}
