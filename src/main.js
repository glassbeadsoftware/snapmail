// - Modules to control application life and create native browser window
const { app, BrowserWindow, Menu, shell, Tray, screen, Notification, nativeImage, globalShortcut } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const kill = require('tree-kill');
const { dialog } = require('electron');
const prompt = require('electron-prompt');
const AutoLaunch = require('auto-launch');
const { autoUpdater } = require('electron-updater');
const IS_DEV = require('electron-is-dev');

// - My Modules
const {
  DNA_HASH_FILEPATH, CONDUCTOR_CONFIG_FILENAME, APP_CONFIG_FILENAME, CONFIG_PATH, STORAGE_PATH,
  CURRENT_DIR, DEFAULT_BOOTSTRAP_URL, SNAPMAIL_APP_ID, IS_DEBUG, DEFAULT_PROXY_URL } = require('./globals');
const { log, logger } = require('./logger');
const {
  generateConductorConfig, spawnKeystore, getKeystoreVersion, hasActivatedApp, connectToAdmin,
  connectToApp, installApp, getDnaHash } = require('./config');
const { SettingsStore } = require('./settings');

//--------------------------------------------------------------------------------------------------
// PRE-INIT
//--------------------------------------------------------------------------------------------------

require('electron-context-menu')();
require('fix-path')();

process.env.WASM_LOG="WARN";
process.env.RUST_LOG="WARN";

//--------------------------------------------------------------------------------------------------
// CONSTS
//--------------------------------------------------------------------------------------------------

const REPORT_BUG_URL = `https://github.com/glassbeadsoftware/snapmail/issues/new`;

//const DIST_DIR = IS_DEBUG? "ui_dbg" : "ui";

const DIST_DIR = "ui";

// - Default is linux
var IS_LINUX = false
var HOLOCHAIN_BIN     = './bin/holochain-linux';
var LAIR_KEYSTORE_BIN = './bin/lair-keystore-linux';
if (process.platform === "win32") {
  HOLOCHAIN_BIN     = 'holochain-win.exe';
  LAIR_KEYSTORE_BIN = 'lair-keystore-win.exe';
} else if (process.platform === 'darwin') {
  HOLOCHAIN_BIN     = './bin/holochain-linux';
  LAIR_KEYSTORE_BIN = './bin/lair-keystore-linux';
} else {
  // TODO: check for android?
  IS_LINUX = true
}

// a special log from the conductor,
// specifying that the interfaces are ready to receive incoming connections
const HC_MAGIC_READY_STRING = 'Conductor ready.';

const g_switchingUrl = 'file://' + CURRENT_DIR + '/'+ DIST_DIR +'/switching.html';
const g_errorUrl = 'file://' + CURRENT_DIR + '/'+ DIST_DIR +'/error.html';
const INDEX_URL = 'file://' + CURRENT_DIR + '/'+ DIST_DIR +'/index.html?APP=';
log('debug', 'INDEX_URL = ' + INDEX_URL);

/** Add Holochain bins to PATH for WSL */
const BIN_DIR = "bin";
const BIN_PATH = path.join(CURRENT_DIR, BIN_DIR);
log('debug', 'BIN_PATH = ' + BIN_PATH);
if (process.platform === "win32") {
  process.env.PATH += ';' + BIN_PATH;
}

//--------------------------------------------------------------------------------------------------
// --  GLOBALS
//--------------------------------------------------------------------------------------------------

//const g_adminPort = 1235;
//const g_adminPort = 1200 + Math.floor(Math.random() * 100); // Randomized admin port on each launch
//var g_appPort = 8900 + Math.floor(Math.random() * 100); // Randomized port on each launch
//log('debug',{g_appPort});

let g_adminPort = 0;
let g_appPort = 0;

let g_lair_version = ""
let g_holochain_version = ""

// Keep a global reference of the ELECTRON window object, if you don't,
// the window will be closed automatically when the JavaScript object is garbage collected.
let g_mainWindow = undefined;

let g_settingsStore = undefined;
let g_holochain_proc = undefined;
let g_keystore_proc = undefined;
let g_canQuit = false;
let g_canMdns = false;
let g_bootstrapUrl = '';
let g_uid = '';
let g_proxyUrl = '';
let g_canProxy = false;
let g_storagePath = undefined;
let g_configPath = undefined;
let g_adminWs = undefined;
let g_uidList = [];
let g_tray = null;
let g_dnaHash = undefined;

// -- Read dna_hash -- //
let DNA_HASH = '<unknown>';
if (fs.existsSync(DNA_HASH_FILEPATH)) {
  DNA_HASH = fs.readFileSync(DNA_HASH_FILEPATH, 'utf-8');
} else  {
  if (fs.existsSync('resources/app/' + DNA_HASH_FILEPATH)) {
    DNA_HASH = fs.readFileSync('resources/app/' + DNA_HASH_FILEPATH, 'utf-8');
  } else {
    if (fs.existsSync(app.getAppPath() + '/' + DNA_HASH_FILEPATH)) {
      DNA_HASH = fs.readFileSync(app.getAppPath() + '/' + DNA_HASH_FILEPATH, 'utf-8');
    }
  }
}
log('info', "DNA HASH: " + DNA_HASH);



