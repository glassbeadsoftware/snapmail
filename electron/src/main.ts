/** Public Modules */
import * as path from 'path'
import {
  app, BrowserWindow, Menu, shell, Tray, Notification,
  nativeImage, globalShortcut, dialog,
  MenuItemConstructorOptions, RelaunchOptions
} from 'electron';
import prompt from 'electron-prompt';
import AutoLaunch from 'auto-launch';
import { autoUpdater } from 'electron-updater';
import IS_DEV from 'electron-is-dev';

/** Holochain Modules */

//import {AdminWebsocket} from "@holochain/client";

import initAgent, {
  StateSignal,
  STATUS_EVENT,
  APP_PORT_EVENT,
  ERROR_EVENT,
  HOLOCHAIN_RUNNER_QUIT,
  /*LAIR_KEYSTORE_QUIT,*/
} from "@lightningrodlabs/electron-holochain"

/** My Modules */
import {
  UID_LIST_FILENAME,
  CONFIG_PATH,
  CURRENT_DIR,
  REPORT_BUG_URL,
  NETWORK_URL,
  INDEX_URL,
  IS_DEBUG,
  ICON_FILEPATH,
  BACKGROUND_COLOR,
  LINUX_ICON_FILE,
  SPLASH_FILE,
  DEVELOPMENT_UI_URL,
  USER_DATA_PATH,
  APP_DATA_PATH,
  DNA_VERSION_FILENAME,
  RUNNING_ZOME_HASH_FILEPATH,
  MAIN_FILE,
  BINARY_PATHS,
  RUNNER_VERSION, DEFAULT_BOOTSTRAP_URL, DEFAULT_PROXY_URL, FAVICON_PATH
} from './constants';
import { log, electronLogger } from './logger';
import { pingBootstrap } from "./spawn";

import {loadUserSettings, SettingsStore} from './userSettings'
import {addUidToDisk, initApp} from "./init";
import {createHolochainOptions, loadDnaVersion, stateSignalToText} from "./holochain";
import {NetworkSettings} from "./networkSettings";
import {loadNetworkConfig, saveNetworkConfig} from "./networkSettings";
import MenuItem = Electron.MenuItem;
import {StatusUpdates} from "@lightningrodlabs/electron-holochain/src/holochain";


/**********************************************************************************************************************/
/*  PRE-INIT
/**********************************************************************************************************************/

require('electron-context-menu')();
require('fix-path')();

/** Set holochain logging output level */
process.env.WASM_LOG="WARN";
process.env.RUST_LOG="WARN";

/** Determine platform */
let IS_LINUX = false
if (process.platform !== "win32" && process.platform !== 'darwin') {
  // TODO: check for android?
  IS_LINUX = true
}

/** Add Holochain bins to PATH for windows */
if (process.platform === "win32") {
  const BIN_PATH = path.join(CURRENT_DIR, "bin");
  log('debug', 'BIN_PATH = ' + BIN_PATH);
  process.env.PATH += ';' + BIN_PATH;
}


/**********************************************************************************************************************/
/*  GLOBALS
/**********************************************************************************************************************/

/** STATE */
/**
 * Keep a global reference of the ELECTRON window object, if you don't,
 * the window will be closed automatically when the JavaScript object is garbage collected.
 */
let g_mainWindow: BrowserWindow | null = null;
let g_tray: Tray | null = null;
let g_updater: MenuItem | null = null;
// let g_holochain_proc = undefined;
// let g_keystore_proc = undefined;
// let g_adminWs: AdminWebsocket = undefined;
// let g_cellId: CellId = undefined;
let g_canQuit = false;
let g_uid = '';


/** */
let g_sessionDataPath: string;
//let g_runner_version = 'holochain runner version (unknown)'
//let g_lair_version = 'lair version (unknown)'
let g_statusEmitter: StatusUpdates;
let g_shutdown:() => Promise<void>;

let g_startingHandle: string;


/** values retrieved from holochain */
let g_appPort = '0';
let g_dnaIdB64: string;
let g_dnaVersion: string | undefined;

/** Settings */
let g_userSettings: SettingsStore;
let g_uidList: string[] = [];
let g_networkSettings: NetworkSettings = {
  canProxy: true,
  canMdns: false,
  bootstrapUrl: DEFAULT_BOOTSTRAP_URL,
  proxyUrl: DEFAULT_PROXY_URL,
}


/**********************************************************************************************************************/
/*  SETUP
/**********************************************************************************************************************/

/** -- Check AutoLaunch -- */

const autoLauncher = new AutoLaunch({
  name: "Snapmail happ",
  isHidden: true,
});


/**********************************************************************************************************************/
/*  auto-update
/**********************************************************************************************************************/

autoUpdater.autoDownload = false;
//autoUpdater.logger = require("electron-log")
//autoUpdater.logger.transports.file.level = "info"

autoUpdater.on('error', (error:any) => {
  dialog.showErrorBox('Error: ', error == null ? "unknown" : (error.stack || error).toString());
})

autoUpdater.on('update-available', (info:any) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Found Update',
    message: 'A software update has been found (v' + info.version + '), do you want to update now?',
    buttons: ['Yes', 'No']
  }).then((buttonIndex) => {
    if (buttonIndex.response === 0) {
      autoUpdater.downloadUpdate().then((paths:any) => {log('debug', 'download array: ' + JSON.stringify(paths))});
    }
    else {
      g_updater!.enabled = true;
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
  g_updater!.enabled = true;
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

/** export this to MenuItem click callback */
function checkForUpdates(menuItem: MenuItem, /*_focusedWindow, _event*/): void {
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
        from github: https://github.com/glassbeadsoftware/snapmail/releases'
      }).then(() => {});
    } else {
      g_updater = menuItem;
      g_updater.enabled = false;
      autoUpdater.checkForUpdates();
    }
  }
}


/**********************************************************************************************************************/
/*  IPC between UI and Main
/**********************************************************************************************************************/

const ipc = require('electron').ipcMain;

// ipc.on('app_version', (event) => {
//   event.sender.send('app_version', { version: app.getVersion() });
// });


