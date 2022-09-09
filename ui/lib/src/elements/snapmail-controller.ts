import type {ButtonElement} from '@vaadin/vaadin-button';
import type {GridElement, GridItem} from '@vaadin/vaadin-grid';
import type {ItemElement} from '@vaadin/vaadin-item';
import type {UploadElement} from '@vaadin/vaadin-upload';
//import {} from '@vaadin/vaadin-upload/vaadin-upload.js';
import type {TextFieldElement} from '@vaadin/vaadin-text-field';
import type {MenuBarElement} from '@vaadin/vaadin-menu-bar';
// import '@vaadin/vaadin-list-box';
//import type {SplitLayoutElement} from '@vaadin/vaadin-split-layout';
import type {ProgressBarElement} from '@vaadin/vaadin-progress-bar';
import type {VerticalLayoutElement} from '@vaadin/vaadin-ordered-layout/vaadin-vertical-layout.js';
import type {HorizontalLayoutElement} from '@vaadin/vaadin-ordered-layout/vaadin-horizontal-layout.js';
import type {ComboBoxElement} from '@vaadin/vaadin-combo-box';
import type {TextAreaElement} from '@vaadin/vaadin-text-field/vaadin-text-area';
// import {GridColumnGroupElement} from '@vaadin/vaadin-grid/vaadin-grid-column-group';
// import {GridFilterElement} from '@vaadin/vaadin-grid/vaadin-grid-filter';
// import {GridFilterColumnElement} from '@vaadin/vaadin-grid/vaadin-grid-filter-column';
// import {GridTreeToggleElement} from '@vaadin/vaadin-grid/vaadin-grid-tree-toggle';
// import {GridSortColumnElement} from '@vaadin/vaadin-grid/vaadin-grid-sort-column';
// import {GridSorterElement} from '@vaadin/vaadin-grid/vaadin-grid-sorter';
import {GridSelectionColumnElement} from '@vaadin/vaadin-grid/vaadin-grid-selection-column';
import type {NotificationElement} from '@vaadin/vaadin-notification';
import type {DialogElement} from '@vaadin/vaadin-dialog';
import '@vaadin/vaadin-icons';
import '@vaadin/vaadin-icons/vaadin-icons';
import '@vaadin/vaadin-lumo-styles';
import '@vaadin/vaadin-lumo-styles/icons';
import '@vaadin/vaadin-ordered-layout';
//import '@vaadin-component-factory/vcf-tooltip';

import * as DNA from '../rsm_bridge'
import {arrayBufferToBase64, base64ToArrayBuffer, splitFile,  htos, stoh} from '../utils'
import {systemFolders, isMailDeleted, determineMailCssClass, into_gridItem, into_mailText, is_OutMail, customDateString} from '../mail'

import {version} from '../../package.json';
import {
  ContactGridItem,
  FileManifest,
  HandleItem,
  Mail,
  MailGridItem,
  MailItem,
  SendMailInput,
  UsernameMap
} from "../types";
import {DnaHash} from "@holochain/client/lib/types";
import {ActionHash, EntryHash} from "@holochain/client";
import {PolymerElement} from "@polymer/polymer";

//---------------------------------------------------------------------------------------------------------------------
// DEBUG MODE
//---------------------------------------------------------------------------------------------------------------------

if (process.env.NODE_ENV === 'prod') {
  console.log = () => {};
}

/**
 * Setup recurrent pull from DHT ever 10 seconds
 */
let _10sec = setInterval(onEvery10sec, 10 * 1000);
function onEvery10sec() {
  console.log("**** onEvery10sec CALLED ****");
  if (process.env.NODE_ENV === 'prod') {
    try {
      getAllFromDht();
    } catch(e) {
      console.error("onEvery10sec.getAllFromDht() failed: ", e)
    }
  }
}

/**
 * Setup recurrent pull from DHT ever 10 seconds
 */
let _1Sec = setInterval(onEverySec, 1 * 1000);
function onEverySec() {
  if (process.env.NODE_ENV === 'prod') {
    console.log("**** onEverySec CALLED ****");
    try {
      if (g_canPing) {
        pingNextAgent();
      }
    } catch(e) {
      console.error("onEverySec.pingNextAgent() failed: ", e)
    }
  }
}


window.Buffer = require('buffer/').Buffer;

//---------------------------------------------------------------------------------------------------------------------
// Globals
//---------------------------------------------------------------------------------------------------------------------

const redDot   = String.fromCodePoint(0x1F534);
const greenDot = String.fromCodePoint(0x1F7E2);
const blueDot  = String.fromCodePoint(0x1F535);
const whiteDot  = String.fromCodePoint(0x26AA);


let g_hasAttachment = 0;
let g_chunkList: EntryHash[] = [];
let g_fileList: ActionHash[] = [];

// Map of (agentId -> username)
// agentId is base64 string of a hash
let g_usernameMap: UsernameMap = new Map();
// Map of (agentId -> timestamp of last ping)
let g_pingMap = new Map();
// Map of (agentId -> bool)
let g_responseMap = new Map();
// Map of (mailId -> mailItem)
let g_mailMap = new Map();

let g_dnaId: string;
let g_myAgentHash = null;
let g_myAgentId: string | null = null;
let g_myHandle = '<unknown>';
let g_currentFolder = '';
let g_currentGroup = '';
let g_currentMailItem: any /* : gridItem*/ = {};

let g_canPing = true;
let g_replyOf: ActionHash | null = null;

let g_contactItems: any[] /* gridItem*/ = [];
let g_mailItems: any[] /* gridItem*/ = [];

// Map of (name -> [agentId])
const SYSTEM_GROUP_LIST = ['All', 'new...'];
let g_groupList: Map<string, string[]>
loadGroupList('');


function loadGroupList(dnaId: string) {
  try {
    g_groupList = new Map(JSON.parse(window.localStorage[dnaId]));
  } catch(err) {
    console.error("localStorage parse failed. No contact groups will be loaded. DnaId = " + dnaId);
    console.error({err});
    g_groupList = new Map();
    g_groupList.set('All', []);
  }
  console.log({ g_groupList });
}

//--------------------------------------------------------------------------------------------------
// App
//--------------------------------------------------------------------------------------------------

/**
 * Set on load
 */
window.addEventListener('load', () => {
  initUi();
});


/** */
async function getAllHandles() {
  let callResult = undefined;
  try {
    callResult = await DNA.getAllHandles()
  } catch(e) {
    console.warn("DNA.getAllHandles() failed: ", e)
  }
  handle_getAllHandles(callResult)
}


/** */
async function getAllMails() {
    await getAllHandles();
    try {
      const callResult = await DNA.getAllMails()
      handle_getAllMails(callResult)
    } catch(e) {
      console.warn('DNA.getAllMails() failed: ', e);
    }
    handle_post_getAllMails()
}


// -- Signal Structure -- //
// AppSignal {
//   data: {
//       cellId: [Uint8Array(39), Uint8Array(39)],
//       payload: any,
//     }
//     type: "Signal"
// }
//
function handleSignal(signalwrapper:any/*FIXME*/) {
  console.log('Received signal:')
  console.log({signalwrapper})
  if (signalwrapper.type !== undefined && signalwrapper.type !== "Signal") {
    return;
  }
  // FIXME
  // if (signalwrapper.signal.signal_type !== "User") {
  //   return;
  // }

  if (signalwrapper.data.payload.hasOwnProperty('ReceivedMail')) {
      let item = signalwrapper.data.payload.ReceivedMail;
      console.log("received_mail:");
      console.log({item});
      const notification = document.querySelector('#notifyMail') as NotificationElement;
      notification.open();

      const mail = signalwrapper.data.payload.ReceivedMail;
      const pingedAgentB64 = htos(mail.author);
      storePingResult({}, pingedAgentB64);

      if (DNA.IS_ELECTRON && window.require) {
        //console.log("handleSignal for ELECTRON");

        console.log(mail);
        let author_name = g_usernameMap.get(htos(mail.author)) || 'unknown user';

        /** ELECTRON NOTIFICATION */
        const NOTIFICATION_TITLE = 'New mail received from ' + author_name;
        const NOTIFICATION_BODY = signalwrapper.data.payload.ReceivedMail.mail.subject;
        //const CLICK_MESSAGE = 'Notification clicked';

        // - Do Notification directly from web UI
        //new Notification(NOTIFICATION_TITLE, { body: NOTIFICATION_BODY })
        //  .onclick = () => console.log(CLICK_MESSAGE)

        /* Notify Electron main */
       const ipc = window.require('electron').ipcRenderer;
       let reply = ipc.sendSync('newMailSync', NOTIFICATION_TITLE, NOTIFICATION_BODY);
       console.log(reply);
      }

      getAllMails();
      return;
  }
  if (signalwrapper.data.payload.hasOwnProperty('ReceivedAck')) {
      let item = signalwrapper.data.payload.ReceivedAck;
      console.log("received_ack:");
      console.log({item});
      const pingedAgentB64 = htos(item.from);
      storePingResult({}, pingedAgentB64);
      const notification = document.querySelector('#notifyAck') as NotificationElement;
      notification.open();
      getAllMails();
      return;
  }
  if (signalwrapper.data.payload.hasOwnProperty('ReceivedFile')) {
      let item = signalwrapper.data.payload.ReceivedFile;
      console.log("received_file:");
      console.log({item});
      const notification = document.querySelector('#notifyFile') as NotificationElement;
      notification.open();
      return
    }
}


