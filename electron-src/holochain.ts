import * as path from 'path'
import { app } from 'electron'
import { HolochainRunnerOptions, StateSignal } from 'electron-holochain'
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
}


/** */
export function createHolochainOptions(uid: string, storagePath: string, networkSettings: NetworkSettings): HolochainRunnerOptions {
  const options: HolochainRunnerOptions = {
    happPath: DNA_PATH,
    datastorePath: path.join(storagePath, 'databases-' + app.getVersion()),
    appId: SNAPMAIL_APP_ID + '-' + uid,
    //appId: MAIN_APP_ID,
    appWsPort: 0,
    adminWsPort: 1235,
    keystorePath: path.join(storagePath, 'keystore-' + app.getVersion()),
    proxyUrl: networkSettings.proxyUrl,
    bootstrapUrl: networkSettings.canProxy? networkSettings.bootstrapUrl : '',
    uid,
  }
  return options;
}


/** */
export function loadDnaVersion(sessionDataPath): string | undefined  {
  let dnaVersion = undefined;
  //let configFilePath = path.join(sessionDataPath, '../');
  let configFilePath = path.join(sessionDataPath, DNA_VERSION_FILENAME);
  try {
    dnaVersion = fs.readFileSync(configFilePath).toString();
  } catch(error) {
    log("warn", "File not found ; " + configFilePath)
    return undefined;
  }
  return dnaVersion;
}