ipc.on('startingInfo', async (event, startingHandle, dnaHash) => {
  //log('info', "startingInfo.startingHandle = " + startingHandle);
  //log('info', "startingInfo.dnaHash = " + dnaHash);
  g_startingHandle = startingHandle;
  g_dnaIdB64 = Buffer.from(dnaHash).toString('base64')
  //log('info', "dnaHash = " + g_dnaHash);
  let firstUsername = "<noname>";
  if (g_startingHandle === "<noname>") {
    firstUsername = await promptFirstHandle();
    //await ipc.call("setHandle", firstUsername)
    log('info', "firstUsername set: " + firstUsername);
  }
  event.returnValue = firstUsername;
});


/**
 * Receive synchronous notification
 * Launch Notification if allowed
 */
ipc.on('newMailSync', (event, title, body) => {
  const canNotify = g_userSettings.get('canNotify');
  log('debug', "newMailSync.title = " + title);
  log('debug', "canNotify = " + canNotify);
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
  const append = newCount === 0 ? '' : ' (' + newCount + ')';
  if (g_tray) {
    g_tray.setToolTip('SnapMail v' + app.getVersion() + append);
  }
  event.returnValue = true;
});

ipc.on('exitNetworkStatus', (event) => {
  const indexUrl = INDEX_URL + g_appPort + '&UID=' + g_uid;
  g_mainWindow?.loadURL(indexUrl)
})


/** Receive and reply to asynchronous message */
ipc.on('bootstrapStatus', (event) => {
  const succeeded = pingBootstrap(g_networkSettings.bootstrapUrl);
  event.sender.send('bootstrapStatusReply', g_networkSettings.bootstrapUrl, succeeded);
});

ipc.on('networkInfo', async (event) => {
  console.log("*** RECEIVED networkInfo request")

  // const dump = await g_adminWs.dumpState({cell_id: g_cellId});
  // const dht_dump = dump[0].integration_dump;
  // console.log({dht_dump})
  // const peer_dump = dump[0].peer_dump;
  //console.log({peer_dump})
  //console.log(JSON.stringify(peer_dump))
  const peer_count = 42; // FIXME peer_dump.peers.length;
  event.sender.send('networkInfoReply', peer_count, g_networkSettings);
});


// function showNotification () {
//   const NOTIFICATION_TITLE = 'Basic Notification'
//   const NOTIFICATION_BODY = 'Notification from the Main process'
//   new Notification({ title: NOTIFICATION_TITLE, body: NOTIFICATION_BODY }).show()
// }


/**********************************************************************************************************************/
/*  Functions
/**********************************************************************************************************************/


/** */
function delay(ms:number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/** Create sys tray electron object */
function createTray(): Tray {
  let tray;
  try {
    tray = new Tray('web/favicon.png');
  } catch(e) {
    try {
      tray = new Tray('resources/app/web/favicon.png');
    } catch(e) {
      try {
        tray = new Tray(app.getAppPath() + '/web/favicon.png');
      } catch(e) {
        log('error', "Could not find favicon. appPath: " + app.getAppPath());
        tray = new Tray(nativeImage.createEmpty());
      }
    }
  }
  return tray;
}


/** */
function updateAutoLaunchSetting(canAutoLaunch: boolean | undefined): void {
  if (canAutoLaunch === undefined) {
    canAutoLaunch = g_userSettings.get('canAutoLaunch');
  }
  g_userSettings.set('canAutoLaunch', canAutoLaunch);
  if (canAutoLaunch) {
    autoLauncher.enable();
  } else {
    autoLauncher.disable();
  }
}


/** */
function updateNotificationSetting(canNotify: boolean): void {
  if (canNotify === undefined) {
    canNotify = g_userSettings.get('canNotify');
  }
  g_userSettings.set('canNotify', canNotify);
}



/**
 *
 */
const createSplashWindow = (): BrowserWindow => {
  /** Create the browser window */
  const splashWindow = new BrowserWindow({
    height: 450,
    width: 850,
    center: true,
    resizable: false,
    frame: false,
    show: false,
    backgroundColor: BACKGROUND_COLOR,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      devTools: true,
      webgl: false,
      sandbox: false,
      enableWebSQL: false,
    },
    icon: process.platform === 'linux'? LINUX_ICON_FILE : ICON_FILEPATH,
  })
    /** once its ready to show, show */
    splashWindow.once('ready-to-show', () => {
      log("debug", 'ready-to-show');
      splashWindow.show()
    })
  // /** Things to setup at start */
  // let { x, y } = g_userSettings.get('windowPosition');
  // splashWindow.setPosition(x, y);

  /** and load it */
  if (app.isPackaged) {
    splashWindow.loadFile(SPLASH_FILE)
  } else {
    /** development */
    //splashWindow.webContents.openDevTools();
    splashWindow.loadURL(`${DEVELOPMENT_UI_URL}/splashscreen.html`)
  }

  /** Done */
  return splashWindow
}



/**
 *
 */
