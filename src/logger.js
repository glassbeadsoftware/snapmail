const electronLogger = require('electron-log');

// - SET UP LOGGING

electronLogger.transports.console.format = '[{h}:{i}:{s}] {text}';
electronLogger.transports.file.format = '[{h}:{i}:{s}] {text}';
//electronLogger.info('%cRed text. %cGreen text', 'color: red', 'color: green')

function log(level, message) {
  electronLogger[level](message);
}
module.exports.log = log;
module.exports.logger = electronLogger;
