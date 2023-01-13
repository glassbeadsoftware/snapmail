import {ContactGridItem} from "./viewModel/snapmail.perspective";
import {SnapmailPage} from "./elements/snapmail-page";

// /** -- APP SETUP -- **/
export let DEV_MODE: string;
export const MY_ELECTRON_API = (window as any).myElectronAPI;
console.log("MY_ELECTRON_API = ", MY_ELECTRON_API);
 if (MY_ELECTRON_API) {
   DEV_MODE = MY_ELECTRON_API.DEV_MODE;
 } else {
   DEV_MODE = process.env.DEV_MODE;
}
 console.log("  DEV_MODE =", DEV_MODE)



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
  if (!MY_ELECTRON_API) {
    return;
  }
  const reply = MY_ELECTRON_API.newCountAsync(newCount);
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

