/*
import * as path from 'path'
import fs = require('fs');
import { log } from './logger';
import { app, dialog } from 'electron';
import { RUNNING_ZOME_HASH_FILEPATH, DNA_VERSION_FILENAME } from './constants';

/!** *!/
export function fatalError(message:string, error: any | undefined) {
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


/!** *!/
export function setupStorage(storagePath: string, runningDnaHash: string): void {
  const dna_version_txt = path.join(storagePath, DNA_VERSION_FILENAME);
  /!** Create storage and setup if none found *!/
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
  /!** Make sure its a compatible version *!/
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
        fs.rmdirSync(storagePath, {/!*force: true,*!/ recursive: true});
        setupStorage(storagePath, runningDnaHash);
      } catch(e) {
        fatalError('Failed erasing current stored data', e);
      }
    }
  }
}


/!** *!/
export function loadUidList(filePath: string): string[] {
  let uidList = [];
  try {
    /!** -- APP config -- *!/
    log('info', 'Reading file ' + filePath);
    const uidListString = fs.readFileSync(filePath).toString();
    uidList = uidListString.replace(/\r\n/g,'\n').split('\n');
    uidList = uidList.filter(function (el) {return el != '';});
    log('info', {uidList});
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


/!**
 * @returns dnaHash
 *!/
export function loadRunningZomeHash(): string {
  if(fs.existsSync(RUNNING_ZOME_HASH_FILEPATH)) {
    return fs.readFileSync(RUNNING_ZOME_HASH_FILEPATH, 'utf-8');
  }
  if(fs.existsSync('resources/app/' + RUNNING_ZOME_HASH_FILEPATH)) {
    return fs.readFileSync('resources/app/' + RUNNING_ZOME_HASH_FILEPATH, 'utf-8');
  }
  if(fs.existsSync(app.getAppPath() + '/' + RUNNING_ZOME_HASH_FILEPATH)) {
    return fs.readFileSync(app.getAppPath() + '/' + RUNNING_ZOME_HASH_FILEPATH, 'utf-8');
  }
  fatalError("Corrupt installation. Missing zome hash file.", undefined);
}


/!**
 * Return true if user wants to erase stored data
 *!/
export function promptVersionMismatch(message: string): boolean {
  const result = dialog.showMessageBoxSync({
    /!*width: 900,*!/
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
*/
