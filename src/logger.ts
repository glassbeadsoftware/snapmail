import electronLogger from 'electron-log';
import {IS_DEBUG} from './constants';

export function log(level, message) {
  electronLogger[level](message);
}


/** -- SET UP LOGGING -- */

electronLogger.transports.console.format = '[{h}:{i}:{s}][{level}] {text}';
electronLogger.transports.file.format = '[{h}:{i}:{s}][{level}] {text}';
//electronLogger.info('%cRed text. %cGreen text', 'color: red', 'color: green')

export const logger = electronLogger;

log('info', "");
log('info', "");
log('info', "APP STARTED");
log('info', "");

if (IS_DEBUG) {
  electronLogger.transports.file.level = 'error';
  log('info', "DEBUG MODE ENABLED");
  // require('electron-debug')({ isEnabled: true });
} else {
  electronLogger.transports.console.level = 'info';
  electronLogger.transports.file.level = 'info';
}
