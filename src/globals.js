const path = require('path');
const { app } = require('electron');

const SNAPMAIL_APP_ID = 'snapmail-app'; // MUST MATCH SNAPMAIL_UI config
const CONFIG_PATH = path.join(app.getPath('appData'), 'Snapmail');
const STORAGE_PATH = path.join(CONFIG_PATH, 'storage');
const CONDUCTOR_CONFIG_FILENAME = 'conductor-config.yaml';
const APP_CONFIG_FILENAME = 'app-config.txt';
const DEFAULT_BOOTSTRAP_URL = 'https://bootstrap-staging.holo.host';
const CURRENT_DIR = path.join(__dirname, '..');
const DNA_HASH_FILEPATH = './dna/dna_hash.txt';

// Toggle this for debug / release mode
const IS_DEBUG = process.env.APP_DEV ? (process.env.APP_DEV.trim() === 'true') : false;

module.exports.IS_DEBUG = IS_DEBUG;
module.exports.SNAPMAIL_APP_ID = SNAPMAIL_APP_ID;
module.exports.DNA_HASH_FILEPATH = DNA_HASH_FILEPATH;
module.exports.CURRENT_DIR = CURRENT_DIR;
module.exports.DEFAULT_BOOTSTRAP_URL = DEFAULT_BOOTSTRAP_URL;
module.exports.CONFIG_PATH = CONFIG_PATH;
module.exports.STORAGE_PATH = STORAGE_PATH;
module.exports.CONDUCTOR_CONFIG_FILENAME = CONDUCTOR_CONFIG_FILENAME;
module.exports.APP_CONFIG_FILENAME = APP_CONFIG_FILENAME;
