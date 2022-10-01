"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INDEX_URL = exports.ERROR_URL = exports.NETWORK_URL = exports.MAIN_FILE = exports.SPLASH_FILE = exports.LINUX_ICON_FILE = exports.ICON_FILEPATH = exports.BACKGROUND_COLOR = exports.RUNNING_ZOME_HASH_FILEPATH = exports.DNA_VERSION_FILENAME = exports.LAIR_VERSION = exports.RUNNER_VERSION = exports.BINARY_PATHS = exports.USER_DATA_PATH = exports.APP_DATA_PATH = exports.DNA_PATH = exports.FAVICON_PATH = exports.DIST_DIR = exports.CURRENT_DIR = exports.NETWORK_SETTINGS_FILENAME = exports.UID_LIST_FILENAME = exports.CONFIG_PATH = exports.DEFAULT_PROXY_URL = exports.DEFAULT_BOOTSTRAP_URL = exports.REPORT_BUG_URL = exports.SNAPMAIL_APP_ID = exports.DEVELOPMENT_UI_URL = exports.IS_DEBUG = void 0;
const tslib_1 = require("tslib");
const path = tslib_1.__importStar(require("path"));
const electron_1 = require("electron");
const electron_holochain_1 = require("@lightningrodlabs/electron-holochain");
console.log({ __dirname });
/** DEBUGGING */
exports.IS_DEBUG = process.env.DEV_MODE ? (process.env.DEV_MODE.trim() === 'dev') : false;
exports.DEVELOPMENT_UI_URL = path.join(__dirname, '../web');
/** MISC */
exports.SNAPMAIL_APP_ID = 'snapmail-app'; // MUST MATCH SNAPMAIL_UI config
/** A special log from the conductor specifying that the interfaces are ready to receive incoming connections */
//export const HC_MAGIC_READY_STRING = 'Conductor ready.';
//export const LAIR_MAGIC_READY_STRING = '#lair-keystore-ready#';
exports.REPORT_BUG_URL = `https://github.com/glassbeadsoftware/snapmail/issues/new`;
/** NETWORK */
exports.DEFAULT_BOOTSTRAP_URL = 'https://bootstrap-staging.holo.host';
exports.DEFAULT_PROXY_URL = 'kitsune-proxy://SYVd4CF3BdJ4DS7KwLLgeU3_DbHoZ34Y-qroZ79DOs8/kitsune-quic/h/165.22.32.11/p/5779/--';
//kitsune-proxy://VYgwCrh2ZCKL1lpnMM1VVUee7ks-9BkmW47C_ys4nqg/kitsune-quic/h/kitsune-proxy.harris-braun.com/p/4010/--';
/** PATHS */
exports.CONFIG_PATH = path.join(electron_1.app.getPath('appData'), 'Snapmail');
//export const STORAGE_PATH = path.join(CONFIG_PATH, 'storage');
exports.UID_LIST_FILENAME = 'uid-list.txt';
exports.NETWORK_SETTINGS_FILENAME = 'network-preferences.json';
exports.CURRENT_DIR = path.join(__dirname, '..');
//const DIST_DIR = IS_DEBUG? "ui_dbg" : "ui";
exports.DIST_DIR = "web";
exports.FAVICON_PATH = `/web/favicon.png`;
exports.DNA_PATH = electron_1.app.isPackaged
    ? path.join(electron_1.app.getAppPath(), '../app/bin/snapmail.happ')
    : path.join(electron_1.app.getAppPath(), 'bin/snapmail.happ');
// export const APP_DATA_PATH = IS_DEBUG
//   ? path.join(__dirname, '../../.dev-app-data')
//   : path.join(app.getPath('appData'), 'Snapmail')
exports.APP_DATA_PATH = path.join(electron_1.app.getPath('appData'), 'Snapmail');
exports.USER_DATA_PATH = path.join(exports.APP_DATA_PATH, 'users');
/**
 * in production must point to unpacked versions, not in an asar archive in development
 * fall back on defaults in the electron-holochain package
 */
const fileExt = process.platform === 'win32' ? '.exe' : '';
exports.BINARY_PATHS = electron_1.app.isPackaged
    ? {
        holochainRunnerBinaryPath: path.join(__dirname, `../../app/bin/holochain-runner${fileExt}`),
        lairKeystoreBinaryPath: path.join(__dirname, `../../app/bin/lair-keystore${fileExt}`),
    }
    : undefined;
//console.log({BINARY_PATHS})
/** Get Versions */
exports.RUNNER_VERSION = electron_holochain_1.getRunnerVersion(exports.BINARY_PATHS === null || exports.BINARY_PATHS === void 0 ? void 0 : exports.BINARY_PATHS.holochainRunnerBinaryPath);
exports.LAIR_VERSION = electron_holochain_1.getLairVersion(exports.BINARY_PATHS === null || exports.BINARY_PATHS === void 0 ? void 0 : exports.BINARY_PATHS.lairKeystoreBinaryPath);
exports.DNA_VERSION_FILENAME = "dna_version.txt";
exports.RUNNING_ZOME_HASH_FILEPATH = 'bin/zome_hash.txt';
// export const HOLOCHAIN_BIN_NAME = 'snapmail-holochain';
// export const LAIR_KEYSTORE_BIN_NAME  = 'snapmail-lair-keystore';
// export const BIN_PATH = process.platform === "win32"? '' : './bin/';
// export const FILE_EXT = process.platform === "win32"? '.exe' : ''
//
// export const HOLOCHAIN_BIN = BIN_PATH + HOLOCHAIN_BIN_NAME + FILE_EXT
// export const LAIR_KEYSTORE_BIN = BIN_PATH + LAIR_KEYSTORE_BIN_NAME + FILE_EXT
/** WEB FILES PATH */
exports.BACKGROUND_COLOR = '#fbf9f7';
exports.ICON_FILEPATH = path.join(exports.CURRENT_DIR, "/web/icon.png");
exports.LINUX_ICON_FILE = path.join(__dirname, '../web/icon.png');
exports.SPLASH_FILE = path.join(__dirname, '../web/splashscreen.html');
exports.MAIN_FILE = path.join(__dirname, '../web/index.html');
/** HTML PAGES URLS */
exports.NETWORK_URL = 'file://' + exports.CURRENT_DIR + '/' + exports.DIST_DIR + '/networking.html';
exports.ERROR_URL = 'file://' + exports.CURRENT_DIR + '/' + exports.DIST_DIR + '/error.html';
exports.INDEX_URL = 'file://' + exports.CURRENT_DIR + '/' + exports.DIST_DIR + '/index.html?APP=';
//# sourceMappingURL=constants.js.map