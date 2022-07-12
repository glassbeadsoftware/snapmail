import * as path from 'path'
import fs from "fs";
import {log} from "./logger";
import {NETWORK_SETTINGS_FILENAME} from "./constants";


/** */
export interface NetworkSettings {
  proxyUrl: string,
  bootstrapUrl: string,
  canMdns: boolean,
  canProxy: boolean,
}


/** */
export function loadNetworkConfig(sessionDataPath): NetworkSettings | undefined  {
  let settings = undefined;
  let configFilePath = path.join(sessionDataPath, NETWORK_SETTINGS_FILENAME);
  try {
    settings = JSON.parse(fs.readFileSync(configFilePath).toString());
  } catch(error) {
    log("warn", "Network config file not found ; " + configFilePath)
    return undefined;
  }
  return settings;
}


/** */
export function saveNetworkConfig(sessionDataPath: string, networkSettings: NetworkSettings, ): boolean {

  let filepath = path.join(sessionDataPath, NETWORK_SETTINGS_FILENAME);
  try {
    fs.writeFileSync(filepath, JSON.stringify(networkSettings));
  } catch (err) {
    log('error','Writing to file failed: ' + err);
    return false;
  }
  return true;
}
