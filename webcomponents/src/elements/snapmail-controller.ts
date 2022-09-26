import {css, html, LitElement} from "lit";
import {property, state} from "lit/decorators.js";
//import { unsafeCSS } from 'lit';
//import { CSSModule } from '../css-utils';
import {ScopedElementsMixin} from "@open-wc/scoped-elements";

import '@vaadin/progress-bar';
import '@vaadin/button';
import '@vaadin/upload';
import '@vaadin/combo-box';
import '@vaadin/menu-bar';
import '@vaadin/text-field';
import '@vaadin/text-area';
import '@vaadin/grid';
import '@vaadin/grid/vaadin-grid-column';
//import '@vaadin/grid/vaadin-grid-sort-column.js';
import '@vaadin/grid/vaadin-grid-sort-column';
import '@vaadin/grid/vaadin-grid-selection-column';
import '@vaadin/notification';
import '@vaadin/dialog';
import '@vaadin/split-layout';
import '@vaadin/vertical-layout';
import '@vaadin/horizontal-layout';

import {PolymerElement} from "@polymer/polymer";
import {ProgressBar} from "@vaadin/progress-bar";
import {Button} from "@vaadin/button";
import {TextField} from "@vaadin/text-field";
import {Grid, GridColumn, GridEventContext} from "@vaadin/grid";
import {MenuBar, MenuBarItem} from "@vaadin/menu-bar";
import {TextArea} from "@vaadin/text-area";
import {ComboBox} from "@vaadin/combo-box";
import {HorizontalLayout} from "@vaadin/horizontal-layout";
import {Dialog} from "@vaadin/dialog";
import {Upload} from "@vaadin/upload";
import {Notification} from "@vaadin/notification";
import {GridSelectionColumn} from "@vaadin/grid/vaadin-grid-selection-column";
import {VerticalLayout} from "@vaadin/vertical-layout";
import {GridSortColumn} from "@vaadin/grid/vaadin-grid-sort-column";
import {SplitLayout} from "@vaadin/split-layout";
import {Icon} from "@vaadin/vaadin-icon";

//import '@vaadin-component-factory/vcf-tooltip';

/** Uncaught DOMException: CustomElementRegistry.define: 'vaadin-lumo-styles' has already been defined as a custom element */
import '@vaadin/vaadin-icon';
import '@vaadin/vaadin-lumo-styles';
//import '@vaadin/vaadin-icon/vaadin-icons';
//import '@vaadin/vaadin-lumo-styles/icons';
//import { ThemableMixin } from '@vaadin/vaadin-themable-mixin/vaadin-themable-mixin.js';


import {ActionHash, CellId, EntryHash} from "@holochain/client";
import {AgentPubKey} from "@holochain/client/lib/types";
import {HolochainClient} from "@holochain-open-dev/cell-client";

import {
  ContactGridItem, FileManifest, HandleItem, Mail, MailGridItem, MailItem, SendMailInput, UsernameMap
} from "../types";
import {arrayBufferToBase64, base64ToArrayBuffer, splitFile,  htos, stoh} from "../utils";
import {
  customDateString,
  determineMailCssClass,
  into_gridItem,
  into_mailText,
  is_OutMail,
  isMailDeleted,
  systemFolders
} from "../mail";
import {
  filterMails, updateTray, handle_findManifest,
  handle_getChunk, ids_to_items, handleSignal
} from "../snapmail"

import {DnaBridge} from "../dna_bridge";


/** ----- */

/** Styles for vaadin-grid */
let tmpl = document.createElement('template');
tmpl.innerHTML = `
<style>
  /* Background needs a stronger selector to not be overridden */
  [part~="cell"].male {
      background: rgb(255, 240, 0);
  }

  :host(#contactGrid) #header {
      display: none;
  }

  :host(#groupGrid) #header {
      display: none;
  }
  
  [part~="cell"] ::slotted(vaadin-grid-cell-content) {
  padding-left: 5px;
  }

  .newmail {
      font-weight: bold;
  }

  .deleted {
      color:grey;
      text-decoration: line-through;
  }

  .arrived {
      color:black;
  }
  .checked {
      font-weight: normal;
  }

  .myCc {
      color: #0f4de8;
  }

  .myBcc {
      color: #a56bf8;
  }

  .partially {
      color: darkorange;
  }
  .pending {
      color:darkred;
  }
  .received {
      color: green;
  }
  .statusColumn {
      font-size: x-small;
      text-align: left;
      padding-left: 3px;
  }
</style>
`;

/** ----- */


export const delay = (ms:number) => new Promise(r => setTimeout(r, ms))

//import {version} from '../../package.json';
const version = "42.0.0" /* FIXME */

const redDot   = String.fromCodePoint(0x1F534);
const greenDot = String.fromCodePoint(0x1F7E2);
//const blueDot  = String.fromCodePoint(0x1F535);
const whiteDot  = String.fromCodePoint(0x26AA);


/* Map of (name -> [agentId]) */
const SYSTEM_GROUP_LIST = ['All', 'new...'];


/** @element snapmail-controller */
export class SnapmailController extends ScopedElementsMixin(LitElement) {
  constructor() {
    super();
  }

  // static get is() {
  //   return 'snapmail-controller';
  // }

  @property()
  cellId: CellId | null = null;

  @property()
  hcClient: HolochainClient | null = null;

  /** -- */

  private _dna: DnaBridge | null = null;
  private _dnaIdB64: string = '';
  private _myAgentId: AgentPubKey | null = null;
  private _myHandle = '<unknown>';
  private _myAgentIdB64: string | null = null;

  private _currentMailItem?: MailGridItem;
  private _currentFolder = '';
  private _currentGroup = '';
  private _replyOf: ActionHash | null = null;

  private _allContactItems: ContactGridItem[] = [];
  private _selectedContactIdB64s: string[] = [];
  private _mailItems: any[] /* gridItem*/ = [];

  private _hasAttachment = 0;
  private _chunkList: EntryHash[] = [];
  private _fileList: ActionHash[] = [];


  private _canPing = true;

  /* Map of (agentIdB64 -> username)
   * agentId is base64 string of a hash */
  _usernameMap: UsernameMap = new Map();
  /* Map of (agentIdB64 -> timestamp of last ping) */
  _pingMap = new Map();
  /* Map of (agentIdB64 -> bool) */
  _responseMap: Map<string, boolean> = new Map();
  /* Map of (mailId -> mailItem) */
  _mailMap: Map<string, MailItem> = new Map();
  /** groupname -> agentIdB64[]  */
  private _groupMap: Map<string, string[]> = new Map();

  /** --  -- */

  get handleButtonElem() : Button {
    return this.shadowRoot!.getElementById("handleDisplay") as Button;
  }

  get handleInputElem() : TextField {
    return this.shadowRoot!.getElementById("myNewHandleInput") as TextField;
  }


  get sendProgressBarElem() : ProgressBar {
    return this.shadowRoot!.getElementById("sendProgressBar") as ProgressBar;
  }

  get groupGridElem() : Grid {
    return this.shadowRoot!.getElementById("groupGrid") as Grid;
  }

  get contactGridElem() : Grid {
    return this.shadowRoot!.getElementById("contactGrid") as Grid;
  }

  get fileboxMenuElem() : MenuBar {
    return this.shadowRoot!.getElementById("fileboxMenu") as MenuBar;
  }

  get contactsMenuElem() : MenuBar {
    return this.shadowRoot!.getElementById("ContactsMenu") as MenuBar;
  }

  get actionMenuElem() : MenuBar {
    return this.shadowRoot!.getElementById("ActionBar") as MenuBar;
  }

  get mailGridElem() : Grid {
    return this.shadowRoot!.getElementById("mailGrid") as Grid;
  }

  get mailSearchElem() : TextField {
    return this.shadowRoot!.getElementById("mailSearch") as TextField;
  }

  get folderElem() : ComboBox {
    return this.shadowRoot!.getElementById("fileboxFolder") as ComboBox;
  }

  get contactSearchElem() : TextField {
    return this.shadowRoot!.getElementById("contactSearch") as TextField;
  }

  get inMailAreaElem() : TextArea {
    return this.shadowRoot!.getElementById("inMailArea") as TextArea;
  }

  get outMailSubjectElem() : TextField {
    return this.shadowRoot!.getElementById("outMailSubjectArea") as TextField;
  }

  get outMailContentElem() : TextArea {
    return this.shadowRoot!.getElementById("outMailContentArea") as TextArea;
  }

  get uploadElem() : Upload {
    return this.shadowRoot!.getElementById("myUpload") as Upload;
  }

  get attachmentGridElem() : Grid {
    return this.shadowRoot!.getElementById("attachmentGrid") as Grid;
  }


  get groupComboElem() : ComboBox {
    return this.shadowRoot!.getElementById("groupCombo") as ComboBox;
  }


  /** --  -- */

  /** Setup recurrent pull from DHT every 10 seconds */
  onEvery10sec() {
    console.log("**** onEvery10sec CALLED ****");
    if (process.env.NODE_ENV === 'prod') {
      try {
        this.getAllFromDht();
      } catch(e) {
        console.error("onEvery10sec.getAllFromDht() failed: ", e)
      }
    }
  }

