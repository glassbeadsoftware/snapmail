const { log } = require("./logger");
const { CURRENT_DIR, HOLOCHAIN_BIN } = require("./constants");
const { spawnSync } = require("child_process");


/**
 *
 */
function pingBootstrap(url) {
  let bin = "ping";
  let args = ['-n', 1, url.substring(8)];

  // Spawn "holochain" subprocess
  log('info', 'Spawning ' + bin + ' (url: ' + url + ')');
  let holochain_proc = spawnSync(bin, args, {
    cwd: CURRENT_DIR, detached: false, timeout: 5000, encoding: 'utf8', //stdio: 'pipe',
    env: {
      ... process.env, RUST_BACKTRACE: 1,
    },
  });
  log('info', 'ping result: ' + holochain_proc.stdout);
  return holochain_proc.status == null || holochain_proc.status == 0;
}
module.exports.pingBootstrap = pingBootstrap;


/**
 *
 */
function getHolochainVersion() {
  let bin = HOLOCHAIN_BIN;
  let args = ['--version'];

  // Spawn "holochain" subprocess
  log('info', 'Spawning ' + bin + ' (dirname: ' + CURRENT_DIR + ') | getHolochainVersion()');
  let holochain_proc = spawnSync(bin, args, {
    cwd: CURRENT_DIR,
    detached: false,
    timeout: 5000,
    encoding: 'utf8',
    //stdio: 'pipe',
    env: {
      ...process.env,
      RUST_BACKTRACE: 1,
    },
  });
  log('info', 'getHolochainVersion() result: ' + holochain_proc.stdout);
  return holochain_proc.stdout;

  // // Handle error output
  // holochain_proc.stderr.on('data', (data) => log('error', '*** holochain version > ' + data.toString()));
  // holochain_proc.on('exit', (_code, _signal) => {
  //   // n/a
  // });
  // // Wait for holochain to boot up
  // await new Promise(async (resolve, reject) => {
  //   const start_time = Date.now()
  //   holochain_proc.stdout.on('data', (data) => {
  //     g_holochain_version = data.toString();
  //     log('info', 'getHolochainVersion() result: ' + g_holochain_version);
  //     log('info', 'Killing holochain sub process... ' + holochain_proc.pid);
  //     kill(holochain_proc.pid, function(err) {
  //       if(!err) {
  //         log('info', 'Killed holochain sub process ' + holochain_proc.pid);
  //       } else {
  //         log('error', err)
  //       }
  //     });
  //     resolve();
  //   });
  //   while(Date.now() - start_time < 5 * 1000) {
  //     await sleep(100);
  //   }
  //   reject(new Error("Failed to retrieve holochain version from child process " + holochain_proc.pid))
  // });
  // Done
}
module.exports.getHolochainVersion = getHolochainVersion;


/**
 * Spawn 'lair-keystore --version' process
 */
function getKeystoreVersion(keystore_bin) {
  // -- Spawn Keystore -- //
  let bin = keystore_bin;
  let args = ["--version"];
  log('info', 'Spawning ' + bin + ' (dirname: ' + CURRENT_DIR + ') | getKeystoreVersion()');
  const keystore_proc = spawnSync(bin, args, {
    cwd: CURRENT_DIR,
    detached: false,
    timeout: 5000,
    encoding: 'utf8',
    //stdio: 'pipe',
    env: {
      ...process.env,
    },
  });
  log('info', 'lair-keystore result: ' + keystore_proc.stdout);
  return keystore_proc.stdout;
  //
  // let version = ''
  //
  // // -- Handle Outputs
  // // Wait for holochain to boot up
  // await new Promise((resolve, reject) => {
  //   keystore_proc.stdout.on('data', (data) => {
  //     log('info', 'lair-keystore result: ' + data.toString());
  //     version = data.toString();
  //     resolve();
  //   });
  //   keystore_proc.stderr.on('data', (data) => {
  //     log('error', 'lair-keystore> ' + data.toString())
  //   });
  //   // -- Handle Termination
  //   keystore_proc.on('exit', (code) => {
  //     log('info', code);
  //     reject();
  //   });
  // });
  // // Done
  // return version;
}
module.exports.getKeystoreVersion = getKeystoreVersion;
