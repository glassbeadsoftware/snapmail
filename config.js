const path = require('path');
const { app } = require('electron');
const { log } = require('./logger');
const fs = require('fs');
const { wslPath } = require('./cli');
const { spawn } = require('child_process');
const { AdminWebsocket } = require('@holochain/conductor-api');

// -- CONSTS -- //

const CONFIG_PATH = path.join(app.getPath('appData'), 'Snapmail');
const STORAGE_PATH = path.join(CONFIG_PATH, 'storage');
const CONDUCTOR_CONFIG_PATH = path.join(CONFIG_PATH, 'conductor-config.yaml');
const DEFAULT_PROXY_URL ='kitsune-proxy://VYgwCrh2ZCKL1lpnMM1VVUee7ks-9BkmW47C_ys4nqg/kitsune-quic/h/kitsune-proxy.harris-braun.com/p/4010/--';
const DEFAULT_BOOTSTRAP_URL = 'https://bootstrap.holo.host';
const SNAPMAIL_APP_ID = 'snapmail-app'; // MUST MATCH SNAPMAIL_UI config
//const ADMIN_PORT = 1235;
const ADMIN_PORT = 1200 + Math.floor(Math.random() * 100); // Randomized admin port on each launch

module.exports.DEFAULT_BOOTSTRAP_URL = DEFAULT_BOOTSTRAP_URL;
module.exports.CONFIG_PATH = CONFIG_PATH;
module.exports.STORAGE_PATH = STORAGE_PATH;
module.exports.CONDUCTOR_CONFIG_PATH = CONDUCTOR_CONFIG_PATH;


/**
 * Spawn 'lair-keystore' process
 */
function spawnKeystore(keystore_bin) {
  // -- Spawn Keystore -- //
  let bin = keystore_bin;
  //let args = ['keygen', '--path', wslPath(KEYSTORE_FILE_PATH), '--nullpass', '--quiet'];
  let args = [];
  if(process.platform === "win32") {
    bin = process.env.comspec;
    args.unshift("/c", "wsl", keystore_bin);
  }
  log('info', 'Spawning ' + bin + ' (dirname: ' + __dirname + ')');
  const keystore_proc = spawn(bin, args, {
    cwd: __dirname,
    env: {
      ...process.env,
    },
  });
  // -- Handle Outputs
  keystore_proc.stdout.once('data', (data) => {
    log('info', 'lair-keystore: ' + data.toString())
  });
  keystore_proc.stderr.on('data', (data) => {
    log('error', 'lair-keystore> ' + data.toString())
  });
  // -- Handle Termination
  keystore_proc.on('exit', (code) => {
     log('info', code);
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
}
module.exports.spawnKeystore = spawnKeystore;


/**
 * Write the conductor config to storage path
 * Using proxy and bootstrap server
 */
function generateConductorConfig(bootstrapUrl, storagePath, proxyUrl) {
  log('info', 'generateConductorConfig() with ' + ADMIN_PORT)
  if (proxyUrl === undefined || proxyUrl === '') {
    proxyUrl = DEFAULT_PROXY_URL;
  }
  let environment_path = wslPath(storagePath);
  console.log({environment_path});
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
      port: ${ADMIN_PORT}
network:
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

  fs.writeFileSync(CONDUCTOR_CONFIG_PATH, config);
}
module.exports.generateConductorConfig = generateConductorConfig;

/**
 * Connect to Admin interface, install App and attach a port
 * @returns {Promise<void>}
 */
async function connectAndInstallApp(appPort) {
  const adminWs = await AdminWebsocket.connect(`ws://localhost:${ADMIN_PORT}`);
  console.log('Connected to admin at ' + ADMIN_PORT);
  const dnas = await adminWs.listDnas();
  console.log('Found ' + dnas.length + ' dnas');
  // const activeAppIds = await adminWs.listActiveApps();
  if (dnas.length === 0) {
    let myPubKey = await adminWs.generateAgentPubKey();
    await adminWs.installApp({
      agent_key: myPubKey,
      installed_app_id: SNAPMAIL_APP_ID,
      dnas: [
        {
          nick: 'snapmail.dna.gz',
          path: './dna/snapmail.dna.gz',
        },
      ],
    });
    console.log('App installed');
    await adminWs.activateApp({ installed_app_id: SNAPMAIL_APP_ID });
    console.log('App activated');
  }
  await adminWs.attachAppInterface({ port: appPort });
  console.log('App Interface attached');
}
module.exports.connectAndInstallApp = connectAndInstallApp;
