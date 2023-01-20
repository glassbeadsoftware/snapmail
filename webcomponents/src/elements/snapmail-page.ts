/** Lit imports */
import {css, html} from "lit";
import {property, state} from "lit/decorators.js";
/** Vaadin imports */
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
import '@vaadin/vaadin-icon';
import '@vaadin/vaadin-lumo-styles';
//import { ThemableMixin } from '@vaadin/vaadin-themable-mixin/vaadin-themable-mixin.js';
/** Holochain imports*/
import {ActionHash, decodeHashFromBase64, encodeHashToBase64, EntryHash} from "@holochain/client";
/** my imports */
import {
  ContactGridItem, MailGridItem, SnapmailPerspective,
} from "../viewModel/snapmail.perspective";
import {
  FileManifest, HandleItem, Mail, MailItem, SendMailInput
} from "../bindings/snapmail.types";
import {arrayBufferToBase64, base64ToArrayBuffer, splitFile} from "../utils";
import {
  customDateString,
  determineMailCssClass, hasMailBeenOpened,
  into_gridItem,
  into_mailText,
  is_OutMail,
  isMailDeleted,
  systemFolders
} from "../mail";
import {
  filterMails,
  updateTray,
  ids_to_items,
  MY_ELECTRON_API,
  DEV_MODE,
} from "../snapmail"

import {SnapmailZvm} from "../viewModel/snapmail.zvm";
import {ZomeElement} from "@ddd-qc/lit-happ";


/** @element snapmail-page */
export class SnapmailPage extends ZomeElement<SnapmailPerspective, SnapmailZvm> {
  constructor() {
    super(SnapmailZvm.DEFAULT_ZOME_NAME);
  }



  /** -- */



  private _mailItems: MailGridItem[] = [];

  private _chunksToSend: EntryHash[] = [];


  /** -- sub Elements -- */

  get contactsMenuElem() : MenuBar {
    return this.shadowRoot!.getElementById("ContactsMenu") as MenuBar;
  }


  /** -- */