// Create sys tray
function create_tray() {
  try {
    g_tray = new Tray('assets/favicon16.png');
  } catch(e) {
    try {
      g_tray = new Tray('resources/app/assets/favicon16.png');
    } catch(e) {
      try {
        g_tray = new Tray(app.getAppPath() + '/assets/favicon16.png');
      } catch(e) {
        log('error', "Could not find favicon. appPath: " + app.getAppPath());
        g_tray = new Tray(nativeImage.createEmpty());
      }
    }
  }
}

//--------------------------------------------------------------------------------------------------
// -- SETUP
//--------------------------------------------------------------------------------------------------

// --  Create missing dirs -- //

if (!fs.existsSync(CONFIG_PATH)) {
  log('info', "Creating missing dir: " + CONFIG_PATH);
  fs.mkdirSync(CONFIG_PATH)
}
if (!fs.existsSync(STORAGE_PATH)) {
  log('info', "Creating missing dir: " + STORAGE_PATH);
  fs.mkdirSync(STORAGE_PATH)
}

// -- Determine Session ID -- //

let sessionId;
if (process.argv.length > 2) {
  sessionId = process.argv[2];
} else {
  sessionId = 'default';
}

// -- Setup storage folder -- //

g_storagePath = path.join(STORAGE_PATH, sessionId);
log('info',{g_storagePath});
let version_txt = path.join(g_storagePath, "dna_version.txt");
// Create storage and setup if none found
if (!fs.existsSync(g_storagePath)) {
  log('info', "Creating missing dir: " + g_storagePath);
  fs.mkdirSync(g_storagePath)
  //let appVersion = require("electron").remote.app.getVersion();
  try { fs.writeFileSync(version_txt, app.getVersion(), 'utf-8'); }
  catch(e) {
    //showErrorDialog('Failed to save the version_txt file !');
    log('error', 'Failed to save the version_txt file !')
    process.abort();
  }
} else {
  // Make sure its a compatible version
  try {
    log('debug', 'Reading: ' + version_txt);
    const read_version = fs.readFileSync(version_txt, 'utf-8');
    if (read_version !== app.getVersion()) {
      // FIXME Check only DNA versions
      // log('error', 'App Version mismatch :-(')
      // log('error', read_version);
      // log('error', app.getVersion());
      // //dialog.showOpenDialogSync({ properties: ['openFile', 'multiSelections'] })
      // //showErrorDialog('App Version mismatch :-(');
      // //app.quit();
      // process.abort();
    }
  }
  catch(e) {
    //showErrorDialog('Failed to read the version_txt file !');
    //app.quit();
    log('error', 'Failed to read the version_txt file !')
    log('error', e);
    process.abort();
  }
}

// -- Determine final conductor config file path -- //
g_configPath = path.join(g_storagePath, CONDUCTOR_CONFIG_FILENAME);
log('debug',{g_configPath});
let g_appConfigPath = path.join(g_storagePath, APP_CONFIG_FILENAME);

// -- Set Globals from current conductor config -- //

// tryLoadingConfig()
{
  try {
    // -- Conductor Config -- //
    const conductorConfigBuffer = fs.readFileSync(g_configPath);
    const conductorConfig = conductorConfigBuffer.toString();
    // log('debug', {conductorConfig})
    // Get Admin PORT
    let regex = /port: (.*)$/gm;
    let match = regex.exec(conductorConfig);
    // log('silly', {match});
    g_adminPort = match[1];
    // Get bootstrap server URL
    regex = /bootstrap_service: (.*)$/gm;
    match = regex.exec(conductorConfig);
    // log('silly', {match});
    g_bootstrapUrl = match[1];
    // Get proxy server URL
    try {
      regex = /proxy_url: (.*)$/gm;
      match = regex.exec(conductorConfig);
      g_proxyUrl = match[1];
      log('debug',{ g_proxyUrl });
    } catch(err) {
      log('info', 'No proxy URL found in config');
      g_proxyUrl = DEFAULT_PROXY_URL;
    }
    // -- APP config -- //
    log('debug', 'Reading file ' + g_appConfigPath);
    const appConfigString = fs.readFileSync(g_appConfigPath).toString();
    g_uidList = appConfigString.replace(/\r\n/g,'\n').split('\n');
    g_uidList = g_uidList.filter(function (el) {return el !== '';});
    log('debug', {g_uidList});

  } catch(err) {
    if(err.code === 'ENOENT') {
      log('error', 'File not found: ' + err);
    } else {
      log('error','Loading config file failed: ' + err);
    }
    log('error','continuing...');
  }
}

// -- Check AutoLaunch -- //

var autoLauncher = new AutoLaunch({
  name: "Snapmail happ",
  isHidden: true,
});

// ------------------------------------------------------------------------------------------------
// -- Auto Update
// ------------------------------------------------------------------------------------------------

let g_updater;
autoUpdater.autoDownload = false;

autoUpdater.on('error', (error) => {
  dialog.showErrorBox('Error: ', error == null ? "unknown" : (error.stack || error).toString());
})

