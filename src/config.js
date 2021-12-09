const fs = require('fs');
const { spawn } = require('child_process');
const { bytesToBase64 } = require('byte-base64');
const { AdminWebsocket, AppWebsocket, AppStatusFilter } = require('@holochain/conductor-api');
//const { AdminWebsocket, AppWebsocket } = require('../holochain-conductor-api');

const { log } = require('./logger');
const { CURRENT_DIR, SNAPMAIL_APP_ID, DEFAULT_BOOTSTRAP_URL, DEFAULT_PROXY_URL } = require('./globals');
const path = require("path");

// -- CONSTS -- //

const LAIR_MAGIC_READY_STRING = '#lair-keystore-ready#';


// -- Functions -- //

/**
 * @param u8array
 * @returns {string}
 */
function htos(u8array) {
  return bytesToBase64(u8array)
}


/**
 * Spawn 'lair-keystore' process
 */
async function getKeystoreVersion(keystore_bin) {
  // -- Spawn Keystore -- //
  let bin = keystore_bin;
  let args = ["--version"];
  log('info', 'Spawning ' + bin + ' (dirname: ' + CURRENT_DIR + ')');
  const keystore_proc = spawn(bin, args, {
    cwd: CURRENT_DIR,
    detached: false,
    //stdio: 'pipe',
    env: {
      ...process.env,
    },
  });
  let version = ''
  // -- Handle Outputs
  // Wait for holochain to boot up
  await new Promise((resolve, reject) => {
    keystore_proc.stdout.on('data', (data) => {
      log('info', 'lair-keystore: ' + data.toString());
      version = data.toString();
      resolve();
    });
    keystore_proc.stderr.on('data', (data) => {
      log('error', 'lair-keystore> ' + data.toString())
    });
    // -- Handle Termination
    keystore_proc.on('exit', (code) => {
      log('info', code);
      reject();
    });
  });
  // Done
  return version;
}
module.exports.getKeystoreVersion = getKeystoreVersion;


/**
 * Spawn 'lair-keystore' process
 */
async function spawnKeystore(keystore_bin, storagePath) {
  // -- Spawn Keystore -- //
  let bin = keystore_bin;
  const lair_dir = winPath(path.join(storagePath, "keystore"))
  let args = ['-d', lair_dir];
  log('info', 'Spawning ' + bin + ' (dirname: ' + CURRENT_DIR + ')');
  const keystore_proc = spawn(bin, args, {
    cwd: CURRENT_DIR,
    detached: false,
    //stdio: 'pipe',
    env: {
      ...process.env,
    },
  });
  // -- Handle Outputs
  // Wait for holochain to boot up
  await new Promise((resolve, reject) => {
    keystore_proc.stdout.on('data', (data) => {
      log('info', 'lair-keystore: ' + data.toString());
      if(data.toString().indexOf(LAIR_MAGIC_READY_STRING) > -1) {
        resolve();
      }
    });
    keystore_proc.stderr.on('data', (data) => {
      log('error', 'lair-keystore> ' + data.toString())
    });
    // -- Handle Termination
    keystore_proc.on('exit', (code) => {
       log('info', code);
      reject();
      // TODO: Figure out if must kill app if keystore crashes
      // kill(holochain_handle.pid, function (err) {
      //   if (!err) {
      //     log('info', 'killed all holochain sub processes');
      //   } else {
      //     log('error', err);
      //   }
      // });
      // quit = true;
      // app.quit();
    });
  });
  // Done
  return keystore_proc;
}
module.exports.spawnKeystore = spawnKeystore;


/**
 * Sanitize path for Windows
 * @param path
 * @returns path
 */
function winPath(path) {
  if (process.platform !== "win32") {
    return path;
  }
  let fp = path.replace(/\\/g, "\\\\");
  return fp;
}

/**
 * Write the conductor config to storage path
 * Using proxy and bootstrap server
 */