  /** Refresh mailGrid */
  handle_getAllMails() {
    /** Get currently selected hashs */
    const prevSelected = [];
    if (this.mailGridElem.selectedItems) {
      for (const item of this.mailGridElem.selectedItems) {
        const mailItem: MailGridItem = item as MailGridItem;
        prevSelected.push(encodeHashToBase64(mailItem.id));
      }
    }

    let trashCount = 0;
    let inboxCount = 0;
    let sentCount = 0;
    let newCount = 0;

    const selected = [];
    const items = [];

    const selectedBox = this.folderElem.value.codePointAt(0);

    const mailItems: MailItem[] = Object.values(this.perspective.mailMap);
    for (const mailItem of mailItems) {
      //console.log({mailItem})
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
      const gridItem = into_gridItem(this.perspective.usernameMap, mailItem);
      // console.log('gridItem.id = ' + gridItem.id);
      items.push(gridItem);
      if (prevSelected.includes(encodeHashToBase64(gridItem.id))) {
        selected.push(gridItem);
      }
    }
    console.log('Counters: ' + newCount + ' / ' + inboxCount + ' / ' + sentCount + ' / ' + trashCount + ' / '+ mailItems.length);

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
  initContactsArea() {
    /** Add Refresh button in DEBUG */
    if (DEV_MODE === 'dev') {
      const contactsMenu = this.contactsMenuElem;
      contactsMenu.items = [{ text: 'Refresh' }];
      contactsMenu.addEventListener('item-selected', (e:any) => {
        console.log('item-selected', JSON.stringify(e.detail.value));
        if(e.detail.value.text === 'Refresh') {
          console.log("contactsMenu Refresh clicked")
          contactsMenu.items[0].disabled = true;
          //contactsMenu.render();
          this._zvm.probeHandles();
        }
      });
    }
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
  initNotification() {
    /** -- Mail  */
    const notificationMail = this.shadowRoot!.getElementById('notifyMail') as Notification;
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
  async initDna() {
    console.log('initDna()');
    try {
      const dnaId = encodeHashToBase64(this.cellId![0]);
      this._zvm.storePingResult({}, this.agentPubKey);
      /** Load Groups from localStorage */
      this.loadGroupList(dnaId);
      this.regenerateGroupComboBox(SYSTEM_GROUP_LIST[0]);
      // let label = this.shadowRoot!.getElementById('agentIdDisplay');
      // label.textContent = g_myAgentId
      this._zvm.getMyHandle()
        .then((myHandle:string) => this.showHandle(myHandle));
      await this._zvm.probeAll();

      // -- findAgent ? -- //
      //const handleButton = this.shadowRoot!.getElementById('handleText');
      //this._dna!.findAgent(handleButton.textContent, handle_findAgent);

      /** -- Change title color in debug -- */
      const titleLayout = this.shadowRoot!.getElementById('titleLayout') as HorizontalLayout;
      if (DEV_MODE === 'dev') {
        titleLayout.style.backgroundColor = "#ec8383d1";
      }
      //const IS_ELECTRON = (window.location.port === ""); // No HREF PORT when run by Electron
      if (MY_ELECTRON_API || this.noTitle) {
        titleLayout.style.display = "none";
        // if (DEV_MODE === 'dev') {
        //   /** -- Update Title with DNA ID */
        //   const rootTitle = document.getElementById('rootTitle') as HTMLTitleElement;
        //   console.assert(rootTitle);
        //   //rootTitle.textContent = "SnapMail v" + version + "  - " + DNA.NETWORK_ID;
        //   rootTitle.textContent = rootTitle.textContent + " (" + dnaId + ")";
        // }
      }
      /** -- Update Abbr -- */
      const handleAbbr = this.shadowRoot!.getElementById('handleAbbr') as HTMLElement;
      handleAbbr.title = "agentId: " + this.agentPubKey;
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
    this.initFileBox();
    this.initContactsArea();
    this.hideHandleInput(true)
    this.initActionMenu();
    //getMyAgentId(logResult)
    this.initNotification();
    /** init DNA at the end because the callbacks will populate the UI */
    this.initDna();
    /* init Send progress bar */
    this.sendProgressBarElem.style.display = "none";
  }


  async initElectron() {
    if (!MY_ELECTRON_API) {
      return;
    }
    console.log("Calling getMyHandle() for ELECTRON");
    const startingHandle = await this._zvm.getMyHandle();
    console.log("getMyHandle() returned: " + startingHandle);
    const dnaHash = this.cellId![0];
    console.log("startingInfo sending dnaHash =", dnaHash);
    const reply = MY_ELECTRON_API.startingInfo(startingHandle, dnaHash)
    console.log("startingInfo reply =", {reply});
    if (reply != "<noname>") {
      const callResult = await this.setUsername(reply);
      console.log({callResult});
    }
  }


  /** After first render only */
  async firstUpdated() {
    console.log("snapmail-controller first update done!")

    this.initUi()
    this.initElectron();

    /** Setup recurrent pull from DHT every 10 seconds */
    /*let _10sec =*/ setInterval(() => {
      // if (DEV_MODE === 'dev') {
      //   return;
      // }
      try {
        this._zvm.probeAll();
      } catch(e) {
        console.error("_10sec.probeAll() failed: ", e)
      }
    }, 10 * 1000);


    /** Stuff to do every 1 second */
    /*let _1sec =*/ setInterval(() => {
      // if (DEV_MODE === 'dev') {
      //   return;
      // }
      try {
        if (this._zvm.canPing) {
          this._zvm.pingNextAgent();
        }
      } catch(e) {
        console.error("_1sec.pingNextAgent() failed: ", e)
      }
    }, 1 * 1000);
  }


  /** Render the current state */
  render() {
    console.log("*** <snapmail-page>.render() ***");

    /* Reset contactGrid */
    this.updateContacts(true);
    this.updateContactGrid(false);
    // if (this.contactsMenuElem.items && this.contactsMenuElem.items.length > 0) {
    //   this.contactsMenuElem.items[0].disabled = false;
    //   //contactsMenu.render();
    // }
    /* Update mailGrid */
    if (this.folderElem) {
      this.update_mailGrid(this.folderElem.value);
    }

    return html`
            <!-- Split between InArea and the rest -->
            <vaadin-split-layout orientation="vertical" style="width:100%; height:100%; margin-top:0px;">
                <!-- OUT-MAIL AREA -->
                <vaadin-vertical-layout style="width:100%; height:50%">
                    <!-- Upload | Handle MENU -->
                    <vaadin-horizontal-layout theme="spacing-xs" style="background-color: #f7f7f1; width: 100%;">
                    </vaadin-horizontal-layout>
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
}