/** -- INIT -- */

/** */
function regenerateGroupComboBox(current: string): void {
  if (g_groupList === undefined || g_groupList === null) {
    return;
  }
  const groupCombo = document.querySelector('#groupCombo') as ComboBoxElement;
  let keys = Array.from(g_groupList.keys());
  keys.push('new...');
  groupCombo.items = keys;
  groupCombo.value = current;
}

/** */
function isValidGroupName(name: string) {
  let keys = Array.from(g_groupList.keys());
  for (let takenName of keys) {
    if (name === takenName) {
      return false;
    }
  }
  return true;
}


/** */
function createNewGroup(dialog: DialogElement, textField: TextFieldElement) {
  if (!isValidGroupName(textField.value)) {
    textField.invalid = true;
    textField.errorMessage = 'Name already taken';
  }
  g_groupList.set(textField.value, []);
  //console.log('g_groupList: ' + JSON.stringify(g_groupList.keys()));
  regenerateGroupComboBox(textField.value);
  setCurrentGroup(textField.value);
  textField.value = '';
  dialog.opened = false;
}


/** Find and collect grid items that have the given agentIds */
function ids_to_items(ids: string[], items: any) {
  let filtered = [];
  for (let id of ids) {
    for (let item of items) {
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
function initGroupsDialog() {
  console.log("initGroupsDialog() called");
  /** -- New Group Dialog */
  const newDialog = document.querySelector('#newGroupDlg') as DialogElement;
  newDialog.renderer = function(root, dialog) {
    /** Check if there is a DOM generated with the previous renderer call to update its content instead of recreation */
    if(root.firstElementChild) {
      //console.log({root});
      let vaadin = root.children[1] as PolymerElement;
      vaadin.autofocus = true;
      vaadin.focus();
      return;
    }
    /** Title */
    const div = window.document.createElement('div') as HTMLDivElement;
    div.textContent = 'Create new group: ';
    const br = window.document.createElement('br');
    // Text Field <vaadin-text-field placeholder="Placeholder"></vaadin-text-field>
    const vaadin = window.document.createElement('vaadin-text-field') as TextFieldElement;
    vaadin.placeholder = "name";
    vaadin.autofocus = true;
    vaadin.preventInvalidInput = true;
    vaadin.pattern = "[a-zA-Z0-9_.]{0,20}";
    vaadin.addEventListener("keyup", (event) => {
      if (event.keyCode == 13) {
        createNewGroup(dialog!, vaadin);
      }
    });

    /** Confirm Button */
    const okButton = window.document.createElement('vaadin-button') as ButtonElement;
    okButton.setAttribute('theme', 'primary');
    okButton.textContent = 'OK';
    okButton.setAttribute('style', 'margin-right: 1em');
    okButton.addEventListener('click', function() {
      createNewGroup(dialog!, vaadin);
    });
    /** Cancel Button */
    const cancelButton = window.document.createElement('vaadin-button') as ButtonElement;
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', function() {
      const groupCombo = document.querySelector('#groupCombo') as ComboBoxElement;
      vaadin.value = '';
      groupCombo.value = g_currentGroup;
      dialog!.opened = false;
    });
    /** Add all elements */
    root.appendChild(div);
    root.appendChild(br);
    root.appendChild(vaadin);
    root.appendChild(br);
    root.appendChild(okButton);
    root.appendChild(cancelButton);
  };

  /** -- Edit Group Dialog */
  const editDialog = document.querySelector('#editGroupDlg') as DialogElement;
  editDialog.renderer = function(root, dialog) {
    console.log("Edit Groups dialog called: " + g_currentGroup);
    /** Check if there is a DOM generated with the previous renderer call to update its content instead of recreation */
    if(root.firstElementChild) {
      let title = root.children[0];
      title.textContent = 'Edit Group: ' + g_currentGroup;
      let grid = root.children[1] as GridElement;
      grid.items = g_contactItems;
      const groupIds = g_groupList.get(g_currentGroup);
      if (groupIds) {
        grid.selectedItems = ids_to_items(groupIds, grid.items);
      }
      return;
    }
    /** Title */
    const div = window.document.createElement('h3');
    div.textContent = 'Edit Group: ' + g_currentGroup;
    div.setAttribute('style', 'margin-bottom: 10px; margin-top: 0px;');
    const br = window.document.createElement('br');
    /* Grid <vaadin-grid> */
    const selectColumn: GridSelectionColumnElement = window.document.createElement('vaadin-grid-selection-column');
    selectColumn.autoSelect = true;
    const column = window.document.createElement('vaadin-grid-column');
    column.path = 'username';
    column.header = " ";
    column.flexGrow = 0;
    column.width = "300px";
    const grid = window.document.createElement('vaadin-grid') as GridElement;
    grid.appendChild(selectColumn);
    grid.appendChild(column);
    grid.id = "groupGrid";
    grid.heightByRows = true;
    grid.setAttribute('style', 'width: 360px;');
    grid.items = g_contactItems;
    const groupIds = g_groupList.get(g_currentGroup);
    const items = ids_to_items(groupIds!, grid.items)
    //grid.selectedItems = items; // does not work here
    /** Confirm Button */
    const okButton = window.document.createElement('vaadin-button');
    okButton.setAttribute('theme', 'primary');
    okButton.textContent = 'OK';
    okButton.setAttribute('style', 'margin-right: 1em');
    /** OnClick OK save agentIds of selected items for the group */
    okButton.addEventListener('click', function() {
      let ids = [];
      for (let item of grid.selectedItems!) {
        const contactItem: ContactGridItem = item as ContactGridItem;
        ids.push(htos(contactItem.agentId));
      }
      g_groupList.set(g_currentGroup, ids);
      grid.selectedItems = [];
      setCurrentGroup(g_currentGroup);
      dialog!.opened = false;
    });
    /** Delete Button */
    const delButton = window.document.createElement('vaadin-button');
    delButton.setAttribute('theme', 'error');
    delButton.textContent = 'Delete';
    delButton.setAttribute('style', 'margin-right: 1em');
    delButton.addEventListener('click', function() {
      g_groupList.delete(g_currentGroup);
      regenerateGroupComboBox(SYSTEM_GROUP_LIST[0]);
      setCurrentGroup(SYSTEM_GROUP_LIST[0]);
      grid.selectedItems = [];
      dialog!.opened = false;
    });
    /** Cancel Button */
    const cancelButton = window.document.createElement('vaadin-button');
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', function() {
      grid.selectedItems = [];
      dialog!.opened = false;
    });
    /** Add all elements */
    root.appendChild(div);
    root.appendChild(br);
    root.appendChild(grid);
    root.appendChild(br);
    root.appendChild(okButton);
    root.appendChild(delButton);
    root.appendChild(cancelButton);
    /** Set selected at the end otherwise it wont register */
    grid.selectedItems = items;
  };

  /** -- Edit Group Button */
  let button = document.querySelector('#groupsBtn') as ButtonElement;
  button.addEventListener('click', () => {
    /** open if not 'All' group selected */
    if (g_currentGroup !== SYSTEM_GROUP_LIST[0]) {
      editDialog.opened = true;
    }
  });
}


