import {FileManifest} from "./bindings/snapmail.types";
import {ContactGridItem} from "./viewModel/snapmail.perspective";
import {AppSignal} from "@holochain/client/lib/api/app/types";
import {Notification} from "@vaadin/notification";
import {SnapmailPage} from "./elements/snapmail-page";

/** -- APP SETUP -- **/
/* @ts-ignore */
export const ELECTRON_API = window.electronAPI
// export let APP_ID = 'snapmail'
// export let HC_PORT: any;
 export let DEV_MODE: any;
// export let NETWORK_ID: any = null


 if (ELECTRON_API) {
//   //console.log(ELECTRON_API)
//   console.log(ELECTRON_API.versions)
//   APP_ID = 'snapmail-app'
   DEV_MODE = ELECTRON_API.DEV_MODE;
//   let searchParams = new URLSearchParams(window.location.search);
//   HC_PORT = searchParams.get("APP");
//   NETWORK_ID = searchParams.get("UID");
 } else {
//   HC_PORT = process.env.HC_PORT;
   DEV_MODE = process.env.DEV_MODE;
}
 console.log("  DEV_MODE =", DEV_MODE)
// console.log("   HC_PORT =", HC_PORT);
// console.log("NETWORK_ID =", NETWORK_ID);

/** Remove console.log() in PROD */
if (DEV_MODE !== 'dev') {
  console.log = () => {};
}


/** -- GLOBAL CONTROLLER -- **/
/** Need a way to get the controller in callbacks */

export let g_controller: SnapmailPage | null = null;


export function setController(controller: SnapmailPage) {
  g_controller = controller
}

export function getController(): SnapmailPage {
  console.assert(g_controller)
  return g_controller!;
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

