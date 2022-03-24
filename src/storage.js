const path = require('path');
const fs = require('fs');
const { log } = require('./logger');
const { app, dialog } = require('electron');
const { RUNNING_ZOME_HASH_FILEPATH, DNA_VERSION_FILENAME } = require('./constants');

/**
 *
 */
function fatalError(message, error) {
  log('error', message);
  log('error', error);
  dialog.showMessageBoxSync({
    title: 'Snapmail: Fatal error',
    buttons: ['exit'],
    type: 'error',
    message,
    detail: JSON.stringify(error),
  });
  process.abort();
}


/**
 *
 */
function setupStorage(storagePath, runningDnaHash) {
  const dna_version_txt = path.join(storagePath, DNA_VERSION_FILENAME);
  /** Create storage and setup if none found */
  if(!fs.existsSync(storagePath)) {
    log('info', "Creating missing dir: " + storagePath);
    try {
      fs.mkdirSync(storagePath);
      fs.writeFileSync(dna_version_txt, runningDnaHash, 'utf-8');
    } catch(e) {
      fatalError('Failed to setup storage folder on disk', e);
    }
    return;
  }
  /** Make sure its a compatible version */
  let storedDnaHash = '<not found>';
  try {
    log('debug', 'Reading: ' + dna_version_txt);
    storedDnaHash = fs.readFileSync(dna_version_txt, 'utf-8');
  } catch(e) {
    log('error', 'Failed to read the dna_version_txt file !');
    log('error', e);
  }
  if(storedDnaHash !== runningDnaHash) {
    const msg = "The data found on disk is for a different version of Snapmail's core:\n" +
      '  Stored data version: ' + storedDnaHash + '\n' +
      'This running version: ' + runningDnaHash;
    log('error', msg);
    const canErase = promptVersionMismatch(msg);
    if (canErase) {
      try {
        fs.rmdirSync(storagePath, {force: true, recursive: true});
        setupStorage(storagePath, runningDnaHash);
      } catch(e) {
        fatalError('Failed erasing current stored data', e);
      }
    }
  }
}
module.exports.setupStorage = setupStorage;


/**
 *
 */
function loadAppConfig(appConfigFilePath) {
  let uidList;
  try {
    /** -- APP config -- */
    log('debug', 'Reading file ' + appConfigFilePath);
    const appConfigString = fs.readFileSync(appConfigFilePath).toString();
    uidList = appConfigString.replace(/\r\n/g,'\n').split('\n');
    uidList = g_uidList.filter(function (el) {return el !== '';});
    log('debug', {uidList});
  } catch(err) {
    if(err.code === 'ENOENT') {
      log('warn', 'File not found: ' + err);
    } else {
      log('warn','Loading config file failed: ' + err);
    }
    log('warn','continuing...');
  }
  return uidList;
}
module.exports.loadAppConfig = loadAppConfig;


/**
 * @returns dnaHash
 */
function loadRunningZomeHash() {
  if(fs.existsSync(RUNNING_ZOME_HASH_FILEPATH)) {
    return fs.readFileSync(RUNNING_ZOME_HASH_FILEPATH, 'utf-8');
  }
  if(fs.existsSync('resources/app/' + RUNNING_ZOME_HASH_FILEPATH)) {
    return fs.readFileSync('resources/app/' + RUNNING_ZOME_HASH_FILEPATH, 'utf-8');
  }
  if(fs.existsSync(app.getAppPath() + '/' + RUNNING_ZOME_HASH_FILEPATH)) {
    return fs.readFileSync(app.getAppPath() + '/' + RUNNING_ZOME_HASH_FILEPATH, 'utf-8');
  }
  fatalError("Corrupt installation. Missing zome hash file.");
}
module.exports.loadRunningZomeHash = loadRunningZomeHash;




/**
 * Return true if user wants to erase stored data
 */
function promptVersionMismatch(message) {
  const result = dialog.showMessageBoxSync({
    width: 900,
    title: `${app.getName()} - v${app.getVersion()}`,
    message: `Version mismatch`,
    detail: message,
    type: "warning",
    defaultId: 0,
    buttons: ['Erase stored data', 'Continue anyway', 'Exit'],
  });
  switch (result) {
    case 0: {
      return true;
      break;
    }
    case 1: {
      return false;
      break;
    }
    case 2: {
      app.exit();
      break;
    }
    default:
      break;
  }
  return false;
}
