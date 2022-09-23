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
//import '@vaadin/grid/vaadin-grid-sort-column.js';
import '@vaadin/grid/vaadin-grid-sort-column';
import '@vaadin/grid/vaadin-grid-column';
import '@vaadin/notification';
import '@vaadin/dialog';
import '@vaadin/split-layout';
import '@vaadin/vertical-layout';
import '@vaadin/horizontal-layout';

import {PolymerElement} from "@polymer/polymer";
import {ProgressBar} from "@vaadin/progress-bar";
import {Button} from "@vaadin/button";
import {TextField} from "@vaadin/text-field";
import {Grid, GridColumn} from "@vaadin/grid";
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
import {toggleContact, selectUsername, filterMails, updateTray, handle_findManifest,
  handle_getChunk, ids_to_items
  } from "../snapmail"


import {AgentPubKey} from "@holochain/client/lib/types";
import {DnaBridge} from "../dna_bridge";


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
//@customElement('snapmail-controller')
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
  private _dnaId: string = '';
  private _myAgentHash: AgentPubKey | null = null;
  private _myHandle = '<unknown>';
  private _myAgentId: string | null = null;

  private _currentMailItem: any /* : gridItem*/ = {};
  private _currentFolder = '';
  private _currentGroup = '';
  private _replyOf: ActionHash | null = null;

  private _contactItems: any[] /* gridItem*/ = [];
  private _mailItems: any[] /* gridItem*/ = [];

  private _groupList: Map<string, string[]> = new Map();

  private _hasAttachment = 0;
  private _chunkList: EntryHash[] = [];
  private _fileList: ActionHash[] = [];


  private _canPing = true;

  /* Map of (agentId -> username)
   * agentId is base64 string of a hash */
  _usernameMap: UsernameMap = new Map();
  /* Map of (agentId -> timestamp of last ping) */
  _pingMap = new Map();
  /* Map of (agentId -> bool) */
  _responseMap = new Map();
  /* Map of (mailId -> mailItem) */
  _mailMap = new Map();


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
      this._groupList = new Map(JSON.parse(window.localStorage[dnaId]));
    } catch(err) {
      if (!dnaId || dnaId === '') {
        console.error("localStorage parse failed. No contact groups will be loaded. DnaId =", dnaId);
        console.error({err});
      }
      this._groupList = new Map();
      this._groupList.set('All', []);
    }
    console.log({ groupList: this._groupList });
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
    this.contactGridElem.activeItem = null;
    //this.contactGridElem.render();
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
      if (htos(contactItem.agentId) === this._myAgentId) {
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
    const mailGrid = this.mailGridElem
    const folderItems = [];
    const activeItem: MailGridItem = mailGrid.activeItem as MailGridItem;
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
    mailGrid.items = filterMails(this._mailItems, this.mailSearchElem.value);
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
    //mailGrid.render();
  }


  /** */
  updateRecipients(canReset: boolean) {
    console.log('updateRecipients() - START ; canReset = ' + canReset)
    const contactGrid = this.contactGridElem;
    /* Get currently selected items' hash (if any) */
    const prevSelected = [];
    const typeMap = new Map();
    if (contactGrid.selectedItems) {
      for (const item of contactGrid.selectedItems) {
        const contactItem: ContactGridItem = item as ContactGridItem;
        const agentId = htos(contactItem.agentId);
        prevSelected.push(agentId);
        typeMap.set(agentId, contactItem.recipientType);
      }
    }
    console.log({typeMap});
    const selected = [];
    const items = [];
    //pingNextAgent();
    /* Add each handle to the contactGrid */
    for (const [agentId, username] of this._usernameMap.entries()) {
      // console.log('' + agentId + '=> ' + username)
      const agentHash = stoh(agentId)
      let status = whiteDot
      if (this._pingMap.get(agentId)) {
        status = this._responseMap.get(agentId)? greenDot : redDot
      }
      //const status = blueDot
      const item = {
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
    const contactSearch = this.contactSearchElem;
    if (canReset) {
      contactSearch.value = '';
    }

    this._contactItems = items;
    contactGrid.items = this.filterContacts([], contactSearch.value);
    contactGrid.selectedItems = selected;
    contactGrid.activeItem = null;
    //contactGrid.render();
    //console.log({contactGrid});
    console.log('updateRecipients() - END')
  }


  /** Refresh g_usernameMap and contactGrid */
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
        const agentId = htos(handleItem.agentId);
        console.log('' + handleItem.name + ': ' + agentId);
        this._usernameMap.set(agentId, handleItem.name);
        if(this._pingMap.get(agentId) === undefined) {
          //console.log("ADDING TO g_pingMap: " + agentId);
          this._pingMap.set(agentId, 0);
          this._responseMap.set(agentId, false);
        }
      }
    }
    /* Reset contactGrid */
    this.updateRecipients(false)
    const contactsMenu = this.contactsMenuElem;
    if (contactsMenu.items && contactsMenu.items.length > 0) {
      contactsMenu.items[0].disabled = false;
      //contactsMenu.render();
    }
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
    const mailGrid = this.mailGridElem;
    const mailList: MailItem[] = callResult;

    /** Get currently selected hashs */
    const prevSelected = [];
    if (mailGrid.selectedItems) {
      for (const item of mailGrid.selectedItems) {
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
    mailGrid.items = filterMails(this._mailItems, mailSearch.value);
    mailGrid.selectedItems = selected;
    mailGrid.activeItem = selected[0];
  }


  /** Post callback for getAllMails() */
  handle_post_getAllMails(): void {
    try {
      /** Update mailGrid */
      this.update_mailGrid(this.folderElem.value);
      /** Update active Item */
      const mailGrid = this.mailGridElem;
      const activeItem: MailGridItem = mailGrid.activeItem as MailGridItem;
      console.log('handle_getAllMails ; activeItem = ');
      console.log({activeItem})
      if(activeItem) {
        let newActiveItem = null;
        for(const item of mailGrid.items!) {
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
    if (pingedAgentB64 === this._myAgentId) {
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
    /** deepCopy MenuBarItems so it can trigger a new render */
    const items = JSON.parse(JSON.stringify(this.actionMenuElem.items)) as MenuBarItem[];
    items[2].disabled = isDisabled;
    this.actionMenuElem.items = items;
  }

  disableDeleteButton(isDisabled: boolean): void {
    /** deepCopy MenuBarItems so it can trigger a new render */
    const items = JSON.parse(JSON.stringify(this.fileboxMenuElem.items)) as MenuBarItem[];
    this.fileboxMenuElem.items[2].disabled = isDisabled;
    this.fileboxMenuElem.items[3].disabled = isDisabled;
    this.fileboxMenuElem.items = items;
  }

  disableReplyButton(isDisabled: boolean): void {
    /** deepCopy MenuBarItems so it can trigger a new render */
    const items = JSON.parse(JSON.stringify(this.fileboxMenuElem.items)) as MenuBarItem[];
    this.fileboxMenuElem.items[1].disabled = isDisabled;
    this.fileboxMenuElem.items = items;
  }


  /** */
  initFileboxMenu() {
    const menu = this.fileboxMenuElem;
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
    menu.items = items;

    /* On button click */
    const controller = this;
    menu.addEventListener('item-selected', function(e: any) {
      console.log("Menu item-selected: " + JSON.stringify(e.detail.value));
      /* -- Handle 'Print' -- */
      if (e.detail.value.text === 'Print') {
        console.log({_currentMailItem: controller._currentMailItem})
        const mailItem = controller._mailMap.get(htos(controller._currentMailItem.id));
        const mailText = into_mailText(controller._usernameMap, mailItem)
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
        controller._replyOf = null;
        controller._dna!.deleteMail(controller._currentMailItem.id)
          .then((/*maybeAh: ActionHash | null*/) => controller.getAllMails()) // On delete, refresh filebox
        const mailGrid = controller.mailGridElem;
        mailGrid.selectedItems = [];
        mailGrid.activeItem = null;
        controller.inMailAreaElem.value = ""
        controller.disableDeleteButton(true)
        controller.disableReplyButton(true)
      }
      /* -- Handle 'Reply' -- */
      const outMailSubjectArea = this.shadowRoot!.getElementById('outMailSubjectArea') as TextField;
      const contactGrid = controller.contactGridElem;

      if (e.detail.value.text === 'Reply to sender') {
        outMailSubjectArea.value = 'Re: ' + controller._currentMailItem.subject;
        controller._replyOf = controller._currentMailItem.id;
        console.log("g_replyOf set ", controller._replyOf)
        controller.resetContactGrid();
        for (const item of contactGrid.items!) {
          const contactItem: ContactGridItem = item as ContactGridItem;
          if (contactItem.username === controller._currentMailItem.username) {
            contactGrid.selectedItems = [contactItem];
            contactGrid.activeItem = contactItem;
            toggleContact(contactGrid, contactItem);
            //contactGrid.render();
            break;
          }
        }
      }
      if (e.detail.value.text === 'Reply to all') {
        const mailItem = controller._mailMap.get(htos(controller._currentMailItem.id));
        controller._replyOf = controller._currentMailItem.id;
        if (mailItem) {
          outMailSubjectArea.value = 'Re: ' + controller._currentMailItem.subject;
          controller.resetContactGrid();
          // TO
          for(const agentId of mailItem.mail.to) {
            const to_username = controller._usernameMap.get(htos(agentId));
            selectUsername(contactGrid, to_username!, 1);
          }
          // CC
          for(const agentId of mailItem.mail.cc) {
            const cc_username = controller._usernameMap.get(htos(agentId));
            selectUsername(contactGrid, cc_username!, 2);
          }
          // BCC
          for(const agentId of mailItem.bcc) {
            const bcc_username = controller._usernameMap.get(htos(agentId));
            selectUsername(contactGrid, bcc_username!, 3);
          }
          // Done
          //contactGrid.render();
        }
      }
      if (e.detail.value.text === 'Forward') {
        outMailSubjectArea.value = 'Fwd: ' + controller._currentMailItem.subject;
        controller.resetContactGrid();
        const mailItem = controller._mailMap.get(htos(controller._currentMailItem.id));
        let fwd = '\n\n';
        fwd += '> ' + 'Mail from: ' + controller._usernameMap.get(htos(mailItem.author)) + ' at ' + customDateString(mailItem.date) + '\n';
        const arrayOfLines = mailItem.mail.payload.match(/[^\r\n]+/g);
        for (const line of arrayOfLines) {
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
    const attachmentGrid = this.shadowRoot!.getElementById('attachmentGrid') as Grid;
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
    attachmentGrid.items = items;
    attachmentGrid.selectedItems = [];
    attachmentGrid.activeItem = null;
    //attachmentGrid.render();
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
      const mailGrid = controller.mailGridElem;
      mailGrid.selectedItems = [];
      mailGrid.activeItem = null;
      controller._replyOf = null;
      controller.update_mailGrid(event.target.value)
      controller._currentFolder = event.target.value;
      controller.disableDeleteButton(true)
      controller.disableReplyButton(true)
    });

    /** Filebox -- vaadin-grid */
    const mailGrid = this.mailGridElem;
    mailGrid.items = [];
    mailGrid.multiSort = true;
    /** Display bold if mail not acknowledged */
    mailGrid.cellClassNameGenerator = function(column, rowData:any) {
      let classes = '';
      const mailItem = controller._mailMap.get(htos(rowData.item.id));
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
      controller._replyOf = null;
      const item = event.detail.value;
      mailGrid.selectedItems = item ? [item] : [];
      if (item === null || item === undefined) {
        //getAllMails(handleMails, handle_getAllMails)
        return;
      }
      controller._currentMailItem = item;
      //console.log('mail grid item: ' + JSON.stringify(item));
      const mailItem = controller._mailMap.get(htos(item.id));
      console.log('mail item:')
      console.log({mailItem});
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

    controller.inMailAreaElem.style.backgroundColor = "#dfe7efd1";

    const mailSearch = this.mailSearchElem;
    mailSearch.addEventListener('value-changed', function(e:any /*TextFieldValueChangedEvent*/) {
      mailGrid.items = filterMails(mailGrid.items!, e.detail.value);
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
    const contactGrid = this.contactGridElem;
    const contactSearch = this.contactSearchElem;
    contactGrid.items = this.filterContacts([], contactSearch.value);
    this.resetContactGrid();
    this.disableDeleteButton(true);
    this.disableReplyButton(true);
    console.log({contactGrid});
    //contactGrid.render();
    window.localStorage[this._dnaId] = JSON.stringify(Array.from(this._groupList.entries()));
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
    const attachmentGrid = this.shadowRoot!.getElementById('attachmentGrid') as Grid;
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
        //attachmentGrid.render();
      }

      /** Get File on source chain */
      controller.getFile(item.fileId).then(function(manifest: FileManifest | null) {
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
        const byteArray = base64ToArrayBuffer(manifest.content!)
        const blob = new Blob([byteArray], { type: filetype});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.filename || 'download';
        a.addEventListener('click', () => {}, false);
        a.click();
        attachmentGrid.activeItem = null;
        attachmentGrid.selectedItems = [];
        //attachmentGrid.render();
      });
    });
  }


  /** */
  filterContacts(selectedItems: ContactGridItem[], searchValue: string): ContactGridItem[] {
    console.log("filterContacts() called");
    /** Get contacts from current group only */
    //console.log({items});
    if (this._currentGroup !== SYSTEM_GROUP_LIST[0]) {
      const ids = this._groupList.get(this._currentGroup);
      //console.log({ids});
      this._contactItems = ids_to_items(ids!, this._contactItems);
      //console.log({items});
    }
    /** Set filter */
    const searchTerm = (searchValue || '').trim();
    const matchesTerm = (value: string) => {
      return value.toLowerCase().indexOf(searchTerm.toLowerCase()) >= 0;
    };
    /** Apply filter */
    const filteredItems = this._contactItems.filter((item) => {
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
    if (this._groupList === undefined || this._groupList === null) {
      return;
    }
    const groupCombo = this.shadowRoot!.getElementById('groupCombo') as ComboBox;
    const keys = Array.from(this._groupList.keys());
    keys.push('new...');
    groupCombo.items = keys;
    groupCombo.value = current;
  }


  /** */
  isValidGroupName(name: string) {
    const keys = Array.from(this._groupList.keys());
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
    const groupCombo = this.shadowRoot!.getElementById('groupCombo') as ComboBox;
    //groupCombo.items = SYSTEM_GROUP_LIST;
    //groupCombo.value = SYSTEM_GROUP_LIST[0];
    this.regenerateGroupComboBox(SYSTEM_GROUP_LIST[0]);
    this._currentGroup = groupCombo.value;
    groupCombo.addEventListener('change', function(event:any) {
      controller.setCurrentGroup(event.target.value);
    });
    /** -- contactGrid */
    const contactGrid = this.contactGridElem;
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
      console.log("contactGrid.active-item-changed:", event)
      //const eventContext: any /* FIXME */ = contactGrid.getEventContext(event)!;
      const item = event.detail.value;
      //const item = eventContext.item;
      if (item) {
        if (contactGrid.selectedItems) {
          if(!contactGrid.selectedItems!.includes(item)) {
            contactGrid.selectedItems!.push(item);
            console.log("contactGrid.selectedItems set - many");
          }
        } else {
          contactGrid.selectedItems = [item]
          console.log("contactGrid.selectedItems set - one");
        }
      }

      console.log({activeSelected: contactGrid.selectedItems})
      controller.disableSendButton(!contactGrid.selectedItems || contactGrid.selectedItems!.length == 0);
      //controller.updateRecipients(false)
      contactGrid.items = controller.filterContacts([], '');
      //contactGrid.items = contactGrid.items
      //contactGrid.selectedItems = contactGrid.selectedItems
      //contactGrid.activeItem = contactGrid.activeItem
    });
    /** ON CLICK */
    contactGrid.addEventListener('click', function(e) {
      const eventContext: any /* FIXME */ = contactGrid.getEventContext(e)!;
      console.log("contactGrid.click:", eventContext)
      //contactGrid.selectedItems = item ? [item] : [];
      toggleContact(contactGrid, eventContext.item);
      console.log({clickSelected: contactGrid.selectedItems})
      controller.disableSendButton(!contactGrid.selectedItems || contactGrid.selectedItems!.length == 0);
      //contactGrid.render();
    });
    /** -- Contacts search bar */
    const contactSearch = this.contactSearchElem;
    contactSearch.addEventListener('value-changed', function(e: any/*: TextFieldValueChangedEvent*/) {
      const items = contactGrid.selectedItems
        ? contactGrid.selectedItems as ContactGridItem[]
        : contactGrid.items as ContactGridItem[];
      contactGrid.items = controller.filterContacts(items, e.detail.value);
      //contactGrid.render();
    });
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


  /** */
  async sendAction(): Promise<void> {
    /** Submit each attachment */
    const upload: any /* FIXME */ = this.uploadElem;
    const files = upload.files;
    console.log({files})
    this._fileList = [];
    for (const file of files) {
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
      this._chunkList = [];
      /** Submit each chunk */
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
    const contactGrid = this.contactGridElem;
    const selection: ContactGridItem[] = contactGrid.selectedItems? contactGrid.selectedItems as ContactGridItem[] : [];
    console.log('selection: ' + JSON.stringify(selection));
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
        case 'to': toList.push(contactItem.agentId); break;
        case 'cc': ccList.push(contactItem.agentId); break;
        case 'bcc': bccList.push(contactItem.agentId); break;
        default: console.error('unknown recipientType');
      }
    }
    /* Create Mail */
    const outMailSubjectArea = this.shadowRoot!.getElementById('outMailSubjectArea') as TextField;
    const mail: SendMailInput = {
      subject: outMailSubjectArea.value,
      payload: this.outMailContentElem.value,
      reply_of: this._replyOf,
      to: toList, cc: ccList, bcc: bccList,
      manifest_address_list: this._fileList
    };
    console.log('sending mail: ')
    console.log({mail});
    /* Send Mail */
    const outmail_hh = await this._dna!.sendMail(mail);
    /* Update UI */
    if (this._replyOf) {
      const replyOfStr =  htos(this._replyOf)
      const mailItem = this._mailMap.get(replyOfStr);
      mailItem.reply = outmail_hh;
      this._mailMap.set(replyOfStr, mailItem);
    }
    this._replyOf = null;
    this.disableSendButton(true);
    outMailSubjectArea.value = '';
    this.outMailContentElem.value = '';
    contactGrid.selectedItems = [];
    contactGrid.activeItem = null;
    this.updateRecipients(false);
    console.log('sendMail -> getAllMails');
    await this.getAllMails();
    upload.files = [];
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
        controller.updateRecipients(true);
        return;
      }
      /** Send clicked */
      if (e.detail.value.text === 'Send') {
        const sendProgressBar = controller.sendProgressBarElem;
        const sendingTitle = controller.shadowRoot!.getElementById('sendingTitle') as HTMLElement;
        sendProgressBar.style.display = "block";
        sendingTitle.style.display = "block";
        actionMenu.style.display = "none";
        //upload.style.display = "none";
        upload.maxFiles = 0;
        controller.sendAction().then(() => {
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
      const upload = controller.uploadElem;

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

      /** -- On upload file selected -- */
      upload.addEventListener('upload-before', function(event:any) {
        console.log('upload-before event: ', JSON.stringify(event.detail.file));

        controller.allowActionMenu(false)

        const file = event.detail.file;
        //const xhr = event.detail.xhr;
        console.log('upload-before event: ');

        event.preventDefault(); // Prevent the upload request

        const reader = new FileReader();
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

          // FIXME
          //upload.set(['files', upload.files.indexOf(file), 'progress'], 100)
          //upload.set(['files', upload.files.indexOf(file), 'complete'], true)
          //upload.set(['files', upload.files.indexOf(file), 'content'], content)

          controller.allowActionMenu(true)
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
  initNotification() {
    /** -- Mail  */
    let notification = this.shadowRoot!.getElementById('notifyMail') as Notification;
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
    notification = this.shadowRoot!.getElementById('notifyAck') as Notification;
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
    }
    this._groupList.set(textField.value, []);
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
      // Text Field <vaadin-text-field placeholder="Placeholder"></vaadin-text-field>
      const vaadin = window.document.createElement('vaadin-text-field') as TextField;
      vaadin.placeholder = "name";
      vaadin.autofocus = true;
      vaadin.preventInvalidInput = true;
      vaadin.pattern = "[a-zA-Z0-9_.]{0,20}";
      vaadin.addEventListener("keyup", (event) => {
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
        const groupCombo = this.shadowRoot!.getElementById('groupCombo') as ComboBox;
        vaadin.value = '';
        groupCombo.value = controller._currentGroup;
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
      console.log("Edit Groups dialog called: " + controller._currentGroup);
      /** Check if there is a DOM generated with the previous renderer call to update its content instead of recreation */
      if(root.firstElementChild) {
        const title = root.children[0];
        title.textContent = 'Edit Group: ' + controller._currentGroup;
        const grid = root.children[1] as Grid;
        grid.items = controller._contactItems;
        const groupIds = controller._groupList.get(controller._currentGroup);
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
      column.header = " ";
      column.flexGrow = 0;
      column.width = "300px";
      const grid = window.document.createElement('vaadin-grid') as Grid;
      grid.appendChild(selectColumn);
      grid.appendChild(column);
      grid.id = "groupGrid";
      //grid.heightByRows = true;
      grid.setAttribute('style', 'width: 360px;');
      grid.items = controller._contactItems;
      const groupIds = controller._groupList.get(controller._currentGroup);
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
          ids.push(htos(contactItem.agentId));
        }
        controller._groupList.set(controller._currentGroup, ids);
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
        controller._groupList.delete(controller._currentGroup);
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


  /** -- Signal Structure --
   *  AppSignal {
   *   data: {
   *       cellId: [Uint8Array(39), Uint8Array(39)],
   *       payload: any,
   *     }
   *     type: "Signal"
   * }
   */
  handleSignal(signalwrapper:any/*FIXME*/) {
    console.log('Received signal:')
    console.log({signalwrapper})
    const controller = document.querySelector("snapmail-app");
    console.log({controller})
    if (signalwrapper.type !== undefined && signalwrapper.type !== "Signal") {
      return;
    }
    // FIXME
    // if (signalwrapper.signal.signal_type !== "User") {
    //   return;
    // }

    if (signalwrapper.data.payload.hasOwnProperty('ReceivedMail')) {
      const item = signalwrapper.data.payload.ReceivedMail;
      console.log("received_mail:");
      console.log({item});
      const notification = this.shadowRoot!.getElementById('notifyMail') as Notification;
      notification.open();

      const mail = signalwrapper.data.payload.ReceivedMail;
      const pingedAgentB64 = htos(mail.author);
      this.storePingResult({}, pingedAgentB64);

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

      this.getAllMails();
      return;
    }
    if (signalwrapper.data.payload.hasOwnProperty('ReceivedAck')) {
      const item = signalwrapper.data.payload.ReceivedAck;
      console.log("received_ack:");
      console.log({item});
      const pingedAgentB64 = htos(item.from);
      this.storePingResult({}, pingedAgentB64);
      const notification = this.shadowRoot!.getElementById('notifyAck') as Notification;
      notification.open();
      this.getAllMails();
      return;
    }
    if (signalwrapper.data.payload.hasOwnProperty('ReceivedFile')) {
      const item = signalwrapper.data.payload.ReceivedFile;
      console.log("received_file:");
      console.log({item});
      const notification = this.shadowRoot!.getElementById('notifyFile') as Notification;
      notification.open();
      return
    }
  }


  /** */
  async initDna() {
    console.log('initDna()');
    try {
      //const cellId = await DNA.rsmConnectApp(this.handleSignal)
      this.hcClient!.addSignalHandler(this.handleSignal)
      this._dna = new DnaBridge(this.hcClient!, this.cellId!)

      const dnaId = htos(this.cellId![0]);
      this._dnaId = dnaId;
      this._myAgentHash = this.cellId![1];
      this._myAgentId = htos(this._myAgentHash);

      this.storePingResult({}, this._myAgentId);

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
      handleAbbr.title = "agentId: " + this._myAgentId;
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

    //this.contactGridElem.setAttribute("theme", "my-theme")
    /** Manual styling of inner components */
    const header = this.contactGridElem.shadowRoot!.getElementById("header") as HTMLElement;
    header.style.display = 'none';
    //const header2 = this.groupGridElem.shadowRoot!.getElementById("header") as HTMLElement;
    //header2.style.display = 'none';
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
                    <img src="favicon.ico" width="32" height="32" style="padding-left: 5px;padding-top: 5px;"/>
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
                    <vaadin-horizontal-layout theme="spacing-xs" style="min-height:50px; height:30%; width:100%; margin-top: 4px;">
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
                                <vaadin-grid-column auto-width path="recepientType" header=" "></vaadin-grid-column>
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


  /** */
  static get styles() {
    return [
      //CSSModule('lumo-typography'),
      //unsafeCSS(styles),
      css`
        /* Background needs a stronger selector to not be overridden */
        [part~="cell"].male {
          background: rgb(255, 240, 0);
        }
        
        [part~="header-cell"] {
            background: rgb(255, 0, 200);
        }

        /* FAILED
        [part~="cell"] ::slotted(vaadin-grid-cell-content) {
          padding-left:5px;
        }
        vaadin-grid [part~="cell"] ::slotted(vaadin-grid-cell-content) {
          padding-left:5px;
        }
        #contactGrid [part~="cell"] ::slotted(vaadin-grid-cell-content) {
          padding-left:5px;
        }        
        */
        vaadin-grid#contactGrid [part~="cell"] ::slotted(vaadin-grid-cell-content) {
          padding-left:5px;
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
          color: darkred;
        }
        .received {
          color: green;
        }
        .statusColumn {
          font-size: x-small;
          text-align: left;
          padding-left: 3px;
        }      
      `];
  }

}