autoUpdater.on('update-available', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Found Update',
    message: 'A software update has been found (v' + info.version + '), do you want to update now?',
    buttons: ['Yes', 'No']
  }).then((buttonIndex) => {
    if (buttonIndex.response === 0) {
      autoUpdater.downloadUpdate().then((paths) => {log('debug', 'download array: ' + JSON.stringify(paths))});
    }
    else {
      g_updater.enabled = true;
      g_updater = null;
    }
  });
})


// autoUpdater.on('download-progress', (progress, bytesPerSecond, percent, total, transferred) => {
//   let append = ' - ' + progress + '%';
//   //let append = ' - ' + JSON.stringify(progress);
//   log('debug', 'download-progress: ' + JSON.stringify(progress))
//
//   g_tray.setToolTip('SnapMail v' + app.getVersion() + append);
// })

autoUpdater.on('update-not-available', () => {
  dialog.showMessageBox({
    title: 'No Update found',
    message: 'Current version is up-to-date.'
  });
  g_updater.enabled = true;
  g_updater = null;
})

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    title: 'Install Update',
    message: 'Update downloaded, application will terminate and perform update...'
  }).then(() => {
    setImmediate(() => autoUpdater.quitAndInstall())
  })
})

// export this to MenuItem click callback
function checkForUpdates(menuItem, focusedWindow, event) {
  if(IS_DEBUG || IS_DEV) {
    dialog.showMessageBox({
      title: 'Check for Update failed',
      message: 'No update available in dev mode.'
    }).then(() => {});
  } else {
    if(IS_LINUX) {
      dialog.showMessageBox({
        title: 'Update unavailable',
        message: 'auto-update not available on linux. Please check and download latest version \
        from github: https://github.com/glassbeadsoftware/snapmail-release/releases'
      }).then(() => {});
    } else {
      g_updater = menuItem;
      g_updater.enabled = false;
      autoUpdater.checkForUpdates();
    }
  }
}

// ------------------------------------------------------------------------------------------------
// -- IPC between UI and Main
// ------------------------------------------------------------------------------------------------

const ipc = require('electron').ipcMain;

// ipc.on('app_version', (event) => {
//   event.sender.send('app_version', { version: app.getVersion() });
// });


/**
 * Receive synchronous notification
 * Launch Notification if allowed
 */
ipc.on('newMailSync', (event, title, body) => {
  const canNotify = g_settingsStore.get('canNotify');
  //log('debug', "canNotify = " + canNotify);
  if(canNotify) {
    new Notification({ title, body }).show();
  }
  event.returnValue = canNotify;
});


/**
 * Receive asynchronous new mail counter
 * Update sys tray title
 */
ipc.on('newCountAsync', (event, newCount) => {
  let append = newCount === 0 ? '' : ' (' + newCount + ')';
  if (g_tray) {
    g_tray.setToolTip('SnapMail v' + app.getVersion() + append);
  }
  event.returnValue = true;
});


// //Receive and reply to asynchronous message
// ipc.on('hello', (event, args) => {
//   event.sender.send('asynReply','Hi, asyn reply');
// });

// function showNotification () {
//   const NOTIFICATION_TITLE = 'Basic Notification'
//   const NOTIFICATION_BODY = 'Notification from the Main process'
//   new Notification({ title: NOTIFICATION_TITLE, body: NOTIFICATION_BODY }).show()
// }


// ------------------------------------------------------------------------------------------------
// -- Functions
// ------------------------------------------------------------------------------------------------

/**
 *
 */
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


/**
 *
 */
function updateAutoLaunchSetting(canAutoLaunch) {
  if (canAutoLaunch === undefined) {
    canAutoLaunch = g_settingsStore.get('canAutoLaunch');
  }
  g_settingsStore.set('canAutoLaunch', canAutoLaunch);
  if (canAutoLaunch) {
    autoLauncher.enable();
  } else {
    autoLauncher.disable();
  }
}


/**
 *
 */
function updateNotificationSetting(canNotify) {
  if (canNotify === undefined) {
    canNotify = g_settingsStore.get('canNotify');
  }
  g_settingsStore.set('canNotify', canNotify);
}


/**
 * Create the main window global
 */
function createWindow() {
  // Create the browser window.
  let { width, height } = g_settingsStore.get('windowBounds');
  let mainWindow = new BrowserWindow({
    width,
    height,
    webPreferences: {
      nodeIntegration: true,
      devTools: true
    },
    icon: CURRENT_DIR + `/assets/favicon.png`,
    webgl: false,
    enableWebSQL: false,
    //autoHideMenuBar: true,
  });
  let { x, y } = g_settingsStore.get('windowPosition');
  mainWindow.setPosition(x, y);

  globalShortcut.register('f5', function() {
    //console.log('f5 is pressed')
    mainWindow.reload()
  })

  // The BrowserWindow class extends the node.js core EventEmitter class, so we use that API
  // to listen to events on the BrowserWindow.
  // The resize event is emitted when the window size changes.
  mainWindow.on('resize', () => {
    // The event doesn't pass us the window size,
    // so we call the `getBounds` method which returns an object with
    // the height, width, and x and y coordinates.
    let { width, height } = mainWindow.getBounds();
    // Now that we have them, save them using the `set` method.
    g_settingsStore.set('windowBounds', { width, height });
  });

  // Open <a href='' target='_blank'> with default system browser
  mainWindow.webContents.on('new-window', function (event, url) {
    event.preventDefault();
    shell.openExternal(url).then(_r => {});
  });

  // Open DevTools
  if (IS_DEBUG) mainWindow.webContents.openDevTools();

  // Emitted on request to close window
  mainWindow.on('close', (event) => {
    log('debug', '*** mainWindow "close" - ' + g_canQuit);
    let positions = mainWindow.getPosition();
    g_settingsStore.set('windowPosition', { x: Math.floor(positions[0]), y: Math.floor(positions[1]) });
    if (g_canQuit) {
      mainWindow = null;
    } else {
      event.preventDefault();
      mainWindow.hide();
    }
  })

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    log('debug', '*** mainWindow "closed"');
    try {
      killHolochain().then(() => {
        log('info', '*** Holochain promise Closed');
      });
    } catch (err) {
      log('error', '*** Error while closing Holochain:');
      log('error', err);
    }
    // Wait for kill subprocess to finish on slow machines
    let start = Date.now();
    let diff = 0;
    do {
      diff = Date.now() - start;
    } while(diff < 1000);
    log('info', '*** Holochain Closed');
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    g_mainWindow = null;
  });

  //// Check for update
  //mainWindow.once('ready-to-show', () => {
  //  autoUpdater.checkForUpdatesAndNotify();
  //});

  // Done
  return mainWindow;
}


