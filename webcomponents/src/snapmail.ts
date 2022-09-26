import {htos} from './utils'

import {
  ContactGridItem,
  FileManifest,
} from "./types";
import {AppSignal} from "@holochain/client/lib/api/app/types";
import {Notification} from "@vaadin/notification";
import {SnapmailController} from "./elements/snapmail-controller";


/** Remove console.log() in PROD */
if (process.env.DEV_MODE === 'prod') {
  console.log = () => {};
}

/**
 * get controller hack
 * FIXME for some reason, 'this' is null if methods of SnapmailController are used as arguments
 * ex: handleSignal, onEvery10sec
 */
export function getController(): SnapmailController {
  const app = document.querySelector("snapmail-app") as HTMLElement;
  const controller = app.shadowRoot!.querySelector("snapmail-controller") as SnapmailController;
  console.log({controller})
  return controller;
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

    // if (DNA.IS_ELECTRON && window.require) {
    //   //console.log("handleSignal for ELECTRON");
    //
    //   console.log(mail);
    //   const author_name = this._usernameMap.get(htos(mail.author)) || 'unknown user';
    //
    //   /** ELECTRON NOTIFICATION */
    //   const NOTIFICATION_TITLE = 'New mail received from ' + author_name;
    //   const NOTIFICATION_BODY = signalwrapper.data.payload.ReceivedMail.mail.subject;
    //   //const CLICK_MESSAGE = 'Notification clicked';
    //
    //   // - Do Notification directly from web UI
    //   //new Notification(NOTIFICATION_TITLE, { body: NOTIFICATION_BODY })
    //   //  .onclick = () => console.log(CLICK_MESSAGE)
    //
    //   /* Notify Electron main */
    //   const ipc = window.require('electron').ipcRenderer;
    //   const reply = ipc.sendSync('newMailSync', NOTIFICATION_TITLE, NOTIFICATION_BODY);
    //   console.log(reply);
    // }

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


/** Find and collect grid items that have the given agentIds */
export function ids_to_items(ids: string[], items: ContactGridItem[]) {
  const filtered = [];
  for (const id of ids) {
    for (const item of items) {
      //const itemStr = htos(item.agentId);
      if (item.agentIdB64 === id) {
        filtered.push(item);
        break;
      }
    }
  }
  return filtered;
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
  // if (DNA.IS_ELECTRON && window.require) {
  //   //console.log("handleSignal for ELECTRON");
  //   const ipc = window.require('electron').ipcRenderer;
  //   const reply = ipc.send('newCountAsync', newCount);
  //   console.log(reply);
  // }
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