const createMainWindow = async (appPort: string): Promise<BrowserWindow> => {
  /** Create the browser window */
  const { width, height } = g_userSettings.get('windowBounds');
  const title = "Snapmail v" + app.getVersion() + " - " + g_uid
  const options: Electron.BrowserWindowConstructorOptions = {
    height,
    width,
    title: IS_DEBUG? "[DEBUG] " + title : title,
    show: false,
    backgroundColor: BACKGROUND_COLOR,
    // use these settings so that the ui can check paths
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: true,
      devTools: true,
      webgl: false,
      enableWebSQL: false,
    },
    icon: process.platform === 'linux'? LINUX_ICON_FILE : ICON_FILEPATH,
  }
  console.log({__dirname})
  let mainWindow: BrowserWindow | null = new BrowserWindow(options)

  /** Things to setup at start */
  const { x, y } = g_userSettings.get('windowPosition');
  mainWindow.setPosition(x, y);

  globalShortcut.register('f5', function() {
    //console.log('f5 is pressed')
    mainWindow?.reload()
  })

  if (IS_DEBUG) {
    mainWindow.webContents.openDevTools();
  }

  /** load the index.html of the app */
  let mainUrl = app.isPackaged? MAIN_FILE : path.join(DEVELOPMENT_UI_URL, "index.html")
  mainUrl += "?APP=" + appPort + "&UID=" + g_uid
  log('info', "createMainWindow ; mainUrl = " + mainUrl)
  try {
    await mainWindow.loadURL("file://" + mainUrl)
  } catch(err) {
    log('error', 'loadURL() failed:');
    log('error', err);
  }

  /** Open <a href='' target='_blank'> with default system browser */
  mainWindow.webContents.on('new-window', function (event, url) {
    event.preventDefault()
    log('info', "new-window ; open: " + url)
    shell.openExternal(url).then(_r => {});
  })
  /** once its ready to show, show */
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('resize', () => {
    // The event doesn't pass us the window size,
    // so we call the `getBounds` method which returns an object with
    // the height, width, and x and y coordinates.
    const { width, height } = mainWindow!.getBounds();
    // Now that we have them, save them using the `set` method.
    g_userSettings.set('windowBounds', { width, height });
  });

  /** Save position on close */
  mainWindow.on('close', async (event) => {
    const positions = mainWindow!.getPosition();
    g_userSettings.set('windowPosition', { x: Math.floor(positions[0]), y: Math.floor(positions[1]) });
    if (g_canQuit) {
      log('info', 'WINDOW EVENT "close" -> canQuit')
      //await tryToShutdown();
      mainWindow = null;
    } else {
      event.preventDefault();
      mainWindow!.hide();
    }
  })

  /** Emitted when the window is closed. */
  mainWindow.on('closed', async function () {
    log('info', 'WINDOW EVENT "closed"');
    //await tryToShutdown();
    // /** Wait for kill subprocess to finish on slow machines */
    // let start = Date.now();
    // let diff = 0;
    // do {
    //   diff = Date.now() - start;
    // } while(diff < 1000);
    // log('info', '*** Holochain Closed\n');
    /**
     * Dereference the window object, usually you would store windows
     * in an array if your app supports multi windows, this is the time
     * when you should delete the corresponding element.
     */
    g_mainWindow = null;
    // g_statusEmitter = null;
  });

  /** Done */
  return mainWindow
}



//
// /** Create the main window global */
// function createWindow(): BrowserWindow {
//   const { width, height } = g_userSettings.get('windowBounds');
//   let title = "Snapmail v" + app.getVersion() + " - " + g_uid
//   let mainWindow = new BrowserWindow({
//     width,
//     height,
//     title,
//     webPreferences: {
//       nodeIntegration: true,
//       contextIsolation: false,
//       devTools: true,
//       webgl: false,
//       enableWebSQL: false,
//     },
//     icon: ICON_FILEPATH,
//     //autoHideMenuBar: true,
//   });
//   const { x, y } = g_userSettings.get('windowPosition');
//   mainWindow.setPosition(x, y);
//
//   globalShortcut.register('f5', function() {
//     //console.log('f5 is pressed')
//     mainWindow.reload()
//   })
//
//   if (IS_DEBUG) {
//     mainWindow.webContents.openDevTools();
//   }
//
//   /**
//    * The BrowserWindow class extends the node.js core EventEmitter class, so we use that API
//    * to listen to events on the BrowserWindow. The resize event is emitted when the window size changes.
//    */
//   mainWindow.on('resize', () => {
//     /** The event doesn't pass us the window size,
//      * so we call the `getBounds` method which returns an object with
//      * the height, width, and x and y coordinates.*/
//     const { width, height } = mainWindow.getBounds();
//     /** Now that we have them, save them using the `set` method. */
//     g_userSettings.set('windowBounds', { width, height });
//   });
//
//   // Open <a href='' target='_blank'> with default system browser
//   mainWindow.webContents.on('new-window', function (event, url) {
//     event.preventDefault();
//     shell.openExternal(url).then(_r => {});
//   });
//
//   /** Open DevTools */
//   if (IS_DEBUG) mainWindow.webContents.openDevTools();
//
//   /** Emitted on request to close window */
//   mainWindow.on('close', (event) => {
//     log('debug', '*** mainWindow "close" - ' + g_canQuit);
//     const positions = mainWindow.getPosition();
//     g_userSettings.set('windowPosition', { x: Math.floor(positions[0]), y: Math.floor(positions[1]) });
//     if (g_canQuit) {
//       mainWindow = null;
//     } else {
//       event.preventDefault();
//       mainWindow.hide();
//     }
//   })
//
//   /** Emitted when the window is closed. */
//   mainWindow.on('closed', function () {
//     log('debug', '*** mainWindow "closed"');
//     try {
//       killHolochain().then(() => {
//         log('info', '*** Holochain promise Closed');
//       });
//     } catch (err) {
//       log('error', '*** Error while closing Holochain:');
//       log('error', err);
//     }
//     /** Wait for kill subprocess to finish on slow machines */
//     const start = Date.now();
//     let diff = 0;
//     do {
//       diff = Date.now() - start;
//     } while(diff < 1000);
//     log('info', '*** Holochain Closed');
//     /**
//      * Dereference the window object, usually you would store windows
//      * in an array if your app supports multi windows, this is the time
//      * when you should delete the corresponding element.
//      */
//     g_mainWindow = null;
//   });
//
//   //// Check for update
//   //mainWindow.once('ready-to-show', () => {
//   //  autoUpdater.checkForUpdatesAndNotify();
//   //});
//
//   /** Done */
//   return mainWindow;
// }



