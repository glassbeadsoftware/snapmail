"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDnaVersion = exports.createHolochainOptions = exports.stateSignalToText = exports.StateSignalText = void 0;
const tslib_1 = require("tslib");
const path = tslib_1.__importStar(require("path"));
const electron_1 = require("electron");
const electron_holochain_1 = require("@lightningrodlabs/electron-holochain");
const constants_1 = require("./constants");
const fs_1 = tslib_1.__importDefault(require("fs"));
const logger_1 = require("./logger");
/** Messages displayed on the splashscreen */
var StateSignalText;
(function (StateSignalText) {
    StateSignalText["IsFirstRun"] = "Welcome to Snapmail...";
    StateSignalText["IsNotFirstRun"] = "Loading...";
    StateSignalText["CreatingKeys"] = "Creating cryptographic keys...";
    StateSignalText["RegisteringDna"] = "Registering Profiles DNA to Holochain...";
    StateSignalText["InstallingApp"] = "Installing DNA bundle to Holochain...";
    StateSignalText["EnablingApp"] = "Enabling DNA...";
    StateSignalText["AddingAppInterface"] = "Attaching API network port...";
    StateSignalText["UnknownState"] = "Application is in an unknown state...";
})(StateSignalText = exports.StateSignalText || (exports.StateSignalText = {}));
/** */
function stateSignalToText(state) {
    switch (state) {
        case electron_holochain_1.StateSignal.IsFirstRun:
            return StateSignalText.IsFirstRun;
        case electron_holochain_1.StateSignal.IsNotFirstRun:
            return StateSignalText.IsNotFirstRun;
        case electron_holochain_1.StateSignal.CreatingKeys:
            return StateSignalText.CreatingKeys;
        case electron_holochain_1.StateSignal.RegisteringDna:
            return StateSignalText.RegisteringDna;
        case electron_holochain_1.StateSignal.InstallingApp:
            return StateSignalText.InstallingApp;
        case electron_holochain_1.StateSignal.EnablingApp:
            return StateSignalText.EnablingApp;
        case electron_holochain_1.StateSignal.AddingAppInterface:
            return StateSignalText.AddingAppInterface;
    }
    logger_1.log('error', 'Unknown state: ' + JSON.stringify(state));
    return StateSignalText.UnknownState;
}
exports.stateSignalToText = stateSignalToText;
/** */
function createHolochainOptions(uid, storagePath, networkSettings) {
    const keystorePath = path.join(storagePath, 'keystore-' + electron_1.app.getVersion());
    const datastorePath = path.join(storagePath, 'databases-' + electron_1.app.getVersion());
    console.log('info', { __dirname });
    //const startPath = path.join(__dirname, '..')
    //const keystorePath = path.join(path.join(startPath, uid), 'keystore-' + app.getVersion())
    //const datastorePath =  path.join(path.join(startPath, uid), 'databases-' + app.getVersion())
    const backslash = "\u005C";
    const options = {
        happPath: constants_1.DNA_PATH,
        datastorePath,
        keystorePath,
        //happPath: "C:\\github\\snapmail\\electron\\bin\\snapmail.happ\\",
        //happPath: "snapmail.happ",
        //happPath: DNA_PATH.replace(/\\/g, "/").replace(/:/g, ""),
        //datastorePath: "c/Users/damien/AppData/Roaming/Snapmail/users/default/toto/databases-0.1.9/",
        //keystorePath: "c/Users/damien/AppData/Roaming/Snapmail/users/default/toto/keystore-0.1.9/",
        //datastorePath: datastorePath.replace(/\\/g, "\\"),
        //keystorePath: keystorePath.replace(/\\/g, "\\"),
        //datastorePath: datastorePath.replace(/\\/g, "/"),//.replace(/:/g, ""),
        //keystorePath: keystorePath.replace(/\\/g, "/"),//.replace(/:/g, ""),
        appId: constants_1.SNAPMAIL_APP_ID + '-' + uid,
        //appId: MAIN_APP_ID,
        appWsPort: 0,
        adminWsPort: 1235,
        proxyUrl: networkSettings.proxyUrl,
        bootstrapUrl: networkSettings.canProxy ? networkSettings.bootstrapUrl : '',
        passphrase: "test-passphrase",
    };
    //console.log('info', {keystorePath: options.keystorePath});
    return options;
}
exports.createHolochainOptions = createHolochainOptions;
/** */
function loadDnaVersion(sessionDataPath) {
    let dnaVersion = undefined;
    //const configFilePath = path.join(sessionDataPath, '../');
    const configFilePath = path.join(sessionDataPath, constants_1.DNA_VERSION_FILENAME);
    try {
        dnaVersion = fs_1.default.readFileSync(configFilePath).toString();
    }
    catch (error) {
        logger_1.log("warn", "File not found ; " + configFilePath);
        return undefined;
    }
    return dnaVersion;
}
exports.loadDnaVersion = loadDnaVersion;
//# sourceMappingURL=holochain.js.map