/**
 *
 */
async function getHolochainVersion() {
  let bin = HOLOCHAIN_BIN;
  let args = ['--version'];

  // Spawn "holochain" subprocess
  log('info', 'Spawning ' + bin + ' (dirname: ' + CURRENT_DIR + ')');
  let holochain_proc = spawn(bin, args, {
    cwd: CURRENT_DIR,
    detached: false,
    //stdio: 'pipe',
    env: {
      ...process.env,
      RUST_BACKTRACE: 1,
    },
  });
  // Handle error output
  holochain_proc.stderr.on('data', (data) => log('error', '*** holochain > ' + data.toString()));
  holochain_proc.on('exit', (_code, _signal) => {
    // n/a
  });
  // Wait for holochain to boot up
  await new Promise((resolve, _reject) => {
    holochain_proc.stdout.on('data', (data) => {
      g_holochain_version = data.toString();
        resolve();
    });
  });
  // Done
}



/**
 *
 */
async function spawnHolochainProc() {
  log('debug','spawnHolochainProc...');
  let bin = HOLOCHAIN_BIN;
  let args = ['-c', g_configPath];

  // Spawn "holochain" subprocess
  log('info', 'Spawning ' + bin + ' (dirname: ' + CURRENT_DIR + ')');
  let holochain_proc = spawn(bin, args, {
    cwd: CURRENT_DIR,
    detached: false,
    //stdio: 'pipe',
    env: {
      ...process.env,
      RUST_BACKTRACE: 1,
    },
  });
  // Handle error output
  holochain_proc.stderr.on('data', (data) => log('error', '*** holochain > ' + data.toString()));
  // if "holochain" exit, close the app
  holochain_proc.on('exit', (code, signal) => {
    if (signal) {
      log('info', `holochain process terminated due to receipt of signal ${signal}`)
    } else {
      log('info', `holochain process terminated with exit code ${code}`)
    }
    // g_canQuit = true;
    if (g_canQuit) {
      app.quit();
    }
  });
  // Wait for holochain to boot up
  await new Promise((resolve, _reject) => {
    holochain_proc.stdout.on('data', (data) => {
      let output = data.toString();
      log('info', 'holochain: ' + output);
      if(output.indexOf(HC_MAGIC_READY_STRING) > -1) {
        let regex = /###ADMIN_PORT:([0-9]*)###/gm;
        let match = regex.exec(output);
        //log('debug', {match});
        if (match === undefined || match === null || match.length === 0) {
          log('warn', 'ADMIN port not found in holochain output:');
          log('warn', {output});
          return;
        }
        g_adminPort = match[1];
        resolve();
      }
    });
  });
  // Done
  g_holochain_proc = holochain_proc;
}


/**
 * Make sure there is no outstanding holochain procs
 */
async function killHolochain() {
  // SIGTERM by default
  if (process.platform !== "win32") {
    let canWaitForHolochain = false;
    if(g_holochain_proc && g_holochain_proc.pid) {
      canWaitForHolochain = true;
      log('info', 'Killing holochain sub processes...');
      kill(g_holochain_proc.pid, function(err) {
        canWaitForHolochain = false;
        if(!err) {
          log('info', 'killed all holochain sub processes');
        } else {
          log('error', err)
        }
      });
    }
    let canWaitForKeystore = false;
    if(g_keystore_proc && g_keystore_proc.pid) {
      canWaitForKeystore = true;
      log('info', 'Killing lair-keystore sub processes...');
      kill(g_keystore_proc.pid, function(err) {
        canWaitForKeystore = false;
        if(!err) {
          log('info', 'killed all lair-keystore sub processes');
        } else {
          log('error', err)
        }
      });
    }
    // Wait a bit for the kill commands to complete
    log('info', 'waiting...');
    while(canWaitForHolochain) {
      await sleep(10);
    }
    while(canWaitForKeystore) {
      await sleep(10);
    }
    //await sleep(2000);
    log('info', 'Killing sub-processes done.');
  } else {
    //killAllWsl(HOLOCHAIN_BIN);
    //killAllWsl(LAIR_KEYSTORE_BIN);
  }
  log('debug', 'killHolochain() - DONE');
}