//
// /** */
// async function spawnHolochainProc(): Promise<ChildProcessWithoutNullStreams> {
//   log('debug','spawnHolochainProc...');
//   const bin = HOLOCHAIN_BIN;
//   const args = ['-c', g_conductorConfigFilePath];
//
//   /** Spawn "holochain" subprocess */
//   log('info', 'Spawning ' + bin + ' (dirname: ' + CURRENT_DIR + ') | spawnHolochainProc()');
//   const holochain_proc = spawn(bin, args, {
//     cwd: CURRENT_DIR,
//     detached: false,
//     //stdio: 'pipe',
//     env: {
//       ...process.env,
//       RUST_BACKTRACE: "1",
//     },
//   });
//   if (!holochain_proc) {
//     throw new Error("Failed to spawn holochain's magic ready string from child process");
//   }
//   /** Handle error output */
//   holochain_proc.stderr.on('data', (data) => log('error', '*** holochain > ' + data.toString()));
//   /** if "holochain" exit, close the app */
//   holochain_proc.on('exit', (code, signal) => {
//     if (signal) {
//       log('info', `holochain process terminated due to receipt of signal ${signal}`)
//     } else {
//       log('info', `holochain process terminated with exit code ${code}`)
//     }
//     // g_canQuit = true;
//     if (g_canQuit) {
//       app.quit();
//     }
//   });
//   /** Wait for holochain to boot up */
//   log('info', 'holochain <-> waiting for magic ready string');
//   const promise: Promise<void> = await new Promise(async (resolve, reject) => {
//     const start_time = Date.now()
//     let total_output = ""
//     holochain_proc.stdout.on('data', (data) => {
//       const output = data.toString();
//       total_output += output
//       log('info', 'holochain: ' + output);
//       if(output.indexOf(HC_MAGIC_READY_STRING) > -1) {
//         const regex = /###ADMIN_PORT:([0-9]*)###/gm;
//         const match = regex.exec(total_output);
//         //log('debug', {match});
//         if (match === undefined || match === null || match.length === 0) {
//           log('warn', 'ADMIN port not found in holochain total_output:');
//           log('warn', {total_output});
//           return;
//         }
//         g_adminPort = parseInt(match[1]);
//         //log('info', {total_output});
//         resolve();
//       } else {
//         log('info', 'holochain <- waiting for magic ready string');
//       }
//     });
//     while(Date.now() - start_time < 60 * 1000) {
//       await delay(100);
//     }
//     reject(new Error("Failed to retrieve holochain's magic ready string from child process"))
//   });
//   /** Done */
//   await promise;
//   return holochain_proc;
// }


// /** * Make sure there is no outstanding holochain procs */
// async function killHolochain(): Promise<void> {
//   /** SIGTERM by default */
//   let canWaitForHolochain = false;
//   if(g_holochain_proc && g_holochain_proc.pid) {
//     canWaitForHolochain = true;
//     log('info', 'Killing holochain sub processes...');
//     kill(g_holochain_proc.pid, function(err) {
//       canWaitForHolochain = false;
//       if(!err) {
//         log('info', 'killed all holochain sub processes');
//       } else {
//         log('error', err)
//       }
//     });
//   }
//   let canWaitForKeystore = false;
//   if(g_keystore_proc && g_keystore_proc.pid) {
//     canWaitForKeystore = true;
//     log('info', 'Killing lair-keystore sub processes...');
//     kill(g_keystore_proc.pid, function(err) {
//       canWaitForKeystore = false;
//       if(!err) {
//         log('info', 'killed all lair-keystore sub processes');
//       } else {
//         log('error', err)
//       }
//     });
//   }
//   /* Wait for the kill commands to complete */
//   log('info', 'waiting...');
//   const start_time = Date.now()
//   while(canWaitForHolochain || canWaitForKeystore) {
//     await delay(10);
//     if (Date.now() - start_time > 5 * 1000) {
//       log('error', 'Killing sub-processes TIMED-OUT. Aborted.');
//       break;
//     }
//   }
//   log('info', 'Killing sub-processes DONE.');
// }


// /**
//  * Prepare conductor config and spawn holochain subprocess
//  * @param canRegenerateConfig - Regenerate the conductor config before relaunching the holochain process.
//  */
// async function startConductorAndLoadPage(canRegenerateConfig: boolean): Promise<void> {
//   //g_canQuit = false;
//   await killHolochain(); // Make sure there is no outstanding Holochain & keystore procs
//   g_lair_version = getKeystoreVersion(LAIR_KEYSTORE_BIN);
//   g_keystore_proc = await spawnKeystore(LAIR_KEYSTORE_BIN, g_sessionStoragePath);
//   //await sleep(2000);
//   if (canRegenerateConfig) {
//     generateConductorConfig(g_conductorConfigFilePath, g_sessionStoragePath, g_adminPort, g_networkSettings);
//   }
//   log('info', 'Launching conductor...');
//   //g_canQuit = true;
//
//   let indexUrl;
//   try {
//     const res = pingBootstrap(g_networkSettings.bootstrapUrl)
//     log('info', 'bootstrap result: ' + res)
//     /** - Spawn Conductor */
//     g_holochain_version = getHolochainVersion();
//     // await sleep(1000); // Time buffer to make sure holochain process closed
//     g_holochain_proc = await spawnHolochainProc();
//     /** - Connect to Conductor and activate app */
//     g_adminWs = await connectToAdmin(g_adminPort);
//     const activeAppPort = await hasActivatedApp(g_adminWs);
//     if(activeAppPort === 0) {
//       // - Prompt for first UID
//       if (!g_networkSettings.canMdns) {
//           g_uid = '<my-network-access-key>';
//           await promptUid(true, g_mainWindow);
//       } else {
//         addUid("local-mdns")
//       }
//       await installApp(g_adminWs, g_uid);
//       // log('debug','Attaching to app at ' + g_appPort + ' ...');
//       g_appPort = await g_adminWs.attachAppInterface({port: undefined});
//       log('debug', {g_appPort});
//       g_appPort = g_appPort.port;
//       log('info','App Interface attached: ' + g_appPort);
//     } else {
//       g_appPort = activeAppPort;
//       /** - Prompt for UID selection or prefered UID if multiple uid found */
//       if (g_uid === '' && g_uidList !== undefined && g_uidList.length > 0) {
//         const maybe_uid = g_userSettings.get('uid');
//         if (maybe_uid !== undefined) {
//           g_uid = maybe_uid;
//         } else {
//           g_uid = g_uidList[0];
//           if(g_uidList.length > 1) {
//             await promptUidSelect(false);
//           }
//         }
//       }
//     }
//     indexUrl = INDEX_URL + g_appPort + '&UID=' + g_uid;
//     log('debug', indexUrl);
//     g_dnaHash = await getDnaHash(g_adminWs, g_uid);
//   } catch (err) {
//     log('error', 'Conductor setup failed:');
//     log('error',{err});
//     //indexUrl = INDEX_URL;
//     await g_mainWindow.loadURL(ERROR_URL);
//     return;
//     //// Better to kill app if holochain not connected
//     //app.quit();
//   }
//   /** -- Check username -- */
//   try
//   {
//     const installed_app_id = SNAPMAIL_APP_ID + '-' + g_uid;
//     const appWs = await connectToApp(g_appPort);
//     const appInfo = await appWs.appInfo({ installed_app_id }, 3000);
//     log('debug', {appInfo});
//     if (appInfo === null) {
//       throw new Error("happ not installed in conductor: " + installed_app_id)
//     }
//     g_cellId = appInfo.cell_data[0].cell_id;
//     const username = await appWs.callZome({
//         cap: null,
//         cell_id: g_cellId,
//         zome_name: "snapmail",
//         fn_name: "get_my_handle",
//         provenance: g_cellId[1],
//         payload: undefined,
//       }
//       , 9999
//     );
//     log('debug', "username found: " + username);
//     if (username === "<noname>") {
//       const firstUsername = await promptFirstHandle(true);
//       const result = await appWs.callZome({
//           cap: null,
//           cell_id: g_cellId,
//           zome_name: "snapmail",
//           fn_name: "set_handle",
//           provenance: g_cellId[1],
//           payload: firstUsername,
//         }
//         , 9999
//       );
//       log('debug', "username set: " + JSON.stringify(result));
//     }
//   } catch(err) {
//     log('error', "*** Calling zome for initial username failed.");
//     log('error', {err});
//     await g_mainWindow.loadURL(ERROR_URL);
//     return;
//     //alert("Holochain failed.\n Connection to holochain might be lost.
//     // Reload App or refresh web page to attempt reconnection");
//   }
//   /** -- trigger refresh once we know interfaces have booted up -- **/
//   log('debug',"Loading index.html: " + indexUrl);
//   try {
//     await g_mainWindow.loadURL(indexUrl);
//   } catch(err) {
//     log('error', 'loadURL() failed:');
//     log('error',{err});
//   }
// }



