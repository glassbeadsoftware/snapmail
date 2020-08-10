/** Modules to control application life and create native browser window **/
const { app, BrowserWindow, Menu, protocol, shell } = require('electron');
const spawn = require('child_process').spawn;
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const kill = require('tree-kill');
const request = require('request');

const { log, logger } = require('./logger');
const { wslPath } = require('./cli');
const { SNAPMAIL_DNA_HASH_FILE } = require('./dna-address-config');

require('electron-context-menu')();
require('fix-path')();

// enables the devtools window automatically
require('electron-debug')({ isEnabled: true })

/** CONSTS **/
var HC_BIN = './hc';
if (process.platform === "win32") {
  HC_BIN = 'hc-linux';
}
var HOLOCHAIN_BIN = './holochain';
if (process.platform === "win32") {
  HOLOCHAIN_BIN = 'holochain-linux';
}
const SNAPMAIL_PROTOCOL_SCHEME = 'snapmail-protocol';

const UI_DIR = "ui";
const CONFIG_PATH = path.join(app.getPath('appData'), 'Snapmail');
const KEYSTORE_FILE = 'keystore.key';
const CONDUCTOR_CONFIG_FILE = 'conductor-config.toml';
const DNA_CONNECTIONS_FILE = '_dna_connections.json';
const SNAPMAIL_DNA_FILE = 'snapmail-dna.dna.json';
const STORAGE_PATH = path.join(CONFIG_PATH, 'storage');
const DNA_FOLDER_PATH = path.join(CONFIG_PATH, 'dna');
const NEW_CONDUCTOR_CONFIG_PATH = path.join(CONFIG_PATH, CONDUCTOR_CONFIG_FILE);
const KEYSTORE_FILE_PATH = path.join(CONFIG_PATH, KEYSTORE_FILE);
const DNA_CONNECTIONS_FILE_PATH = path.join(CONFIG_PATH, DNA_CONNECTIONS_FILE);

/** Create missing dirs */
if (!fs.existsSync(CONFIG_PATH)) {
  fs.mkdirSync(CONFIG_PATH)
}
if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH)
}

/** GLOBALS **/

// Keep a global reference of the ELECTRON window object, if you don't,
// the window will be closed automatically when the JavaScript object is garbage collected.
let g_mainWindow = undefined;
let g_canQuit = false;
let g_holochain_proc;
const g_canDebug = true;

killAllWsl(HC_BIN);
killAllWsl(HOLOCHAIN_BIN);

/**
 * We want to be able to use localStorage/sessionStorage but Chromium doesn't allow that for every source.
 * Since we are using custom URI schemes to redirect UIs' resources specific URI schemes here to be privileged.
 */
console.log('Registering scheme as privileged:', SNAPMAIL_PROTOCOL_SCHEME);
protocol.registerSchemesAsPrivileged([{
    scheme: SNAPMAIL_PROTOCOL_SCHEME,
    privileges: { standard: true, supportFetchAPI: true, secure: true },
  },
]);
const snapmailFileProtocolCallback = (request, callback) => {
  // remove 'snapmail-protocol://'
  let url = request.url.substr(SNAPMAIL_PROTOCOL_SCHEME.length + 3);
  log('info', 'request url: ' + url);
  // /#/ because of react router
  if (url === 'root/' || url.includes('/#/')) {
    url = ''+ UI_DIR + '/index.html'
  } else if (url.includes('root')) {
    url = url.replace('root', UI_DIR)
  }
  if (url === '' + UI_DIR + '/_dna_connections.json') {
    newpath = DNA_CONNECTIONS_FILE_PATH
  } else {
    newpath = path.normalize(`${__dirname}/${url}`)
  }
  callback({ path: newpath })
};

/**
 * Create the main window global
 */