  /** Setup recurrent pull from DHT every 10 seconds */
  onEverySec() {
    if (process.env.NODE_ENV === 'prod') {
      console.log("**** onEverySec CALLED ****");
      try {
        if (this._canPing) {
          this.pingNextAgent();
        }
      } catch(e) {
        console.error("onEverySec.pingNextAgent() failed: ", e)
      }
    }
  }


  /** -- -- */


  /** */
  loadGroupList(dnaId: string) {
    try {
      this._groupMap = new Map(JSON.parse(window.localStorage[dnaId]));
    } catch(err) {
      if (!dnaId || dnaId === '') {
        console.error("localStorage parse failed. No contact groups will be loaded. DnaId =", dnaId);
        console.error({err});
      }
      this._groupMap = new Map();
      this._groupMap.set('All', []);
    }
    console.log({ groupList: this._groupMap });
  }


  /** */
  resetContactGrid(): void {
    if (this.contactGridElem.items && this.contactGridElem.items.length > 0) {
      for(const item of this.contactGridElem.items) {
        const contactItem: ContactGridItem = item as ContactGridItem;
        contactItem.recipientType = '';
      }
    }
    this.contactGridElem.selectedItems = [];
    //this._selectedContactIdB64s = [];
    this.contactGridElem.activeItem = null;
  }


  /** Generic callback: Refresh my handle */
  showHandle(myHandle: string) {
    //console.log('showHandle call result = ' + JSON.stringify(callResult))
    const handleButton = this.shadowRoot!.getElementById('handleText') as Button;
    handleButton.textContent = myHandle
    this._myHandle = handleButton.textContent? handleButton.textContent : myHandle;
  }


  /** */
  async setHandle(e?:any) {
    const newHandle = this.handleInputElem.value;
    console.log('new handle = ' + newHandle);
    /*const callResult =*/ await this._dna!.setHandle(newHandle)
    this.showHandle(newHandle);
    this.handleInputElem.value = '';
    this.hideHandleInput(true);
    // - Update my Handle in the contacts grid
    for (const item of this.contactGridElem.items!) {
      const contactItem: ContactGridItem = item as ContactGridItem;
      if (contactItem.agentIdB64 === this._myAgentIdB64) {
        contactItem.username = newHandle;
      }
    }
    //contactGrid.render();
  }


  /** */
  hideHandleInput(hideInput: boolean): void {
    this.handleButtonElem.hidden = !hideInput;
    this.handleInputElem.hidden = hideInput;
    if (!hideInput) {
      this.handleInputElem.focus();
    }

    const updateButton = this.shadowRoot!.getElementById('setMyHandleButton') as Button;
    const cancelButton = this.shadowRoot!.getElementById('cancelHandleButton') as Button;
    updateButton.hidden = hideInput;
    cancelButton.hidden = hideInput;

    if (!hideInput && this._myHandle !== '<noname>') {
      this.handleInputElem.value = this._myHandle
    } else {
      this.handleInputElem.value = ''
    }
  }



  /** */
  initTitleBar() {
    /** Title bar buttons */
    const controller = this;
    customElements.whenDefined('vaadin-button').then(() => {
      this.handleInputElem.addEventListener("keyup", (event) => {
        if (event.keyCode == 13) {
          controller.setHandle();
        }
      });
    });

    // console.log({NETWORK_ID: DNA.NETWORK_ID})
    // const span = this.shadowRoot!.getElementById('networkIdDisplay') as HTMLElement;
    // console.assert(span);
    // span.textContent = DNA.NETWORK_ID;
    //
    // const title = this.shadowRoot!.getElementById('snapTitle') as HTMLElement;
    // console.assert(title);
    // title.textContent = "SnapMail v" + version;

    // const rootTitle = this.shadowRoot!.getElementById('rootTitle') as HTMLTitleElement;
    // console.assert(rootTitle);
    // const maybeUid = DNA.NETWORK_ID != ""? "  - " + DNA.NETWORK_ID : "";
    // rootTitle.textContent = "SnapMail v" + version + maybeUid;
  }


  /** */
  update_mailGrid(folder: string): void {
    const folderItems = [];
    const activeItem: MailGridItem = this.mailGridElem.activeItem as MailGridItem;
    const codePoint = folder.codePointAt(0);
    console.log('update_mailGrid: ' + folder + ' (' + codePoint + ')');

    switch(codePoint) {
      case systemFolders.ALL.codePointAt(0):
        for (const mailItem of this._mailMap.values()) {
          //folderItems = Array.from(g_mail_map.values());
          folderItems.push(into_gridItem(this._usernameMap, mailItem));
        }
        break;
      case systemFolders.INBOX.codePointAt(0):
      case systemFolders.SENT.codePointAt(0):
        for (const mailItem of this._mailMap.values()) {
          //console.log('mailItem: ' + JSON.stringify(mailItem))
          const is_out = is_OutMail(mailItem);
          if (isMailDeleted(mailItem)) {
            continue;
          }
          if (is_out && codePoint == systemFolders.SENT.codePointAt(0)) {
            folderItems.push(into_gridItem(this._usernameMap, mailItem));
            continue;
          }
          if (!is_out && codePoint == systemFolders.INBOX.codePointAt(0)) {
            folderItems.push(into_gridItem(this._usernameMap, mailItem));
          }
        }
        break;
      case systemFolders.TRASH.codePointAt(0): {
        for (const mailItem of this._mailMap.values()) {
          if(isMailDeleted(mailItem)) {
            folderItems.push(into_gridItem(this._usernameMap, mailItem));
          }
        }
      }
        break;
      default:
        console.error('Unknown folder')
    }

    const span = this.shadowRoot!.getElementById('messageCount') as HTMLElement;
    console.assert(span);
    span.textContent = '' + folderItems.length;

    console.log('folderItems count: ' + folderItems.length);
    // console.log('folderItems: ' + JSON.stringify(folderItems))
    //grid.items = folderItems;
    this._mailItems = folderItems;
    this.mailGridElem.items = filterMails(this._mailItems, this.mailSearchElem.value);
    // - Re-activate activeItem
    if (activeItem !== undefined && activeItem !== null) {
      for(const item of Object.values(this.mailGridElem.items)) {
        const mailGridItem: MailGridItem = item as MailGridItem;
        //console.log('Item id = ' + item.id);
        if(activeItem.id === mailGridItem.id) {
          //console.log('activeItem match found');
          this.mailGridElem.activeItem = item;
          this.mailGridElem.selectedItems = [item];
          break;
        }
      }
    }
    //
    //mailGrid.render();
  }


  /** Regenerate _allContactItems from _usernameMap, _pingMap and _selectedContactIds */
  updateContacts(canResetSelection: boolean): void {
    console.log('updateContacts() - START', this._allContactItems)
    console.log({_selectedContactIdB64s: this._selectedContactIdB64s})
    /* Stash currently selected items' hash (if any) */
    const prevSelected: string[] = [];
    const recipientTypeMap: Map<string, string> = new Map();
    if (!canResetSelection) {
      for (const contactId of this._selectedContactIdB64s) {
        const contactItem: ContactGridItem = this._allContactItems.find((item) => item.agentIdB64 === contactId)!;
        console.assert(contactItem);
        prevSelected.push(contactItem.agentIdB64);
        recipientTypeMap.set(contactItem.agentIdB64, contactItem.recipientType);
      }
    }
    console.log({recipientTypeMap});

    //pingNextAgent();
    /* Convert each handle into a contactGridItem */
    const selected = [];
    const allItems = [];
    for (const [agentIdB64, username] of this._usernameMap.entries()) {
      // console.log('' + agentId + '=> ' + username)
      let status = whiteDot
      if (this._pingMap.get(agentIdB64)) {
        status = this._responseMap.get(agentIdB64)? greenDot : redDot
      }
      //const status = blueDot
      const item: ContactGridItem = {
        username,
        agentIdB64,
        recipientType: '',
        status,
      };
      /** Retrieve stashed selectedItems */
      if (!canResetSelection && prevSelected.includes(agentIdB64)) {
        console.log("keep selected: " + item.username);
        item.recipientType = recipientTypeMap.get(agentIdB64)!;
        selected.push(item);
      }
      allItems.push(item);
    }

    // // Test Content
    // items = [
    //   { "username": "Bob", "agentId": 11, "recipientType": '', "status": blueDot },
    //   { "username": "Alice", "agentId": 222, "recipientType": '', "status": blueDot },
    //   { "username": "Camille", "agentId": 333, "recipientType": '', "status": blueDot },
    //   { "username": "Daniel", "agentId": 444, "recipientType": '', "status": blueDot },
    //   { "username": "Eve", "agentId": 555, "recipientType": '', "status": blueDot },
    // ];

    this._allContactItems = allItems;
    console.log('updateContacts() - END')
  }


  /**
   * Populate contactGrid according to _allContactItems, _selectedContactIds and maybe search value
   * Set Send button state according to selection
   */
  updateContactGrid(canReset: boolean): void {
    /** generated selectedItems */
    let selected = []
    for (const idB64 of this._selectedContactIdB64s) {
      const item = this._allContactItems.find((item) => item.agentIdB64 === idB64)!;
      selected.push(item)
    }
    this.contactGridElem.selectedItems = selected;

    /* Reset search filter */
    if (canReset) {
      this.contactSearchElem.value = '';
    }
    /** generated items */
    this.contactGridElem.items = this.filterContacts(selected, this.contactSearchElem.value);
    //this.contactGridElem.activeItem = null;
    //console.log({contactGrid});
    this.disableSendButton(this._selectedContactIdB64s.length == 0);
  }


