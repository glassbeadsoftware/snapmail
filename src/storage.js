const path = require('path');
const fs = require('fs');
const { log } = require('./logger');
const { app, dialog } = require('electron');
const { RUNNING_DNA_HASH_FILEPATH } = require('./constants');


/**
 *
 */
function setupStorage(storagePath) {
  const version_txt = path.join(storagePath, "dna_version.txt");
// Create storage and setup if none found
  if(!fs.existsSync(storagePath)) {
    log('info', "Creating missing dir: " + storagePath);
    fs.mkdirSync(storagePath)
    //let appVersion = require("electron").remote.app.getVersion();
    try {
      fs.writeFileSync(version_txt, app.getVersion(), 'utf-8');
    } catch(e) {
      //showErrorDialog('Failed to save the version_txt file !');
      log('error', 'Failed to save the version_txt file !')
      process.abort();
    }
    return;
  }
  // Make sure its a compatible version
  try {
    log('debug', 'Reading: ' + version_txt);
    const read_version = fs.readFileSync(version_txt, 'utf-8');
    if(read_version !== app.getVersion()) {
      // FIXME Check only DNA versions
      const msg = 'The data found on disk is for a different version of Snapmail:\n' +
        '   Stored data version: ' + read_version + '\n' +
        'This running version: ' + app.getVersion();
      log('error', msg)
      const canErase = promptVersionMismatch(msg)
      if (canErase) {
        fs.rmdirSync(storagePath, {force: true, recursive: true})
        setupStorage(storagePath)
      }
    }
  } catch(e) {
    //showErrorDialog('Failed to read the version_txt file !');
    //app.quit();
    log('error', 'Failed to read the version_txt file !')
    log('error', e);
    process.abort();
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
      log('error', 'File not found: ' + err);
    } else {
      log('error','Loading config file failed: ' + err);
    }
    log('error','continuing...');
  }
  return uidList;
}
module.exports.loadAppConfig = loadAppConfig;


/**
 * @returns dnaHash
 */
function loadRunningOriginalDnaHash() {
  if(fs.existsSync(RUNNING_DNA_HASH_FILEPATH)) {
    return fs.readFileSync(RUNNING_DNA_HASH_FILEPATH, 'utf-8');
  }
  if(fs.existsSync('resources/app/' + RUNNING_DNA_HASH_FILEPATH)) {
    return fs.readFileSync('resources/app/' + RUNNING_DNA_HASH_FILEPATH, 'utf-8');
  }
  if(fs.existsSync(app.getAppPath() + '/' + RUNNING_DNA_HASH_FILEPATH)) {
    return fs.readFileSync(app.getAppPath() + '/' + RUNNING_DNA_HASH_FILEPATH, 'utf-8');
  }
  return '<unknown>';
}
module.exports.loadRunningOriginalDnaHash = loadRunningOriginalDnaHash;




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
