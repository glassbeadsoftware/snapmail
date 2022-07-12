import * as path from 'path'
import { app } from 'electron';
import {getLairVersion, getRunnerVersion, PathOptions} from "electron-holochain";

console.log({__dirname})

/** DEBUGGING */
export const IS_DEBUG = process.env.APP_DEV ? (process.env.APP_DEV.trim() === 'true') : false;
export const DEVELOPMENT_UI_URL = path.join(__dirname, '../electron-ui')


/** MISC */
export const SNAPMAIL_APP_ID = 'snapmail-app'; // MUST MATCH SNAPMAIL_UI config
/** A special log from the conductor specifying that the interfaces are ready to receive incoming connections */
//export const HC_MAGIC_READY_STRING = 'Conductor ready.';
//export const LAIR_MAGIC_READY_STRING = '#lair-keystore-ready#';
export const REPORT_BUG_URL = `https://github.com/glassbeadsoftware/snapmail/issues/new`;


/** NETWORK */
export const DEFAULT_BOOTSTRAP_URL = 'https://bootstrap-staging.holo.host';
export const DEFAULT_PROXY_URL ='kitsune-proxy://SYVd4CF3BdJ4DS7KwLLgeU3_DbHoZ34Y-qroZ79DOs8/kitsune-quic/h/165.22.32.11/p/5779/--'
//kitsune-proxy://VYgwCrh2ZCKL1lpnMM1VVUee7ks-9BkmW47C_ys4nqg/kitsune-quic/h/kitsune-proxy.harris-braun.com/p/4010/--';


/** PATHS */
export const CONFIG_PATH = path.join(app.getPath('appData'), 'Snapmail');
//export const STORAGE_PATH = path.join(CONFIG_PATH, 'storage');
export const UID_LIST_FILENAME = 'uid-list.txt';
export const NETWORK_SETTINGS_FILENAME = 'network-preferences.json';
export const CURRENT_DIR = path.join(__dirname, '..');
//const DIST_DIR = IS_DEBUG? "ui_dbg" : "ui";
export const DIST_DIR = "electron-ui";

export const DNA_PATH = app.isPackaged
  ? path.join(app.getAppPath(), '../app/bin/snapmail.happ')
  : path.join(app.getAppPath(), 'bin/snapmail.happ')


export const APP_DATA_PATH = IS_DEBUG
  ? path.join(__dirname, '../../.dev-app-data')
  : path.join(app.getPath('appData'), 'snapmail')
export const USER_DATA_PATH = path.join(APP_DATA_PATH, 'users');


/**
 * in production must point to unpacked versions, not in an asar archive in development
 * fall back on defaults in the electron-holochain package
 */
const fileExt = process.platform === 'win32' ? '.exe' : '';
export const BINARY_PATHS: PathOptions | undefined = app.isPackaged
  ? {
    holochainRunnerBinaryPath: path.join(__dirname, `../../app/bin/holochain-runner${fileExt}`),
    lairKeystoreBinaryPath: path.join(__dirname, `../../app/bin/lair-keystore${fileExt}`,),
  }
  : undefined;

//console.log({BINARY_PATHS})

/** Get Versions */
export const RUNNER_VERSION = getRunnerVersion(BINARY_PATHS?.holochainRunnerBinaryPath)
export const LAIR_VERSION = getLairVersion(BINARY_PATHS?.lairKeystoreBinaryPath)



export const DNA_VERSION_FILENAME = "dna_version.txt";
export const RUNNING_ZOME_HASH_FILEPATH = 'bin/zome_hash.txt';

// export const HOLOCHAIN_BIN_NAME = 'snapmail-holochain';
// export const LAIR_KEYSTORE_BIN_NAME  = 'snapmail-lair-keystore';
// export const BIN_PATH = process.platform === "win32"? '' : './bin/';
// export const FILE_EXT = process.platform === "win32"? '.exe' : ''
//
// export const HOLOCHAIN_BIN = BIN_PATH + HOLOCHAIN_BIN_NAME + FILE_EXT
// export const LAIR_KEYSTORE_BIN = BIN_PATH + LAIR_KEYSTORE_BIN_NAME + FILE_EXT


/** ELECTRON-UI FILES */
export const BACKGROUND_COLOR = '#fbf9f7'
export const ICON_FILEPATH = path.join(CURRENT_DIR, "/electron-ui/icon.png")
export const LINUX_ICON_FILE = path.join(__dirname, '../electron-ui/icon.png')
export const SPLASH_FILE = path.join(__dirname, '../electron-ui/splashscreen.html')
export const MAIN_FILE = path.join(__dirname, '../electron-ui/index.html')


/** HTML PAGES */
export const NETWORK_URL = 'file://' + CURRENT_DIR + '/'+ DIST_DIR +'/networking.html';
export const ERROR_URL = 'file://' + CURRENT_DIR + '/'+ DIST_DIR +'/error.html';
export const INDEX_URL = 'file://' + CURRENT_DIR + '/'+ DIST_DIR +'/index.html?APP=';
