"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveNetworkConfig = exports.loadNetworkConfig = void 0;
const tslib_1 = require("tslib");
const path = tslib_1.__importStar(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const logger_1 = require("./logger");
const constants_1 = require("./constants");
/** */
function loadNetworkConfig(sessionDataPath) {
    let settings = undefined;
    const configFilePath = path.join(sessionDataPath, constants_1.NETWORK_SETTINGS_FILENAME);
    try {
        settings = JSON.parse(fs_1.default.readFileSync(configFilePath).toString());
    }
    catch (error) {
        logger_1.log("warn", "Network config file not found ; " + configFilePath);
        return undefined;
    }
    return settings;
}
exports.loadNetworkConfig = loadNetworkConfig;
/** */
function saveNetworkConfig(sessionDataPath, networkSettings) {
    const filepath = path.join(sessionDataPath, constants_1.NETWORK_SETTINGS_FILENAME);
    try {
        fs_1.default.writeFileSync(filepath, JSON.stringify(networkSettings));
    }
    catch (err) {
        logger_1.log('error', 'Writing to file failed: ' + err);
        return false;
    }
    return true;
}
exports.saveNetworkConfig = saveNetworkConfig;
//# sourceMappingURL=networkSettings.js.map