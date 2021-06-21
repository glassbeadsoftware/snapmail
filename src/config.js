// const path = require('path');
// const { app } = require('electron');
const { log } = require('./logger');
const fs = require('fs');
const { wslPath } = require('./cli');
const { spawn, fork } = require('child_process');
const { AdminWebsocket } = require('@holochain/conductor-api');
//const { AdminWebsocket } = require('../holochain-conductor-api');

const {bytesToBase64} = require('byte-base64');

const { CURRENT_DIR } = require('./globals');

// -- CONSTS -- //

const DEFAULT_PROXY_URL ='kitsune-proxy://VYgwCrh2ZCKL1lpnMM1VVUee7ks-9BkmW47C_ys4nqg/kitsune-quic/h/kitsune-proxy.harris-braun.com/p/4010/--';
const SNAPMAIL_APP_ID = 'snapmail-app'; // MUST MATCH SNAPMAIL_UI config
const LAIR_MAGIC_READY_STRING = '#lair-keystore-ready#';

/**
 * Spawn 'lair-keystore' process
 */
async function spawnKeystore(keystore_bin) {
  // -- Spawn Keystore -- //
  let bin = keystore_bin;
  //let args = ['keygen', '--path', wslPath(KEYSTORE_FILE_PATH), '--nullpass', '--quiet'];
  let args = [];
  if(process.platform === "win32") {
    bin = process.env.comspec;
    args.unshift("/c", "wsl", keystore_bin);
  }
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
 * Write the conductor config to storage path
 * Using proxy and bootstrap server
 */
function generateConductorConfig(configPath, bootstrapUrl, storagePath, proxyUrl, adminPort, canMdns) {
  log('info', 'generateConductorConfig() with ' + adminPort);
  if (proxyUrl === undefined || proxyUrl === '') {
    proxyUrl = DEFAULT_PROXY_URL;
  }
  let network_type = "quic_bootstrap";
  if (canMdns) {
    network_type = "quic_mdns";
  }
  let environment_path = wslPath(storagePath);
  log('debug',{environment_path});
  if (bootstrapUrl === undefined) {
    bootstrapUrl = DEFAULT_BOOTSTRAP_URL
  }
  const config =
    `environment_path: ${environment_path}
use_dangerous_test_keystore: false
passphrase_service:
  type: cmd
admin_interfaces:
  - driver:
      type: websocket
      port: ${adminPort}
network:
  network_type: ${network_type}
  bootstrap_service: ${bootstrapUrl}
  transport_pool:
    - type: proxy
      sub_transport:
        type: quic
        bind_to: kitsune-quic://0.0.0.0:0
      proxy_config:
        type: remote_proxy_client
        proxy_url: ${proxyUrl}`
  ;
  fs.writeFileSync(configPath, config);
}
module.exports.generateConductorConfig = generateConductorConfig;


// async function isAppInstalled(appPort) {
//   const adminWs = await AdminWebsocket.connect(`ws://localhost:${adminPort}`);
//   console.log('Connected to admin at ' + adminPort);
//   const dnas = await adminWs.listDnas();
//   console.log('Found ' + dnas.length + ' dnas');
// }

function htos(u8array) {
  return bytesToBase64(u8array)
}


/**
 *
 * @returns {Promise<AdminWebsocket>}
 */
async function connectToAdmin(adminPort) {
  let adminWs = await AdminWebsocket.connect(`ws://localhost:${ adminPort }`, 30000);
  //log('debug',{adminWs});
  log('debug','Connected to admin at ' + adminPort);
  return adminWs;
}
module.exports.connectToAdmin = connectToAdmin;


/**
 *
 * @param adminWs
 * @returns {Promise<boolean|boolean>}
 */
async function hasActivatedApp(adminWs) {
  const dnas = await adminWs.listDnas();
  log('debug','Found ' + dnas.length + ' dna(s)');
  for (dna of dnas) {
    log('debug',' -  ' + htos(dna));
  }

  // Active Apps
  const activeAppIds = await adminWs.listActiveApps();
  log('info','Found ' + activeAppIds.length + ' Active App(s)');
  for (activeId of activeAppIds) {
    log('info',' -  ' + activeId);
  }
  // const hasActiveApp = activeAppIds.length == 1 && activeAppIds[0] == SNAPMAIL_APP_ID;
  const hasActiveApp = activeAppIds.length > 0;

  // Get App interfaces
  let activeAppPort = 0;
  if (hasActiveApp) {
    const interfaces = await adminWs.listAppInterfaces();
    if (interfaces.length > 0) {
      activeAppPort = interfaces[0];
    }
    log('info','Found ' + interfaces.length + ' App Interfaces(s)');
    for (appInterface of interfaces) {
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
  console.log('Found ' + cellIds.length + ' Cell(s)');
  for (const cellId of cellIds) {
    console.log(' -  ' + htos(cellId[0]) + ' - ' + htos(cellId[1]));
  }
  if (cellIds.length == 0) {
    console.error("Can't switch cell since no cell already installed");
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
    log('info', { clonedDna });
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
 * @param adminWs
 * @param uid
 * @returns {Promise<void>}
 */
async function installApp(adminWs, uid) {
  const installed_app_id = SNAPMAIL_APP_ID + '-' + uid;
  log('info', 'Installing app: ' + installed_app_id);
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
        nick: uid,
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
}
module.exports.installApp = installApp;