/**
 * Prepare conductor config and spawn holochain subprocess
 * @param canRegenerateConfig - Regenerate the conductor config before relaunching the holochain process.
 */
async function startConductor(canRegenerateConfig) {
  //g_canQuit = false;
  await killHolochain(); // Make sure there is no outstanding Holochain & keystore procs
  g_lair_version = await getKeystoreVersion(LAIR_KEYSTORE_BIN);
  g_keystore_proc = await spawnKeystore(LAIR_KEYSTORE_BIN, g_storagePath);
  //await sleep(2000);
  if (canRegenerateConfig) {
    generateConductorConfig(g_configPath, g_bootstrapUrl, g_storagePath, g_proxyUrl, g_adminPort, g_canMdns, g_canProxy);
  }
  log('info', 'Launching conductor...');
  await getHolochainVersion();
  await spawnHolochainProc();
  //g_canQuit = true;
  // - Connect to Conductor and activate app
  let indexUrl;
  try {
    log('debug','Connecting to admin at ' + g_adminPort + ' ...');
    g_adminWs = await connectToAdmin(g_adminPort);
    let activeAppPort = await hasActivatedApp(g_adminWs);
    if(activeAppPort === 0) {
      // - Prompt for first UID
      if (!g_canMdns) {
          g_uid = '<my-network-access-key>';
          await promptUid(true);
      } else {
        addUid("local-mdns")
      }
      g_dnaHash = await installApp(g_adminWs, g_uid);
      //log('debug','Attaching to app at ' + g_appPort + ' ...');
      g_appPort = await g_adminWs.attachAppInterface({port: undefined});
      log('debug', {g_appPort});
      g_appPort = g_appPort.port;
      log('info','App Interface attached: ' + g_appPort);
    } else {
      g_appPort = activeAppPort;
      // - Prompt for UID selection or prefered UID if multiple uid found
      if (g_uid === '' && g_uidList !== undefined && g_uidList.length > 0) {
        let maybe_uid = g_settingsStore.get('uid');
        if (maybe_uid !== undefined) {
          g_uid = maybe_uid;
        } else {
          g_uid = g_uidList[0];
          if(g_uidList.length > 1) {
            await promptUidSelect(false);
          }
        }
      }
    }
    indexUrl = INDEX_URL + g_appPort + '&UID=' + g_uid;
    log('debug', indexUrl);
  } catch (err) {
    log('error', 'Conductor setup failed:');
    log('error',{err});
    indexUrl = INDEX_URL;
    //// Better to kill app if holochain not connected
    //app.quit();
  }
  // -- Check username -- //
  try
  {
    const installed_app_id = SNAPMAIL_APP_ID + '-' + g_uid;
    let appWs = await connectToApp(g_appPort);
    const appInfo = await appWs.appInfo({ installed_app_id }, 1000);
    log('debug', {appInfo});
    if (appInfo === null) {
      log('error', "happ not installed in conductor: " + installed_app_id)
    }
    let cellId = appInfo.cell_data[0].cell_id;
    let username = await appWs.callZome({
        cap: null,
        cell_id: cellId,
        zome_name: "snapmail",
        fn_name: "get_my_handle",
        provenance: cellId[1],
        payload: undefined,
      }
      , 9999
    );
    log('debug', "username found: " + username);
    if (username === "<noname>") {
      let firstUsername = await promptFirstHandle(true);
      let result = await appWs.callZome({
          cap: null,
          cell_id: cellId,
          zome_name: "snapmail",
          fn_name: "set_handle",
          provenance: cellId[1],
          payload: firstUsername,
        }
        , 9999
      );
      log('debug', "username set: " + JSON.stringify(result));
    }
  } catch(err) {
    log('error', "*** Calling zome for initial username failed.");
    log('error', {err});
    //alert("Holochain failed.\n Connection to holochain might be lost.
    // Reload App or refresh web page to attempt reconnection");
  }
  // -- trigger refresh once we know interfaces have booted up -- //
  log('debug',"Loading index.html: " + indexUrl);
  try {
    await g_mainWindow.loadURL(indexUrl);
  } catch(err) {
    log('error', 'loadURL() failed:');
    log('error',{err});
  }
}


/**
 * This method will be called when Electron has finished initialization
 * and is ready to create browser windows.
 * Some APIs can only be used after this event occurs.
 */
