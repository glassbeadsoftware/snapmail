const path = require('path');
const { app } = require('electron');
const { log } = require('./logger');
const fs = require('fs');
//const { SNAPMAIL_DNA_HASH_FILE } = require('./dna-address-config');
//const { wslPath } = require('./cli');
const { spawn } = require('child_process');

const CONFIG_PATH = path.join(app.getPath('appData'), 'Snapmail');
const STORAGE_PATH = path.join(CONFIG_PATH, 'storage');
const CONDUCTOR_CONFIG_PATH = path.join(CONFIG_PATH, 'conductor-config.yaml');
module.exports.CONFIG_PATH = CONFIG_PATH;
module.exports.STORAGE_PATH = STORAGE_PATH;
module.exports.CONDUCTOR_CONFIG_PATH = CONDUCTOR_CONFIG_PATH;

//const KEYSTORE_FILE = 'keystore.key';
//const KEYSTORE_FILE_PATH = path.join(CONFIG_PATH, KEYSTORE_FILE);
//const DNA_CONNECTIONS_FILE = '_dna_connections.json';
//const DNA_CONNECTIONS_FILE_PATH = path.join(CONFIG_PATH, DNA_CONNECTIONS_FILE);
//const SNAPMAIL_DNA_FILE = 'snapmail-dna.dna.json';
//module.exports.KEYSTORE_FILE_PATH = KEYSTORE_FILE_PATH;
//module.exports.DNA_CONNECTIONS_FILE_PATH = DNA_CONNECTIONS_FILE_PATH;

//const DNA_FOLDER_PATH = path.join(CONFIG_PATH, 'dna');

const DEFAULT_BOOTSTRAP_URL = 'https://bootstrap.holo.host'
const APP_PORT = 8889; // MUST MATCH SNAPMAIL_UI config
const ADMIN_PORT = 1235; // MUST MATCH SNAPMAIL_UI config
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
function generateConductorConfig(bootstrapUrl) {

  if (bootstrapUrl === undefined) {
    bootstrapUrl = DEFAULT_BOOTSTRAP_URL
  }
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
//   bootstrap_service: ${bootstrapUrl}
//   transport_pool:
//     - type: proxy
//       sub_transport:
//         type: quic
//         bind_to: kitsune-quic://0.0.0.0:0
//       proxy_config:
//         type: remote_proxy_client
//         proxy_url: kitsune-proxy://VYgwCrh2ZCKL1lpnMM1VVUee7ks-9BkmW47C_ys4nqg/kitsune-quic/h/kitsune-proxy.harris-braun.com/p/4010/--`
//   ;

  const config =
    `environment_path: ${STORAGE_PATH}
use_dangerous_test_keystore: false
passphrase_service:
  type: cmd
admin_interfaces:
  - driver:
      type: websocket
      port: ${ADMIN_PORT}
network:
  bootstrap_service: https://bootstrap.holo.host
  transport_pool:
    - type: proxy
      sub_transport:
        type: quic
      proxy_config:
        type: remote_proxy_client
        proxy_url: kitsune-proxy://VYgwCrh2ZCKL1lpnMM1VVUee7ks-9BkmW47C_ys4nqg/kitsune-quic/h/kitsune-proxy.harris-braun.com/p/4010/--`
  ;

  fs.writeFileSync(CONDUCTOR_CONFIG_PATH, config);
}
module.exports.generateConductorConfig = generateConductorConfig;

/**
 * Generate a conductor-config from the template and DNA_HASH_FILE, and put it in appData folder.
 * @param publicAddress - The agent public key to use
 * @param bootstrapUrl  - The bootstrap server address to use
function generateConductorConfig(publicAddress, bootstrapUrl) {
  //console.log('generateConductorConfig:\n - ' + publicAddress + '\n - ' + sim2hUrl);
  // Overwrite the DNA hash address in the conductor-config with the up to date one in SNAPMAIL_DNA_HASH_FILE
  let snapmailDnaHash = fs.readFileSync(path.join(__dirname, SNAPMAIL_DNA_HASH_FILE)).toString();
  // Make sure there is no trailing end of line after reading the hash from the file
  let regex = /(Qm[a-zA-Z0-9]*)/;
  let match = regex.exec(snapmailDnaHash);
  snapmailDnaHash = match[1];
  console.log({ snapmailDnaHash });
  //let snapmailDnaHash = 'QmaTQtGajbgbnwLhj5LdMs3SwC3XXuktviL25YFbtZmKJF';
  log('info', 'snapmailDnaHash: `' + snapmailDnaHash + '`| done');

  if (!fs.existsSync(DNA_FOLDER_PATH)) {
    fs.mkdirSync(DNA_FOLDER_PATH);
  }
  // For the sake of mirroring holoscape behaviour, do this step of moving the snapmail dna over into the AppData folder
  // and naming it by its hash/address.
  const oldDnaFilePath = path.join(__dirname, SNAPMAIL_DNA_FILE);
  const newDnaFilePath = path.join(DNA_FOLDER_PATH, `${snapmailDnaHash}.dna.json`);
  log('info', 'oldDnaFilePath: ' + oldDnaFilePath);
  log('info', 'newDnaFilePath: ' + newDnaFilePath);

  fs.copyFileSync(oldDnaFilePath, newDnaFilePath);

  // read the template config
  const conductorConfig = fs.readFileSync(path.join(__dirname, CONDUCTOR_CONFIG_FILENAME)).toString();

  // replace persistence_dir
  let newConductorConfig = conductorConfig.replace(
    /persistence_dir = ''/g,
    `persistence_dir = "${wslPath(CONFIG_PATH)}"`
  );
  // replace dna
  newConductorConfig = newConductorConfig.replace(
    /file = 'dna'/g,
    `file = "${wslPath(newDnaFilePath)}"`
  );
  newConductorConfig = newConductorConfig.replace(
    /hash = ''/g,
    `hash = "${snapmailDnaHash}"`
  );
  // replace agent public key
  newConductorConfig = newConductorConfig.replace(
    /public_address = ''/g,
    `public_address = "${publicAddress}"`
  );
  // replace key path
  newConductorConfig = newConductorConfig.replace(
    /keystore_file = ''/g,
    `keystore_file = "${wslPath(KEYSTORE_FILE_PATH)}"`
  );
  // replace pickle db storage path
  newConductorConfig = newConductorConfig.replace(
    /path = 'picklepath'/g,
    `path = "${wslPath(STORAGE_PATH)}"`
  );

  // replace sim2h_url path
  newConductorConfig = newConductorConfig.replace(
    /sim2h_url = ".*"/g,
    `sim2h_url = "${bootstrapUrl}"`
  );

  // write to the destination folder (appData)
  fs.writeFileSync(CONDUCTOR_CONFIG_PATH, newConductorConfig)
}
module.exports.generateConductorConfig = generateConductorConfig;
*/
