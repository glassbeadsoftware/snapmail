import {htos} from './utils'

import {
  ContactGridItem,
  FileManifest,
} from "./types";
import {AppSignal} from "@holochain/client/lib/api/app/types";
import {Notification} from "@vaadin/notification";
import {SnapmailController} from "./elements/snapmail-controller";

/** -- APP SETUP -- **/
/* @ts-ignore */
export const ELECTRON_API = window.electronAPI
export let APP_ID = 'snapmail'
export let HC_PORT: any;
export let DEV_MODE: any;
export let NETWORK_ID: any = null

if (ELECTRON_API) {
  //console.log(ELECTRON_API)
  console.log(ELECTRON_API.versions)
  APP_ID = 'snapmail-app'
  DEV_MODE = ELECTRON_API.DEV_MODE;
  let searchParams = new URLSearchParams(window.location.search);
  HC_PORT = searchParams.get("APP");
  NETWORK_ID = searchParams.get("UID");
} else {
  HC_PORT = process.env.HC_PORT;
  DEV_MODE = process.env.DEV_MODE;
}
console.log("  DEV_MODE =", DEV_MODE)
console.log("   HC_PORT =", HC_PORT);
console.log("NETWORK_ID =", NETWORK_ID);

/** Remove console.log() in PROD */
if (DEV_MODE !== 'dev') {
  console.log = () => {};
}


/** -- GLOBAL CONTROLLER -- **/
/** Need a way to get the controller in callbacks */

export let g_controller: SnapmailController | null = null;


export function setController(controller: SnapmailController) {
  g_controller = controller
}

export function getController(): SnapmailController {
  console.assert(g_controller)
  return g_controller!;
}


/** -- CALLBACKS -- **/


/** Setup recurrent pull from DHT every 10 seconds */
export function onEvery10sec() {
  console.log("**** onEvery10sec CALLED ****");
  if (DEV_MODE === 'dev') {
    return;
  }
  const controller = getController();
  try {
    controller.getAllFromDht();
  } catch(e) {
    console.error("onEvery10sec.getAllFromDht() failed: ", e)
  }
}


/** Stuff to do every 1 second */
export function onEverySec() {
  // console.log("**** onEverySec CALLED ****");
  if (DEV_MODE === 'dev') {
    return;
  }
  const controller = getController();
  try {
    if (controller._canPing) {
      controller.pingNextAgent();
    }
  } catch(e) {
    console.error("onEverySec.pingNextAgent() failed: ", e)
  }
}


/** */
export function handleSignal(signalwrapper: AppSignal) {
  console.log('Received signal:', signalwrapper)
  /** Check valid signal type */
  if (signalwrapper.type !== undefined && signalwrapper.type !== "Signal") {
    return;
  }
  const controller = getController();
  /** Handle signal */
  if (Object.prototype.hasOwnProperty.call(signalwrapper.data.payload,'ReceivedMail')) {
    const item = signalwrapper.data.payload.ReceivedMail;
    console.log("received_mail:", item);
    const notification = controller.shadowRoot!.getElementById('notifyMail') as Notification;
    notification.open();

    const mail = signalwrapper.data.payload.ReceivedMail;
    const pingedAgentB64 = htos(mail.author);
    controller.storePingResult({}, pingedAgentB64);

    if (ELECTRON_API) {
      //console.log("handleSignal for ELECTRON");
      console.log({mail});
      const author_name = controller._usernameMap.get(htos(mail.author)) || 'unknown user';

      /** ELECTRON NOTIFICATION */
      const NOTIFICATION_TITLE = 'New mail received from ' + author_name;
      const NOTIFICATION_BODY = signalwrapper.data.payload.ReceivedMail.mail.subject;
      //const CLICK_MESSAGE = 'Notification clicked';

      // - Do Notification directly from web UI
      //new Notification(NOTIFICATION_TITLE, { body: NOTIFICATION_BODY })
      //  .onclick = () => console.log(CLICK_MESSAGE)

      /* Notify Electron main */
      const reply = ELECTRON_API.newMailSync(NOTIFICATION_TITLE, NOTIFICATION_BODY)
      console.log({reply});
    }

    controller.getAllMails();
    return;
  }
  if (Object.prototype.hasOwnProperty.call(signalwrapper.data.payload,'ReceivedAck')) {
    const item = signalwrapper.data.payload.ReceivedAck;
    console.log("received_ack:", item);
    const pingedAgentB64 = htos(item.from);
    controller.storePingResult({}, pingedAgentB64);
    const notification = controller.shadowRoot!.getElementById('notifyAck') as Notification;
    notification.open();
    controller.getAllMails();
    return;
  }
  if (Object.prototype.hasOwnProperty.call(signalwrapper.data.payload,'ReceivedFile')) {
    const item = signalwrapper.data.payload.ReceivedFile;
    console.log("received_file:", item);
    const notification = controller.shadowRoot!.getElementById('notifyFile') as Notification;
    notification.open();
    return
  }
}