app.on('ready', async function () {
  log('info', 'Electron App readying...');

  // Get Settings
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  let default_width = Math.min(width, 1400);
  let default_height = Math.min(height, 950);

  let x = Math.floor((width - default_width) / 2);
  let y = Math.floor((height - default_height) / 2);

  g_settingsStore = new SettingsStore({
    // We'll call our data file 'user-preferences'
    configName: 'user-preferences',
    defaults: {
      windowBounds: { width: default_width, height: default_height },
      canAutoLaunch: false,
      windowPosition: {x, y},
      dontConfirmOnExit: false,
      canNotify: false,
    }
  });

  // Check AutoLaunch
  updateAutoLaunchSetting();

  // Modify main menu
  let mainMenu = Menu.getApplicationMenu();
  let item = mainMenu.getMenuItemById('launch-at-startup');
  item.checked = g_settingsStore.get('canAutoLaunch');

  item = mainMenu.getMenuItemById('notify-msg');
  item.checked = g_settingsStore.get('canNotify');

  // Create sys tray
  create_tray();
  g_tray.setToolTip('SnapMail v' + app.getVersion());
  const menu = Menu.buildFromTemplate(trayMenuTemplate);
  g_tray.setContextMenu(menu);

  // Create main window
  g_mainWindow = createWindow();

  // Load splashscreen
  try {
    await g_mainWindow.loadURL(g_switchingUrl);
  } catch(err) {
    log('error', 'loadURL() failed:');
    log('error',{err});
  }

  // Start Conductor
  try {
    // if bootstrapUrl not set, prompt it, otherwise
    if(g_bootstrapUrl === "") {
      g_bootstrapUrl = DEFAULT_BOOTSTRAP_URL;
      await promptNetworkType(true);
      log('debug', 'network type prompt done. Can MDNS: ' + g_canMdns);
      if (!g_canMdns) {
        /// Use default bootstrap url
        // await promptBootstrapUrl(true);
      } else {
        let menu = Menu.getApplicationMenu();
        menu.getMenuItemById('join-network').enabled = false;
        menu.getMenuItemById('switch-network').enabled = false;
        menu.getMenuItemById('change-bootstrap').enabled = false;
      }
    }
    await startConductor(true);
  } catch (err) {
    log('error','Holochain init failed:');
    log('error',{err});
    if (g_mainWindow !== null && g_mainWindow !== undefined) {
      await g_mainWindow.loadURL(g_errorUrl);
    } else {
      //app.quit();
    }
  }
});


/**
 * This event will be emitted inside the primary instance of your application
 * when a second instance has been executed.
 * and calls app.requestSingleInstanceLock().
 */
app.on('second-instance', (_event) => {
  log('warn','\n\n second-instance detected !!! \n\n')
});


/**
 * When main window has been closed and the application will quit, destroy conductor subprocess
 */
app.on('will-quit', (event) => {
  log('debug','*** App "will-quit"');
  if (!g_canQuit) {
    event.preventDefault();
    //killHolochain();
  }
});


/**
 * Quit when all windows are closed.
 */
app.on('window-all-closed', function () {
  log('debug','*** App "window-all-closed"');
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    //g_canQuit = true;
    app.quit();
  }
});


/**
 *
 */
app.on('activate', function () {
  log('debug','*** App "activate"');
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (g_mainWindow === null || g_mainWindow === undefined) {
    g_mainWindow = createWindow();
  } else {
    g_mainWindow.show();
  }
});


/**
 *
 */
app.on('before-quit', function () {
  log('debug','*** App "before-quit"');
  g_canQuit = true;
});


//--------------------------------------------------------------------------------------------------
// -- PROMPTS
//--------------------------------------------------------------------------------------------------

/**
 * @returns false if user cancelled
 */
async function promptNetworkType(canExitOnCancel) {
  let r = await prompt({
    title: 'Select network type',
    height: 180,
    width: 300,
    alwaysOnTop: true,
    label: 'Choose network type:',
    value: g_proxyUrl,
    type: 'select',
    selectOptions: {
      'false': 'Bootstrap server (WAN)',
      'true': 'mDNS (LAN)',
    }
  });
  if(r === null) {
    log('debug','user cancelled. Can exit: ' + canExitOnCancel);
    if (canExitOnCancel) {
      app.quit();
    }
  } else {
    log('debug','promptNetworkType result: ' + r);
    g_canMdns = r === 'true';
  }
  return r !== null
}


/**
 * @returns false if user cancelled
 */
async function promptBootstrapUrl(canExitOnCancel) {
  let r = await prompt({
    title: 'SnapMail: Bootstrap Server URL',
    height: 180,
    width: 600,
    alwaysOnTop: true,
    label: 'URL:',
    value: g_bootstrapUrl,
    inputAttrs: {
      required: true,
      type: 'url'
    },
    type: 'input'
  });
  if(r === null) {
    log('debug','user cancelled. Can exit: ' + canExitOnCancel);
    if (canExitOnCancel) {
      app.quit();
    }
  } else {
    log('debug','result: ' + r);
    g_bootstrapUrl = r;
  }
  return r !== null
}


/**
 *
 */
async function promptFirstHandle() {
  let r = await prompt({
    title: 'SnapMail: Starting Username',
    height: 180,
    width: 500,
    alwaysOnTop: true,
    label: 'Username:',
    value: "<noname>",
    inputAttrs: {
      required: true,
      minlength: "3",
      pattern: "[a-zA-Z0-9\-_.]+",
      type: 'string'
    },
    type: 'input'
  });
  if(r === null) {
    log('debug','user cancelled. Exiting');
    app.quit();
  }
  return r;
}


/**
 * @returns false if user cancelled
 */