function generateConductorConfig(configPath, bootstrapUrl, storagePath, proxyUrl, adminPort, canMdns, canProxy) {
  log('info', 'generateConductorConfig() with ' + adminPort);
  if (proxyUrl === undefined || proxyUrl === '') {
    proxyUrl = DEFAULT_PROXY_URL;
  }
  let network_type = "quic_bootstrap";
  if (canMdns) {
    network_type = "quic_mdns";
  }
  if (bootstrapUrl === undefined) {
    bootstrapUrl = DEFAULT_BOOTSTRAP_URL;
  }
  let environment_path = winPath(storagePath);
  log('debug',{environment_path});
  let keystore_path = winPath(path.join(environment_path, "keystore"))
  log('debug',{keystore_path});

  let config;
  if (canProxy) {
    // - Basic Config with Proxy
    config = `---
environment_path: ${environment_path}
keystore:
  type: lair_server_legacy_deprecated
  keystore_path: "${keystore_path}"
  danger_passphrase_insecure_from_config: default-insecure-passphrase
dpki: ~
admin_interfaces:
  - driver:
      type: websocket
      port: ${adminPort}
db_sync_level: Normal      
network:
  network_type: ${network_type}
  bootstrap_service: ${bootstrapUrl}
  transport_pool:
    - type: proxy
      sub_transport:
        type: quic
        bind_to: kitsune-quic://0.0.0.0:0
        override_host: ~
        override_port: ~        
      proxy_config:
        type: remote_proxy_client
        proxy_url: ${proxyUrl}
        `;
} else {
    // - No PROXY Config
    config =`---
environment_path: "${environment_path}"
keystore:
  type: lair_server_legacy_deprecated
  keystore_path: "${keystore_path}"
  danger_passphrase_insecure_from_config: default-insecure-passphrase
dpki: ~
admin_interfaces:
  - driver:
      type: websocket
      port: ${adminPort}
db_sync_level: Normal      
network:
  network_type: ${network_type}
  bootstrap_service: ${bootstrapUrl}
  transport_pool:
    - type: quic
      bind_to: ~
      override_host: ~
      override_port: ~
      `;
  }

  fs.writeFileSync(configPath, config);
}
module.exports.generateConductorConfig = generateConductorConfig;


// async function isAppInstalled(appPort) {
//   const adminWs = await AdminWebsocket.connect(`ws://localhost:${adminPort}`);
//   log('info', 'Connected to admin at ' + adminPort);
//   const dnas = await adminWs.listDnas();
//   log('info', 'Found ' + dnas.length + ' dnas');
// }


/**
 *
 * @returns {Promise<AdminWebsocket>}
 */
async function connectToAdmin(adminPort) {
  log('info','Connecting to admin at ' + adminPort + ' ...');
  let adminWs = undefined
  //try {
    adminWs = await AdminWebsocket.connect(`ws://localhost:${ adminPort }`, 30000);
    //log('debug',{adminWs});
    log('info', 'Connected to admin at ' + adminPort);
  //} catch (e) {
  //  log('error', 'Failed to to connect to admin at ' + adminPort + ': ' + e);
  //}
  return adminWs;
}
module.exports.connectToAdmin = connectToAdmin;


/**
 *
 */
async function connectToApp(appPort) {
  let appWs = undefined
  //try {
    appWs = await AppWebsocket.connect(`ws://localhost:${ appPort }`, 30000);
  //log('silly',{appWs});
  log('info','Connected to app at ' + appPort);
  //} catch (e) {
  //  log('error', 'Failed to to connect to app at ' + appPort + ': ' + e);
  //}
  return appWs;
}
module.exports.connectToApp = connectToApp;


/**
 *
 * @param adminWs
 * @returns {Promise<string|undefined>}
 */
async function getDnaHash(adminWs, uid) {
  const apps = await adminWs.listApps("running");
  log('debug','getDnaHash('+ uid +') - Found ' + apps.length + ' app(s):');
  for (let app of apps) {
    log('debug',' -  ' + app.installed_app_id);
    for (let cell of app.cell_data) {
      log('debug','    -  ' + cell.role_id);
      if (cell.role_id == uid) {
        return htos(cell.cell_id[0]);
      }
    }
  }
  return undefined;
}
module.exports.getDnaHash = getDnaHash;


