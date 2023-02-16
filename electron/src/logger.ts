import * as electronLogger from "electron-log";
import {IS_DEV} from "./constants";

export function log(level:any, message:any) {
  electronLogger[level](message);
}
//module.exports.log = log;
module.exports.logger = electronLogger;


/**  SET UP LOGGING */

electronLogger.transports.console.format = '[{h}:{i}:{s}][{level}] {text}';
electronLogger.transports.file.format = '[{h}:{i}:{s}][{level}] {text}';
//electronLogger.info('%cRed text. %cGreen text', 'color: red', 'color: green')

log('info', "");
log('info', "");
log('info', "APP STARTED");
log('info', "");

if (IS_DEV) {
  electronLogger.transports.file.level = 'error'; // minimize disk writes ; Use console instead
  electronLogger.transports.console.level = 'debug';
  log('debug', "DEBUG MODE ENABLED\n");
} else {
  //log('info', "DEBUG MODE DISABLED");
  electronLogger.transports.console.level = 'info';
  electronLogger.transports.file.level = 'info';
}
