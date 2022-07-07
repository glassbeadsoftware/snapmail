import * as path from 'path'
import { app } from 'electron'
import { HolochainRunnerOptions, StateSignal, PathOptions } from 'electron-holochain'
import { DNA_PATH, SNAPMAIL_APP_ID, BINARY_PATHS } from './constants'

// these messages get seen on the splash page
export enum StateSignalText {
  IsFirstRun = 'Welcome to Snapmail...',
  IsNotFirstRun = 'Loading...',
  CreatingKeys = 'Creating cryptographic keys...',
  RegisteringDna = 'Registering Profiles DNA to Holochain...',
  InstallingApp = 'Installing DNA bundle to Holochain...',
  EnablingApp = 'Enabling DNA...',
  AddingAppInterface = 'Attaching API network port...',
}

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


/**
 *
 */
function createHolochainOptions(uid: string, storagePath: string): HolochainRunnerOptions {
  const options: HolochainRunnerOptions = {
    happPath: DNA_PATH,
    datastorePath: path.join(storagePath, 'databases-' + app.getVersion()),
    appId: SNAPMAIL_APP_ID + '-' + uid,
    //appId: MAIN_APP_ID,
    appWsPort: 0,
    adminWsPort: 1235,
    keystorePath: path.join(storagePath, 'keystore-' + app.getVersion()),
    //proxyUrl: COMMUNITY_PROXY_URL,
    //bootstrapUrl: "",
    uid,
  }
  return options;
}

export { createHolochainOptions }
