"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.electronLogger = void 0;
exports.electronLogger = require('electron-log');
const { IS_DEBUG } = require('./constants');
function log(level, message) {
    exports.electronLogger[level](message);
}
exports.log = log;
//module.exports.log = log;
module.exports.logger = exports.electronLogger;
/**  SET UP LOGGING */
exports.electronLogger.transports.console.format = '[{h}:{i}:{s}][{level}] {text}';
exports.electronLogger.transports.file.format = '[{h}:{i}:{s}][{level}] {text}';
//electronLogger.info('%cRed text. %cGreen text', 'color: red', 'color: green')
log('info', "");
log('info', "");
log('info', "APP STARTED");
log('info', "");
if (IS_DEBUG) {
    exports.electronLogger.transports.file.level = 'error'; // minimize disk writes ; Use console instead
    exports.electronLogger.transports.console.level = 'debug';
    log('debug', "DEBUG MODE ENABLED\n");
    // require('electron-debug')({ isEnabled: true });
}
else {
    //log('info', "DEBUG MODE DISABLED");
    exports.electronLogger.transports.console.level = 'info';
    exports.electronLogger.transports.file.level = 'info';
}
//# sourceMappingURL=logger.js.map