/** */
function initUi() {
  setState_ChangeHandleBar(true);
  initTitleBar();
  initMenuBar();
  initFileBox();
  initInMail();
  initContactsArea();
  initActionBar();
  initUpload();
  //getMyAgentId(logResult)
  initNotification();
  initGroupsDialog();
  /** init DNA at the end because the callbacks will populate the UI */
  initDna();
  /* init Send progress bar */
  const sendProgressBar = document.querySelector('#sendProgressBar') as ProgressBarElement;
  sendProgressBar.style.display = "none";
}


/** */
function allowActionMenu(canShowMenu: boolean): void {
  const sendProgressBar = document.querySelector('#sendProgressBar') as ProgressBarElement;
  const actionMenu = document.querySelector('#ActionBar') as MenuBarElement;
  if (canShowMenu) {
    sendProgressBar.style.display = "none";
    actionMenu.style.display = "block";
  } else  {
    sendProgressBar.style.display = "block";
    actionMenu.style.display = "none";
  }
}


/** */
function initUpload(): void {
  customElements.whenDefined('vaadin-upload').then(function() {
    const upload = document.querySelector('vaadin-upload') as UploadElement;

    // upload.onclick = function changeContent() {
    //   allowActionMenu(false)
    // }

    upload.addEventListener('file-reject', function(event:any) {
      window.alert(event.detail.file.name + ' error: ' + event.detail.error);
    });

    // // DEBUG
    // upload.addEventListener('files-changed', function(event) {
    //   //console.log('files-changed event: ', JSON.stringify(event.detail));
    //   console.log('files-changed event: ');
    //   //const detail = event.detail;
    //   //console.log({detail});
    // });
    // upload.addEventListener('upload-success', function(event) {
    //   console.log('upload-success event');
    //   //console.log(event);
    // })
    // upload.addEventListener('upload-abort', function(event) {
    //   window.alert('upload aborted');
    // });

    // -- On upload file selected -- //
    upload.addEventListener('upload-before', function(event:any) {
      console.log('upload-before event: ', JSON.stringify(event.detail.file));

      allowActionMenu(false)

      const file = event.detail.file;
      //const xhr = event.detail.xhr;
      console.log('upload-before event: ');

      event.preventDefault(); // Prevent the upload request

      let reader = new FileReader();
      reader.onload = function(e: any) {
        console.log('FileReader onload event: ');
        const content = arrayBufferToBase64(e.target.result); // reader.result

        // Disabled regex test because it causes error on big files: "RangeError: Maximum call stack size exceeded"
        // if (!base64regex.test(content)) {
        //   const invalid_hash = sha256(content);
        //   console.error("File '" + file.name + "' is invalid base64. hash is: " + invalid_hash);
        // }

        console.log({e});
        console.log('file: ' + file.name + ' ; size: ' + Math.ceil(content.length / 1024) + ' KiB ; type: ' + file.type);

        upload.set(['files', upload.files.indexOf(file), 'progress'], 100)
        upload.set(['files', upload.files.indexOf(file), 'complete'], true)
        upload.set(['files', upload.files.indexOf(file), 'content'], content)

        allowActionMenu(true)
      };
      reader.readAsArrayBuffer(event.detail.file);
    });

    //  upload.addEventListener('upload-request', function(event) {
    //    console.log('upload-request event: ', JSON.stringify(event.detail));
    // //   const files = upload.files;
    // //   console.log('upload-request event: ');
    // //   console.log({event});
    // //   //console.log({files});
    // //   event.preventDefault();
    // //   let xhr = event.detail.xhr;
    // //   console.log({xhr});
    // //   let file = event.detail.file;
    // //   xhr.send(file);
    // });

  });
}


/** */
function initNotification() {
  /** -- Mail  */
  let notification = document.querySelector('#notifyMail') as NotificationElement;
  notification.renderer = function(root) {
    /** Check if there is a content generated with the previous renderer call not to recreate it. */
    if (root.firstElementChild) {
      return;
    }
    const container = window.document.createElement('div');
    const boldText = window.document.createElement('b');
    boldText.textContent = 'New Mail Received';
    container.appendChild(boldText);
    root.appendChild(container);
  };
  /** -- Ack */
  notification = document.querySelector('#notifyAck') as NotificationElement;
  notification.renderer = function(root) {
    /** Check if there is a content generated with the previous renderer call not to recreate it. */
    if (root.firstElementChild) {
      return;
    }
    const container = window.document.createElement('div');
    const boldText = window.document.createElement('b');
    boldText.textContent = 'Notice: ';
    const plainText = window.document.createTextNode('Acknowledgement Received');
    container.appendChild(boldText);
    container.appendChild(plainText);
    root.appendChild(container);
  };
  /** -- File  */
  notification = document.querySelector('#notifyFile') as NotificationElement;
  notification.renderer = function(root) {
    /** Check if there is a content generated with the previous renderer call not to recreate it. */
    if (root.firstElementChild) {
      return;
    }
    const container = window.document.createElement('div');
    const boldText = window.document.createElement('b');
    boldText.textContent = 'Notice: ';
    const plainText = window.document.createTextNode('File Received');
    container.appendChild(boldText);
    container.appendChild(plainText);
    root.appendChild(container);
  };
}


/** */
async function getAllFromDht() {
  await DNA.checkAckInbox();
  await DNA.checkMailInbox();
  await getAllMails();
}


/** */
async function initDna() {
  console.log('initDna()');
  try {
    const cellId = await DNA.rsmConnectApp(handleSignal)
    const dnaId = htos(cellId[0]);
    g_dnaId = dnaId;
    g_myAgentHash = cellId[1];
    g_myAgentId = htos(g_myAgentHash);
    storePingResult({}, g_myAgentId);

    /** Load Groups from localStorage */
    loadGroupList(dnaId);
    regenerateGroupComboBox(SYSTEM_GROUP_LIST[0]);
    // let label = document.getElementById('agentIdDisplay');
    // label.textContent = g_myAgentId
    DNA.getMyHandle()
      .then((myHandle:string) => showHandle(myHandle));
    await getAllFromDht();

    // -- findAgent ? -- //
    //const handleButton = document.getElementById('handleText');
    //DNA.findAgent(handleButton.textContent, handle_findAgent);

    /** -- Change title color in debug -- */
    const titleLayout = document.getElementById('titleLayout') as HorizontalLayoutElement;
    if (process.env.NODE_ENV !== 'prod') {
      titleLayout.style.backgroundColor = "#ec8383d1";
    }
    if (DNA.IS_ELECTRON) {
      titleLayout.style.display = "none";
      if (process.env.NODE_ENV !== 'prod') {
        /** -- Update Title with DNA ID */
        const rootTitle = document.querySelector('#rootTitle') as HTMLTitleElement;
        console.assert(rootTitle);
        //rootTitle.textContent = "SnapMail v" + version + "  - " + DNA.NETWORK_ID;
        rootTitle.textContent = rootTitle.textContent + " (" + dnaId + ")";
      }
    }
    /** -- Update Abbr -- */
    const handleAbbr = document.getElementById('handleAbbr') as HTMLElement;
    handleAbbr.title = "agentId: " + g_myAgentId;
    const titleAbbr = document.getElementById('titleAbbr') as HTMLElement;
    titleAbbr.title = dnaId;
    /** -- Loading Done -- */
    const loadingBar = document.querySelector('#loadingBar') as ProgressBarElement;
    loadingBar.style.display = "none";
    const mainPage = document.querySelector('#mainPage') as VerticalLayoutElement;
    mainPage.style.display = "flex";
  } catch(error) {
    console.error(error)
    alert("Failed to connect to holochain. Holochain conductor service might not be up and running.");
  }
}


/** */
async function setHandle() {
  let input = document.getElementById('myNewHandleInput') as TextFieldElement;
  const newHandle = input.value;
  console.log('new handle = ' + newHandle);
  const callResult = await DNA.setHandle(newHandle)
  showHandle(newHandle);
  input.value = '';
  setState_ChangeHandleBar(true);
  // - Update my Handle in the contacts grid
  const contactGrid = document.querySelector('#contactGrid') as GridElement;
  for (const item of contactGrid.items!) {
    let contactItem: ContactGridItem = item as ContactGridItem;
    if (htos(contactItem.agentId) === g_myAgentId) {
      contactItem.username = newHandle;
    }
  }
  contactGrid.render();
}


