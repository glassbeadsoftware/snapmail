const path = require('path');
const { app } = require('electron');
const { log } = require('./logger');
const fs = require('fs');
const { SNAPMAIL_DNA_HASH_FILE } = require('./dna-address-config');
const { wslPath } = require('./cli');
const { spawn } = require('child_process');

const CONFIG_PATH = path.join(app.getPath('appData'), 'Snapmail');
const STORAGE_PATH = path.join(CONFIG_PATH, 'storage');
const KEYSTORE_FILE = 'keystore.key';
const CONDUCTOR_CONFIG_FILENAME = 'conductor-config.toml';
const DNA_CONNECTIONS_FILE = '_dna_connections.json';
const SNAPMAIL_DNA_FILE = 'snapmail-dna.dna.json';
const DNA_FOLDER_PATH = path.join(CONFIG_PATH, 'dna');
const CONDUCTOR_CONFIG_PATH = path.join(CONFIG_PATH, CONDUCTOR_CONFIG_FILENAME);
const KEYSTORE_FILE_PATH = path.join(CONFIG_PATH, KEYSTORE_FILE);
const DNA_CONNECTIONS_FILE_PATH = path.join(CONFIG_PATH, DNA_CONNECTIONS_FILE);

module.exports.CONFIG_PATH = CONFIG_PATH;
module.exports.STORAGE_PATH = STORAGE_PATH;
module.exports.CONDUCTOR_CONFIG_PATH = CONDUCTOR_CONFIG_PATH;
module.exports.KEYSTORE_FILE_PATH = KEYSTORE_FILE_PATH;
module.exports.DNA_CONNECTIONS_FILE_PATH = DNA_CONNECTIONS_FILE_PATH;


function createConductorConfig(hc_bin, sim2hUrl, callback) {
  // Call "hc keygen" to create public key.
  // Once done, spawn the conductor.
  let bin = hc_bin;
  let pubKey;
  let args = ['keygen', '--path', wslPath(KEYSTORE_FILE_PATH), '--nullpass', '--quiet'];
  if(process.platform === "win32") {
    bin = process.env.comspec;
    args.unshift("/c", "wsl", hc_bin);
  }
  log('info', 'could not find existing public key or conductor config, creating one and running setup...');
  const hc_proc = spawn(bin, args, {
    cwd: __dirname,
    env: {
      ...process.env,
    },
  });
  hc_proc.stdout.once('data', (data) => {
    // first line out of two is the public address
    pubKey = data.toString().split('\n')[0];
    console.log({ pubKey })
  });
  hc_proc.stderr.on('data', (err) => {
    log('error', err.toString())
  });
  hc_proc.on('exit', (code) => {
    log('info', code);
    if(code === 0 || code === 127)
    {
      // to avoid rebuilding key-config-gen
      // all the time, according to new DNA address
      // we can just update it after the fact this way
      log('info', 'new pubKey: ' + pubKey);
      updateConductorConfig(pubKey, sim2hUrl);
      log('info', 'Conductor config updated with new public key.');
      callback(pubKey);
    } else {
      log('error', 'failed to perform setup')
    }
  })
}
module.exports.createConductorConfig = createConductorConfig;

/**
 * Overwrite the DNA hash address in the conductor-config with the up to date one in SNAPMAIL_DNA_HASH_FILE
 * @param publicAddress the agent public key
 * * @param sim2hUrl the sim2h server address
 */
function updateConductorConfig(publicAddress, sim2hUrl) {
  //console.log('updateConductorConfig:\n - ' + publicAddress + '\n - ' + sim2hUrl);
  // do this step of moving the snapmail dna over into the AppData folder
  // and naming it by its hash/address for the sake of mirroring holoscape behaviour
  let snapmailDnaHash = fs.readFileSync(path.join(__dirname, SNAPMAIL_DNA_HASH_FILE)).toString();
  // Make sure there is no trailing end of line
  let regex = /(Qm[a-zA-Z0-9]*)/;
  let match = regex.exec(snapmailDnaHash);
  snapmailDnaHash = match[1];
  console.log({ snapmailDnaHash });
  //let snapmailDnaHash = 'QmaTQtGajbgbnwLhj5LdMs3SwC3XXuktviL25YFbtZmKJF';
  log('info', 'snapmailDnaHash: `' + snapmailDnaHash + '`| done');

  if (!fs.existsSync(DNA_FOLDER_PATH)) {
    fs.mkdirSync(DNA_FOLDER_PATH);
  }
  const oldDnaFilePath = path.join(__dirname, SNAPMAIL_DNA_FILE);
  const newDnaFilePath = path.join(DNA_FOLDER_PATH, `${snapmailDnaHash}.dna.json`);
  log('info', 'oldDnaFilePath: ' + oldDnaFilePath);
  log('info', 'newDnaFilePath: ' + newDnaFilePath);

  fs.copyFileSync(oldDnaFilePath, newDnaFilePath);

  // read from the local template
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
    `sim2h_url = "${sim2hUrl}"`
  );

  // write to a folder we can write to
  fs.writeFileSync(CONDUCTOR_CONFIG_PATH, newConductorConfig)
}
module.exports.updateConductorConfig = updateConductorConfig;
