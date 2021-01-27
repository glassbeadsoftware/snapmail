// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu, shell } = require('electron');
const spawn = require('child_process').spawn;
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const kill = require('tree-kill');
const { dialog } = require('electron');
//const request = require('request');
const prompt = require('electron-prompt');

// Holochain Modules
const { AdminWebsocket } = require('@holochain/conductor-api');

// My Modules
const { log, logger } = require('./logger');
const { wslPath, killAllWsl } = require('./cli');
const {SNAPMAIL_APP_ID, generateConductorConfig, spawnKeystore, DEFAULT_BOOTSTRAP_URL,
  CONDUCTOR_CONFIG_PATH, CONFIG_PATH, STORAGE_PATH, APP_PORT, ADMIN_PORT} = require('./config');

// -- Code -- //

// Toggle this for debug / release mode
const g_canDebug = false;

require('electron-context-menu')();
require('fix-path')();
// enables the devtools window automatically
if (g_canDebug) {
  require('electron-debug')({ isEnabled: true });
}

/** CONSTS **/
// var HC_BIN = './hc';
// if (process.platform === "win32") {
//   HC_BIN = 'hc-linux';
// }
var HOLOCHAIN_BIN = './bin/holochain-linux';
if (process.platform === "win32") {
  HOLOCHAIN_BIN = 'holochain-linux';
}

var LAIR_KEYSTORE_BIN = './bin/lair-keystore-linux';
if (process.platform === "win32") {
   LAIR_KEYSTORE_BIN = 'lair-keystore-linux';
 }

// a special log from the conductor, specifying
// that the interfaces are ready to receive incoming
// connections
const MAGIC_READY_STRING = 'Conductor ready.';

//const SNAPMAIL_PROTOCOL_SCHEME = 'snapmail-protocol';
//const UI_DIR = "ui";

// -- Start-up stuff -- //

/** Add Holochain bins to PATH for WSL */
const BIN_DIR = "bin";
const BIN_PATH = path.join(__dirname, BIN_DIR);
if (process.platform === "win32") {
  log('info', 'BIN_PATH = ' + BIN_PATH);
  process.env.PATH += ';' + BIN_PATH;
}

// --  GLOBALS  -- //

// Keep a global reference of the ELECTRON window object, if you don't,
// the window will be closed automatically when the JavaScript object is garbage collected.
let g_mainWindow = undefined;
let g_holochain_proc = undefined;
let g_keystore_proc = undefined;
let g_canQuit = false;
let g_bootstrapUrl = '';

// --  Create missing dirs -- //

if (!fs.existsSync(CONFIG_PATH)) {
  fs.mkdirSync(CONFIG_PATH)
}
if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH)
}


// -- Set Globals from current conductor config --/

// tryLoadingConfig()
{
  try {
    const conductorConfigBuffer = fs.readFileSync(CONDUCTOR_CONFIG_PATH);
    const conductorConfig = conductorConfigBuffer.toString();
    //console.log({conductorConfig})
    let regex = /bootstrap_service = "(.*)"/g;
    let match = regex.exec(conductorConfig);
    g_bootstrapUrl = match[1];
    console.log({ g_bootstrapUrl });
    //regex = /public_address = "(.*)"/g;
    //match = regex.exec(conductorConfig);
    //g_pubKey = match[1];
    //console.log({ g_pubKey });
  } catch(err) {
    if(err.code === 'ENOENT')
    {
      console.error('File not found: ' + CONDUCTOR_CONFIG_PATH);
    } else {
      console.error('Loading config file failed: ' + err.code);
    }
    console.error('continuing...');
  }
}


/**
 * Create the main window global
 */
