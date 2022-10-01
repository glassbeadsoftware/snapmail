"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addUidToDisk = exports.initApp = void 0;
const tslib_1 = require("tslib");
const fs = tslib_1.__importStar(require("fs"));
const path = tslib_1.__importStar(require("path"));
const electron_1 = require("electron");
const logger_1 = require("./logger");
/** Prompt fatal error message */
function fatalError(message, error) {
    logger_1.log('error', message);
    logger_1.log('error', error);
    electron_1.dialog.showMessageBoxSync({
        title: 'Snapmail: Fatal error',
        buttons: ['exit'],
        type: 'error',
        message,
        detail: JSON.stringify(error),
    });
    process.abort();
}
/** */
function initApp(userDataPath, appDataPath, dnaVersionFilename, runningZomeHashFilePath, uidListFilename) {
    /** Read zome_hash.txt in app folder */
    const runningDnaHash = loadRunningZomeHash(runningZomeHashFilePath);
    logger_1.log('info', "ZOME HASH: " + runningDnaHash);
    /** --  Create missing dirs -- **/
    try {
        if (!fs.existsSync(appDataPath)) {
            logger_1.log('info', "Creating missing dir: " + appDataPath);
            fs.mkdirSync(appDataPath);
        }
        if (!fs.existsSync(userDataPath)) {
            logger_1.log('info', "Creating missing dir: " + userDataPath);
            fs.mkdirSync(userDataPath);
        }
    }
    catch (e) {
        fatalError("Failed to create data folders on disk", e);
    }
    /** -- Determine Session ID -- **/
    let sessionId;
    if (process.argv.length > 2) {
        sessionId = process.argv[2];
    }
    else {
        sessionId = 'default';
    }
    /** -- Setup storage folder -- **/
    const sessionDataPath = path.join(userDataPath, sessionId);
    logger_1.log('info', { sessionDataPath });
    setupSessionStorage(sessionDataPath, runningDnaHash, dnaVersionFilename);
    /** -- UID List -- **/
    let uidList = [];
    try {
        const uidListPath = path.join(sessionDataPath, uidListFilename);
        logger_1.log('debug', 'Reading file ' + uidListPath);
        const uidListStr = fs.readFileSync(uidListPath).toString();
        uidList = uidListStr.replace(/\r\n/g, '\n').split('\n');
        uidList = uidList.filter(function (el) { return el !== ''; });
        logger_1.log('debug', { uidList });
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            logger_1.log('warn', 'File not found: ' + err);
        }
        else {
            logger_1.log('warn', 'Loading config file failed: ' + err);
        }
        logger_1.log('warn', 'continuing...');
    }
    // if (uidList.length == 0) {
    //   uidList.push(INITIAL_UID)
    // }
    //// -- Determine final conductor config file path -- //
    //g_configPath = path.join(g_storagePath, CONDUCTOR_CONFIG_FILENAME);
    //log('debug', {g_configPath});
    //let g_appConfigPath = path.join(g_storagePath, APP_CONFIG_FILENAME);
    /** Done */
    return { sessionDataPath, uidList };
}
exports.initApp = initApp;
/** */
function setupSessionStorage(sessionPath, dnaHash, dnaVersionFilename) {
    const dna_version_txt = path.join(sessionPath, dnaVersionFilename);
    // Create storage and setup if none found
    if (!fs.existsSync(sessionPath)) {
        logger_1.log('info', "Creating missing dir: " + sessionPath);
        try {
            fs.mkdirSync(sessionPath);
            fs.writeFileSync(dna_version_txt, dnaHash, 'utf-8');
        }
        catch (e) {
            fatalError("Failed to setup storage folder on disk", e);
        }
    }
    else {
        /** Make sure its a compatible version */
        let storedDnaHash = '<not found>';
        try {
            logger_1.log('debug', 'Reading: ' + dna_version_txt);
            storedDnaHash = fs.readFileSync(dna_version_txt, 'utf-8');
        }
        catch (e) {
            logger_1.log('error', 'Failed to read the dna_version_txt file !');
            logger_1.log('error', e);
        }
        if (storedDnaHash !== dnaHash) {
            const msg = "The data found on disk is for a different version of Snapmails's core:\n" +
                '  Stored data version: ' + storedDnaHash + '\n' +
                'This running version: ' + dnaHash;
            logger_1.log('error', msg);
            const canErase = promptVersionMismatch(msg);
            if (canErase) {
                try {
                    fs.rmdirSync(sessionPath, { recursive: true });
                    /* Start over */
                    setupSessionStorage(sessionPath, dnaHash, dnaVersionFilename);
                }
                catch (e) {
                    fatalError('Failed erasing current stored data', e);
                }
            }
        }
    }
}
/** */
function addUidToDisk(newUid, sessionDataPath, uidListFilename) {
    //log('info','addUidToDisk(): ' + newUid);
    //log('info','addUidToDisk() sessionDataPath = ' + sessionDataPath);
    const uidListPath = path.join(sessionDataPath, uidListFilename);
    try {
        fs.appendFileSync(uidListPath, newUid + '\n');
    }
    catch (err) {
        logger_1.log('error', 'Writing to file failed: ' + err);
        return false;
    }
    return true;
}
exports.addUidToDisk = addUidToDisk;
/**
 * @returns dnaHash
 */
function loadRunningZomeHash(runningZomeHashFilePath) {
    logger_1.log('debug', 'loadRunningZomeHash: ' + runningZomeHashFilePath);
    if (fs.existsSync(runningZomeHashFilePath)) {
        return fs.readFileSync(runningZomeHashFilePath, 'utf-8');
    }
    if (fs.existsSync('resources/app/' + runningZomeHashFilePath)) {
        return fs.readFileSync('resources/app/' + runningZomeHashFilePath, 'utf-8');
    }
    if (fs.existsSync(electron_1.app.getAppPath() + '/' + runningZomeHashFilePath)) {
        return fs.readFileSync(electron_1.app.getAppPath() + '/' + runningZomeHashFilePath, 'utf-8');
    }
    fatalError("Corrupt installation. Missing zome hash file.");
}
/**
 * Return true if user wants to erase stored data
 */
function promptVersionMismatch(message) {
    const result = electron_1.dialog.showMessageBoxSync({
        title: `${electron_1.app.getName()} - v${electron_1.app.getVersion()}`,
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
            electron_1.app.exit();
            break;
        }
        default:
            break;
    }
    return false;
}
//# sourceMappingURL=init.js.map