function createWindow() {
  // Create the browser window.
  g_mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
    },
    icon: __dirname + `/assets/favicon.png`,
    webgl: false,
    enableWebSQL: false,
    webPreferences: {
      devTools: true
    },
    //autoHideMenuBar: true,
  });

  // and load the index.html of the app.
  g_mainWindow.loadURL(`${SNAPMAIL_PROTOCOL_SCHEME}://root`);

  // Open <a href='' target='_blank'> with default system browser
  g_mainWindow.webContents.on('new-window', function (event, url) {
    event.preventDefault()
    shell.openExternal(url)
  });

  // Open the DevTools.
  //g_mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  g_mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    g_mainWindow = null
  });
}

/**
 * Overwrite the DNA hash address in the conductor-config with the up to date one
 * @param publicAddress the agent public key
 */
function updateConductorConfig(publicAddress) {
  // do this step of moving the snapmail dna over into the AppData folder
  // and naming it by its hash/address
  // for the sake of mirroring holoscape behaviour
  const snapmailDnaHash = fs.readFileSync(
    path.join(__dirname, SNAPMAIL_DNA_HASH_FILE)
  );
  log('info', 'snapmailDnaHash: ' + snapmailDnaHash);
  if (!fs.existsSync(DNA_FOLDER_PATH)) {
    fs.mkdirSync(DNA_FOLDER_PATH);
  }
  const newDnaFilePath = path.join(DNA_FOLDER_PATH, `${snapmailDnaHash}.dna.json`);
  fs.copyFileSync(
    path.join(__dirname, SNAPMAIL_DNA_FILE), // source
    newDnaFilePath // destination
  );

  // read from the local template
  const origConductorConfigPath = path.join(__dirname, CONDUCTOR_CONFIG_FILE);
  const conductorConfig = fs.readFileSync(origConductorConfigPath).toString();

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

  // write to a folder we can write to
  fs.writeFileSync(NEW_CONDUCTOR_CONFIG_PATH, newConductorConfig)
}


/**
 *
 */
function startConductorProc() {
  // spawn "holochain"
  let bin = HOLOCHAIN_BIN;
  let args = ['-c', wslPath(NEW_CONDUCTOR_CONFIG_PATH)];
  if (process.platform === "win32") {
    bin = process.env.comspec;
    args.unshift("/c", "wsl", HOLOCHAIN_BIN);
  }
  // spawn subprocess
  g_holochain_proc = spawn(bin, args, {
      cwd: __dirname,
      env: {
        ...process.env,
        RUST_BACKTRACE: 'full',
    },
  });

  // We need the _dna_connections.json to be a file readable by the UI, over the SNAPMAIL_PROTOCOL_SCHEME.
  // So we request it from the conductor and write the response to a file.
  g_holochain_proc.stdout.on('data', (data) => {
    log('info', data.toString());
    if (data.toString().indexOf('Listening on http://127.0.0.1:3111') > -1) {
      request(
        'http://127.0.0.1:3111/_dna_connections.json',
        { json: true },
        (err, res, body) => {
          fs.writeFileSync(DNA_CONNECTIONS_FILE_PATH, JSON.stringify(body));
          // trigger refresh once we know interfaces have booted up
          assert(g_mainWindow !== undefined);
          g_mainWindow.loadURL(`${SNAPMAIL_PROTOCOL_SCHEME}://root`)
        }
      )
    }
  })

  // log errors
  g_holochain_proc.stderr.on('data', (data) => log('error', data.toString()));

  // if "holochain" exits, close the app
  g_holochain_proc.on('exit', (code, signal) => {
    if (signal) {
      log(
        'info',
        `holochain process terminated due to receipt of signal ${signal}`
      )
    } else {
      log('info', `holochain process terminated with exit code ${code}`)
    }
    g_canQuit = true;
    app.quit();
  })
}

/**
 * This method will be called when Electron has finished initialization and is ready to create browser windows.
 * Some APIs can only be used after this event occurs.
 */