  /** Refresh _usernameMap and contactGrid */
  handle_getAllHandles(callResult: any): void {
    if (callResult === undefined || callResult.Err !== undefined) {
      console.error('getAllHandles zome call failed');
    } else {
      /* Update global state */
      const handleList: HandleItem[] = callResult;
      //console.log('handleList: ' + JSON.stringify(handleList))
      this._usernameMap.clear();
      for(const handleItem of handleList) {
        /* TODO: exclude self from list when in prod? */
        const agentIdB64 = htos(handleItem.agentId);
        console.log('' + handleItem.name + ': ' + agentIdB64);
        this._usernameMap.set(agentIdB64, handleItem.name);
        if(this._pingMap.get(agentIdB64) === undefined) {
          //console.log("ADDING TO g_pingMap: " + agentId);
          this._pingMap.set(agentIdB64, 0);
          this._responseMap.set(agentIdB64, false);
        }
      }
    }
    /* Reset contactGrid */
    this.updateContacts(false);
    this.updateContactGrid(false);
    // if (this.contactsMenuElem.items && this.contactsMenuElem.items.length > 0) {
    //   this.contactsMenuElem.items[0].disabled = false;
    //   //contactsMenu.render();
    // }
    /* Update mailGrid */
    this.update_mailGrid(this.folderElem.value);
  }