/**
 *
 */
async function startMainWindow(splashWindow: BrowserWindow) {
  /** Init conductor */
  const opts = createHolochainOptions(g_uid, g_sessionDataPath, g_networkSettings)
  log('info', opts)

  try {
    const {statusEmitter, shutdown} = await initAgent(app, opts, BINARY_PATHS)
    g_statusEmitter = statusEmitter;
    g_shutdown = shutdown;
  } catch (e) {
    log('error', e)
    if (g_mainWindow == null && splashWindow) {
      splashWindow.webContents.send('status', e)
    }
    return;
  }
  g_statusEmitter.on(STATUS_EVENT, async (event: string | StateSignal | Error) => {
    const state = event as StateSignal;
    log('info', "STATUS EVENT: " + stateSignalToText(state) + " (" + state + ")")
    switch (state) {
      case StateSignal.IsReady:
        log('debug', "STATUS EVENT: IS READY")
        // Its important to create the window before closing the current one
        // otherwise this triggers the 'all-windows-closed' event
        g_mainWindow = await createMainWindow(g_appPort)
        splashWindow.close()
        g_mainWindow.show()
        break
      default:
        if (splashWindow) {
          splashWindow.webContents.send('status', stateSignalToText(state as StateSignal))
        }
    }
  })
  g_statusEmitter.on(APP_PORT_EVENT, (appPort: string | StateSignal | Error) => {
    log('info', "APP_PORT_EVENT: " + appPort)
    g_appPort = appPort as string;
  })
  g_statusEmitter.on(ERROR_EVENT, (error: string | StateSignal | Error) => {
    const error_msg = error;
    log('error', error_msg)
    if (g_mainWindow == null && splashWindow) {
      splashWindow.webContents.send('status', error_msg)
    }
  })
  g_statusEmitter.on(HOLOCHAIN_RUNNER_QUIT, () => {
    const msg = "HOLOCHAIN_RUNNER_QUIT event received"
    log('warn', msg)
    if (g_mainWindow) {
      promptHolochainError(g_mainWindow, msg)
    } else {
      if (splashWindow) {
        splashWindow.webContents.send('status', msg)
      }
    }
    //app.quit()
  })
  // g_statusEmitter.on(LAIR_KEYSTORE_QUIT, (e:any) => {
  //   const msg = "LAIR_KEYSTORE_QUIT event received"
  //   log('warn', msg)
  //   if (g_mainWindow) {
  //     promptHolochainError(g_mainWindow, msg)
  //   } else {
  //     if (splashWindow) {
  //       splashWindow.webContents.send('status', msg)
  //     }
  //   }
  //  //app.quit()
  //})
}


/**
 * This method will be called when Electron has finished initialization and is ready to create browser windows.
 * Some APIs can only be used after this event occurs.
 */
