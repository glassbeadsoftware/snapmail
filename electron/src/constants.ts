import * as path from 'path'
import { app } from 'electron';
import {getRunnerVersion, PathOptions} from "@lightningrodlabs/electron-holochain"

console.log({__dirname})
console.log("electron IS_PACKAGED", app.isPackaged);

/** DEBUGGING */
export const IS_PACKAGED = app.isPackaged;
export const IS_DEV = process.env.HAPP_BUILD_MODE? process.env.HAPP_BUILD_MODE == HappBuildModeType.Debug : false;
export const DEVELOPMENT_UI_URL = path.join(__dirname, '../web')

/** MISC */
export const SNAPMAIL_APP_ID = 'snapmail-app'; // WARN Must match APP_ID in webcomponents code
/** A special log from the conductor specifying that the interfaces are ready to receive incoming connections */
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
export const DIST_DIR = "web";
export const FAVICON_PATH = `/web/favicon.png`;


export const DNA_PATH = IS_PACKAGED
  ? path.join(app.getAppPath(), '../app/bin/snapmail.happ')
  : path.join(app.getAppPath(), 'bin/snapmail.happ')


/*
  app.getPath('appData') =
  - %APPDATA% on Windows
  - $XDG_CONFIG_HOME or ~/.config on Linux
  - ~/Library/Application Support on macOS
 */
export const APP_DATA_PATH = path.join(app.getPath('appData'), 'Snapmail')
export const USER_DATA_PATH = path.join(APP_DATA_PATH, 'users');


/**
 * in production must point to unpacked versions, not in an asar archive in development
 * fall back on defaults in the electron-holochain package
 */
const fileExt = process.platform === 'win32' ? '.exe' : '';
export const BINARY_PATHS: PathOptions | undefined = app.isPackaged
  ? {
    holochainRunnerBinaryPath: path.join(__dirname, `../../app/bin/holochain-runner${fileExt}`)
  }
  : undefined;

//console.log({BINARY_PATHS})

/** Get Versions */
export const RUNNER_VERSION = getRunnerVersion(BINARY_PATHS?.holochainRunnerBinaryPath)

export const DNA_VERSION_FILENAME = "dna_version.txt";
export const MODEL_ZOME_HASH_FILEPATH = 'bin/snapmail_zome_hash.txt';

/** WEB FILES PATH */
export const BACKGROUND_COLOR = '#fbf9f7'
export const ICON_FILEPATH = path.join(CURRENT_DIR, "/web/icon.png")
export const LINUX_ICON_FILE = path.join(__dirname, '../web/icon.png')
export const SPLASH_FILE = path.join(__dirname, '../web/splashscreen.html')
export const MAIN_FILE = path.join(__dirname, '../web/index.html')
/** HTML PAGES URLS */
export const NETWORK_URL = 'file://' + CURRENT_DIR + '/'+ DIST_DIR +'/networking.html';
export const ERROR_URL = 'file://' + CURRENT_DIR + '/'+ DIST_DIR +'/error.html';
/** Shameful */


/** */
export async function getIndexUrl(): Promise<string> {
  return 'file://' + CURRENT_DIR + '/'+ DIST_DIR +'/index.html?ADMIN='+ await getAdminPort() +'&APP=';
}



/** */
let g_adminPort = null;
export async function getAdminPort(): Promise<number> {
  if (g_adminPort === null) {
    g_adminPort = await getPortFree();
  }
  return g_adminPort;
}


import net, {AddressInfo} from "net"
import {HAPP_BUILD_MODE, HappBuildModeType} from "@ddd-qc/lit-happ";

async function getPortFree() {
  return new Promise( res => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = (srv.address() as AddressInfo).port;
      srv.close((err) => res(port))
    });
  })
}
