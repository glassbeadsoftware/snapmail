const path = require('path');
const { app } = require('electron');

const SNAPMAIL_APP_ID = 'snapmail-app'; // MUST MATCH SNAPMAIL_UI config
const CONFIG_PATH = path.join(app.getPath('appData'), 'Snapmail');
const STORAGE_PATH = path.join(CONFIG_PATH, 'storage');
const CONDUCTOR_CONFIG_FILENAME = 'conductor-config.yaml';
const APP_CONFIG_FILENAME = 'app-config.txt';
const DEFAULT_BOOTSTRAP_URL = 'https://bootstrap-staging.holo.host';
const CURRENT_DIR = path.join(__dirname, '..');
const DNA_HASH_FILEPATH = 'dna/dna_hash.txt';
const DEFAULT_PROXY_URL ='kitsune-proxy://SYVd4CF3BdJ4DS7KwLLgeU3_DbHoZ34Y-qroZ79DOs8/kitsune-quic/h/165.22.32.11/p/5779/--'
//kitsune-proxy://VYgwCrh2ZCKL1lpnMM1VVUee7ks-9BkmW47C_ys4nqg/kitsune-quic/h/kitsune-proxy.harris-braun.com/p/4010/--';

const HOLOCHAIN_BIN_NAME = 'snapmail-holochain';
const LAIR_KEYSTORE_BIN_NAME  = 'snapmail-lair-keystore';
const BIN_PATH = process.platform === "win32"? '' : './bin/';
const FILE_EXT = process.platform === "win32"? '.exe' : ''

const HOLOCHAIN_BIN = BIN_PATH + HOLOCHAIN_BIN_NAME + FILE_EXT
const LAIR_KEYSTORE_BIN = BIN_PATH + LAIR_KEYSTORE_BIN_NAME + FILE_EXT


// Toggle this for debug / release mode
const IS_DEBUG = process.env.APP_DEV ? (process.env.APP_DEV.trim() === 'true') : false;

module.exports.IS_DEBUG = IS_DEBUG;
module.exports.LAIR_KEYSTORE_BIN = LAIR_KEYSTORE_BIN;
module.exports.HOLOCHAIN_BIN = HOLOCHAIN_BIN;
module.exports.DEFAULT_PROXY_URL = DEFAULT_PROXY_URL;
module.exports.SNAPMAIL_APP_ID = SNAPMAIL_APP_ID;
module.exports.DNA_HASH_FILEPATH = DNA_HASH_FILEPATH;
module.exports.CURRENT_DIR = CURRENT_DIR;
module.exports.DEFAULT_BOOTSTRAP_URL = DEFAULT_BOOTSTRAP_URL;
module.exports.CONFIG_PATH = CONFIG_PATH;
module.exports.STORAGE_PATH = STORAGE_PATH;
module.exports.CONDUCTOR_CONFIG_FILENAME = CONDUCTOR_CONFIG_FILENAME;
module.exports.APP_CONFIG_FILENAME = APP_CONFIG_FILENAME;