/** */
function initTitleBar() {
  // Title bar buttons
  customElements.whenDefined('vaadin-button').then(function() {
    let button = document.querySelector('#setMyHandleButton') as ButtonElement;
    button.addEventListener('click', () => {
      setHandle();
    });
    let handleInput = document.querySelector('#myNewHandleInput') as TextFieldElement;
    handleInput.addEventListener("keyup", (event) => {
      if (event.keyCode == 13) {
        setHandle();
      }
    });
    button = document.querySelector('#handleDisplay') as ButtonElement;
    button.addEventListener('click', () => {
      setState_ChangeHandleBar(false);
    });
    button = document.querySelector('#cancelHandleButton') as ButtonElement;
    button.addEventListener('click', () =>{
      setState_ChangeHandleBar(true);
    });
  });
  const span = document.querySelector('#networkIdDisplay') as HTMLElement;
  console.assert(span);
  span.textContent = DNA.NETWORK_ID;

  const title = document.querySelector('#snapTitle') as HTMLElement;
  console.assert(title);
  title.textContent = "SnapMail v" + version;

  const rootTitle = document.querySelector('#rootTitle') as HTMLTitleElement;
  console.assert(rootTitle);
  const maybeUid = DNA.NETWORK_ID != ""? "  - " + DNA.NETWORK_ID : "";
  rootTitle.textContent = "SnapMail v" + version + maybeUid;
}


/** */
function updateRecepients(canReset: boolean) {
  console.log('updateRecepients() - START ; canReset = ' + canReset)
  const contactGrid = document.querySelector('#contactGrid') as GridElement;
  /* Get currently selected items' hash */
  let prevSelected = [];
  let typeMap = new Map();
  for (const item of contactGrid.selectedItems!) {
    let contactItem: ContactGridItem = item as ContactGridItem;
    let agentId = htos(contactItem.agentId);
    prevSelected.push(agentId);
    typeMap.set(agentId, contactItem.recipientType);
  }
  console.log({typeMap});
  let selected = [];
  let items = [];
  //pingNextAgent();
  /* Add each handle to the contactGrid */
  for (const [agentId, username] of g_usernameMap.entries()) {
    // console.log('' + agentId + '=> ' + username)
    const agentHash = stoh(agentId)
    let status = whiteDot
    if (g_pingMap.get(agentId)) {
      status = g_responseMap.get(agentId)? greenDot : redDot
    }
    //const status = blueDot
    let item = {
      "username": username, "agentId": agentHash, "recipientType": '', status,
    };
    // - Retrieve selected
    if (!canReset && prevSelected.includes(agentId)) {
      console.log("keep selected: " + item.username);
      item.recipientType = typeMap.get(agentId);
      selected.push(item);
    }
    items.push(item);
  }

  // // Test Content
  // items = [
  //   { "username": "Bob", "agentId": 11, "recipientType": '', "status": blueDot },
  //   { "username": "Alice", "agentId": 222, "recipientType": '', "status": blueDot },
  //   { "username": "Camille", "agentId": 333, "recipientType": '', "status": blueDot },
  //   { "username": "Daniel", "agentId": 444, "recipientType": '', "status": blueDot },
  //   { "username": "Eve", "agentId": 555, "recipientType": '', "status": blueDot },
  // ];

  /* Reset search filter */
  const contactSearch = document.querySelector('#contactSearch') as TextFieldElement;
  if (canReset) {
    contactSearch.value = '';
  }

  g_contactItems = items;
  contactGrid.items = filterContacts([], contactSearch.value);
  contactGrid.selectedItems = selected;
  contactGrid.activeItem = null;
  contactGrid.render();
  console.log({contactGrid});
  console.log('updateRecepients() - END')
}