app.on('ready', async () => {
  log('debug', "ELECTRON READY - " + __dirname)
  /** Load user settings */
  g_userSettings = loadUserSettings(1920, 1080);
  /** Check menu items */
  const maybeMenu = Menu.getApplicationMenu()
  const submenu = maybeMenu!.getMenuItemById('options').submenu;
  const item = submenu.getMenuItemById('launch-at-startup');
  item.checked = g_userSettings.get('canAutoLaunch')
  const item2 = submenu.getMenuItemById('notify-msg');
  item2.checked = g_userSettings.get('canNotify')
  /** Show splashscreen */
  const splashWindow = createSplashWindow()
  /** init app */
  {
    const {sessionDataPath, uidList} = initApp(USER_DATA_PATH, APP_DATA_PATH, DNA_VERSION_FILENAME, RUNNING_ZOME_HASH_FILEPATH, UID_LIST_FILENAME);
    g_sessionDataPath = sessionDataPath
    g_uidList = uidList
    g_dnaVersion = loadDnaVersion(sessionDataPath)
    /** Load network settings */
    const maybeNetworkSettings = loadNetworkConfig(g_sessionDataPath)
    if (maybeNetworkSettings) {
      g_networkSettings = maybeNetworkSettings;
    }
  }
  /** Determine starting UID */
  const maybeUid = g_userSettings.get("lastUid")
  const hasUid = maybeUid? g_uidList.includes(maybeUid): false;
  if (hasUid) {
    g_uid = maybeUid
  } else {
    if (g_uidList.length == 0) {
      while (!splashWindow.isVisible()) {
        await delay(20)
      }
      await promptUid(true, splashWindow);
    }
    g_uid = g_uidList[0]
    g_userSettings.set('lastUid', g_uid)
  }
  log('debug', "g_uid: " + g_uid);
  g_sessionDataPath = path.join(g_sessionDataPath, g_uid)
  log('debug', "g_sessionDataPath: " + g_sessionDataPath);

  /** Create sys tray */
  g_tray = createTray();
  g_tray.setToolTip('Snapmail v' + app.getVersion());
  const menu = Menu.buildFromTemplate(trayMenuTemplate);
  g_tray.setContextMenu(menu);

  /** Start holochain and main window */
  await startMainWindow(splashWindow)

  /** -- Check username -- */
  let time = 0;
  while (!g_startingHandle && time < 10 * 1000) {
    await delay(100);
    time += 100;
  }
  log('debug', "g_startingHandle found: " + g_startingHandle);
})



// /**
//  * This method will be called when Electron has finished initialization and is ready to create browser windows.
//  * Some APIs can only be used after this event occurs.
//  */
// app.on('ready', async function () {
//   log('info', 'Electron App ready. Init app...');
//
//   /** Read zome_hash.txt in app folder */
//   g_zomeHash = loadRunningZomeHash();
//   log('info', "SNAPMAIL ZOME HASH: " + g_zomeHash);
//   /** setup storage folder */
//   setupStorage(g_sessionStoragePath, g_zomeHash)
//
//   /** -- Read Globals from current conductor config -- */
//   {
//     const { networkSettings, adminPort } = loadConductorConfig(g_conductorConfigFilePath);
//     g_networkSettings = networkSettings;
//     g_adminPort = adminPort;
//   }
//   g_uidList = loadUidList(g_uidListFilePath);
//
//   /** Get user Settings */
//   const { width, height } = screen.getPrimaryDisplay().workAreaSize;
//   const default_width = Math.min(width, 1400);
//   const default_height = Math.min(height, 950);
//
//   const x = Math.floor((width - default_width) / 2);
//   const y = Math.floor((height - default_height) / 2);
//
//   g_userSettings = new SettingsStore({
//     /** We'll call our data file 'user-preferences' */
//     configName: 'user-preferences',
//     defaults: {
//       windowBounds: { width: default_width, height: default_height },
//       canAutoLaunch: false,
//       windowPosition: {x, y},
//       dontConfirmOnExit: false,
//       canNotify: false,
//     }
//   });
//
//   /** Check AutoLaunch */
//   updateAutoLaunchSetting();
//
//   /** Modify main menu */
//   const mainMenu = Menu.getApplicationMenu();
//   const item = mainMenu.getMenuItemById('launch-at-startup');
//   item.checked = g_userSettings.get('canAutoLaunch');
//
//   item = mainMenu.getMenuItemById('notify-msg');
//   item.checked = g_userSettings.get('canNotify');
//
//   /** Create sys tray */
//   g_tray = createTray();
//   g_tray.setToolTip('SnapMail v' + app.getVersion());
//   const menu = Menu.buildFromTemplate(trayMenuTemplate);
//   g_tray.setContextMenu(menu);
//
//   /** Create main window */
//   g_mainWindow = createWindow();
//
//   /** Load splashscreen */
//   try {
//     await g_mainWindow.loadURL(SWITCHING_URL);
//   } catch(err) {
//     log('error', 'loadURL() failed:');
//     log('error',{err});
//   }
//
//   /** Start Conductor */
//   /** if bootstrapUrl not set, prompt it, otherwise */
//   if(g_networkSettings.bootstrapUrl === "") {
//     g_networkSettings.bootstrapUrl = DEFAULT_BOOTSTRAP_URL;
//     await promptNetworkType(true);
//     log('debug', 'network type prompt done. Can MDNS: ' + g_networkSettings.canMdns);
//     if (!g_networkSettings.canMdns) {
//       //// Use default bootstrap url
//       // await promptBootstrapUrl(true);
//     } else {
//       const menu = Menu.getApplicationMenu();
//       menu.getMenuItemById('join-network').enabled = false;
//       menu.getMenuItemById('switch-network').enabled = false;
//       menu.getMenuItemById('change-bootstrap').enabled = false;
//     }
//   }
//   await startConductorAndLoadPage(true);
// });


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
  }
});


/**
 * Quit when all windows are closed.
 */
app.on('window-all-closed', async () => {
  log('info', 'APP EVENT "window-all-closed"')
  if (process.platform !== 'darwin') {
    await tryToShutdown();
    app.quit()
  }
});


/** */
app.on('activate', async () => {
  log('debug','*** App "activate"');
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow(g_appPort)
  }
});


/** */
app.on('before-quit', function () {
  log('debug','*** App "before-quit"');
  g_canQuit = true;
});


/**
 *
 */
async function tryToShutdown() {
  try {
    log('debug', {g_shutdown})
    if (g_shutdown) {
      log('info', 'calling g_shutdown()...');
      await g_shutdown();
    }
  } catch (e) {
    log('error', 'g_shutdown() failed: '+ e);
  }
}



async function restart() {
  log('debug', "*** Restarting...");
  g_mainWindow = null;
  //g_statusEmitter = null;
  //await tryToShutdown();
  log('debug', "*** Restarting: RELAUNCH");

  if (app.isPackaged && process.env.APPIMAGE) {
    log('debug', "*** ... with APPIMAGE: " + process.env.APPIMAGE);
    //log('debug', "*** ... with execPath: " + process.execPath);

    // // Pipe errors if console.log() is called + plus possible other issues when relaunching again
    // const options: RelaunchOptions = {
    //   args: process.argv.slice(1).concat(['--relaunch']),
    //   execPath: process.execPath
    // };
    // execFile(process.env.APPIMAGE, options.args);
    // app.quit();
    // return;

    // FUSE can still fail
    const options: RelaunchOptions = {
      execPath: process.env.APPIMAGE,
      args:['--appimage-extract-and-run']
    };
    //console.log({options})
    app.relaunch(options)
  } else {
    app.relaunch()
  }
  app.exit(0)
}


