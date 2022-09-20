import type {Grid} from '@vaadin/grid';

// import '@vaadin/vaadin-icons';
// import '@vaadin/vaadin-icons/vaadin-icons';
// import '@vaadin/vaadin-lumo-styles';
// import '@vaadin/vaadin-lumo-styles/icons';
// import '@vaadin/vaadin-ordered-layout';
// //import '@vaadin-component-factory/vcf-tooltip';

import * as DNA from './rsm_bridge'
import {htos} from './utils'

import {
  ContactGridItem,
  FileManifest,
} from "./types";


//---------------------------------------------------------------------------------------------------------------------
// DEBUG MODE
//---------------------------------------------------------------------------------------------------------------------

if (process.env.NODE_ENV === 'prod') {
  console.log = () => {};
}


//window.Buffer = require('buffer/').Buffer;


/** Find and collect grid items that have the given agentIds */
export function ids_to_items(ids: string[], items: any) {
  const filtered = [];
  for (const id of ids) {
    for (const item of items) {
      const itemStr = htos(item.agentId);
      if (itemStr === id) {
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


/** */
export function toggleContact(contactGrid: Grid, contactItem?: ContactGridItem) {
  if (!contactItem) {
    return;
  }
  let nextType = '';
  switch(contactItem.recipientType) {
    case '': nextType = 'to'; break;
    case 'to': nextType = 'cc'; break;
    case 'cc': nextType = 'bcc'; break;
    case 'bcc': {
      nextType = '';
      console.log({activeItem:contactGrid.activeItem})
      const index = contactGrid.selectedItems!.indexOf(contactItem)
      if (index > -1) {
        contactGrid.selectedItems!.splice(index, 1);
      }
      break;
    }
    default: console.error('unknown recipientType');
  }
  contactItem.recipientType = nextType;
}


/** */
export function selectUsername(contactGrid: Grid, candidate: string, count: number) {
  for(let contactItem of contactGrid.items!) {
    if(contactItem.username === candidate) {
      for (let i = 0; i < count; i++) {
        toggleContact(contactGrid, contactItem);
      }
      contactGrid.selectedItems.push(contactItem);
      contactGrid.activeItem = contactItem;
      break;
    }
  }
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
  if (DNA.IS_ELECTRON && window.require) {
    //console.log("handleSignal for ELECTRON");
    const ipc = window.require('electron').ipcRenderer;
    const reply = ipc.send('newCountAsync', newCount);
    console.log(reply);
  }
}


// /** */
// function handle_findAgent(callResult) {
//   let button = document.querySelector('#handleDisplay');
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