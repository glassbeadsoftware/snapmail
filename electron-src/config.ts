import fs from 'fs';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { bytesToBase64 } from 'byte-base64';
//import { AdminWebsocket, AppWebsocket, AppStatusFilter } from '@holochain/client';
//const { AdminWebsocket, AppWebsocket } = require('../holochain-conductor-api');

import { log } from './logger';
import { CURRENT_DIR, SNAPMAIL_APP_ID, DEFAULT_BOOTSTRAP_URL, DEFAULT_PROXY_URL } from './constants';
import  path from "path";
import {NetworkSettings} from "./types";


/** Convert holo hash to readable string */
export function htos(u8array: number[] | Uint8Array): string {
  return bytesToBase64(u8array)
}

//
// /** Spawn 'lair-keystore' process */
// export async function spawnKeystore(keystore_bin, storagePath: string): Promise<ChildProcessWithoutNullStreams> {
//   /** Spawn Keystore */
//   const bin = keystore_bin;
//   const lair_dir = winPath(path.join(storagePath, "keystore"))
//   const args = ['-d', lair_dir];
//   log('info', 'Spawning ' + bin + ' (dirname: ' + CURRENT_DIR + ') | spawnKeystore()');
//   const keystore_proc = spawn(bin, args, {
//     cwd: CURRENT_DIR,
//     detached: false,
//     //stdio: 'pipe',
//     env: {
//       ...process.env,
//     },
//   });
//   /** Handle Outputs */
//   /** Wait for holochain to boot up */
//   const promise: Promise<void> = new Promise((resolve, reject) => {
//     keystore_proc.stdout.on('data', (data) => {
//       log('info', 'lair-keystore: ' + data.toString());
//       if(data.toString().indexOf(LAIR_MAGIC_READY_STRING) > -1) {
//         resolve();
//       }
//     });
//     keystore_proc.stderr.on('data', (data) => {
//       log('error', 'lair-keystore> ' + data.toString())
//     });
//     /** Handle Termination */
//     keystore_proc.on('exit', (code) => {
//        log('info', code);
//       reject();
//       // TODO: Figure out if must kill app if keystore crashes
//       // kill(holochain_handle.pid, function (err) {
//       //   if (!err) {
//       //     log('info', 'killed all holochain sub processes');
//       //   } else {
//       //     log('error', err);
//       //   }
//       // });
//       // quit = true;
//       // app.quit();
//     });
//   });
//   await promise;
//   /** Done */
//   return keystore_proc;
// }


/** Sanitize path for Windows */
export function winPath(path) {
  if (process.platform !== "win32") {
    return path;
  }
  return path.replace(/\\/g, "\\\\");
}

//
// /**
//  * Write the conductor config to storage path
//  * Using proxy and bootstrap server
//  */
// export function generateConductorConfig(
//   configPath: string,
//   storagePath: string,
//   adminPort: number,
//   networkSettings: NetworkSettings): void
// {
//   log('info', 'generateConductorConfig() with admin port ' + adminPort);
//
//   if (networkSettings.proxyUrl === undefined || networkSettings.proxyUrl === '') {
//     networkSettings.proxyUrl = DEFAULT_PROXY_URL;
//   }
//   let network_type = "quic_bootstrap";
//   if (networkSettings.canMdns) {
//     network_type = "quic_mdns";
//   }
//   if (networkSettings.bootstrapUrl === undefined) {
//     networkSettings.bootstrapUrl = DEFAULT_BOOTSTRAP_URL;
//   }
//   const environmentPath = winPath(storagePath);
//   log('debug',{environmentPath});
//   const keystorePath = winPath(path.join(environmentPath, "keystore"))
//   log('debug',{keystorePath});
//
//   let config;
//   if (networkSettings.canProxy) {
//     /** Basic Config with Proxy */
//     config = `---
// environment_path: ${environmentPath}
// keystore:
//   type: lair_server_legacy_deprecated
//   keystore_path: "${keystorePath}"
//   danger_passphrase_insecure_from_config: default-insecure-passphrase
// dpki: ~
// admin_interfaces:
//   - driver:
//       type: websocket
//       port: ${adminPort}
// db_sync_level: Normal
// network:
//   network_type: ${network_type}
//   bootstrap_service: ${networkSettings.bootstrapUrl}
//   transport_pool:
//     - type: proxy
//       sub_transport:
//         type: quic
//         bind_to: kitsune-quic://0.0.0.0:0
//         override_host: ~
//         override_port: ~
//       proxy_config:
//         type: remote_proxy_client
//         proxy_url: ${networkSettings.proxyUrl}
//         `;
// } else {
//     /** No PROXY Config */
//     config =`---
// environment_path: "${environmentPath}"
// keystore:
//   type: lair_server_legacy_deprecated
//   keystore_path: "${keystorePath}"
//   danger_passphrase_insecure_from_config: default-insecure-passphrase
// dpki: ~
// admin_interfaces:
//   - driver:
//       type: websocket
//       port: ${adminPort}
// db_sync_level: Normal
// network:
//   network_type: ${network_type}
//   bootstrap_service: ${networkSettings.bootstrapUrl}
//   transport_pool:
//     - type: quic
//       bind_to: ~
//       override_host: ~
//       override_port: ~
//       `;
//   }
//
//   fs.writeFileSync(configPath, config);
// }