/**********************************************************************************************************************/
/*  PROMPTS
/**********************************************************************************************************************/

/**
 * @returns false if user cancelled
 */
async function promptNetworkType(canExitOnCancel: boolean): Promise<boolean> {
  const r = await prompt({
    title: 'Select network type',
    height: 180,
    width: 300,
    alwaysOnTop: true,
    label: 'Choose network type:',
    icon: CURRENT_DIR + FAVICON_PATH,
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
    g_networkSettings.canMdns = r === 'true';
    saveNetworkConfig(g_sessionDataPath, g_networkSettings);
  }
  return r !== null
}


/**
 * @returns false if user cancelled
 */
async function promptBootstrapUrl(canExitOnCancel: boolean): Promise<boolean> {
  const r = await prompt({
    title: 'SnapMail: Bootstrap Server URL',
    height: 180,
    width: 600,
    alwaysOnTop: true,
    label: 'URL:',
    icon: CURRENT_DIR + FAVICON_PATH,
    value: g_networkSettings.bootstrapUrl,
    inputAttrs: {
      required: 'true',
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
    g_networkSettings.bootstrapUrl = r;
    saveNetworkConfig(g_sessionDataPath, g_networkSettings);
    const res = pingBootstrap(r)
    log('info', 'bootstrap result: ' + res)
  }
  return r !== null
}


/** */
async function promptFirstHandle(): Promise<string> {
  const r = await prompt({
    title: 'SnapMail: Starting Username',
    height: 180,
    width: 500,
    alwaysOnTop: true,
    label: 'Username:',
    icon: CURRENT_DIR + FAVICON_PATH,
    value: "<noname>",
    inputAttrs: {
      required: 'true',
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
  return r!;
}


/**
 * @returns false if user cancelled
 */
async function promptUid(canExitOnCancel: boolean, parentBrowserWindow: BrowserWindow): Promise<boolean> {
  const r = await prompt({
    title: 'SnapMail: Join new Network',
    height: 180,
    width: 500,
    alwaysOnTop: true,
    label: 'Network Access Key:',
    icon: CURRENT_DIR + FAVICON_PATH,
    value: g_uid,
    //parentBrowserWindow,
    inputAttrs: {
      minlength: "2",
      required: 'true',
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
    let sessionPath = g_sessionDataPath;
    if (g_uid) {
      sessionPath = path.join(g_sessionDataPath, "../")
    }
    const succeeded = addUidToDisk(r, sessionPath, UID_LIST_FILENAME);
    if (succeeded) {
      g_uid = r
      g_uidList.push(r)
      g_userSettings.set('lastUid', g_uid);
    }
  }
  return r !== null
}


// function addUid(newUid: string): void {
//   log('debug','addUid(): ' + newUid);
//   g_uid = newUid;
//   try {
//     fs.appendFileSync(g_uidListFilePath, g_uid + '\n');
//     g_uidList.push(g_uid);
//   } catch (err) {
//     log('error','Writing config file failed: ' + err);
//   }
// }


/**
 * @returns false if user cancelled
 */
async function promptUidSelect(canExitOnCancel: boolean): Promise<boolean> {
  const selectOptions: any = {};
  const uidSet = new Set(g_uidList)
  const uniq = Array.from(uidSet.values());
  for (const uid of uniq) {
    selectOptions[uid] = uid;
  }
  const r = await prompt({
    title: 'Select network',
    height: 180,
    width: 300,
    alwaysOnTop: true,
    label: 'Choose network:',
    value: g_uid,
    icon: CURRENT_DIR + FAVICON_PATH,
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
    g_userSettings.set('uid', g_uid);
  }
  return r !== null
}

/**
 * @returns false if user cancelled
 */
async function promptCanProxy(): Promise<boolean> {
  const {response} = await dialog.showMessageBox(g_mainWindow!, {
    title: `Proxy`,
    message: "Do you want to use a proxy?",
    defaultId: 0,
    buttons: ['Yes', 'No'],
    type: "question",
    noLink: true,
  });
  log('warn', 'promptCanProxy: ' + response);
  g_networkSettings.canProxy = response === 0;
  return g_networkSettings.canProxy;
}


/**
 * @returns false if user cancelled
 */
async function promptProxyUrl(canExitOnCancel: boolean): Promise<boolean> {
  const r = await prompt({
    title: 'Proxy Server URL',
    height: 180,
    width: 800,
    alwaysOnTop: true,
    label: 'URL:',
    icon: CURRENT_DIR + FAVICON_PATH,
    value: g_networkSettings.proxyUrl,
    inputAttrs: {
      required: 'true',
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
    g_networkSettings.proxyUrl = r;
    saveNetworkConfig(g_sessionDataPath, g_networkSettings);
  }
  return r !== null
}


/**
 *
 */
async function showAbout() {
  log("info", `[${RUNNER_VERSION}] DNA hash of "${g_uid}": ${g_dnaIdB64}\n`)
  await dialog.showMessageBoxSync(g_mainWindow!, {
    //width: 900,
    title: `About ${app.getName()}`,
    message: `${app.getName()} - v${app.getVersion()}`,
    detail: `A minimalist email app on Holochain from Glass Bead Software\n\n`
      + `DNA Version:\n${g_dnaVersion}\n`
      + `DNA hash of "${g_uid}":\n${g_dnaIdB64}\n\n`
      + '' + RUNNER_VERSION + ''
      //+ '' + LAIR_VERSION
      + `\n`,
    buttons: ['OK'],
    type: "info",
    //iconIndex: 0,
    //icon: CONFIG.ICON,
    //icon: app.getFileIcon(path)
  });
}


/**
 *
 */
async function confirmExit(): Promise<boolean> {
  const dontConfirmOnExit = g_userSettings.get("dontConfirmOnExit");
  //let r = await prompt({
  const {response, checkboxChecked} = await dialog.showMessageBox(g_mainWindow!, {
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
  g_userSettings.set("dontConfirmOnExit", checkboxChecked);

  switch (response) {
    case 0: {
      g_mainWindow!.hide();
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


/**
 *
 */
async function promptHolochainError(browserWindow: BrowserWindow, msg: string) {
  await dialog.showMessageBoxSync(browserWindow, {
    //width: 900,
    title: `Fatal Error`,
    message: `Holochain not running`,
    detail: `${msg}`,
    buttons: ['OK'],
    type: "error",
  });
}


/**********************************************************************************************************************/
/*  MENUS
/**********************************************************************************************************************/

const optionsMenuTemplate: Array<MenuItemConstructorOptions> = [
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
const networkMenuTemplate: Array<MenuItemConstructorOptions> = [
  {
    id: 'join-network',
    label: 'Join new Network',
    click: async function (menuItem, browserWindow, _event) {
      const changed = await promptUid(false, g_mainWindow!);
      if (changed) {
        await restart();
      }
    },
  },
  {
    id: 'switch-network',
    label: 'Switch Network',
    click: async function (menuItem, _browserWindow, _event) {
      const changed = await promptUidSelect(false);
      if (changed) {
        await restart();
      }
    },
  },
  {
    type: 'separator'
  },
  {
    label: 'Change Network type',
    click: async function () {
      const changed = await promptNetworkType(false);
      if (changed) {
        await restart();
      }
    },
  },
  {
    id: 'change-bootstrap',
    label: 'Change Bootstrap Server',
    click: async function () {
      const changed = await promptBootstrapUrl(false);
      if (changed) {
        await restart();
      }
    }
  },
  {
    label: 'Change Proxy Server',
    click: async function () {
      const prevCanProxy = g_networkSettings.canProxy;
      const canProxy = await promptCanProxy();
      const proxyChanged = prevCanProxy !== canProxy;
      if (canProxy) {
        const changed = await promptProxyUrl(false);
        if(changed || proxyChanged) {
          await restart();
        }
      } else  {
        if(proxyChanged) {
          saveNetworkConfig(g_sessionDataPath, g_networkSettings);
          await restart();
        }
      }
    }
  },
];


/** */
const debugMenuTemplate: Array<MenuItemConstructorOptions> = [
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
  },
  {
    label: 'Open Log File',
    click: function () {
      shell.openExternal('file://' + electronLogger.transports.file.file);
      //shell.openItem(logger.transports.file.file);
    },
  },
  {
    label: 'devTools',
    role: "toggleDevTools",
    // click: function () {
    //   g_mainWindow.webContents.openDevTools();
    // },
  },
  // {
  //   label: 'Show PATHS',
  //   click: function () {
  //     dialog.showMessageBoxSync(g_mainWindow, {
  //       type: 'info',
  //       title: 'Constants',
  //       message: 'BIN_PATH: ' + BIN_PATH + '\n' + 'process.env.path: ' + JSON.stringify(process.env.PATH),
  //     });
  //   },
  // },
  {
    id: 'debug-network',
    label: 'Debug network',
    click: async function () {
      const currentURL = g_mainWindow!.webContents.getURL();
      const currentFilename = currentURL.substring(currentURL.lastIndexOf('/')+1);
      const networkFilename = NETWORK_URL.substring(NETWORK_URL.lastIndexOf('/')+1);
      //console.log({currentFilename})
      if (networkFilename != currentFilename) {
        await g_mainWindow!.loadURL(NETWORK_URL);
        //const succeeded = pingBootstrap(g_bootstrapUrl);
      } else {
        const indexUrl = INDEX_URL + g_appPort + '&UID=' + g_uid;
        await g_mainWindow!.loadURL(indexUrl);
      }
    }
  },
  {
    label: 'Restart Conductor',
    click: async function () {
      await restart()
    }
  },
  {
    label: 'Reload window',
    accelerator: 'F5',
    click: async function () {
      g_mainWindow!.reload();
    }
  },

];


/** */
const mainMenuTemplate: Array<MenuItemConstructorOptions> = [
  {
    label: 'File',
    submenu: [{
        label:`Check for Update`,
      click: function (menuItem: MenuItem, browserWindow: Electron.BrowserWindow | undefined, event: Electron.KeyboardEvent) {
          //log('info', menuItem)
          checkForUpdates(menuItem);
        }
      }, {
      label: 'Quit',
      //accelerator: 'Command+Q',
      click: async function () {
        const dontConfirmOnExit = g_userSettings.get("dontConfirmOnExit");
        if (dontConfirmOnExit) {
          app.quit();
        } else {
          const canExit = await confirmExit();
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
    id: 'options',
    submenu: optionsMenuTemplate,
  },
  {
    label: 'Debug',
    submenu: debugMenuTemplate,
  },
  {
    label: 'Help', submenu: [{
      label: 'Report bug / issue',
      click: function (menuItem, _browserWindow, _event) {
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
      click: async function (menuItem, _browserWindow, _event) {
        await showAbout();
      },
    },],
  },
];


/**
 *
 */
const trayMenuTemplate: Array<MenuItemConstructorOptions> = [
  { label: 'Tray / Untray', click: function (menuItem, _browserWindow, _event) {
      g_mainWindow!.isVisible()? g_mainWindow!.hide() : g_mainWindow!.show();
    }
  },
  //{ label: 'Settings', submenu: networkMenuTemplate },
  {
    label: 'Switch network',
    click: async function (menuItem, _browserWindow, _event) {
      const changed = await promptUidSelect(false);
      if(changed) {
        await restart()
      }
    }
  },
  //{ label: 'Debug', submenu: debugMenuTemplate },
  { type: 'separator' },
  { label: 'About', click: async function (menuItem, _browserWindow, _event) { await showAbout(); } },
  { type: 'separator' },
  { label: 'Exit', role: 'quit' }
];


/**********************************************************************************************************************/
/*  FINALIZE
/**********************************************************************************************************************/

Menu.setApplicationMenu(Menu.buildFromTemplate(mainMenuTemplate));