/**
 *
 * @param adminWs
 * @returns {Promise<number>}
 */
async function hasActivatedApp(adminWs) {
  const dnas = await adminWs.listDnas();
  log('debug','Found ' + dnas.length + ' dna(s)');
  for (let dna of dnas) {
    log('debug',' -  ' + htos(dna));
  }

  // Active Apps
  const activeApps = await adminWs.listApps({status_filter: AppStatusFilter.Enabled});
  log('info','Found ' + activeApps.length + ' Active App(s)');
  for (let activeApp of activeApps) {
    log('info',' -  ' + activeApp.installed_app_id);
  }
  // const hasActiveApp = activeAppIds.length == 1 && activeAppIds[0] == SNAPMAIL_APP_ID;
  const hasActiveApp = activeApps.length > 0;

  // Get App interfaces
  let activeAppPort = 0;
  if (hasActiveApp) {
    const interfaces = await adminWs.listAppInterfaces();
    if (interfaces.length > 0) {
      activeAppPort = interfaces[0];
    }
    log('info','Found ' + interfaces.length + ' App Interfaces(s)');
    for (let appInterface of interfaces) {
      log('info',' -  ' + appInterface);
    }
  }
  return activeAppPort;
}
module.exports.hasActivatedApp = hasActivatedApp;


/**
 * Uninstall current App and reinstall with new uid
 */
async function cloneCell(adminWs, uid) {
  log('debug', 'cloneCell()');

  // Check if cell exists
  const cellIds = await adminWs.listCellIds();
  log('info', 'Found ' + cellIds.length + ' Cell(s)');
  for (const cellId of cellIds) {
    log('info', ' -  ' + htos(cellId[0]) + ' - ' + htos(cellId[1]));
  }
  if (cellIds.length === 0) {
    log('error', "Can't switch cell since no cell already installed");
    return false;
  }

  let firstCellId = cellIds[0];

  // Create it by cloning
  try {
    const clonedDna = await adminWs.createCloneCell({
      properties: undefined,
      dna_hash: firstCellId[0],
      agent_key: firstCellId[1],
      installed_app_id: SNAPMAIL_APP_ID,
      slot_id: uid,
      membrane_proof: undefined,
    });
    log('debug', clonedDna);
  } catch (err) {
    log('error', 'createCloneCell() failed:');
    log('error',{err});
  }
  // Done
  return true;
}
module.exports.cloneCell = cloneCell;


/**
 *  Connect to Admin interface, install App and attach a port
 */
async function installApp(adminWs, uid) {
  //const installed_app_id = SNAPMAIL_APP_ID;
  const installed_app_id = SNAPMAIL_APP_ID + '-' + uid;
  log('info', 'Installing  app: ' + installed_app_id);
  // Generate keys
  let myPubKey = await adminWs.generateAgentPubKey();
  // Register Dna
  let hash = undefined;
  try {
    hash = await adminWs.registerDna({
      uid,
      properties: undefined,
      path: './dna/snapmail.dna',
    });
  } catch (err) {
    log('error','[admin] registerDna() failed:');
    log('error',{err});
    return;
  }
  log('info','registerDna response: ' + htos(hash));
  // Install Dna
  try {
    let installResponse = await adminWs.installApp({
      agent_key: myPubKey,
      installed_app_id,
      dnas: [{
        hash,
        role_id: uid,
      }],
    });
    log('debug','Install app response:');
    log('debug',{installResponse});
  } catch (err) {
    log('error','[admin] installApp() failed:');
    log('error',{err});
    return;
  }
  log('info','App installed');
  await adminWs.activateApp({ installed_app_id });
  log('info','App activated');
  return htos(hash);
}
module.exports.installApp = installApp;
