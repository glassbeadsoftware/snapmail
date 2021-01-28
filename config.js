const path = require('path');
const { app } = require('electron');
const { log } = require('./logger');
const fs = require('fs');
const { wslPath } = require('./cli');
const { spawn } = require('child_process');

const CONFIG_PATH = path.join(app.getPath('appData'), 'Snapmail');
const STORAGE_PATH = path.join(CONFIG_PATH, 'storage');
const CONDUCTOR_CONFIG_PATH = path.join(CONFIG_PATH, 'conductor-config.yaml');
module.exports.CONFIG_PATH = CONFIG_PATH;
module.exports.STORAGE_PATH = STORAGE_PATH;
module.exports.CONDUCTOR_CONFIG_PATH = CONDUCTOR_CONFIG_PATH;

const DEFAULT_BOOTSTRAP_URL = 'https://bootstrap.holo.host';
const ADMIN_PORT = 1235; // MUST MATCH SNAPMAIL_UI config
const APP_PORT = 8889; // MUST MATCH SNAPMAIL_UI config
const SNAPMAIL_APP_ID = 'snapmail-app'; // MUST MATCH SNAPMAIL_UI config

module.exports.DEFAULT_BOOTSTRAP_URL = DEFAULT_BOOTSTRAP_URL;
module.exports.ADMIN_PORT = ADMIN_PORT;
module.exports.APP_PORT = APP_PORT;
module.exports.SNAPMAIL_APP_ID = SNAPMAIL_APP_ID;

/**
 * Call "hc keygen" to create public key.
 * Once done, generate the conductor config.
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
  console.log('Spawning ' + bin + ' (dirname: ' + __dirname + ')');
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
  //   if(code === 0 || code === 127)
  //   {
  //     // to avoid rebuilding key-config-gen
  //     // all the time, according to new DNA address
  //     // we can just update it after the fact this way
  //     log('info', 'new pubKey: ' + pubKey);
  //     generateConductorConfig(pubKey, sim2hUrl);
  //     log('info', 'Conductor config updated with new public key.');
  //     callback(pubKey);
  //   } else {
  //     log('error', 'failed to perform setup')
  //   }
  //   kill(holochain_handle.pid, function (err) {
  //     if (!err) {
  //       log('info', 'killed all holochain sub processes')
  //     } else {
  //       log('error', err)
  //     }
  //   })
  //   quit = true
  //   app.quit()
  });
}
module.exports.spawnKeystore = spawnKeystore;


/**
 *
 * @param publicAddress
 * @param sim2hUrl
 */
function generateConductorConfig(bootstrapUrl, storagePath) {
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
        proxy_url: kitsune-proxy://VYgwCrh2ZCKL1lpnMM1VVUee7ks-9BkmW47C_ys4nqg/kitsune-quic/h/kitsune-proxy.harris-braun.com/p/4010/--`
  ;

//   const config =
//     `environment_path: ${STORAGE_PATH}
// use_dangerous_test_keystore: false
// passphrase_service:
//   type: cmd
// admin_interfaces:
//   - driver:
//       type: websocket
//       port: ${ADMIN_PORT}
// network:
//   bootstrap_service: https://bootstrap.holo.host
//   transport_pool:
//     - type: proxy
//       sub_transport:
//         type: quic
//       proxy_config:
//         type: remote_proxy_client
//         proxy_url: kitsune-proxy://VYgwCrh2ZCKL1lpnMM1VVUee7ks-9BkmW47C_ys4nqg/kitsune-quic/h/kitsune-proxy.harris-braun.com/p/4010/--`
//   ;

  fs.writeFileSync(CONDUCTOR_CONFIG_PATH, config);
}
module.exports.generateConductorConfig = generateConductorConfig;