app.on('ready', function () {

  // Register the Snapmail protocol
  protocol.registerFileProtocol(
    SNAPMAIL_PROTOCOL_SCHEME,
    snapmailFileProtocolCallback
  );

  // Create main window
  createWindow();

  // check if config and keys exist, if they don't, create one.
  if (fs.existsSync(KEYSTORE_FILE_PATH) && fs.existsSync(NEW_CONDUCTOR_CONFIG_PATH)) {
    log('info', 'Public key found. Launching conductor...');
    startConductorProc();
    return
  }

  // Call "hc keygen" to create public key.
  // Once done, spawn the conductor.
  let bin = HC_BIN;
  let args = ['keygen', '--path', wslPath(KEYSTORE_FILE_PATH), '--nullpass', '--quiet'];
  if (process.platform === "win32") {
    bin = process.env.comspec;
    args.unshift("/c", "wsl", HC_BIN);
  }
  log('info', 'could not find existing public key or conductor config, creating one and running setup...');
  const hc_proc = spawn(bin, args, {
      cwd: __dirname,
    }
  );
  let publicAddress;
  hc_proc.stdout.once('data', (data) => {
    // first line out of two is the public address
    publicAddress = data.toString().split('\n')[0]
  });
  hc_proc.stderr.on('data', (err) => {
    log('error', err.toString())
  });
  hc_proc.on('exit', (code) => {
    log('info', code);
    if (code === 0 || code === 127) {
      // to avoid rebuilding key-config-gen
      // all the time, according to new DNA address
      // we can just update it after the fact this way
      updateConductorConfig(publicAddress);
      log('info', 'Conductor config updated with new public key. Launching conductor...');

      startConductorProc();
    } else {
      log('error', 'failed to perform setup')
    }
  })
});


/**
 * Make sure there is no outstanding holochain process in wsl by calling `killall` command
 */
function killAllWsl(psname) {
  if (process.platform !== "win32") {
    return;
  }
  log('info', 'killAllWsl:' + psname);
  const killall_proc = spawn(
    process.env.comspec,
    ["/c", "wsl", "killall", psname],
    { cwd: __dirname, }
  );
  killall_proc.stderr.on('data', (err) => {
    log('error', err.toString())
  });
  killall_proc.on('exit', (code) => {
    log('info', code);
  })
}

/**
 * This event will be emitted inside the primary instance of your application when a second instance has been executed
 * and calls app.requestSingleInstanceLock().
 */
app.on('second-instance', (event) => {
  // FIXME
});

/**
 * When main window has been closed and the application will quit, destroy conductor subprocess
 */
app.on('will-quit', (event) => {
  if (!g_canQuit) {
    event.preventDefault()
    // SIGTERM by default
    g_holochain_proc &&
      kill(g_holochain_proc.pid, function (err) {
        log('info', 'killed all sub processes')
      })
  }
});

/**
 * Quit when all windows are closed.
 */
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
});

/**
 *
 */
app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (g_mainWindow === null) createWindow()
});


/**
 * In this file you can include the rest of your app's specific main process code.
 * You can also put them in separate files and require them here.
 */


const menutemplate = [
  {
    label: 'File',
    submenu: [
      { label: 'Dump logs', click: function()
        {
          console.log({process})
        }},
      {
        label: 'Open Config Folder',
        click: function () {
          shell.openItem(CONFIG_PATH)
        },
        //icon: 'assets/icon.png'
      },
      {
        label: 'Open Log File',
        click: function () {
          shell.openItem(logger.transports.file.file)
        },
      },
      {
        label: 'devTools',
        click: function () {
          g_mainWindow.webContents.openDevTools()
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: function () {
          app.quit()
        },
      },
    ],
  },
  // {
  //   label: 'Edit',
  //   submenu: [
  //     { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
  //     { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
  //     { type: 'separator' },
  //     { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
  //     { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
  //     { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
  //     {
  //       label: 'Select All',
  //       accelerator: 'CmdOrCtrl+A',
  //       selector: 'selectAll:',
  //     },
  //   ],
  // },
]

Menu.setApplicationMenu(Menu.buildFromTemplate(menutemplate))