/** -- FUNCTIONS -- **/

/** Find and collect grid items that have the given agentIds */
export function ids_to_items(ids: string[], items: ContactGridItem[]) {
  const subGroup = [];
  for (const id of ids) {
    for (const item of items) {
      //const itemStr = htos(item.agentId);
      if (item.agentIdB64 === id) {
        subGroup.push(item);
        break;
      }
    }
  }
  return subGroup;
}


/** */
export function filterMails(mailItems: any[] /*GridItems*/, searchValue: string) {
  const searchTerm = (searchValue || '').trim();
  const matchesTerm = (value: string) => {
    return value.toLowerCase().indexOf(searchTerm.toLowerCase()) >= 0;
  };
  const filteredItems = mailItems.filter((item) => {
    //console.log({item});
    return (
      !searchTerm
      || matchesTerm(item.username)
      || matchesTerm(item.subject)
      || matchesTerm(item.content)
    );
  });
  return filteredItems;
}


//---------------------------------------------------------------------------------------------------------------------
// Zome call Callbacks
//---------------------------------------------------------------------------------------------------------------------

// /** Generic callback: log response */
// function logCallResult(callResult) {
//   if (callResult === undefined || callResult.Err !== undefined) {
//     const err = callResult.Err || 'unknown error';
//     console.error('Zome call failed:');
//     console.error(err);
//     return;
//   }
//   //console.debug('callResult = ' + JSON.stringify(callResult));
// }



/** */
export function updateTray(newCount: number): void {
  if (!ELECTRON_API) {
    return;
  }
  const reply = ELECTRON_API.newCountAsync(newCount);
  console.log({reply});

}


// /** */
// function handle_findAgent(callResult) {
//   let button = document.getElementById('handleDisplay');
//   if (callResult.Err !== undefined) {
//     const err = callResult.Err;
//     console.error('findAgent dna call failed');
//     console.error(err);
//     button.title = "";
//     return;
//   }
//   button.title = callResult[0];
// }


// /** */
// function handle_acknowledgeMail(callResult: any): void {
//   if (!callResult || callResult.Err !== undefined) {
//     const err = callResult.Err;
//     console.error('AcknowledgeMail zome call failed');
//     console.error(err);
//     return;
//   }
//   getAllMails();
// }


/** */
export function handle_getChunk(callResult: any): string | null {
  if (!callResult || callResult.Err !== undefined) {
    const err = callResult.Err;
    console.error('GetChunk zome call failed');
    console.error(err);
    return null;
  }
  const chunk = callResult;
  console.log({chunk});
  return chunk
}


/** */
export function handle_findManifest(callResult: any): FileManifest | null {
  if (!callResult || callResult.Err !== undefined) {
    const err = callResult.Err;
    console.error('FindManifest zome call failed');
    console.error(err);
    return null;
  }
  const maybeManifest = callResult;
  console.log({maybeManifest});
  return maybeManifest;
}