//
// /**
//  *
//  * @returns {{networkSettings: {bootstrapUrl: string, proxyUrl: string, canProxy: boolean, canMdns: boolean}, adminPort: number}}
//  */
// export function loadConductorConfig(conductorConfigFilePath) {
//   let canMdns;
//   let canProxy = true;
//   let bootstrapUrl;
//   let proxyUrl;
//   let adminPort = 0;
//   try {
//     /** -- Conductor Config -- */
//     const conductorConfigBuffer = fs.readFileSync(conductorConfigFilePath);
//     const conductorConfig = conductorConfigBuffer.toString();
//     // log('debug', {conductorConfig})
//     /** Get Admin PORT */
//     let regex = /port: (.*)$/gm;
//     let match = regex.exec(conductorConfig);
//     // log('silly', {match});
//     adminPort = parseInt(match[1]);
//     /** Get network type */
//     regex = /network_type: (.*)$/gm;
//     match = regex.exec(conductorConfig);
//     canMdns = match[1] == 'quic_mdns';
//     /** Get bootstrap server URL */
//     regex = /bootstrap_service: (.*)$/gm;
//     match = regex.exec(conductorConfig);
//     // log('silly', {match});
//     bootstrapUrl = match[1];
//     /** Get proxy server URL */
//     try {
//       regex = /proxy_url: (.*)$/gm;
//       match = regex.exec(conductorConfig);
//       proxyUrl = match[1];
//       canProxy = true;
//       log('debug',{ proxyUrl });
//     } catch(err) {
//       log('info', 'No proxy URL found in config. Using default proxy.');
//       proxyUrl = DEFAULT_PROXY_URL;
//     }
//   } catch(err) {
//     if(err.code === 'ENOENT') {
//       log('error', 'File not found: ' + err);
//     } else {
//       log('error','Loading config file failed: ' + err);
//     }
//     log('error','continuing...');
//   }
//
//   const networkSettings = {
//     canMdns, bootstrapUrl, canProxy, proxyUrl
//   };
//   return {
//     networkSettings,
//     adminPort
//   };
// }

// async function isAppInstalled(appPort) {
//   const adminWs = await AdminWebsocket.connect(`ws://localhost:${adminPort}`);
//   log('info', 'Connected to admin at ' + adminPort);
//   const dnas = await adminWs.listDnas();
//   log('info', 'Found ' + dnas.length + ' dnas');
// }