async function promptUid(canExitOnCancel) {
  let r = await prompt({
    title: 'SnapMail: Join new Network',
    height: 180,
    width: 500,
    alwaysOnTop: true,
    label: 'Network Access Key:',
    value: g_uid,
    inputAttrs: {
      minlength: "2",
      required: true,
      pattern: "[a-zA-Z0-9\-_.]+",
      type: 'string'
    },
    type: 'input'
  });
  if(r === null) {
    log('debug','user cancelled. Can exit: ' + canExitOnCancel);
    if (canExitOnCancel) {
      app.quit();
    }
  } else {
    addUid(r)
  }
  return r !== null
}


function addUid(newUid) {
  log('debug','addUid(): ' + newUid);
  g_uid = newUid;
  try {
    fs.appendFileSync(g_appConfigPath, g_uid + '\n');
    g_uidList.push(g_uid);
  } catch (err) {
    log('error','Writing config file failed: ' + err);
  }
}


/**
 * @returns false if user cancelled
 */
async function promptUidSelect(canExitOnCancel) {
  let selectOptions = {};
  const uniq = [...new Set(g_uidList)];
  for (const uid of uniq) {
    selectOptions[uid] = uid;
  }
  let r = await prompt({
    title: 'Select network',
    height: 180,
    width: 300,
    alwaysOnTop: true,
    label: 'Choose network:',
    value: g_uid,
    type: 'select',
    selectOptions,
  });
  if(r === null) {
    log('debug','user cancelled. Can exit: ' + canExitOnCancel);
    if (canExitOnCancel) {
      app.quit();
    }
  } else {
    log('debug','promptUidSelect result: ' + r);
    g_uid = r;
    g_settingsStore.set('uid', g_uid);
  }
  return r !== null
}

/**
 * @returns false if user cancelled
 */
async function promptCanProxy() {
  let {response} = await dialog.showMessageBox(g_mainWindow, {
    title: `Proxy`,
    message: "Do you want to use a proxy?",
    defaultId: 0,
    buttons: ['Yes', 'No'],
    type: "question",
    noLink: true,
  });
  log('warn', 'promptCanProxy: ' + response);
  g_canProxy = response === 0;
  return g_canProxy;
}

/**
 * @returns false if user cancelled
 */
async function promptProxyUrl(canExitOnCancel) {
  let r = await prompt({
    title: 'Proxy Server URL',
    height: 180,
    width: 800,
    alwaysOnTop: true,
    label: 'URL:',
    value: g_proxyUrl,
    inputAttrs: {
      required: true,
      type: 'url'
    },
    type: 'input'
  });
  if(r === null) {
    log('debug','user cancelled. Can exit: ' + canExitOnCancel);
    if (canExitOnCancel) {
      app.quit();
    }
  } else {
    log('debug','result: ' + r);
    g_proxyUrl = r;
  }
  return r !== null
}


// /**
//  *
//  */
// function showErrorDialog(message) {
//   dialog.showMessageBox(g_mainWindow, {
//     title: 'Application error',
//     buttons: ['OK'],
//     type: 'error',
//     message,
//   });
// }


/**
 *
 */
async function showAbout() {
  if (g_uid === undefined) {
    g_dnaHash = await getDnaHash(g_adminWs, g_uid);
  }
  let netHash = g_dnaHash || "(unknown)";
  await dialog.showMessageBox({
    width: 900,
    title: `About ${app.getName()}`,
    message: `${app.getName()} - v${app.getVersion()}`,
    detail: `A minimalist email app on Holochain from Glass Bead Software\n\n`
      + `Zome hash:\n${DNA_HASH}\n\n`
      + `DNA hash of "${g_uid}":\n${netHash}\n\n`
      + g_holochain_version + ''
      + g_lair_version + `\n`,
    buttons: ['OK'],
    type: "info",
    //iconIndex: 0,
    //icon: CONFIG.ICON,
    //icon: app.getFileIcon(path)
  }, {});
}


/**
 *
 */
async function confirmExit() {
  let dontConfirmOnExit = g_settingsStore.get("dontConfirmOnExit");
  //let r = await prompt({
  let {response, checkboxChecked} = await dialog.showMessageBox(g_mainWindow, {
    //width: 800,
    title: `Confirm Exit`,
    message: "Incoming messages will not arrive until you relaunch SnapMail.\n" +
      "Are you sure you want to exit?",
    defaultId: 2,
    buttons: ['Just minimize Snapmail', 'Cancel', 'Exit'],
    type: "question",
    checkboxLabel: "Don't ask again, just exit",
    checkboxChecked: dontConfirmOnExit,
    noLink: true,
    //icon: app.getFileIcon(path)
  });

  //log('silly', response);
  //log('silly', checkboxChecked);
  g_settingsStore.set("dontConfirmOnExit", checkboxChecked);

  switch (response) {
    case 0: {
      g_mainWindow.hide();
      break;
    }
    case 2: {
      return true;
      //break;
    }
    default:
  }
  return false;
}

//--------------------------------------------------------------------------------------------------
// -- MENUS
//--------------------------------------------------------------------------------------------------

const optionsMenuTemplate = [
  {
    id: 'launch-at-startup',
    label: 'Launch at startup',
    type: 'checkbox',
    click: function (menuItem, _browserWindow, _event) {
      updateAutoLaunchSetting(menuItem.checked);
    },
  },
  {
    id: 'notify-msg',
    label: 'Allow Notifications',
    type: 'checkbox',
    click: function (menuItem, _browserWindow, _event) {
      updateNotificationSetting(menuItem.checked);
    },
  },
];


