import * as fs from "fs";
import * as path from "path";
import {app, dialog} from "electron";

import {log} from "./logger";
import {MODEL_ZOME_HASH_FILEPATH} from "./constants";


/** Prompt fatal error message */
function fatalError(message: string, error?: any) {
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


/** */
export function initApp(
  userDataPath: string,
  appDataPath: string,
  dnaVersionFilename: string,
  uidListFilename: string,
  ) {
  /** Read snapmail_zome_hash.txt in app folder */
  const modelZomeHash = loadModelZomeHash();
  log('info', "MODEL ZOME HASH: " + modelZomeHash);

  /** --  Create missing dirs -- **/
  try {
    if (!fs.existsSync(appDataPath)) {
      log('info', "Creating missing dir: " + appDataPath);
      fs.mkdirSync(appDataPath)
    }
    if (!fs.existsSync(userDataPath)) {
      log('info', "Creating missing dir: " + userDataPath);
      fs.mkdirSync(userDataPath)
    }
  } catch (e) {
    fatalError("Failed to create data folders on disk", e)
  }

  /** -- Determine Session ID -- **/
  let sessionId;
  if (process.argv.length > 2) {
    sessionId = process.argv[2];
  } else {
    sessionId = 'default';
  }

  /** -- Setup storage folder -- **/
  const sessionDataPath = path.join(userDataPath, sessionId);
  log('info', {sessionDataPath});
  setupSessionStorage(sessionDataPath, modelZomeHash, dnaVersionFilename)

  /** -- UID List -- **/
  let uidList: string[] = []
  try {
    const uidListPath = path.join(sessionDataPath, uidListFilename);
    log('debug', 'Reading file ' + uidListPath);
    const uidListStr = fs.readFileSync(uidListPath).toString();
    uidList = uidListStr.replace(/\r\n/g,'\n').split('\n');
    uidList = uidList.filter(function (el) {return el !== '';});
    log('debug', {uidList});
  } catch(err) {
    if(err.code === 'ENOENT') {
      log('warn', 'File not found: ' + err);
    } else {
      log('warn','Loading config file failed: ' + err);
    }
    log('warn','continuing...');
  }
  // if (uidList.length == 0) {
  //   uidList.push(INITIAL_UID)
  // }

  //// -- Determine final conductor config file path -- //
  //g_configPath = path.join(g_storagePath, CONDUCTOR_CONFIG_FILENAME);
  //log('debug', {g_configPath});
  //let g_appConfigPath = path.join(g_storagePath, APP_CONFIG_FILENAME);

  /** Done */
  return {sessionDataPath, uidList}
}


/** */
function setupSessionStorage(sessionPath: string, modelZomeHash: string, dnaVersionFilename: string) {
  const dna_version_txt = path.join(sessionPath, dnaVersionFilename);
  /** Create storage and setup if none found */
  if (!fs.existsSync(sessionPath)) {
    log('info', "Creating missing dir: " + sessionPath);
    try {
      fs.mkdirSync(sessionPath)
      fs.writeFileSync(dna_version_txt, modelZomeHash, 'utf-8');
      log('info', 'dna_version written to disk: ' + modelZomeHash)
    } catch(e) {
      fatalError("Failed to setup storage folder on disk", e)
    }
  } else {
    /** Make sure it's a compatible version */
    let storedDnaHash = '<not found>';
    try {
      log('debug', 'Reading: ' + dna_version_txt);
      storedDnaHash = fs.readFileSync(dna_version_txt, 'utf-8');
    } catch (e) {
      log('error', 'Failed to read the dna_version_txt file !');
      log('error', e);
    }
    if (storedDnaHash !== modelZomeHash) {
      const msg = "The data found on disk is for a different version of Snapmails's data model:\n" +
        '    Stored version: ' + storedDnaHash + '\n' +
        "This app's version: " + modelZomeHash;
      log('error', msg);
      const canErase = promptVersionMismatch(msg);
      if (canErase) {
        try {
          fs.rmdirSync(sessionPath, {recursive: true});
          /* Start over */
          setupSessionStorage(sessionPath, modelZomeHash, dnaVersionFilename);
        } catch (e) {
          fatalError('Failed erasing current stored data', e);
        }
      }
    }
  }
}


/** */
export function addUidToDisk(newUid: string, sessionDataPath: string, uidListFilename: string,): boolean {
  //log('info','addUidToDisk(): ' + newUid);
  //log('info','addUidToDisk() sessionDataPath = ' + sessionDataPath);
  const uidListPath = path.join(sessionDataPath, uidListFilename);
  try {
    fs.appendFileSync(uidListPath, newUid + '\n');
  } catch (err) {
    log('error','Writing to file failed: ' + err);
    return false;
  }
  return true;
}


/** */
function loadModelZomeHash() {
  log('info', 'loadRunningZomeHash: ' + MODEL_ZOME_HASH_FILEPATH)
  if(fs.existsSync(MODEL_ZOME_HASH_FILEPATH)) {
    return fs.readFileSync(MODEL_ZOME_HASH_FILEPATH, 'utf-8');
  }
  if(fs.existsSync('resources/app/' + MODEL_ZOME_HASH_FILEPATH)) {
    return fs.readFileSync('resources/app/' + MODEL_ZOME_HASH_FILEPATH, 'utf-8');
  }
  if(fs.existsSync(app.getAppPath() + '/' + MODEL_ZOME_HASH_FILEPATH)) {
    return fs.readFileSync(app.getAppPath() + '/' + MODEL_ZOME_HASH_FILEPATH, 'utf-8');
  }
  fatalError("Corrupt installation. Missing zome hash file.");
}


/** Return true if user wants to erase stored data */
function promptVersionMismatch(message: string) {
  const result = dialog.showMessageBoxSync({
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