  /** Refresh mailGrid */
  handle_getAllMails(callResult: any) {
    if (callResult === undefined || callResult.Err !== undefined) {
      //const err = callResult.Err;
      //console.error('getAllMails zome call failed');
      //console.error(err);
      return;
    }
    const mailList: MailItem[] = callResult;

    /** Get currently selected hashs */
    const prevSelected = [];
    if (this.mailGridElem.selectedItems) {
      for (const item of this.mailGridElem.selectedItems) {
        const mailItem: MailGridItem = item as MailGridItem;
        prevSelected.push(htos(mailItem.id));
      }
    }

    const allCount = mailList.length;
    let trashCount = 0;
    let inboxCount = 0;
    let sentCount = 0;
    let newCount = 0;

    const selected = [];
    const items = [];
    this._mailMap.clear();
    const selectedBox = this.folderElem.value.codePointAt(0);
    for (const mailItem of mailList) {
      console.log({mailItem})
      this._mailMap.set(htos(mailItem.ah), mailItem);
      //
      const isDeleted = isMailDeleted(mailItem);
      const isOutMail = is_OutMail(mailItem);

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

      /** Determine if we should add to grid depending on current folder */
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
      const gridItem = into_gridItem(this._usernameMap, mailItem);
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
    const folderBoxAll = this.folderElem;
    folderBoxAll.items = systemFoldersVec;
    for (const systemFolder of systemFoldersVec) {
      //console.log("systemFolder.codePointAt(0) = " + systemFolder.codePointAt(0));
      if (selectedBox == systemFolder.codePointAt(0)) {
        folderBoxAll.value = systemFolder;
        break;
      }
    }

    const mailSearch = this.mailSearchElem;
    console.log('mailCount = ' + items.length + ' (' + selected.length + ')');
    this._mailItems = items;
    this.mailGridElem.items = filterMails(this._mailItems, mailSearch.value);
    this.mailGridElem.selectedItems = selected;
    this.mailGridElem.activeItem = selected[0];
  }


  /** Post callback for getAllMails() */
  handle_post_getAllMails(): void {
    try {
      /** Update mailGrid */
      this.update_mailGrid(this.folderElem.value);
      /** Update active Item */
      console.log('handle_getAllMails ; activeItem = ');
      console.log({activeItem: this.mailGridElem.activeItem})
      if(this.mailGridElem.activeItem) {
        let newActiveItem = null;
        for(const item of this.mailGridElem.items!) {
          const mailItem: MailGridItem = item as MailGridItem;
          if(mailItem.id === this.mailGridElem.activeItem.id) {
            newActiveItem = mailItem;
            break;
          }
        }
        this.mailGridElem.selectItem(newActiveItem);
      }
    } catch(e) {
      console.error("handle_post_getAllMails() failed:", e)
    }
  }


  /** */
  async getAllHandles() {
    let callResult = undefined;
    try {
      callResult = await this._dna!.getAllHandles()
    } catch(e) {
      console.warn("getAllHandles() failed: ", e)
    }
    this.handle_getAllHandles(callResult)
  }


  /** */
  async getAllFromDht() {
    await this._dna!.checkAckInbox();
    await this._dna!.checkMailInbox();
    await this.getAllMails();
  }


  /** */
  async getAllMails() {
    await this.getAllHandles();
    try {
      const callResult = await this._dna!.getAllMails()
      this.handle_getAllMails(callResult)
    } catch(e) {
      console.warn('getAllMails() failed: ', e);
    }
    this.handle_post_getAllMails()
  }



  /** Ping oldest pinged agent */
  pingNextAgent(): void {
    //console.log({this._pingMap});
    //console.log({this._responseMap});
    /* Skip if empty map */
    if (this._pingMap.size === 0) {
      return;
    }
    this._canPing = false;
    /* Sort g_pingMap by value to get oldest pinged agent */
    const nextMap = new Map([...this._pingMap.entries()]
      .sort((a, b) => a[1] - b[1]));
    console.log({nextMap})
    /* Ping first agent in sorted list */
    const pingedAgentB64 = nextMap.keys().next().value
    const pingedAgent = stoh(pingedAgentB64);
    console.log("pinging: ", pingedAgentB64);
    if (pingedAgentB64 === this._myAgentIdB64) {
      console.log("pinging self");
      this.storePingResult({}, pingedAgentB64);
      this._canPing = true;
      return;
    }
    //const contactGrid = this.contactGridElem;
    this._dna!.pingAgent(pingedAgent)
      .then((result: boolean) => {
        this.storePingResult(result, pingedAgentB64);
        this._canPing = true;
        //contactGrid.render();
      })
      .catch((error: any) => {
        console.error('Ping failed for: ' + pingedAgentB64);
        console.error({ error })
        this.storePingResult(undefined, pingedAgentB64);
        //contactGrid.render();
      })
  }


  /** */
  disableSendButton(isDisabled: boolean): void {
    if (this.actionMenuElem.items[2].disabled == isDisabled) {
      return;
    }
    /** Deep-copy MenuBarItems so it can trigger a new render */
    const items = JSON.parse(JSON.stringify(this.actionMenuElem.items)) as MenuBarItem[];
    items[2].disabled = isDisabled;
    this.actionMenuElem.items = items;
  }

  disableDeleteButton(isDisabled: boolean): void {
    console.log("disableDeleteButton() called", isDisabled)
    if (this.fileboxMenuElem.items[2].disabled === isDisabled) {
      return;
    }
    /** deepCopy MenuBarItems so it can trigger a new render */
    const items = JSON.parse(JSON.stringify(this.fileboxMenuElem.items)) as MenuBarItem[];
    items[2].disabled = isDisabled;
    items[3].disabled = isDisabled;
    this.fileboxMenuElem.items = items;
  }

  disableReplyButton(isDisabled: boolean): void {
    if (this.fileboxMenuElem.items[1].disabled == isDisabled) {
      return;
    }
    /** deepCopy MenuBarItems so it can trigger a new render */
    const items = JSON.parse(JSON.stringify(this.fileboxMenuElem.items)) as MenuBarItem[];
    items[1].disabled = isDisabled;
    this.fileboxMenuElem.items = items;
  }


  /** */
  initFileboxMenu() {
    const items =
      [ { text: 'Move', disabled: true }
        , { text: 'Reply', disabled: true, children: [{ text: 'Reply to sender' }, { text: 'Reply to all' }, { text: 'Forward' }] }
        , { text: 'Trash', disabled: true }
        , { text: 'Print', disabled: true }
        //, { text: 'Find', disabled: true }
      ];
    if (process.env.NODE_ENV !== 'prod') {
      items.push({ text: 'Refresh', disabled: false });
    }
    this.fileboxMenuElem.items = items;

    /* On button click */
    const controller = this;
    this.fileboxMenuElem.addEventListener('item-selected', function(e: any) {
      console.log("Menu item-selected: " + JSON.stringify(e.detail.value));
      /* -- Handle 'Print' -- */
      if (e.detail.value.text === 'Print') {
        console.log({_currentMailItem: controller._currentMailItem})
        const mailItem = controller._mailMap.get(htos(controller._currentMailItem!.id));
        const mailText = into_mailText(controller._usernameMap, mailItem!)
        /** Save to disk */
        const blob = new Blob([mailText], { type: 'text/plain'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = mailItem!.mail.subject + ".txt";
        a.addEventListener('click', () => {}, false);
        a.click();
      }
      /* -- Handle 'Trash' -- */
      if (e.detail.value.text === 'Trash') {
        controller._replyOf = null;
        controller._dna!.deleteMail(controller._currentMailItem!.id)
          .then((/*maybeAh: ActionHash | null*/) => controller.getAllMails()) // On delete, refresh filebox
        controller.mailGridElem.selectedItems = [];
        controller.mailGridElem.activeItem = null;
        controller.inMailAreaElem.value = ""
        controller.disableDeleteButton(true)
        controller.disableReplyButton(true)
      }
      /* -- Handle 'Reply' -- */
      const outMailSubjectArea = controller.outMailSubjectElem;
      const contactGrid = controller.contactGridElem;

      if (e.detail.value.text === 'Reply to sender') {
        outMailSubjectArea.value = 'Re: ' + controller._currentMailItem!.subject;
        controller._replyOf = controller._currentMailItem!.id;
        console.log("g_replyOf set ", htos(controller._replyOf));
        controller.resetContactGrid();
        for (const item of contactGrid.items!) {
          const contactItem: ContactGridItem = item as ContactGridItem;
          if (contactItem.username === controller._currentMailItem!.username) {
            controller.toggleContact(contactItem);
            controller.updateContactGrid(false);
            contactGrid.activeItem = contactItem;
            break;
          }
        }
      }
      if (e.detail.value.text === 'Reply to all') {
        const mailItem = controller._mailMap.get(htos(controller._currentMailItem!.id));
        controller._replyOf = controller._currentMailItem!.id;
        if (mailItem) {
          outMailSubjectArea.value = 'Re: ' + controller._currentMailItem!.subject;
          controller.resetContactGrid();
          /* TO */
          for (const agentId of mailItem.mail.to) {
            const to_username = controller._usernameMap.get(htos(agentId));
            controller.selectUsername(contactGrid, to_username!, 1);
          }
          /* CC */
          for (const agentId of mailItem.mail.cc) {
            const cc_username = controller._usernameMap.get(htos(agentId));
            controller.selectUsername(contactGrid, cc_username!, 2);
          }
          /* BCC */
          if (mailItem.bcc) {
            for (const agentId of mailItem.bcc) {
              const bcc_username = controller._usernameMap.get(htos(agentId));
              controller.selectUsername(contactGrid, bcc_username!, 3);
            }
          }
          // Done
          //contactGrid.render();
        }
      }
      if (e.detail.value.text === 'Forward') {
        outMailSubjectArea.value = 'Fwd: ' + controller._currentMailItem!.subject;
        controller.resetContactGrid();
        const mailItem = controller._mailMap.get(htos(controller._currentMailItem!.id));
        let fwd = '\n\n';
        fwd += '> ' + 'Mail from: ' + controller._usernameMap.get(htos(mailItem!.author)) + ' at ' + customDateString(mailItem!.date) + '\n';
        const arrayOfLines = mailItem!.mail.payload.match(/[^\r\n]+/g);
        for (const line of arrayOfLines!) {
          fwd += '> ' + line + '\n';
        }
        controller.outMailContentElem.value = fwd;
      }
      // -- Handle 'Refresh' -- //
      if (e.detail.value.text === 'Refresh') {
        //console.log('Refresh called');
        controller.getAllFromDht();
      }
    });
  }


  /** */
  handle_getManifest(callResult: any): void {
    if (!callResult || callResult.Err !== undefined) {
      const err = callResult.Err;
      console.error('GetManifest zome call failed');
      console.error(err);
      this._hasAttachment = -1;
      return;
    }
    this._hasAttachment = 1;
  }


  /** */
  async fillAttachmentGrid(mail: Mail): Promise<number> {
    const items = [];
    const emoji = String.fromCodePoint(0x1F6D1);
    this._hasAttachment = 0;
    let missingCount = 0;
    for (const attachmentInfo of mail.attachments) {
      //console.log({attachmentInfo});
      const callResult = await this._dna!.getManifest(attachmentInfo.manifest_eh);
      this.handle_getManifest(callResult)

      const hasAttachment = this._hasAttachment > 0;
      missingCount += Number(!hasAttachment);
      const item = {
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
    this.attachmentGridElem.items = items;
    this.attachmentGridElem.selectedItems = [];
    this.attachmentGridElem.activeItem = null;
    //console.log({missingCount})
    return missingCount;
  }


  /** FIXME */
  handle_missingAttachments(missingCount: number): void {
    //const attachmentGrid = document.getElementById('attachmentGrid') as Grid;
    //attachmentGrid!.render();
  }




  /** */
  initFileBox() {
    const controller = this;
    const fileboxLayout = this.shadowRoot!.getElementById('fileboxLayout') as HorizontalLayout;
    if (process.env.NODE_ENV !== 'prod') {
      fileboxLayout.style.backgroundColor = "rgba(241,154,154,0.82)";
    }
    /** Combobox -- vaadin-combo-box */
    const systemFoldersVec = [systemFolders.ALL, systemFolders.INBOX, systemFolders.SENT, systemFolders.TRASH];
    const folderCombo = this.folderElem;
    folderCombo.items = systemFoldersVec;
    folderCombo.value = systemFoldersVec[1];
    this._currentFolder = folderCombo.value;
    /** On value change */
    folderCombo.addEventListener('change', function(event:any) {
      controller.mailGridElem.selectedItems = [];
      controller.mailGridElem.activeItem = null;
      controller._replyOf = null;
      controller.update_mailGrid(event.target.value)
      controller._currentFolder = event.target.value;
      controller.disableDeleteButton(true)
      controller.disableReplyButton(true)
    });

    /** Filebox -- vaadin-grid */
    this.mailGridElem.items = [];
    this.mailGridElem.multiSort = true;
    /** Display bold if mail not acknowledged */
    this.mailGridElem.cellClassNameGenerator = function(column, rowData:any) {
      let classes = '';
      const mailItem: MailItem = controller._mailMap.get(htos(rowData.item.id))!;
      classes += determineMailCssClass(mailItem!);
      // let is_old = hasMailBeenOpened(mailItem);
      // //console.log('answer: ' + is_old);
      // if (!is_old) {
      //   classes += ' newmail';
      // }
      return classes;
    };

    /** On item select: Display in inMailArea */
    this.mailGridElem.addEventListener('active-item-changed', function(event:any) {
      console.log('mailgrid Event: active-item-changed');
      controller._replyOf = null;
      const item = event.detail.value;
      controller.mailGridElem.selectedItems = item ? [item] : [];
      if (!item) {
        //getAllMails(handleMails, handle_getAllMails)
        return;
      }
      controller._currentMailItem = item;
      const mailItem = controller._mailMap.get(htos(item.id))!;
      console.assert(mailItem)
      //console.log('mail item:', mailItem)
      controller.inMailAreaElem.value = into_mailText(controller._usernameMap, mailItem);

      controller.fillAttachmentGrid(mailItem.mail).then( function(missingCount: number) {
        if (missingCount > 0) {
          controller._dna!.getMissingAttachments(mailItem.author, mailItem.ah)
            .then((missingCount:number) => controller.handle_missingAttachments(missingCount))
            .catch((err:any) => {
              console.error('MissingAttachments zome call failed');
              console.error(err);
            })
        }
        controller._dna!.acknowledgeMail(item.id)
        //.then(callResult => handle_acknowledgeMail(callResult));
        // Allow delete button
        if (controller._currentFolder.codePointAt(0) !== systemFolders.TRASH.codePointAt(0)) {
          controller.disableDeleteButton(false)
          controller.disableReplyButton(false)
        }
      });
    });

    this.inMailAreaElem.style.backgroundColor = "#dfe7efd1";
    this.mailSearchElem.addEventListener('value-changed', function(e:any /*TextFieldValueChangedEvent*/) {
      controller.mailGridElem.items = filterMails(controller.mailGridElem.items!, e.detail.value);
      //mailGrid.render();
    });
  }


  /** Return manifest with added content field */
  async getFile(fileId: ActionHash): Promise<FileManifest | null> {
    const callResult = await this._dna!.findManifest(fileId);
    const manifest = handle_findManifest(callResult)
    if (!manifest) {
      return null;
    }
    const chunks = [];
    let i = 0;
    for (const chunkAddress of manifest.chunks) {
      i++;
      const callResult = await this._dna!.getChunk(chunkAddress)
      const maybeChunk = handle_getChunk(callResult)
      if (!maybeChunk) {
        return null;
      }
      chunks.push(maybeChunk)
    }
    /** concat chunks */
    let content = '';
    for (const chunk of chunks) {
      content += chunk;
    }
    manifest.content = content;
    return manifest;
  }


  /** */
  setCurrentGroup(groupName: string): void {
    console.log('Current Group changed: ' + groupName);
    if(groupName === 'new...') {
      const newDialog = this.shadowRoot!.getElementById('newGroupDlg') as Dialog;
      newDialog.opened = true;
      return;
    }
    //const groupIds = g_groupList.get(groupName);
    //console.log('groupIds:' + JSON.stringify(groupIds));
    this._currentGroup = groupName;
    this.contactGridElem.items = this.filterContacts([], this.contactSearchElem.value);
    this.resetContactGrid();
    this.disableDeleteButton(true);
    this.disableReplyButton(true);
    console.log({contactGrid: this.contactGridElem});
    this.updateContactGrid(false);
    //contactGrid.render();
    const entries = Array.from(this._groupMap.entries());
    console.log({entries})
    window.localStorage[this._dnaIdB64] = JSON.stringify(entries);
  }


  /** */
  initInMail() {
    this.inMailAreaElem.value = '';
    this.initAttachmentGrid();
  }


  /** */
  initAttachmentGrid() {
    const controller = this;
    /** attachmentGrid -- vaadin-grid */
    this.attachmentGridElem.items = [];

    this.attachmentGridElem.cellClassNameGenerator = function(column, rowData:any/*FIXME*/) {
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
    this.attachmentGridElem.addEventListener('active-item-changed', function(event:any) {
      const item = event.detail.value;
      console.log({item})
      controller.attachmentGridElem.activeItem = null;
      controller.attachmentGridElem.selectedItems = [];

      if (!item || !item.hasFile) {
        return;
      }

      if (!controller.attachmentGridElem.selectedItems.includes(item)) {
        //attachmentGrid.selectedItems = [];
        item.status = String.fromCodePoint(0x23F3);
        controller.attachmentGridElem.selectedItems.push(item);
        item.disabled = true;
        //controller.attachmentGridElem.render();
      }

      /** Get File on source chain */
      controller.getFile(item.fileId).then(function(manifest: FileManifest | null) {
        if (!manifest) {
          return;
        }
        //console.log({ manifest })
        item.status = String.fromCodePoint(0x2714);
        //controller.attachmentGridElem.deselectItem(item);

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
        const byteArray = base64ToArrayBuffer(manifest.content!)
        const blob = new Blob([byteArray], { type: filetype});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.filename || 'download';
        a.addEventListener('click', () => {}, false);
        a.click();
        controller.attachmentGridElem.activeItem = null;
        controller.attachmentGridElem.selectedItems = [];
        //attachmentGrid.render();
      });
    });
  }


  /** */
  filterContacts(selectedItems: ContactGridItem[], searchValue: string): ContactGridItem[] {
    console.log("filterContacts() called");
    /** Get contacts from current group only */
    //console.log({items});
    let groupItems = this._allContactItems;
    if (this._currentGroup !== SYSTEM_GROUP_LIST[0]) {
      const ids = this._groupMap.get(this._currentGroup);
      //console.log({ids});
      groupItems = ids_to_items(ids!, this._allContactItems);
      //console.log({items});
    }
    /** Set filter */
    const searchTerm = (searchValue || '').trim();
    const matchesTerm = (value: string) => {
      return value.toLowerCase().indexOf(searchTerm.toLowerCase()) >= 0;
    };
    /** Apply filter */
    const filteredItems = groupItems.filter((item) => {
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
  regenerateGroupComboBox(current: string): void {
    if (this._groupMap === undefined || this._groupMap === null) {
      return;
    }
    const keys = Array.from(this._groupMap.keys());
    console.log({groupKeys: keys})
    keys.push('new...');
    this.groupComboElem.items = keys;
    this.groupComboElem.value = current;
  }


  /** */
  isValidGroupName(name: string) {
    const keys = Array.from(this._groupMap.keys());
    for (const takenName of keys) {
      if (name === takenName) {
        return false;
      }
    }
    return true;
  }


  /** */
  initContactsArea() {
    const controller = this;
    /** Add Refresh button in DEBUG */
    if (process.env.NODE_ENV !== 'prod') {
      const contactsMenu = this.contactsMenuElem;
      contactsMenu.items = [{ text: 'Refresh' }];
      contactsMenu.addEventListener('item-selected', function(e:any) {
        console.log(JSON.stringify(e.detail.value));
        if(e.detail.value.text === 'Refresh') {
          console.log("contactsMenu Refresh clicked")
          contactsMenu.items[0].disabled = true;
          //contactsMenu.render();
          controller.getAllHandles();
        }
      });
    }
    /** -- Groups Combo box  */
    //groupCombo.items = SYSTEM_GROUP_LIST;
    //groupCombo.value = SYSTEM_GROUP_LIST[0];
    this.regenerateGroupComboBox(SYSTEM_GROUP_LIST[0]);
    this._currentGroup = this.groupComboElem.value;
    this.groupComboElem.addEventListener('change', function(event:any) {
      controller.setCurrentGroup(event.target.value);
    });
    /** -- contactGrid */
    //const contactGrid = this.contactGridElem;
    this.contactGridElem.items = [];
    this.contactGridElem.cellClassNameGenerator = function(column, rowData:any) {
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
    // /** ON SELECT */
    // contactGrid.addEventListener('active-item-changed', function(event:any) {
    //   console.log("contactGrid.active-item-changed:", event)
    //   const item = event.detail.value;
    //   if (!item) {
    //     return;
    //   }
    //   console.log({activeChanged_before_SelectedItems: contactGrid.selectedItems})
    //   if(!contactGrid.selectedItems.includes(item)) {
    //     const selected = JSON.parse(JSON.stringify(contactGrid.selectedItems)); // deep-copy
    //     selected.push(item);
    //     contactGrid.selectedItems = selected;
    //   }
    //   console.log({activeChanged_after_SelectedItems: contactGrid.selectedItems})
    //   controller.disableSendButton(contactGrid.selectedItems!.length == 0);
    //   //controller.updateRecipients(false)
    // });
    /** ON CLICK */
    this.contactGridElem.addEventListener('click', function(e) {
      const eventContext: GridEventContext<ContactGridItem> = controller.contactGridElem.getEventContext(e)!;
      console.log("contactGrid.click:", eventContext)
      /* Bail if clicked on empty space */
      if (!eventContext.item) {
        return;
      }
      const index = controller._allContactItems.indexOf(eventContext.item)
      console.assert(index > -1)
      console.log({click_before_SelectedItems: controller.contactGridElem.selectedItems})
      controller.toggleContact(controller._allContactItems[index]);
      controller.updateContactGrid(false);
      console.log({click_after_SelectedItems: controller.contactGridElem.selectedItems})
      //console.log({click_activeItem: controller.contactGridElem.activeItem})
    });

    /** -- Contacts search bar */
    this.contactSearchElem.addEventListener('value-changed', function(e: any/*: TextFieldValueChangedEvent*/) {
      const searchValue = e.detail.value;
      controller.contactGridElem.items = controller.filterContacts(controller.contactGridElem.selectedItems, searchValue);
    });
  }


  /** update state */
  toggleContact(contactItem: ContactGridItem) {
    let nextType = '';
    switch(contactItem.recipientType) {
      case '': {
        nextType = 'to';
        this._selectedContactIdB64s.push(contactItem.agentIdB64)
      } break;
      case 'to': nextType = 'cc'; break;
      case 'cc': nextType = 'bcc'; break;
      case 'bcc': {
        nextType = '';
        /** Remove item from selected list */
          //if (selectedItems.length > 0) {
        const index = this._selectedContactIdB64s.indexOf(contactItem.agentIdB64)
        if (index > -1) {
          this._selectedContactIdB64s.splice(index, 1);
        }
        //}
        break;
      }
      default: console.error('unknown recipientType');
    }
    contactItem.recipientType = nextType;
    //return JSON.parse(JSON.stringify(selectedItems)) // deep-copy
  }

  /** */
  selectUsername(contactGrid: Grid, candidate: string, count: number) {
    for(const contactItem of contactGrid.items!) {
      if(contactItem.username !== candidate) {
        continue;
      }
      contactGrid.selectedItems.push(contactItem);
      for (let i = 0; i < count; i++) {
        this.toggleContact(contactItem);
      }
      contactGrid.activeItem = contactItem;
      break;
    }
  }


  /** Add chunk to chunkList */
  handle_writeChunk(callResult: any): void {
    if (!callResult || callResult.Err !== undefined) {
      const err = callResult.Err;
      console.error('writeChunk zome call failed');
      console.error(err);
      return;
    }
    const chunkAddress: EntryHash = callResult;
    this._chunkList.push(chunkAddress);
  }


  /** Add manifest to fileList */
  handle_writeManifest(callResult: any): void {
    //console.log('writeManifestResult: ' + JSON.stringify(callResult));
    if (!callResult || callResult.Err !== undefined) {
      const err = callResult.Err;
      console.error('writeManifest zome call failed');
      console.error(err);
      return;
    }
    const manifestAddress: ActionHash = callResult;
    this._fileList.push(manifestAddress);
  }


  /** Perform send mail action */
  async sendAction(): Promise<void> {
    /** Submit each attachment */
    const files = this.uploadElem.files;
    this._fileList = [];
    for (const file of files) {
      // // Causes stack error on big files
      // if (!base64regex.test(file.content)) {
      //   const invalid_hash = sha256(file.content);
      //   console.error("File '" + file.name + "' is invalid base64. hash is: " + invalid_hash);
      // }
      console.log('sendAction: ', file)
      const content = await file.arrayBuffer();
      const contentB64 = arrayBufferToBase64(content);

      const filetype = ""
      const splitObj = await splitFile(contentB64);
      console.log({splitObj})


      /** Submit each chunk */
      this._chunkList = [];
      for (let i = 0; i < splitObj.numChunks; ++i) {
        //console.log('chunk' + i + ': ' + fileChunks.chunks[i])
        const callResult = await this._dna!.writeChunk(splitObj.dataHash, i, splitObj.chunks[i]);
        this.handle_writeChunk(callResult)
        // while (g_chunkList.length !=  i + 1) {
        //   await sleep(10)
        // }
      }
      // while (g_chunkList.length < splitObj.numChunks) {
      //   await sleep(10);
      // }
      const callResult = await this._dna!.writeManifest(splitObj.dataHash, file.name, filetype, file.size, this._chunkList)
      this.handle_writeManifest(callResult)
    }
    // while (g_fileList.length < files.length) {
    //   await sleep(10);
    // }

    /* Get contact Lists */
    //const selection: ContactGridItem[] = this.contactGridElem.selectedItems? this.contactGridElem.selectedItems as ContactGridItem[] : [];
    const selection = this.contactGridElem.selectedItems;
    console.log('selection: ', selection);
    if (!selection || selection.length == 0) {
      console.log('Send Mail Failed: No recipient selected')
      return;
    }

    const toList = [];
    const ccList = [];
    const bccList = [];
    /* Get recipients from contactGrid */
    for (const contactItem of selection) {
      console.log('recipientType: ' + contactItem.recipientType);
      switch (contactItem.recipientType) {
        case '': break;
        case 'to': toList.push(stoh(contactItem.agentIdB64)); break;
        case 'cc': ccList.push(stoh(contactItem.agentIdB64)); break;
        case 'bcc': bccList.push(stoh(contactItem.agentIdB64)); break;
        default: console.error('unknown recipientType');
      }
    }
    /* Create Mail */
    const mail: SendMailInput = {
      subject: this.outMailSubjectElem.value,
      payload: this.outMailContentElem.value,
      reply_of: this._replyOf,
      to: toList, cc: ccList, bcc: bccList,
      manifest_address_list: this._fileList
    };
    console.log('sending mail:', mail)
    /* Send Mail */
    const outmail_hh = await this._dna!.sendMail(mail);
    /* Update UI */
    if (this._replyOf) {
      const replyOfStr = htos(this._replyOf)
      const mailItem = this._mailMap.get(replyOfStr)!;
      mailItem.reply = outmail_hh;
      this._mailMap.set(replyOfStr, mailItem);
    }
    this._replyOf = null;
    this.outMailSubjectElem.value = '';
    this.outMailContentElem.value = '';
    this._selectedContactIdB64s = [];
    this.updateContacts(false);
    this.updateContactGrid(false);
    this.contactGridElem.activeItem = null;
    console.log('sendMail -> getAllMails');
    await this.getAllMails();
    this.uploadElem.files = [];
  }


  /** */
  initActionMenu() {
    const controller = this;
    const actionMenu = this.actionMenuElem;
    actionMenu.items = [
      { text: 'Clear' },
      //{ text: '+File', disabled: true },
      { text: 'Snap', disabled: true },
      { text: 'Send', disabled: true }
    ];

    /** ON SELECT */
    actionMenu.addEventListener('item-selected', function(e:any) {
      console.log('actionMenu: ' + JSON.stringify(e.detail.value.text))
      const upload = controller.uploadElem;
      /** Clear clicked */
      if (e.detail.value.text === 'Clear') {
        controller.outMailSubjectElem.value = '';
        controller.outMailContentElem.value = '';
        /** clear each attachment */
        upload.files = [];
        controller._selectedContactIdB64s = [];
        controller.updateContacts(true);
        controller.updateContactGrid(true);
        return;
      }
      /** Send clicked */
      if (e.detail.value.text === 'Send') {
        /** Hide actionMenu and display progress bar */
        const sendProgressBar = controller.sendProgressBarElem;
        const sendingTitle = controller.shadowRoot!.getElementById('sendingTitle') as HTMLElement;
        sendProgressBar.style.display = "block";
        sendingTitle.style.display = "block";
        actionMenu.style.display = "none";
        //upload.style.display = "none";
        /** Perform send */
        upload.maxFiles = 0;
        controller.sendAction().then(() => {
          /** Show actionMenu and hid progress bar */
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
  allowActionMenu(canShowMenu: boolean): void {
    if (canShowMenu) {
      this.sendProgressBarElem.style.display = "none";
      this.actionMenuElem.style.display = "block";
    } else  {
      this.sendProgressBarElem.style.display = "block";
      this.actionMenuElem.style.display = "none";
    }
  }


  /** */
  initUpload(): void {
    const controller = this;
    customElements.whenDefined('vaadin-upload').then(function() {

      controller.uploadElem.addEventListener('file-reject', function(event:any) {
        window.alert(event.detail.file.name + ' error: ' + event.detail.error);
      });

      /** -- On upload file selected -- */
      controller.uploadElem.addEventListener('upload-before', function(event:any) {
        console.log('upload-before event: ', event);

        const file = event.detail.file;
        //const xhr = event.detail.xhr;
        //console.log({file});

        event.preventDefault(); // Prevent the upload request

        /** Read file just so we can change vaadin's upload-file css */
        const reader = new FileReader();
        reader.addEventListener('loadend', function(event:any) {
          console.log('FileReader loadend event: ', event);
          /** Hide all unnecessary UI */
          const uploadFiles = controller.uploadElem.shadowRoot!.querySelectorAll("vaadin-upload-file");
          console.log({uploadFiles});
          uploadFiles.forEach((uploadFile) => {
            const progressBar = uploadFile.shadowRoot!.querySelector("vaadin-progress-bar");
            progressBar!.style.display = 'none';
            const status = uploadFile.shadowRoot!.querySelector('[part="status"]') as HTMLElement;
            status!.style.display = 'none';
            const start = uploadFile.shadowRoot!.querySelector('[part="start-button"]') as HTMLElement;
            start!.style.display = 'none';
          });
        });
        reader.readAsArrayBuffer(file);
      });

      //  controller.uploadElem.addEventListener('upload-request', function(event) {
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
  initNotification() {
    /** -- Mail  */
    let notificationMail = this.shadowRoot!.getElementById('notifyMail') as Notification;
    notificationMail.renderer = function(root) {
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
    let notification = this.shadowRoot!.getElementById('notifyAck') as Notification;
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
    notification = this.shadowRoot!.getElementById('notifyFile') as Notification;
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
  createNewGroup(dialog: Dialog, textField: TextField) {
    if (!this.isValidGroupName(textField.value)) {
      textField.invalid = true;
      textField.errorMessage = 'Name already taken';
      return;
    }
    if (textField.value.length < 1) {
      textField.invalid = true;
      textField.errorMessage = 'Min 1 character';
      return;
    }
    this._groupMap.set(textField.value, []);
    //console.log('g_groupList: ' + JSON.stringify(g_groupList.keys()));
    this.regenerateGroupComboBox(textField.value);
    this.setCurrentGroup(textField.value);
    textField.value = '';
    dialog.opened = false;
  }


  /** */
  initGroupsDialog() {
    console.log("initGroupsDialog() called");
    const controller = this;
    /** -- New Group Dialog */
    const newDialog = this.shadowRoot!.getElementById('newGroupDlg') as Dialog;
    newDialog.renderer = function(root, dialog) {
      /** Check if there is a DOM generated with the previous renderer call to update its content instead of recreation */
      if(root.firstElementChild) {
        //console.log({root});
        const vaadin = root.children[1] as PolymerElement;
        vaadin.autofocus = true;
        vaadin.focus();
        return;
      }
      /** Title */
      const div = window.document.createElement('div') as HTMLDivElement;
      div.textContent = 'Create new group: ';
      const br = window.document.createElement('br');
      /** Name text-field */
      const vaadin = window.document.createElement('vaadin-text-field') as TextField;
      vaadin.placeholder = "name";
      vaadin.autofocus = true;
      vaadin.minlength = 1;
      vaadin.maxlength = 16;
      vaadin.helperText = "Max 16 characters";
      vaadin.allowedCharPattern = "[a-zA-Z0-9_.]";
      vaadin.addEventListener("keyup", (event) => {
        /** On return key */
        if (event.keyCode == 13) {
          controller.createNewGroup(dialog!, vaadin);
        }
      });

      /** Confirm Button */
      const okButton = window.document.createElement('vaadin-button') as Button;
      okButton.setAttribute('theme', 'primary');
      okButton.textContent = 'OK';
      okButton.setAttribute('style', 'margin-right: 1em');
      okButton.addEventListener('click', function() {
        controller.createNewGroup(dialog!, vaadin);
      });
      /** Cancel Button */
      const cancelButton = window.document.createElement('vaadin-button') as Button;
      cancelButton.textContent = 'Cancel';
      cancelButton.addEventListener('click', function() {
        vaadin.value = '';
        controller.groupComboElem.value = controller._currentGroup;
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

    const editDialog = this.shadowRoot!.getElementById('editGroupDlg') as Dialog;
    editDialog.renderer = function(root, dialog) {
      console.log("Edit Groups dialog called: ", controller._currentGroup);
      /** Check if there is a DOM generated with the previous renderer call to update its content instead of recreation */
      if(root.firstElementChild) {
        const title = root.children[0];
        title.textContent = 'Edit Group: ' + controller._currentGroup;
        const grid = root.children[1] as Grid;
        grid.items = controller._allContactItems;
        const groupIds = controller._groupMap.get(controller._currentGroup);
        if (groupIds) {
          grid.selectedItems = ids_to_items(groupIds, grid.items);
        }
        return;
      }
      /** Title */
      const div = window.document.createElement('h3');
      div.textContent = 'Edit Group: ' + controller._currentGroup;
      div.setAttribute('style', 'margin-bottom: 10px; margin-top: 0px;');
      const br = window.document.createElement('br');


      /* Grid <vaadin-grid> */
      const selectColumn: GridSelectionColumn = window.document.createElement('vaadin-grid-selection-column');
      selectColumn.autoSelect = true;
      const column = window.document.createElement('vaadin-grid-column');
      column.path = 'username';
      column.header = "Name";
      column.flexGrow = 0;
      column.width = "300px";
      const grid = window.document.createElement('vaadin-grid') as Grid;
      grid.appendChild(selectColumn);
      grid.appendChild(column);
      grid.id = "groupGrid";
      //grid.heightByRows = true;
      grid.setAttribute('style', 'width: 360px;display:block;');
      grid.items = controller._allContactItems;
      console.log({groupItems: grid.items})
      const groupIds = controller._groupMap.get(controller._currentGroup);
      const items = ids_to_items(groupIds!, grid.items)
      //grid.selectedItems = items; // does not work here
      /** Confirm Button */
      const okButton = window.document.createElement('vaadin-button');
      okButton.setAttribute('theme', 'primary');
      okButton.textContent = 'OK';
      okButton.setAttribute('style', 'margin-right: 1em');



      /** OnClick OK save agentIds of selected items for the group */
      okButton.addEventListener('click', function() {
        const ids = [];
        for (const item of grid.selectedItems!) {
          const contactItem: ContactGridItem = item as ContactGridItem;
          ids.push(contactItem.agentIdB64);
        }
        controller._groupMap.set(controller._currentGroup, ids);
        grid.selectedItems = [];
        controller.setCurrentGroup(controller._currentGroup);
        dialog!.opened = false;
      });
      /** Delete Button */
      const delButton = window.document.createElement('vaadin-button');
      delButton.setAttribute('theme', 'error');
      delButton.textContent = 'Delete';
      delButton.setAttribute('style', 'margin-right: 1em');
      delButton.addEventListener('click', function() {
        controller._groupMap.delete(controller._currentGroup);
        controller.regenerateGroupComboBox(SYSTEM_GROUP_LIST[0]);
        controller.setCurrentGroup(SYSTEM_GROUP_LIST[0]);
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
      /** Set selected at the end otherwise it won't register */
      grid.selectedItems = items;
    };

    /** -- Edit Group Button */
    const button = this.shadowRoot!.getElementById('groupsBtn') as Button;
    button.addEventListener('click', () => {
      /** open if not 'All' group selected */
      if (controller._currentGroup !== SYSTEM_GROUP_LIST[0]) {
        editDialog.opened = true;
      }
    });
  }


  /** */
  storePingResult(callResult: any, agentB64: string) {
    const isAgentPresent = callResult !== undefined && callResult.Err === undefined
    console.log("storePingResult() " + agentB64 + " | " + isAgentPresent)
    this._responseMap.set(agentB64, isAgentPresent);
    this._pingMap.set(agentB64, Date.now());
  }


  /** */
  async initDna() {
    console.log('initDna()');
    try {
      //const cellId = await DNA.rsmConnectApp(this.handleSignal)
      this.hcClient!.addSignalHandler(handleSignal)
      this._dna = new DnaBridge(this.hcClient!, this.cellId!)

      const dnaId = htos(this.cellId![0]);
      this._dnaIdB64 = dnaId;
      this._myAgentId = this.cellId![1];
      this._myAgentIdB64 = htos(this._myAgentId);

      this.storePingResult({}, this._myAgentIdB64);

      /** Load Groups from localStorage */
      this.loadGroupList(dnaId);
      this.regenerateGroupComboBox(SYSTEM_GROUP_LIST[0]);
      // let label = this.shadowRoot!.getElementById('agentIdDisplay');
      // label.textContent = g_myAgentId
      this._dna!.getMyHandle()
        .then((myHandle:string) => this.showHandle(myHandle));
      await this.getAllFromDht();

      // -- findAgent ? -- //
      //const handleButton = this.shadowRoot!.getElementById('handleText');
      //this._dna!.findAgent(handleButton.textContent, handle_findAgent);

      /** -- Change title color in debug -- */
      const titleLayout = this.shadowRoot!.getElementById('titleLayout') as HorizontalLayout;
      if (process.env.NODE_ENV !== 'prod') {
        titleLayout.style.backgroundColor = "#ec8383d1";
      }
      // if (DNA.IS_ELECTRON) {
      //   titleLayout.style.display = "none";
      //   if (process.env.NODE_ENV !== 'prod') {
      //     /** -- Update Title with DNA ID */
      //     const rootTitle = document.getElementById('rootTitle') as HTMLTitleElement;
      //     console.assert(rootTitle);
      //     //rootTitle.textContent = "SnapMail v" + version + "  - " + DNA.NETWORK_ID;
      //     rootTitle.textContent = rootTitle.textContent + " (" + dnaId + ")";
      //   }
      // }
      /** -- Update Abbr -- */
      const handleAbbr = this.shadowRoot!.getElementById('handleAbbr') as HTMLElement;
      handleAbbr.title = "agentId: " + this._myAgentIdB64;
      const titleAbbr = this.shadowRoot!.getElementById('titleAbbr') as HTMLElement;
      titleAbbr.title = dnaId;
      /** -- Loading Done -- */
      const loadingBar = this.shadowRoot!.getElementById('loadingBar') as ProgressBar;
      loadingBar.style.display = "none";
      const mainPage = this.shadowRoot!.getElementById('mainPage') as VerticalLayout;
      mainPage.style.display = "flex";
    } catch(error:any) {
      console.error('initDna() FAILED');
      console.error({ error })
      alert("Failed to connect to holochain. Holochain conductor service might not be up and running.");
    }
  }


  /** */
  initUi() {
    this.initTitleBar();
    this.initFileboxMenu();
    this.initFileBox();
    this.initInMail();
    this.initContactsArea();
    this.hideHandleInput(true)
    this.initActionMenu();
    this.initUpload();
    //getMyAgentId(logResult)
    this.initNotification();
    this.initGroupsDialog();
    /** init DNA at the end because the callbacks will populate the UI */
    this.initDna();
    /* init Send progress bar */
    this.sendProgressBarElem.style.display = "none";
  }


  /** After first render only */
  async firstUpdated() {
    console.log("snapmail-controller first update done!")
    this.loadGroupList('');
    this.initUi()

    /*let _10sec =*/ setInterval(this.onEvery10sec, 10 * 1000);
    // /*let _1Sec =*/ setInterval(this.onEverySec, 1 * 1000);


    /** Styling of vaadin components */
    this.mailGridElem.shadowRoot!.appendChild(tmpl.content.cloneNode(true));
    this.contactGridElem.shadowRoot!.appendChild(tmpl.content.cloneNode(true));
  }


  /** After each render */
  async updated(changedProperties: any) {
    // n/a
  }


  /** Render the current state */
  render() {
    return html`
        <!-- Loading Spinner -->
        <vaadin-progress-bar indeterminate value="0" id="loadingBar" ></vaadin-progress-bar>
        <!-- Notifications -->
        <vaadin-notification duration="4000" theme="contrast" position="bottom-center" id="notifyMail"></vaadin-notification>
        <vaadin-notification duration="4000" position="bottom-center" id="notifyAck"></vaadin-notification>
        <vaadin-notification duration="4000" position="bottom-center" id="notifyFile"></vaadin-notification>

        <!-- Groups dialog -->
        <vaadin-dialog no-close-on-esc no-close-on-outside-click id="newGroupDlg"></vaadin-dialog>
        <vaadin-dialog no-close-on-esc no-close-on-outside-click id="editGroupDlg"></vaadin-dialog>

        <!-- MAIN VERTICAL LAYOUT -->
        <vaadin-vertical-layout theme="spacing-s" style="display:none; height:100%;gap: 0;" id="mainPage">

            <!-- TITLE BAR -->
            <vaadin-horizontal-layout id="titleLayout" theme="spacing-xs" style="background-color:beige; width:100%;">
                <abbr title="dna" id="titleAbbr">
                    <img src="dist/favicon.ico" width="32" height="32" style="padding-left: 5px;padding-top: 5px;"/>
                </abbr>
                <span id="snapTitle" style="text-align: center; font-size: larger; padding: 10px 0px 10px 5px;">SnapMail</span>
                <span id="networkIdDisplay" style="text-align: center; font-size: small; padding: 15px 2px 0px 5px;">UNKNOWN NETWORK-ID</span>
                <!--        <span style="text-align: center; font-size: larger; padding: 10px 10px 10px 5px;"> - </span>-->
            </vaadin-horizontal-layout>

            <!-- FILEBOX MENU -->
            <vaadin-horizontal-layout theme="spacing-xs" id="fileboxLayout" style="width:100%;">
                <!-- FIXEME: use vaadin-select instead -->
                <vaadin-combo-box id="fileboxFolder" style="user-select: none;
            -khtml-user-select: none;
            -webkit-user-select: none;"></vaadin-combo-box>
                <vaadin-menu-bar open-on-hover id="fileboxMenu" style="margin-top:2px"></vaadin-menu-bar>
                <span style="padding:12px 0px 0px 5px;margin-right: 10px;">messages: <span id="messageCount">0</span></span>
                <vaadin-text-field id="mailSearch" clear-button-visible placeholder="Search" style="width: 25%; margin-left: auto;margin-right: 5px;">
                    <vaadin-icon slot="prefix" icon="lumo:search"></vaadin-icon>
                </vaadin-text-field>
            </vaadin-horizontal-layout>

            <!-- Split between InArea and the rest -->
            <vaadin-split-layout orientation="vertical" style="width:100%; height:100%; margin-top:0px;">

                <!-- Split between filebox and Inmail -->
                <vaadin-split-layout orientation="vertical" style="width:100%; height:50%; margin-top:0px;">
                    <!-- FILEBOX AREA -->
                    <vaadin-grid id="mailGrid" theme="compact" style="min-height:50px; margin-top:0;">
                        <!--  <vaadin-grid-selection-column width="2em" auto-select></vaadin-grid-selection-column>-->
                        <vaadin-grid-column path="id" header="id" width="0em" hidden></vaadin-grid-column>
                        <!-- <vaadin-grid-column header="A" width="60px" flex-grow="0" text-align="end"></vaadin-grid-column>-->
                        <vaadin-grid-sort-column path="status" header=" " width="50px" flex-grow="0"></vaadin-grid-sort-column>
                        <vaadin-grid-sort-column path="username" header="Who" width="100px"></vaadin-grid-sort-column>
                        <vaadin-grid-sort-column path="subject" header="Subject" width="500px"></vaadin-grid-sort-column>
                        <vaadin-grid-sort-column path="date" header="Date"></vaadin-grid-sort-column>
                        <vaadin-grid-sort-column path="attachment" header=" " width="50px" flex-grow="0"></vaadin-grid-sort-column>
                    </vaadin-grid>

                    <!-- IN-MAIL AREA -->
                    <vaadin-horizontal-layout theme="spacing-xs" style="min-height:80px; height:30%; width:100%; margin-top: 4px; flex: 1 1 100px">
                        <vaadin-text-area style="width: 70%;padding:0;" id="inMailArea" placeholder="<no selection>" readonly>
                            <!-- <span id="mailDisplay"></span>-->
                        </vaadin-text-area>
                        <!-- ATTACHMENT GRID -->
                        <vaadin-grid theme="no-row-borders" id="attachmentGrid" style="width:30%; height:100%; border-style: dotted;">
                            <vaadin-grid-column path="status" header=" " width="40px" flex-grow="0"></vaadin-grid-column>
                            <vaadin-grid-column auto-width path="filename" header="Attachments"></vaadin-grid-column>
                            <vaadin-grid-column auto-width path="filesize" text-align="end" header="KiB"></vaadin-grid-column>
                            <vaadin-grid-column path="filetype" hidden></vaadin-grid-column>
                            <vaadin-grid-column path="fileId" hidden></vaadin-grid-column>
                        </vaadin-grid>
                    </vaadin-horizontal-layout>
                </vaadin-split-layout>

                <!-- OUT-MAIL AREA -->
                <vaadin-vertical-layout style="width:100%; height:50%">

                    <h4 style="margin:10px 0px 0px 0px;">&#128394; Write Mail</h4>

                    <!-- Split between Write and Contacts -->
                    <vaadin-split-layout style="min-height:50px; height:100%; width:100%; margin:0px;">
                        <!-- WRITE AREA -->
                        <vaadin-vertical-layout style="min-width: 40px; width: 65%;">
                            <vaadin-text-field style="width: 100%;" id="outMailSubjectArea" placeholder="Write subject here..."></vaadin-text-field>
                            <vaadin-text-area style="width: 100%; height: 100%;padding-bottom:0;" id="outMailContentArea" placeholder="Write here..."></vaadin-text-area>
                        </vaadin-vertical-layout>
                        <!-- CONTACTS AREA -->
                        <vaadin-vertical-layout theme="spacing-xs" style="min-width: 20px; width: 35%;">
                            <!-- CONTACTS MENU -->
                            <!-- <vaadin-horizontal-layout theme="spacing-xs" id="fileboxLayout">-->
                            <vaadin-horizontal-layout theme="spacing-xs" style="background-color: #f7f7f1; width: 100%;">
                                <h4 style="min-width:85px;text-align: center; font-size: large; padding: 10px 10px 10px 10px; margin: 0px 0px 0px 5px;">📇 Groups</h4>
                                <vaadin-combo-box id="groupCombo" style="min-width:100px;max-width:200px;"></vaadin-combo-box>
                                <vaadin-button id="groupsBtn" style="margin: 5px; min-width: 40px; padding-left: 5px;">
                                    <vaadin-icon icon="lumo:edit" slot="suffix"></vaadin-icon>
                                </vaadin-button>
                                <vaadin-text-field id="contactSearch" clear-button-visible placeholder="Search" style="width: 35%; min-width:100px; margin-left: auto;margin-right: 3px;">
                                    <vaadin-icon slot="prefix" icon="lumo:search"></vaadin-icon>
                                </vaadin-text-field>
                            </vaadin-horizontal-layout>
                            <!-- CONTACTS GRID -->
                            <vaadin-grid theme="no-row-borders" id="contactGrid" style="height: 100%; min-width: 50px;">
                                <vaadin-grid-column path="status" width="30px" flex-grow="0" header=" "></vaadin-grid-column>
                                <vaadin-grid-column auto-width path="username" header=" "></vaadin-grid-column>
                                <vaadin-grid-column auto-width path="recipientType" header=" "></vaadin-grid-column>
                                <vaadin-grid-column path="agentId" hidden></vaadin-grid-column>
                            </vaadin-grid>
                        </vaadin-vertical-layout>
                    </vaadin-split-layout>

                    <!-- <input type="file" hidden id="file-input" name="myfile">-->
                    <!-- </div>-->
                    <!-- <vaadin-list-box id="fileList"></vaadin-list-box>-->


                    <!-- Upload | Handle MENU -->
                    <vaadin-horizontal-layout theme="spacing-xs" style="background-color: #f7f7f1; width: 100%;">

                        <vaadin-upload id="myUpload" nodrop max-file-size="8000000" style="width:280px; margin-top:0;">
                            <span slot="drop-label">Maximum file size: 8 MB</span>
                        </vaadin-upload>
                        <div style="margin-left: auto;display: flex;">
                            <h4 style="margin: 14px 10px 0px 0px;">Username:</h4>
                            <abbr title="handle" id="handleAbbr" style="margin-left:0px;">
                                <vaadin-button id="handleDisplay" style="min-width: 100px;" @click=${() => {this.hideHandleInput(false);}}>
                                    <span id="handleText"></span>
                                    <vaadin-icon icon="lumo:edit" slot="suffix"></vaadin-icon>
                                </vaadin-button>
                            </abbr>
                            <!-- <vcf-tooltip id="handleDisplayTT" for="handleDisplay" position="bottom">fucking tooltip</vcf-tooltip> -->
                            <vaadin-text-field clear-button-visible id="myNewHandleInput" placeholder="username"></vaadin-text-field>
                            <vaadin-button theme="icon" id="setMyHandleButton" title="unknown" @click=${this.setHandle}>
                                <vaadin-icon icon="lumo:checkmark" slot="prefix"></vaadin-icon>
                            </vaadin-button>
                            <vaadin-button theme="icon" id="cancelHandleButton" @click=${() => {this.hideHandleInput(true);}}>
                                <vaadin-icon icon="lumo:cross" slot="prefix"></vaadin-icon>
                            </vaadin-button>
                        </div>
                        <vaadin-menu-bar open-on-hover id="ContactsMenu" style="margin-top:2px;"></vaadin-menu-bar>
                    </vaadin-horizontal-layout>


                    <!-- ACTION MENU BAR -->
                    <div style="width:100%; display:flex;justify-content: flex-end">
                        <vaadin-menu-bar theme="primary" id="ActionBar"
                                         style="height:40px; margin-top:5px; margin-bottom:10px;">
                        </vaadin-menu-bar>
                    </div>
                    <!-- Progress Bar -->
                    <h3 style="margin:10px 0 5px 0;display:none;" id="sendingTitle">Sending</h3>
                    <vaadin-progress-bar indeterminate value="0" id="sendProgressBar" style="margin-bottom:20px;"></vaadin-progress-bar>
                </vaadin-vertical-layout>

            </vaadin-split-layout>

        </vaadin-vertical-layout>
      `;
  }


  /** */
  static get styles() {
    return [
    css`
    `];
  }


  /** */
  static get scopedElements() {
    return {
      "vaadin-icon": Icon,
      "vaadin-progress-bar": ProgressBar,
      'vaadin-button':Button,
      'vaadin-upload': Upload,
      'vaadin-grid':Grid,
      'vaadin-menu-bar':MenuBar,
      'vaadin-combo-box':ComboBox,
      'vaadin-text-field':TextField,
      'vaadin-text-area':TextArea,
      'vaadin-notification': Notification,
      'vaadin-dialog':Dialog,
      'vaadin-vertical-layout': VerticalLayout,
      'vaadin-horizontal-layout': HorizontalLayout,
      'vaadin-split-layout': SplitLayout,
      'vaadin-grid-column':GridColumn,
      'vaadin-grid-sort-column':GridSortColumn,
    };
  }
}