function createWindow() {
  // Create the browser window.
  let mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
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
  mainWindow.loadURL('file://' + __dirname + '/ui/index.html')

  // Open <a href='' target='_blank'> with default system browser
  mainWindow.webContents.on('new-window', function (event, url) {
    event.preventDefault();
    shell.openExternal(url);
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
async function spawnHolochainProc() {
  // adapt to WSL if needed
  let bin = HOLOCHAIN_BIN;
  let args = ['-c', wslPath(CONDUCTOR_CONFIG_PATH)];
  if (process.platform === "win32") {
    bin = process.env.comspec;
    args.unshift("/c", "wsl", HOLOCHAIN_BIN);
  }
  // spawn "holochain" subprocess
  console.log('Spawning ' + bin);
  let holochain_proc = spawn(bin, args, {
    cwd: __dirname,
    env: {
      ...process.env,
      RUST_BACKTRACE: 1,
    },
  });
  // Handle error output
  holochain_proc.stderr.on('data', (data) => log('error', 'holochain> ' + data.toString()));
  // if "holochain" exits, close the app
  holochain_proc.on('exit', (code, signal) => {
    if (signal) {
      log('info', `holochain process terminated due to receipt of signal ${signal}`)
    } else {
      log('info', `holochain process terminated with exit code ${code}`)
    }
    g_canQuit = true;
    //app.quit();
  });
  // Wait for holochain to boot up
  await new Promise((resolve, _reject) => {
    holochain_proc.stdout.on('data', (data) => {
      log('info', 'holochain: ' + data.toString())
      if(data.toString().indexOf(MAGIC_READY_STRING) > -1) {
        resolve();
      }
    });
  });
  // Done
  g_holochain_proc = holochain_proc;
}


async function installIfFirstLaunch(adminWs) {
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
    await adminWs.attachAppInterface({ port: APP_PORT });
    console.log('App activated');
  }
}

/**
 *
 */
function killHolochain() {
  // SIGTERM by default
  if (g_holochain_proc) {
    kill(g_holochain_proc.pid, function(err) {
      if (!err) {
        log('info', 'killed all holochain sub processes');
      } else {
        log('error', err)
      }
    });
  }
  if (g_keystore_proc) {
    kill(g_keystore_proc.pid, function(err) {
      if (!err) {
      log('info', 'killed all lair_keystore sub processes');
      } else {
        log('error', err)
      }
    });
  }
  // Make sure there is no outstanding holochain procs
  killAllWsl(HOLOCHAIN_BIN);
  killAllWsl(LAIR_KEYSTORE_BIN);
}

/**
 * Prepare conductor config and spawn holochain subprocess
 * @param canRegenerateConfig - Regenerate the conductor config before relaunching the holochain process.
 */
async function startConductor(canRegenerateConfig) {
  // Make sure there is no outstanding Holochain & keystore procs
  killHolochain();
  // Spawn Keystore
  spawnKeystore(LAIR_KEYSTORE_BIN);
  // check if config exist, if not, create one.
  if (!fs.existsSync(CONDUCTOR_CONFIG_PATH)) {
    generateConductorConfig(g_bootstrapUrl, STORAGE_PATH);
  } else {
    if (canRegenerateConfig) {
      log('info', 'Updating ConductorConfig with latest Bootstrap Url.');
      generateConductorConfig(g_bootstrapUrl, STORAGE_PATH);
    } else {
      log('info', 'Public key and config found.');
    }
  }
  // Spawn Holochain
  log('info', 'Launching conductor...');
  await spawnHolochainProc();
  //log('info', {g_holochain_proc});
}

/**
 * This method will be called when Electron has finished initialization and is ready to create browser windows.
 * Some APIs can only be used after this event occurs.
 */
app.on('ready', async function () {
  console.error('App ready ... ' + APP_PORT + ' (' + ADMIN_PORT + ')');

  // Create main window
  g_mainWindow = createWindow();
  // if bootstrapUrl not set, prompt it, otherwise Start Conductor
  if(g_bootstrapUrl === "") {
    g_bootstrapUrl = DEFAULT_BOOTSTRAP_URL;
    await promptBootstrapUrl();
    await startConductor(true);
  } else {
    await startConductor(false);
  }
  const adminWs = await AdminWebsocket.connect(`ws://localhost:${ADMIN_PORT}`);
  console.log('Connected to admin')
  await installIfFirstLaunch(adminWs);
  // trigger refresh once we know interfaces have booted up
  g_mainWindow.loadURL('file://' + __dirname + '/ui/index.html')
});

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
    killHolochain();
  }
});

/**
 * Quit when all windows are closed.
 */
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
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

async function promptBootstrapUrl() {
  let r = await prompt({
    title: 'Bootstrap Server URL',
    height: 180,
    width: 400,
    alwaysOnTop: true,
    label: 'URL:',
    value: g_bootstrapUrl,
    inputAttrs: {
      type: 'url'
    },
    type: 'input'
  });
  if(r === null) {
    console.log('user cancelled');
    if (g_bootstrapUrl === "") {
      app.quit();
    }
  } else {
    console.log('result', r);
    g_bootstrapUrl = r;
  }
}

/**
 * In this file you can include the rest of your app's specific main process code.
 * You can also put them in separate files and require them here.
 */

const menutemplate = [
  {
    label: 'File', submenu: [{
      label: 'Quit',
      accelerator: 'Command+Q',
      click: function () {
        app.quit()
      },
    },],
  },
  {
    label: 'Edit',
    submenu: [
      {
        label: 'Change Bootstrap URL', click: async function () {
          await promptBootstrapUrl();
          await startConductor(true);
        }
      },
      {
        label: 'Restart Conductor', click: async function () {
          await startConductor(false);
        }
      },
    ],
  },
  {
    label: 'Debug',
    submenu: [
      // {
      //   label: 'Dump logs', click: function() {
      //     console.log({process})
      //   }
      // },
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
      {
        label: 'Show PATHS',
        click: function () {
          dialog.showMessageBoxSync(g_mainWindow, {
            type: 'info',
            title: 'Constants',
            message: 'BIN_PATH: ' + BIN_PATH + '\n' + 'process.env.path: ' + JSON.stringify(process.env.PATH),
          });
        },
      },
    ],
  },
];

Menu.setApplicationMenu(Menu.buildFromTemplate(menutemplate))