/** */
function initMenuBar() {
  /* Menu -- vaadin-menu-bar */
  const menu = document.querySelector('#MenuBar') as MenuBarElement;
  let items =
    [ { text: 'Move', disabled: true }
    , { text: 'Reply', disabled: true, children: [{ text: 'Reply to sender' }, { text: 'Reply to all' }, { text: 'Forward' }] }
    , { text: 'Trash', disabled: true }
    , { text: 'Print', disabled: true }
    //, { text: 'Find', disabled: true }
    ];
  if (process.env.NODE_ENV !== 'prod') {
    items.push({ text: 'Refresh', disabled: false });
  }
  menu.items = items;

  /* On button click */
  menu.addEventListener('item-selected', function(e: any) {
    console.log("Menu item-selected: " + JSON.stringify(e.detail.value));

    /* -- Handle 'Print' -- */
    if (e.detail.value.text === 'Print') {
      console.log({g_currentMailItem})
      let mailItem = g_mailMap.get(htos(g_currentMailItem.id));
      let mailText = into_mailText(g_usernameMap, mailItem)
      /** Save to disk */
      const blob = new Blob([mailText], { type: 'text/plain'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = mailItem.mail.subject + ".txt";
      a.addEventListener('click', () => {}, false);
      a.click();
    }
    /* -- Handle 'Trash' -- */
    if (e.detail.value.text === 'Trash') {
      g_replyOf = null;
      DNA.deleteMail(g_currentMailItem.id)
        .then((maybeAh: ActionHash | null) => getAllMails()) // On delete, refresh filebox
      const mailGrid = document.querySelector('#mailGrid') as GridElement;
      mailGrid.selectedItems = [];
      mailGrid.activeItem = null;
      const inMailArea = document.getElementById('inMailArea') as TextAreaElement;
      inMailArea.value = ""
      setState_DeleteButton(true)
      setState_ReplyButton(true)
    }
    /* -- Handle 'Reply' -- */
    const outMailSubjectArea = document.querySelector('#outMailSubjectArea') as TextFieldElement;
    const contactGrid = document.querySelector('#contactGrid') as GridElement;

    if (e.detail.value.text === 'Reply to sender') {
      outMailSubjectArea.value = 'Re: ' + g_currentMailItem.subject;
      g_replyOf = g_currentMailItem.id;
      console.log("g_replyOf set ", g_replyOf)
      resetContactGrid(contactGrid);
      for (let item of contactGrid.items!) {
        let contactItem: ContactGridItem = item as ContactGridItem;
        if (contactItem.username === g_currentMailItem.username) {
          contactGrid.selectedItems = [contactItem];
          contactGrid.activeItem = contactItem;
          toggleContact(contactGrid, contactItem);
          contactGrid.render();
          break;
        }
      }
    }
    if (e.detail.value.text === 'Reply to all') {
      let mailItem = g_mailMap.get(htos(g_currentMailItem.id));
      g_replyOf = g_currentMailItem.id;
      if (mailItem) {
        outMailSubjectArea.value = 'Re: ' + g_currentMailItem.subject;
        resetContactGrid(contactGrid);
        // TO
        for(let agentId of mailItem.mail.to) {
          let to_username = g_usernameMap.get(htos(agentId));
          selectUsername(contactGrid, to_username!, 1);
        }
        // CC
        for(let agentId of mailItem.mail.cc) {
          let cc_username = g_usernameMap.get(htos(agentId));
          selectUsername(contactGrid, cc_username!, 2);
        }
        // BCC
        for(let agentId of mailItem.bcc) {
          let bcc_username = g_usernameMap.get(htos(agentId));
          selectUsername(contactGrid, bcc_username!, 3);
        }
        // Done
        contactGrid.render();
      }
    }
    if (e.detail.value.text === 'Forward') {
      outMailSubjectArea.value = 'Fwd: ' + g_currentMailItem.subject;
      resetContactGrid(contactGrid);
      const outMailContentArea = document.querySelector('#outMailContentArea') as TextAreaElement;
      let mailItem = g_mailMap.get(htos(g_currentMailItem.id));
      let fwd = '\n\n';
      fwd += '> ' + 'Mail from: ' + g_usernameMap.get(htos(mailItem.author)) + ' at ' + customDateString(mailItem.date) + '\n';
      let arrayOfLines = mailItem.mail.payload.match(/[^\r\n]+/g);
      for (let line of arrayOfLines) {
        fwd += '> ' + line + '\n';
      }
      outMailContentArea.value = fwd;
    }
    // -- Handle 'Refresh' -- //
    if (e.detail.value.text === 'Refresh') {
      //console.log('Refresh called');
      getAllFromDht();
    }
  });
}


/** */
function selectUsername(contactGrid: GridElement, candidat: string, count: number): void {
  for(let item of contactGrid.items!) {
    let contactItem: ContactGridItem = item as ContactGridItem;
    if(contactItem.username === candidat) {
      for (let i = 0; i < count; i++) {
        toggleContact(contactGrid, contactItem);
      }
      contactGrid.selectedItems!.push(contactItem);
      contactGrid.activeItem = contactItem;
      break;
    }
  }
}


/** */
function update_mailGrid(folder: string): void {
  const mailGrid = document.querySelector('#mailGrid') as GridElement;
  let folderItems = [];
  const activeItem: MailGridItem = mailGrid.activeItem as MailGridItem;
  let codePoint = folder.codePointAt(0);
  console.log('update_mailGrid: ' + folder + ' (' + codePoint + ')');

  switch(codePoint) {
    case systemFolders.ALL.codePointAt(0):
      for (let mailItem of g_mailMap.values()) {
        //folderItems = Array.from(g_mail_map.values());
        folderItems.push(into_gridItem(g_usernameMap, mailItem));
      }
      break;
    case systemFolders.INBOX.codePointAt(0):
    case systemFolders.SENT.codePointAt(0):
      for (let mailItem of g_mailMap.values()) {
        //console.log('mailItem: ' + JSON.stringify(mailItem))
        let is_out = is_OutMail(mailItem);
        if (isMailDeleted(mailItem)) {
          continue;
        }
        if (is_out && codePoint == systemFolders.SENT.codePointAt(0)) {
          folderItems.push(into_gridItem(g_usernameMap, mailItem));
          continue;
        }
        if (!is_out && codePoint == systemFolders.INBOX.codePointAt(0)) {
          folderItems.push(into_gridItem(g_usernameMap, mailItem));
        }
      }
      break;
    case systemFolders.TRASH.codePointAt(0): {
      for (let mailItem of g_mailMap.values()) {
        if(isMailDeleted(mailItem)) {
          folderItems.push(into_gridItem(g_usernameMap, mailItem));
        }
      }
    }
      break;
    default:
      console.error('Unknown folder')
  }

  const span = document.querySelector('#messageCount') as HTMLElement;
  console.assert(span);
  span.textContent = '' + folderItems.length;

  console.log('folderItems count: ' + folderItems.length);
  // console.log('folderItems: ' + JSON.stringify(folderItems))
  //grid.items = folderItems;
  const mailSearch = document.getElementById('mailSearch') as TextFieldElement;
  g_mailItems = folderItems;
  mailGrid.items = filterMails(mailSearch.value);

  // - Re-activate activeItem
  if (activeItem !== undefined && activeItem !== null) {
    for(const item of Object.values(mailGrid.items)) {
      const mailGridItem: MailGridItem = item as MailGridItem;
      //console.log('Item id = ' + item.id);
      if(activeItem.id === mailGridItem.id) {
        //console.log('activeItem match found');
        mailGrid.activeItem = item;
        mailGrid.selectedItems = [item];
        break;
      }
    }
  }
  //
  mailGrid.render();
}


/**
 *
 */
function initFileBox() {
  const fileboxBar = document.querySelector('#fileboxBar') as HorizontalLayoutElement;
  if (process.env.NODE_ENV !== 'prod') {
    fileboxBar.style.backgroundColor = "rgba(241,154,154,0.82)";
  }
  /** Combobox -- vaadin-combo-box */
  const systemFoldersVec = [systemFolders.ALL, systemFolders.INBOX, systemFolders.SENT, systemFolders.TRASH];
  const folderCombo = document.querySelector('#fileboxFolder') as ComboBoxElement;
  folderCombo.items = systemFoldersVec;
  folderCombo.value = systemFoldersVec[1];
  g_currentFolder = folderCombo.value;
  /** On value change */
  folderCombo.addEventListener('change', function(event:any) {
    const mailGrid = document.querySelector('#mailGrid') as GridElement;
    mailGrid.selectedItems = [];
    mailGrid.activeItem = null;
    g_replyOf = null;
    update_mailGrid(event.target.value)
    g_currentFolder = event.target.value;
    setState_DeleteButton(true)
    setState_ReplyButton(true)
  });

  /** Filebox -- vaadin-grid */
  const mailGrid = document.querySelector('#mailGrid') as GridElement;
  mailGrid.items = [];
  mailGrid.multiSort = true;
  /** Display bold if mail not acknowledged */
  mailGrid.cellClassNameGenerator = function(column, rowData:any) {
    let classes = '';
    let mailItem = g_mailMap.get(htos(rowData.item.id));
    console.assert(mailItem);
    classes += determineMailCssClass(mailItem);
    // let is_old = hasMailBeenOpened(mailItem);
    // //console.log('answer: ' + is_old);
    // if (!is_old) {
    //   classes += ' newmail';
    // }
    return classes;
  };

  /** On item select: Display in inMailArea */
  mailGrid.addEventListener('active-item-changed', function(event:any) {
    console.log('mailgrid Event: active-item-changed');
    g_replyOf = null;
    const item = event.detail.value;
    mailGrid.selectedItems = item ? [item] : [];
    if (item === null || item === undefined) {
      //getAllMails(handleMails, handle_getAllMails)
      return;
    }
    g_currentMailItem = item;
    //console.log('mail grid item: ' + JSON.stringify(item));
    let inMailArea = document.getElementById('inMailArea') as TextAreaElement;
    let mailItem = g_mailMap.get(htos(item.id));
    console.log('mail item:')
    console.log({mailItem});
    inMailArea.value = into_mailText(g_usernameMap, mailItem);

    fillAttachmentGrid(mailItem.mail).then( function(missingCount) {
      if (missingCount > 0) {
        DNA.getMissingAttachments(mailItem.author, mailItem.ah)
          .then((missingCount:number) => handle_missingAttachments(missingCount))
          .catch((err:any) => {
            console.error('MissingAttachments zome call failed');
            console.error(err);
          })
      }
      DNA.acknowledgeMail(item.id)
        //.then(callResult => handle_acknowledgeMail(callResult));
      // Allow delete button
      if (g_currentFolder.codePointAt(0) !== systemFolders.TRASH.codePointAt(0)) {
        setState_DeleteButton(false)
        setState_ReplyButton(false)
      }
    });
  });
  let inMailArea = document.getElementById('inMailArea') as TextAreaElement;
  inMailArea.style.backgroundColor = "#dfe7efd1";

  let mailSearch = document.getElementById('mailSearch') as TextFieldElement;
  mailSearch.addEventListener('value-changed', function(e:any /*TextFieldValueChangedEvent*/) {
    mailGrid.items = filterMails(e.detail.value);
    mailGrid.render();
  });
}


/** */
function filterMails(searchValue: string) {
  const searchTerm = (searchValue || '').trim();
  const matchesTerm = (value: string) => {
    return value.toLowerCase().indexOf(searchTerm.toLowerCase()) >= 0;
  };
  let filteredItems = g_mailItems.filter((item) => {
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
async function fillAttachmentGrid(mail: Mail): Promise<number> {
  let attachmentGrid = document.querySelector('#attachmentGrid') as GridElement;
  let items = [];
  const emoji = String.fromCodePoint(0x1F6D1);
  g_hasAttachment = 0;
  let missingCount = 0;
  for (let attachmentInfo of mail.attachments) {
    //console.log({attachmentInfo});
    const callResult = await DNA.getManifest(attachmentInfo.manifest_eh);
    handle_getManifest(callResult)

    const hasAttachment = g_hasAttachment > 0;
    missingCount += 0 + Number(!hasAttachment);
    let item = {
      "fileId": attachmentInfo.data_hash,
      "filename": attachmentInfo.filename,
      "filesize": Math.ceil(attachmentInfo.orig_filesize / 1024),
      "filetype": attachmentInfo.filetype,
      "status": hasAttachment? ' ' : emoji,
      "hasFile": hasAttachment,
    };
    items.push(item)
  }
  //console.log({items})
  attachmentGrid.items = items;
  attachmentGrid.selectedItems = [];
  attachmentGrid.activeItem = null;
  attachmentGrid.render();
  //console.log({missingCount})
  return missingCount;
}


/** */
function initInMail() {
  const inMailArea = document.querySelector('#inMailArea') as TextAreaElement;
  inMailArea.value = '';
  initAttachmentGrid();
}


/** */
function initAttachmentGrid() {
  /** attachmentGrid -- vaadin-grid */
  const attachmentGrid = document.querySelector('#attachmentGrid') as GridElement;
  attachmentGrid.items = [];

  attachmentGrid.cellClassNameGenerator = function(column, rowData:any/*FIXME*/) {
    //console.log({rowData})
    let classes = '';
    if (!rowData.item.hasFile) {
      classes += ' pending';
    } else {
      //classes += ' newmail';
    }
    return classes;
  };

  /** On select, download attachment */
  attachmentGrid.addEventListener('active-item-changed', function(event:any) {
    const item = event.detail.value;
    console.log({item})
    attachmentGrid.activeItem = null;
    attachmentGrid.selectedItems = [];

    if (!item || !item.hasFile) {
      return;
    }

    if (!attachmentGrid.selectedItems.includes(item)) {
      //attachmentGrid.selectedItems = [];
      item.status = String.fromCodePoint(0x23F3);
      attachmentGrid.selectedItems.push(item);
      item.disabled = true;
      attachmentGrid.render();
    }

    /** Get File on source chain */
    getFile(item.fileId).then(function(manifest) {
       if (!manifest) {
         return;
       }
       //console.log({ manifest })
       item.status = String.fromCodePoint(0x2714);
       //attachmentGrid.deselectItem(item);

       // DEBUG - check if content is valid base64
       // if (!base64regex.test(manifest.content)) {
       //   const invalid_hash = sha256(manifest.content);
       //   console.error("File '" + manifest.filename + "' is invalid base64. hash is: " + invalid_hash);
       // }

       let filetype = manifest.filetype;
       const fields = manifest.filetype.split(':');
       if (fields.length > 1) {
         const types = fields[1].split(';');
         filetype = types[0];
       }
       let byteArray = base64ToArrayBuffer(manifest.content!)
       const blob = new Blob([byteArray], { type: filetype});
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = item.filename || 'download';
       a.addEventListener('click', () => {}, false);
       a.click();
       attachmentGrid.activeItem = null;
       attachmentGrid.selectedItems = [];
       attachmentGrid.render();
     });
  });
}


/** Return manifest with added content field */
async function getFile(fileId: ActionHash): Promise<FileManifest | null> {
  const callResult = await DNA.findManifest(fileId);
  let manifest = handle_findManifest(callResult)
  if (!manifest || manifest === null) {
    return null;
  }
  let chunks = [];
  let i = 0;
  for (let chunkAddress of manifest.chunks) {
    i++;
    const callResult = await DNA.getChunk(chunkAddress)
    let maybeChunk = handle_getChunk(callResult)
    if (!maybeChunk) {
       return null;
    }
    chunks.push(maybeChunk)
  }
  /** concat chunks */
  let content = '';
  for (let chunk of chunks) {
    content += chunk;
  }
  manifest.content = content;
  return manifest;
}


/** */
function setCurrentGroup(groupName: string): void {
  console.log('Current Group changed: ' + groupName);
  if(groupName === 'new...') {
    const newDialog = document.querySelector('#newGroupDlg') as DialogElement;
    newDialog.opened = true;
    return;
  }
  //const groupIds = g_groupList.get(groupName);
  //console.log('groupIds:' + JSON.stringify(groupIds));
  const contactGrid = document.querySelector('#contactGrid') as GridElement;
  g_currentGroup = groupName;
  const contactSearch = document.querySelector('#contactSearch') as TextFieldElement;
  contactGrid.items = filterContacts([], contactSearch.value);
  resetContactGrid(contactGrid);
  setState_DeleteButton(true);
  setState_ReplyButton(true);
  console.log({contactGrid});
  contactGrid.render();
  window.localStorage[g_dnaId] = JSON.stringify(Array.from(g_groupList.entries()));
}


/** */
function initContactsArea() {
  /** -- ContactsMenu -- vaadin-menu-bar */
  if (process.env.NODE_ENV !== 'prod') {
    const contactsMenu = document.querySelector('#ContactsMenu') as MenuBarElement;
    contactsMenu.items = [{ text: 'Refresh' }];
    contactsMenu.addEventListener('item-selected', function(e:any) {
      console.log(JSON.stringify(e.detail.value));
      if(e.detail.value.text === 'Refresh') {
        contactsMenu.items[0].disabled = true;
        contactsMenu.render();
        getAllHandles();
      }
    });
  }

  /** Groups Combo box  */
  const groupCombo = document.querySelector('#groupCombo') as ComboBoxElement;
  //groupCombo.items = SYSTEM_GROUP_LIST;
  //groupCombo.value = SYSTEM_GROUP_LIST[0];
  regenerateGroupComboBox(SYSTEM_GROUP_LIST[0]);
  g_currentGroup = groupCombo.value;

  /** On value change */
  groupCombo.addEventListener('change', function(event:any) {
    setCurrentGroup(event.target.value);
  });


  /** -- contactGrid */
  const contactGrid = document.querySelector('#contactGrid') as GridElement;
  contactGrid.items = [];
  contactGrid.cellClassNameGenerator = function(column, rowData:any) {
    //console.log(rowData)
    let classes = rowData.item.status;
    if (column.path === 'status') {
      classes += ' statusColumn';
    }
    if (rowData.item.recipientType !== '') { classes += ' newmail' }
    if (rowData.item.recipientType === 'cc') { classes += ' myCc' }
    if (rowData.item.recipientType === 'bcc') { classes += ' myBcc' }
    return classes;
  };
  /** ON SELECT */
  contactGrid.addEventListener('active-item-changed', function(event:any) {
    const item = event.detail.value;
    if (item && !contactGrid.selectedItems!.includes(item)) {
      contactGrid.selectedItems!.push(item);
    }
    setState_SendButton(contactGrid.selectedItems!.length == 0);
  });
  /** ON CLICK */
  contactGrid.addEventListener('click', function(e) {
    const eventContext: any /* FIXME */ = contactGrid.getEventContext(e)!;
    //contactGrid.selectedItems = item ? [item] : [];
    toggleContact(contactGrid, eventContext.item);
    setState_SendButton(contactGrid.selectedItems!.length == 0);
    contactGrid.render();
  });
  /** -- Contacts search bar -- */
  let contactSearch = document.getElementById('contactSearch') as TextFieldElement;
  contactSearch.addEventListener('value-changed', function(e: any/*: TextFieldValueChangedEvent*/) {
    const selectedItems = contactGrid.selectedItems! as ContactGridItem[];
    contactGrid.items = filterContacts(selectedItems, e.detail.value);
    contactGrid.render();
  });
}


/** */
function filterContacts(selectedItems: ContactGridItem[], searchValue: string): ContactGridItem[] {
  console.log("filterContacts() called");
  /** Get contacts from current group only */
  let items = g_contactItems;
  //console.log({items});
  if (g_currentGroup !== SYSTEM_GROUP_LIST[0]) {
    const ids = g_groupList.get(g_currentGroup);
    //console.log({ids});
    items = ids_to_items(ids!, items);
    //console.log({items});
  }
  /** Set filter */
  const searchTerm = (searchValue || '').trim();
  const matchesTerm = (value: string) => {
    return value.toLowerCase().indexOf(searchTerm.toLowerCase()) >= 0;
  };
  /** Apply filter */
  let filteredItems = items.filter((item) => {
    //console.log({item});
    return (
      !searchTerm
      || matchesTerm(item.username)
    );
  });
  /** Unique values by going through a Set */
  return [...new Set(selectedItems.concat(filteredItems))];
}


/** */
function toggleContact(contactGrid: GridElement, contactItem?: ContactGridItem) {
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
function resetContactGrid(contactGrid: GridElement): void {
  if (contactGrid.items && contactGrid.items.length > 0) {
    for(let item of contactGrid.items) {
      let contactItem: ContactGridItem = item as ContactGridItem;
      contactItem.recipientType = '';
    }
  }
  contactGrid.selectedItems = [];
  contactGrid.activeItem = null;
  //contactGrid.render();
}


/** */
function initActionBar() {
  /** -- actionMenu -- vaadin-menu-bar */
  const actionMenu = document.querySelector('#ActionBar') as MenuBarElement;
  actionMenu.items = [
      { text: 'Clear' },
    //{ text: '+File', disabled: true },
      { text: 'Snap', disabled: true },
      { text: 'Send', disabled: true }
  ];
  /** ON SELECT */
  actionMenu.addEventListener('item-selected', function(e:any) {
    console.log('actionMenu: ' + JSON.stringify(e.detail.value.text))
    const outMailSubjectArea = document.querySelector('#outMailSubjectArea') as TextFieldElement;
    const outMailContentArea = document.querySelector('#outMailContentArea') as TextAreaElement;
    const upload = document.querySelector('vaadin-upload') as UploadElement;
    /** Clear clicked */
    if (e.detail.value.text === 'Clear') {
      outMailSubjectArea.value = '';
      outMailContentArea.value = '';
      /** clear each attachment */
      upload.files = [];
      updateRecepients(true);
      return;
    }
    /** Send clicked */
    if (e.detail.value.text === 'Send') {
      const sendProgressBar = document.querySelector('#sendProgressBar') as ProgressBarElement;
      const sendingTitle = document.querySelector('#sendingTitle') as HTMLElement;
      sendProgressBar.style.display = "block";
      sendingTitle.style.display = "block";
      actionMenu.style.display = "none";
      //upload.style.display = "none";
      upload.maxFiles = 0;
      sendAction().then(function() {
        sendProgressBar.style.display = "none";
        sendingTitle.style.display = "none";
        actionMenu.style.display = "block";
        //upload.style.display = "block";
        upload.maxFiles = 42;
      });
    }
  });
}


/** */
async function sendAction(): Promise<void> {
  /** Submit each attachment */
  const upload:any /* FIXME*/ = document.querySelector('vaadin-upload');
  const files = upload.files;
  console.log({files})
  g_fileList = [];
  for (let file of files) {
    // // Causes stack error on big files
    // if (!base64regex.test(file.content)) {
    //   const invalid_hash = sha256(file.content);
    //   console.error("File '" + file.name + "' is invalid base64. hash is: " + invalid_hash);
    // }
    const parts = file.content.split(',');
    console.log("parts.length: " + parts.length)
    console.log({parts})
    const filetype = parts.length > 1? parts[0] : file.type;
    const splitObj = splitFile(parts[parts.length - 1]);
    g_chunkList = [];
    /** Submit each chunk */
    for (let i = 0; i < splitObj.numChunks; ++i) {
      //console.log('chunk' + i + ': ' + fileChunks.chunks[i])
      const callResult = await DNA.writeChunk(splitObj.dataHash, i, splitObj.chunks[i]);
      handle_writeChunk(callResult)
      // while (g_chunkList.length !=  i + 1) {
      //   await sleep(10)
      // }
    }
    // while (g_chunkList.length < splitObj.numChunks) {
    //   await sleep(10);
    // }
    const callResult = await DNA.writeManifest(splitObj.dataHash, file.name, filetype, file.size, g_chunkList)
    handle_writeManifest(callResult)
  }
  // while (g_fileList.length < files.length) {
  //   await sleep(10);
  // }

  /* Get contact Lists */
  const contactGrid = document.querySelector('#contactGrid') as GridElement;
  const selection: ContactGridItem[] = contactGrid.selectedItems! as ContactGridItem[];
  console.log('selection: ' + JSON.stringify(selection));
  if (!selection || selection.length == 0) {
    console.log('Send Mail Failed: No receipient selected')
    return;
  }

  let toList = [];
  let ccList = [];
  let bccList = [];
  /* Get recipients from contactGrid */
  for (let contactItem of selection) {
    console.log('recipientType: ' + contactItem.recipientType);
    switch (contactItem.recipientType) {
      case '': break;
      case 'to': toList.push(contactItem.agentId); break;
      case 'cc': ccList.push(contactItem.agentId); break;
      case 'bcc': bccList.push(contactItem.agentId); break;
      default: console.error('unknown recipientType');
    }
  }
  /* Create Mail */
  const outMailSubjectArea = document.querySelector('#outMailSubjectArea') as TextFieldElement;
  const outMailContentArea = document.querySelector('#outMailContentArea') as TextAreaElement;
  const mail: SendMailInput = {
    subject: outMailSubjectArea.value,
    payload: outMailContentArea.value,
    reply_of: g_replyOf,
    to: toList, cc: ccList, bcc: bccList,
    manifest_address_list: g_fileList
  };
  console.log('sending mail: ')
  console.log({mail});
  /* Send Mail */
  const outmail_hh = await DNA.sendMail(mail);
  /* Update UI */
  if (g_replyOf) {
    const replyOfStr =  htos(g_replyOf)
    let mailItem = g_mailMap.get(replyOfStr);
    mailItem.reply = outmail_hh;
    g_mailMap.set(replyOfStr, mailItem);
  }
  g_replyOf = null;
  setState_SendButton(true);
  outMailSubjectArea.value = '';
  outMailContentArea.value = '';
  contactGrid.selectedItems = [];
  contactGrid.activeItem = null;
  updateRecepients(false);
  console.log('sendMail -> getAllMails');
  await getAllMails();
  upload.files = [];
}


/** */
function setState_ChangeHandleBar(hidden: boolean): void {
  let handleButton = document.getElementById('handleDisplay') as ButtonElement;
  handleButton.hidden = !hidden;
  let handleInput = document.getElementById('myNewHandleInput') as TextFieldElement;
  handleInput.hidden = hidden;
  if (!hidden) {
    handleInput.focus();
  }
  let updateButton = document.getElementById('setMyHandleButton') as ButtonElement;
  updateButton.hidden = hidden;
  let cancelButton = document.getElementById('cancelHandleButton') as ButtonElement;
  cancelButton.hidden = hidden;

  if (!hidden && g_myHandle !== '<noname>') {
    handleInput.value = g_myHandle
  } else {
    handleInput.value = ''
  }
}


/** */
function setState_SendButton(isDisabled: boolean): void {
  let actionMenu = document.querySelector('#ActionBar') as MenuBarElement;
  //actionMenu.items[1].disabled = isDisabled;
  actionMenu.items[2].disabled = isDisabled;
  actionMenu.render();
}

function setState_DeleteButton(isDisabled: boolean): void {
  let menu = document.querySelector('#MenuBar') as MenuBarElement;
  //console.log('menu.items = ' + JSON.stringify(menu.items))
  menu.items[2].disabled = isDisabled;
  menu.items[3].disabled = isDisabled;
  menu.render();
}

function setState_ReplyButton(isDisabled: boolean): void {
  let menu = document.querySelector('#MenuBar') as MenuBarElement;
  //console.log('menu.items = ' + JSON.stringify(menu.items))
  menu.items[1].disabled = isDisabled;
  menu.render();
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


/** Generic callback: Refresh my handle */
function showHandle(myHandle: string) {
  //console.log('showHandle call result = ' + JSON.stringify(callResult))
  let handleButton = document.getElementById('handleText') as ButtonElement;
  g_myHandle = handleButton.textContent? handleButton.textContent : myHandle;
}


/** Refresh mailGrid */
function handle_getAllMails(callResult: any) {
  if (callResult === undefined || callResult.Err !== undefined) {
    //const err = callResult.Err;
    //console.error('getAllMails zome call failed');
    //console.error(err);
    return;
  }
  let mailGrid = document.querySelector('#mailGrid') as GridElement;
  let mailList: MailItem[] = callResult;

  /** Get currently selected hashs */
  let prevSelected = [];
  for (const item of mailGrid.selectedItems!) {
    let mailItem: MailGridItem = item as MailGridItem;
    prevSelected.push(htos(mailItem.id));
  }

  let allCount = mailList.length;
  let trashCount = 0;
  let inboxCount = 0;
  let sentCount = 0;
  let newCount = 0;

  let selected = [];
  let items = [];
  g_mailMap.clear();
  const folderBox = document.querySelector('#fileboxFolder') as ComboBoxElement;
  let selectedBox = folderBox.value.codePointAt(0);
  for (let mailItem of mailList) {
    console.log({mailItem})
    g_mailMap.set(htos(mailItem.ah), mailItem);
    //
    let isDeleted = isMailDeleted(mailItem);
    let isOutMail = is_OutMail(mailItem);

    /** Counters */
    if (isOutMail) {
      sentCount = sentCount + 1;
    }
    if (isDeleted) {
      trashCount = trashCount + 1;
    }
    if (!isDeleted && !isOutMail) {
      inboxCount = inboxCount + 1;
    }
    if (determineMailCssClass(mailItem) === 'newmail') {
      newCount = newCount + 1;
    }

    /** Determine if should add to grid depending on current folder */
    if (isDeleted && selectedBox !== systemFolders.TRASH.codePointAt(0)) {
      continue;
    }
    if (isOutMail && selectedBox === systemFolders.INBOX.codePointAt(0)) {
      continue;
    }
    if (!isOutMail && selectedBox === systemFolders.SENT.codePointAt(0)) {
      continue;
    }
    // items.push(into_gridItem(g_usernameMap, mailItem));
    let gridItem = into_gridItem(g_usernameMap, mailItem);
    // console.log('gridItem.id = ' + gridItem.id);
    items.push(gridItem);
    if (prevSelected.includes(htos(gridItem.id))) {
      selected.push(gridItem);
    }
  }
  console.log('Counters: ' + newCount + ' / ' + inboxCount + ' / ' + sentCount + ' / ' + trashCount + ' / '+ allCount);

  updateTray(newCount);

  const systemFoldersVec = [
    systemFolders.ALL // + ' ('+ allCount +')'
    , newCount === 0 ? systemFolders.INBOX : systemFolders.INBOX + ' ('+ newCount + ')' //+ inboxCount +')'
    , systemFolders.SENT // + ' ('+ sentCount +')'
    , systemFolders.TRASH // + ' ('+ trashCount +')'
  ];
  const folderBoxAll = document.querySelector('#fileboxFolder') as ComboBoxElement;
  folderBoxAll.items = systemFoldersVec;
  for (const systemFolder of systemFoldersVec) {
    //console.log("systemFolder.codePointAt(0) = " + systemFolder.codePointAt(0));
    if (selectedBox == systemFolder.codePointAt(0)) {
      folderBoxAll.value = systemFolder;
      break;
    }
  }

  const mailSearch = document.getElementById('mailSearch') as TextFieldElement;
  console.log('mailCount = ' + items.length + ' (' + selected.length + ')');
  g_mailItems = items;
  mailGrid.items = filterMails(mailSearch.value);
  mailGrid.selectedItems = selected;
  mailGrid.activeItem = selected[0];
}


/** */
function updateTray(newCount: number): void {
  if (DNA.IS_ELECTRON && window.require) {
    //console.log("handleSignal for ELECTRON");
    const ipc = window.require('electron').ipcRenderer;
    let reply = ipc.send('newCountAsync', newCount);
    console.log(reply);
  }
}


/** Post callback for getAllMails() */
function handle_post_getAllMails(): void {
  try {
    /** Update mailGrid */
    const folder = document.querySelector('#fileboxFolder') as ComboBoxElement;
    update_mailGrid(folder.value);
    /** Update active Item */
    const mailGrid = document.querySelector('#mailGrid') as GridElement;
    const activeItem: MailGridItem = mailGrid.activeItem as MailGridItem;
    console.log('handle_getAllMails ; activeItem = ');
    console.log({activeItem})
    if(activeItem) {
      let newActiveItem = null;
      for(let item of mailGrid.items!) {
        const mailItem: MailGridItem = item as MailGridItem;
        if(mailItem.id === activeItem.id) {
          newActiveItem = mailItem;
          break;
        }
      }
      mailGrid.selectItem(newActiveItem);
    }
  } catch(e) {
    console.error("handle_post_getAllMails() failed:", e)
  }
}


/** Ping oldest pinged agent */
function pingNextAgent(): void {
  console.log({g_pingMap});
  console.log({g_responseMap});
  /* Skip if empty map */
  if (g_pingMap.size === 0) {
    return;
  }
  g_canPing = false;
  /* Sort g_pingMap by value to get oldest pinged agent */
  const nextMap = new Map([...g_pingMap.entries()]
    .sort((a, b) => a[1] - b[1]));
  console.log({nextMap})
  /* Ping first agent in sorted list */
  const pingedAgentB64 = nextMap.keys().next().value
  const pingedAgent = stoh(pingedAgentB64);
  console.log("pinging: ", pingedAgentB64);
  if (pingedAgentB64 === g_myAgentId) {
    console.log("pinging self");
    storePingResult({}, pingedAgentB64);
    g_canPing = true;
    return;
  }
  const contactGrid = document.querySelector('#contactGrid') as GridElement;
  DNA.pingAgent(pingedAgent)
    .then((result: boolean) => {
      storePingResult(result, pingedAgentB64);
      g_canPing = true;
      contactGrid.render();
    })
    .catch((error: any) => {
      console.error('Ping failed for: ' + pingedAgentB64);
      console.error({ error })
      storePingResult(undefined, pingedAgentB64);
      contactGrid.render();
    })
}


/** */
function storePingResult(callResult: any, agentB64: string) {
  const isAgentPresent = callResult !== undefined && callResult.Err === undefined
  console.log("storePingResult() " + agentB64 + " | " + isAgentPresent)
  g_responseMap.set(agentB64, isAgentPresent);
  g_pingMap.set(agentB64, Date.now());
}


/** Refresh g_usernameMap and contactGrid */
function handle_getAllHandles(callResult: any): void {
  if (callResult === undefined || callResult.Err !== undefined) {
    console.error('getAllHandles zome call failed');
  } else {
    /* Update global state */
    //const contactGrid = document.querySelector('#contactGrid') as GridElement;
    let handleList: HandleItem[] = callResult;
    //console.log('handleList: ' + JSON.stringify(handleList))
    g_usernameMap.clear();
    for(let handleItem of handleList) {
      /* TODO: exclude self from list when in prod? */
      let agentId = htos(handleItem.agentId);
      console.log('' + handleItem.name + ': ' + agentId);
      g_usernameMap.set(agentId, handleItem.name);
      if(g_pingMap.get(agentId) === undefined) {
        //console.log("ADDING TO g_pingMap: " + agentId);
        g_pingMap.set(agentId, 0);
        g_responseMap.set(agentId, false);
      }
    }
  }
  /* Reset contactGrid */
  updateRecepients(false)
  const contactsMenu = document.querySelector('#ContactsMenu') as MenuBarElement;
  if (contactsMenu.items.length > 0) {
    contactsMenu.items[0].disabled = false;
    contactsMenu.render();
  }
  /* Update mailGrid */
  const folder = document.querySelector('#fileboxFolder') as ComboBoxElement;
  update_mailGrid(folder.value);
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


/** Add chunk to chunkList */
function handle_writeChunk(callResult: any): void {
  if (callResult === undefined || callResult.Err !== undefined) {
    const err = callResult.Err;
    console.error('writeChunk zome call failed');
    console.error(err);
    return;
  }
  let chunkAddress: EntryHash = callResult;
  g_chunkList.push(chunkAddress);
}


/** Add manifest to fileList */
function handle_writeManifest(callResult: any): void {
  //console.log('writeManifestResult: ' + JSON.stringify(callResult));
  if (callResult === undefined || callResult.Err !== undefined) {
    const err = callResult.Err;
    console.error('writeManifest zome call failed');
    console.error(err);
    return;
  }
  let manifestAddress: ActionHash = callResult;
  g_fileList.push(manifestAddress);
}


/** */
function handle_getManifest(callResult: any): void {
  if (callResult === undefined || callResult.Err !== undefined) {
    const err = callResult.Err;
    console.error('GetManifest zome call failed');
    console.error(err);
    g_hasAttachment = -1;
    return;
  }
  g_hasAttachment = 1;
}


/** */
function handle_missingAttachments(missingCount: number): void {
  let attachmentGrid = document.querySelector('#attachmentGrid') as GridElement;
  attachmentGrid!.render();
}



/** */
function handle_acknowledgeMail(callResult: any): void {
  if (callResult === undefined || callResult.Err !== undefined) {
    const err = callResult.Err;
    console.error('AcknowledgeMail zome call failed');
    console.error(err);
    return;
  }
  getAllMails();
}


/** */
function handle_getChunk(callResult: any): string | null {
  if (callResult === undefined || callResult.Err !== undefined) {
    const err = callResult.Err;
    console.error('GetChunk zome call failed');
    console.error(err);
    return null;
  }
  let chunk = callResult;
  console.log({chunk});
  return chunk
}


/** */
function handle_findManifest(callResult: any): FileManifest | null {
  if (callResult === undefined || callResult.Err !== undefined) {
    const err = callResult.Err;
    console.error('FindManifest zome call failed');
    console.error(err);
    return null;
  }
  let maybeManifest = callResult;
  console.log({maybeManifest});
  return maybeManifest;
}
