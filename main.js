/** Modules to control application life and create native browser window **/
const { app, BrowserWindow, Menu, protocol, shell } = require('electron');
const spawn = require('child_process').spawn;
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const kill = require('tree-kill');
//const { dialog } = require('electron');
const request = require('request');
const prompt = require('electron-prompt');

const { log, logger } = require('./logger');
const { wslPath, killAllWsl } = require('./cli');
const {updateConductorConfig, createConductorConfig, CONDUCTOR_CONFIG_PATH, KEYSTORE_FILE_PATH,
  CONFIG_PATH, STORAGE_PATH, DNA_CONNECTIONS_FILE_PATH} = require('./config')

require('electron-context-menu')();
require('fix-path')();
// enables the devtools window automatically
require('electron-debug')({ isEnabled: true });

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


// -- Start-up stuff -- //

/** Add Holochain bins to PATH for WSL */
const BIN_DIR = "bin";
const BIN_PATH = path.join(__dirname, BIN_DIR);
process.env.Path += BIN_PATH;

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
//const g_canDebug = true;
let g_sim2hUrl = "";
let g_pubKey = '';


// -- Set Globals from current conductor config --/
{
  try {
    const conductorConfigBuffer = fs.readFileSync(CONDUCTOR_CONFIG_PATH);
    const conductorConfig = conductorConfigBuffer.toString();
    //console.log({conductorConfig})
    // replace persistence_dir
    let regex = /sim2h_url = "(.*)"/g;
    let match = regex.exec(conductorConfig);
    g_sim2hUrl = match[1];
    console.log({g_sim2hUrl});
    regex = /public_address = "(.*)"/g;
    match = regex.exec(conductorConfig);
    g_pubKey = match[1];
    console.log({g_pubKey});
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('File not found!');
    }
  }
}

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
  let mainWindow = new BrowserWindow({
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
  mainWindow.loadURL(`${SNAPMAIL_PROTOCOL_SCHEME}://root`);

  // Open <a href='' target='_blank'> with default system browser
  mainWindow.webContents.on('new-window', function (event, url) {
    event.preventDefault()
    shell.openExternal(url)
  });

  // Open the DevTools.
  //mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    g_mainWindow = null
  });
  return mainWindow;
}

/**
 *
 */
function startHolochainProc() {
  // spawn "holochain"
  let bin = HOLOCHAIN_BIN;
  let args = ['-c', wslPath(CONDUCTOR_CONFIG_PATH)];
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
  protocol.registerFileProtocol(SNAPMAIL_PROTOCOL_SCHEME, snapmailFileProtocolCallback);
  // Create main window
  g_mainWindow = createWindow();
  // Start Conductor if sim2hUrl is set otherwise prompt it.
  if(g_sim2hUrl === "") {
    promptSim2hUrl(function(sim2hUrl) {
      updateConductorConfig(g_pubKey, sim2hUrl);
      startConductor(sim2hUrl);
    });
  } else {
    startConductor(g_sim2hUrl);
  }
});


/**
 *
 */
function startConductor(sim2hUrl) {
  // Make sure there is no outstanding holochain procs
  killAllWsl(HC_BIN);
  killAllWsl(HOLOCHAIN_BIN);
  // check if config and keys exist, if they don't, create one.
  if (!fs.existsSync(KEYSTORE_FILE_PATH) || !fs.existsSync(CONDUCTOR_CONFIG_PATH)) {
    createConductorConfig(HC_BIN, sim2hUrl, function(pubKey) {
      g_pubKey = pubKey;
      startHolochainProc();
    });
  } else {
    log('info', 'Public key found. Launching conductor...');
    startHolochainProc();
  }
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
    event.preventDefault();
    // SIGTERM by default
    if (g_holochain_proc) {
      killAllWsl(HOLOCHAIN_BIN);
      kill(g_holochain_proc.pid, function(err) {
        log('info', 'killed all sub processes')
      });
    }
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
  if (g_mainWindow === null) {
    g_mainWindow = createWindow();
  }
});

function promptSim2hUrl(callback) {
  prompt({
    title: 'Sim2h URL',
    height: 180,
    width: 400,
    alwaysOnTop: true,
    label: 'URL:',
    value: g_sim2hUrl,
    inputAttrs: {
      type: 'url'
    },
    type: 'input'
  }).then((r) => {
      if(r === null) {
        console.log('user cancelled');
      } else {
        console.log('result', r);
        g_sim2hUrl = r;
        callback(r);
      }
    })
    .catch(console.error);
}
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
  {
    label: 'Edit',
    submenu: [
      {
        label: 'Change Sim2h URL', click: function () { promptSim2hUrl(function(sim2hUrl) {
          updateConductorConfig(g_pubKey, sim2hUrl);
          startConductor(sim2hUrl);
        });}}
      // { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
      // { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
      // { type: 'separator' },
      // { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
      // { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
      // { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
      // {
      //   label: 'Select All',
      //   accelerator: 'CmdOrCtrl+A',
      //   selector: 'selectAll:',
      // },
    ],
  },
]

Menu.setApplicationMenu(Menu.buildFromTemplate(menutemplate))