//
// /** */
// export async function connectToAdmin(adminPort: number): Promise<AdminWebsocket> {
//   log('info','Connecting to admin at ' + adminPort + ' ...');
//   let adminWs = undefined
//   //try {
//     adminWs = await AdminWebsocket.connect(`ws://localhost:${ adminPort }`, 60 * 1000);
//     //log('debug',{adminWs});
//     log('info', 'Connected to admin at ' + adminPort + ' !');
//   //} catch (e) {
//   //  log('error', 'Failed to to connect to admin at ' + adminPort + ': ' + e);
//   //}
//   return adminWs;
// }
//
//
// /** */
// export async function connectToApp(appPort: string): Promise<AppWebsocket> {
//   let appWs = undefined
//   //try {
//     appWs = await AppWebsocket.connect(`ws://localhost:${ appPort }`, 30000);
//   //log('silly',{appWs});
//   log('info','Connected to app at ' + appPort);
//   //} catch (e) {
//   //  log('error', 'Failed to to connect to app at ' + appPort + ': ' + e);
//   //}
//   return appWs;
// }
//
//
// /** */
// export async function getDnaHash(adminWs: AdminWebsocket, uid: string): Promise<string|undefined> {
//   const apps = await adminWs.listApps({status_filter: AppStatusFilter.Running });
//   log('info','getDnaHash('+ uid +') - Found ' + apps.length + ' app(s):');
//   for (const app of apps) {
//     log('info',' -  ' + app.installed_app_id);
//     for (const cell of app.cell_data) {
//       // log('info','    -  ' + cell.role_id);
//       log('info','    -  ' + htos(cell.cell_id[0]));
//       if (cell.role_id === uid) {
//         log('info','Found cell:' + htos(cell.cell_id[0]));
//         //log('info','  0. ' + htos(cell.cell_id[0]));
//         //log('info','  1. ' + htos(cell.cell_id[1]));
//         return htos(cell.cell_id[0]);
//       }
//     }
//   }
//   return undefined;
// }
//
//
// /**
//  * Returns port of active app is there is one
//  */
// export async function hasActivatedApp(adminWs: AdminWebsocket): Promise<number> {
//   const dnas = await adminWs.listDnas();
//   log('debug','Found ' + dnas.length + ' dna(s)');
//   for (const dna of dnas) {
//     log('debug',' -  ' + dna); //htos()
//   }
//
//   /** Active Apps */
//   const activeApps = await adminWs.listApps({status_filter: AppStatusFilter.Enabled});
//   log('info','Found ' + activeApps.length + ' Active App(s)');
//   for (const activeApp of activeApps) {
//     log('info',' -  ' + activeApp.installed_app_id);
//   }
//   // const hasActiveApp = activeAppIds.length == 1 && activeAppIds[0] == SNAPMAIL_APP_ID;
//   const hasActiveApp = activeApps.length > 0;
//
//   /** Get App interfaces */
//   let activeAppPort = 0;
//   if (hasActiveApp) {
//     const interfaces = await adminWs.listAppInterfaces();
//     if (interfaces.length > 0) {
//       activeAppPort = interfaces[0];
//     }
//     log('info','Found ' + interfaces.length + ' App Interfaces(s)');
//     for (const appInterface of interfaces) {
//       log('info',' -  ' + appInterface);
//     }
//   }
//   return activeAppPort;
// }

//
// /**
//  * Uninstall current App and reinstall with new uid
//  */
// export async function cloneCell(adminWs, uid) {
//   log('debug', 'cloneCell()');
//
//   /** Check if cell exists */
//   const cellIds = await adminWs.listCellIds();
//   log('info', 'Found ' + cellIds.length + ' Cell(s)');
//   for (const cellId of cellIds) {
//     log('info', ' -  ' + htos(cellId[0]) + ' - ' + htos(cellId[1]));
//   }
//   if (cellIds.length === 0) {
//     log('error', "Can't switch cell since no cell already installed");
//     return false;
//   }
//
//   const firstCellId = cellIds[0];
//
//   /** Create it by cloning */
//   try {
//     const clonedDna = await adminWs.createCloneCell({
//       properties: undefined,
//       dna_hash: firstCellId[0],
//       agent_key: firstCellId[1],
//       installed_app_id: SNAPMAIL_APP_ID,
//       slot_id: uid,
//       membrane_proof: undefined,
//     });
//     log('debug', clonedDna);
//   } catch (err) {
//     log('error', 'createCloneCell() failed:');
//     log('error',{err});
//   }
//   /** Done */
//   return true;
// }

//
// /**
//  *  Connect to Admin interface, install App and attach a port
//  */
// export async function installApp(adminWs: AdminWebsocket, uid: string): Promise<string> {
//   //const installed_app_id = SNAPMAIL_APP_ID;
//   const installed_app_id = SNAPMAIL_APP_ID + '-' + uid;
//   log('info', '     Installing  app: ' + installed_app_id);
//   /** Generate keys */
//   const myPubKey = await adminWs.generateAgentPubKey();
//   /** Register Dna */
//   let hash = undefined;
//   try {
//     hash = await adminWs.registerDna({
//       uid,
//       properties: undefined,
//       path: './bin/snapmail.dna',
//     });
//   } catch (err) {
//     log('error','[admin] registerDna() failed:');
//     log('error',{err});
//     return;
//   }
//   log('info','registerDna response: ' + htos(hash));
//   /** Install Dna */
//   try {
//     const installResponse = await adminWs.installApp({
//       agent_key: myPubKey,
//       installed_app_id,
//       dnas: [{
//         hash,
//         role_id: uid,
//       }],
//     });
//     log('debug','Install app response:');
//     log('debug',{installResponse});
//   } catch (err) {
//     log('error','[admin] installApp() failed:');
//     log('error',{err});
//     return;
//   }
//   log('info','App installed');
//   await adminWs.enableApp({ installed_app_id });
//   log('info','App activated');
//   return htos(hash);
// }