/**
 * In this file you can include the rest of your app's specific main process code.
 * You can also put them in separate files and require them here.
 */
const networkMenuTemplate = [
  {
    id: 'join-network',
    label: 'Join new Network',
    click: async function () {
      let changed = await promptUid(false);
      if (changed) {
        await g_mainWindow.loadURL(g_switchingUrl);
        await g_mainWindow.setEnabled(false);
        g_dnaHash = await installApp(g_adminWs, g_uid);
        await startConductor(false);
        await g_mainWindow.setEnabled(true);
      }
    },
  },
  {
    id: 'switch-network',
    label: 'Switch Network',
    click: async function () {
      let changed = await promptUidSelect(false);
      if (changed) {
        await g_mainWindow.loadURL(g_switchingUrl);
        await g_mainWindow.setEnabled(false);
        await startConductor(false);
        await g_mainWindow.setEnabled(true);
      }
    },
  },
  {
    type: 'separator'
  },
  {
    label: 'Change Network type',
    click: async function () {
      let changed = await promptNetworkType(false);
      let menu = Menu.getApplicationMenu();
      menu.getMenuItemById('join-network').enabled = !g_canMdns;
      menu.getMenuItemById('switch-network').enabled = !g_canMdns;
      menu.getMenuItemById('change-bootstrap').enabled = !g_canMdns;
      if (changed) {
        await startConductor(true);
      }
    },
  },
  {
    id: 'change-bootstrap',
    label: 'Change Bootstrap Server',
    click: async function () {
      let changed = await promptBootstrapUrl(false);
      if (changed) {
        await startConductor(true);
      }
    }
  },
  {
    label: 'Change Proxy Server',
    click: async function () {
      const prevCanProxy = g_canProxy;
      let canProxy = await promptCanProxy();
      const proxyChanged = prevCanProxy !== canProxy;
      if (canProxy) {
        let changed = await promptProxyUrl(false);
        if(changed || proxyChanged) {
          await startConductor(true);
        }
      } else  {
        if(proxyChanged) {
          await startConductor(true);
        }
      }
    }
  },
];


const debugMenuTemplate = [
  // {
  //   label: 'Dump logs', click: function() {
  //     log('debug', {process})
  //   }
  // },
  {
    label: 'Open Config Folder',
    click: function () {
      shell.openExternal('file://' + CONFIG_PATH);
      //shell.openItem(CONFIG_PATH);
    },
    //icon: 'assets/icon.png'
  },
  {
    label: 'Open Log File',
    click: function () {
      shell.openExternal('file://' + logger.transports.file.file);
      //shell.openItem(logger.transports.file.file);
    },
  },
  {
    label: 'devTools',
    click: function () {
      g_mainWindow.webContents.openDevTools();
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
  {
    label: 'Restart Conductor', click: async function () {
      await startConductor(false);
    }
  },
  {
    label: 'Reload window', click: async function () {
      g_mainWindow.reload();
    }
  },

];


/**
 *
 */
const mainMenuTemplate = [
  {
    label: 'File', submenu: [{
        label:`Check for Update`,
      click: function () {
          checkForUpdates(this);
        }
      }, {
      label: 'Quit',
      //accelerator: 'Command+Q',
      click: async function () {
        let dontConfirmOnExit = g_settingsStore.get("dontConfirmOnExit");
        if (dontConfirmOnExit) {
          app.quit();
        } else {
          let canExit = await confirmExit();
          if (canExit) {
            app.quit();
          }
        }
      },
    },
    ],
  },
  {
    label: 'Network',
    submenu: networkMenuTemplate,
  },
  {
    label: 'Options',
    submenu: optionsMenuTemplate,
  },
  {
    label: 'Debug',
    submenu: debugMenuTemplate,
  },
  {
    label: 'Help', submenu: [{
      label: 'Report bug / issue',
      click: function () {
        shell.openExternal(REPORT_BUG_URL)
        //g_mainWindow.loadURL(REPORT_BUG_URL)
       }
      },
      {
        type: 'separator'
      },
      {
      label: 'About',
      //accelerator: 'Command+A',
      click: async function () {
        await showAbout();
      },
    },],
  },
];


/**
 *
 */
const trayMenuTemplate = [
  { label: 'Tray / Untray', click: function () { g_mainWindow.isVisible()? g_mainWindow.hide() : g_mainWindow.show();  }  },
  //{ label: 'Settings', submenu: networkMenuTemplate },
  {
    label: 'Switch network',
    click: async function () {
      let changed = await promptUidSelect(false);
      if(changed) {
        await g_mainWindow.setEnabled(false);
        await startConductor(false);
        await g_mainWindow.setEnabled(true);
      }
    }
  },
  //{ label: 'Debug', submenu: debugMenuTemplate },
  { type: 'separator' },
  { label: 'About', click: async function () { await showAbout(); } },
  { type: 'separator' },
  { label: 'Exit', click: function () { app.quit() } }
];


//--------------------------------------------------------------------------------------------------
// -- FINALIZE
//--------------------------------------------------------------------------------------------------

Menu.setApplicationMenu(Menu.buildFromTemplate(mainMenuTemplate));
