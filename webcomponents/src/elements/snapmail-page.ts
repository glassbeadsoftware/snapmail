import {css, html} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {consume} from "@lit/context";
import {
  ActionHash,
  ActionHashB64,
  AgentPubKey, AgentPubKeyB64, AppSignal,
  decodeHashFromBase64,
  encodeHashToBase64,
  EntryHash
} from "@holochain/client";

import {ProgressBar} from "@vaadin/progress-bar";
import {Button} from "@vaadin/button";
import {MenuBar, MenuBarItem, MenuBarItemSelectedEvent} from "@vaadin/menu-bar";
import {TextField} from "@vaadin/text-field";
import {Notification} from "@vaadin/notification";
import {VerticalLayout} from "@vaadin/vertical-layout";
import {HorizontalLayout} from "@vaadin/horizontal-layout";


import {customDateString, into_mailText, MailGridItem} from "../mail";

import {SnapmailMailWrite} from "./snapmail-mail-write";
import {SnapmailContacts} from "./snapmail-contacts";
import {arrayBufferToBase64, splitFile} from "../utils";
import {
  FileManifest,
  MailItem,
  SendMailInput,
  SignalProtocol,
  SignalProtocolType,
  SignalProtocolVariantReceivedAck,
  SignalProtocolVariantReceivedFile,
  SignalProtocolVariantReceivedMail,
  SnapmailSignal
} from "../bindings/snapmail.types";
import {SnapmailFilebox} from "./snapmail-filebox";
import {BUILD_MODE, MY_ELECTRON_API} from "../electron";
import {DnaElement, HAPP_BUILD_MODE, HAPP_ENV, HappEnvType} from "@ddd-qc/lit-happ";
import {SnapmailPerspective} from "../viewModel/snapmail.perspective";
import {SnapmailDvm} from "../viewModel/snapmail.dvm";

import {wrapPathInSvg} from "@ddd-qc/we-utils";
import {WeNotification, WeServices} from "@lightningrodlabs/we-applet";
import {weClientContext} from "../contexts";
import {mdiAlertOctagonOutline, mdiAlertOutline, mdiCheckCircleOutline, mdiInformationOutline, mdiCog} from "@mdi/js";

import '@vaadin/vaadin-lumo-styles';
import '@vaadin/icons';
import '@vaadin/icon/theme/lumo/vaadin-icon.js';

import '@vaadin/button/theme/lumo/vaadin-button.js';
import '@vaadin/combo-box/theme/lumo/vaadin-combo-box.js';
import '@vaadin/dialog/theme/lumo/vaadin-dialog.js';
import '@vaadin/grid/theme/lumo/vaadin-grid.js';
import '@vaadin/grid/theme/lumo/vaadin-grid-column.js';
import '@vaadin/grid/theme/lumo/vaadin-grid-filter.js';
import '@vaadin/grid/theme/lumo/vaadin-grid-filter-column.js';
import '@vaadin/grid/theme/lumo/vaadin-grid-selection-column.js';
import '@vaadin/grid/theme/lumo/vaadin-grid-sort-column.js';
import '@vaadin/grid/theme/lumo/vaadin-grid-sorter.js';
import '@vaadin/grid/theme/lumo/vaadin-grid-tree-toggle.js';
import '@vaadin/menu-bar/theme/lumo/vaadin-menu-bar.js';
import '@vaadin/progress-bar/theme/lumo/vaadin-progress-bar.js';
import '@vaadin/text-field/theme/lumo/vaadin-text-field.js';
import '@vaadin/text-area/theme/lumo/vaadin-text-area.js';
import '@vaadin/notification/theme/lumo/vaadin-notification.js';
import '@vaadin/select/theme/lumo/vaadin-select.js';
import '@vaadin/split-layout/theme/lumo/vaadin-split-layout.js';
import '@vaadin/vertical-layout/theme/lumo/vaadin-vertical-layout.js';
import '@vaadin/horizontal-layout/theme/lumo/vaadin-horizontal-layout.js';
import '@vaadin/upload/theme/lumo/vaadin-upload.js';



/** */
@customElement("snapmail-page")
export class SnapmailPage extends DnaElement<unknown, SnapmailDvm> {
  constructor() {
    super(SnapmailDvm.DEFAULT_BASE_ROLE_NAME);
    console.log("<snapmail-page> ctor")
  }

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServices;

  @property()
  noTitle = false;

  @property()
  startingNickname?: string;

  @state() private _myHandle = '<unknown>';
  @state() private _canHideHandleInput = true;
  private _replyOf?: ActionHashB64;
  @state() private _currentMailItem?: MailItem;


  private _actionMenuItems: MenuBarItem[] = [
    { text: 'Clear' },
    //{ text: '+File', disabled: true },
    { text: 'Snap', disabled: true },
    { text: 'Send', disabled: true }
  ];


  /** -- Getters -- */

  get zPerspective(): SnapmailPerspective {
    return this._dvm.snapmailZvm.perspective;
  }

  get handleButtonElem(): Button {
    return this.shadowRoot.getElementById("handleDisplay") as Button;
  }

  get handleInputElem(): TextField {
    return this.shadowRoot.getElementById("myHandleInput") as TextField;
  }

  get actionMenuElem() : MenuBar {
    return this.shadowRoot.getElementById("ActionBar") as MenuBar;
  }

  get mailWriteElem() : SnapmailMailWrite {
    return this.shadowRoot.getElementById("mailWrite") as SnapmailMailWrite;
  }

  get contactsElem() : SnapmailContacts {
    return this.shadowRoot.getElementById("snapmailContacts") as SnapmailContacts;
  }

  get sendProgressBarElem() : ProgressBar {
    return this.shadowRoot.getElementById("sendProgressBar") as ProgressBar;
  }

  get fileboxElem() : SnapmailFilebox {
    return this.shadowRoot.getElementById("snapmailFilebox") as SnapmailFilebox;
  }


  /** -- Methods -- */


  /** */
  handleSignal(signalwrapper: AppSignal) {
    console.log('<snapmail-page>.Received signal:', signalwrapper);
    const signal: SnapmailSignal = signalwrapper.payload as SnapmailSignal;

    /** store ping */
    const sender = encodeHashToBase64(signal.from)
    this._dvm.snapmailZvm.storePingResult(sender, true);
    const senderName = this.zPerspective.usernameMap[sender] || 'unknown user';

    /** Handle */
    let title;
    let body = "";
    let urgency: "high" | "medium" | "low" = "high";
    switch(signal.kind) {
      case SignalProtocolType.ReceivedMail:
        const mailItem: MailItem = (signal.payload as SignalProtocolVariantReceivedMail).ReceivedMail;
        console.log("received_mail:", mailItem);
        title = 'New Mail received from ' + senderName;
        body = mailItem.mail.subject;
        /*await*/ this._dvm.snapmailZvm.probeMails();
      break;
      case SignalProtocolType.ReceivedAck:
        const forMailAh: ActionHashB64 = encodeHashToBase64((signal.payload as SignalProtocolVariantReceivedAck).ReceivedAck);
        console.log("received_ack:", forMailAh);
        title = 'New Ack received from ' + senderName;
        urgency = 'low';
      break;
      case SignalProtocolType.ReceivedFile:
        const item: FileManifest = (signal.payload as SignalProtocolVariantReceivedFile).ReceivedFile;
        title = 'New File received from ' + senderName;
        body = item.filename;
        console.log("received_file:", item);
      break;
    default:
      console.error("Unknown SnapmailSignal kind:", signal.kind);
      return;
      break;
    }
    /** */
    const notification = Notification.show(html`${title}`, {
      position: 'bottom-center',
      duration: 3000,
      theme: urgency == "high"? 'contrast' : '',
    });
    /** */
    if (this.weServices) {
      const myNotif: WeNotification = {
        title,
        body,
        notification_type: signal.kind,
        icon_src: wrapPathInSvg(mdiInformationOutline),
        urgency,
        timestamp: Date.now(),
      }
      this.weServices.notifyWe([myNotif]);
    }
    /** electron */
    if (MY_ELECTRON_API) {
      //console.log("handleSignal for ELECTRON");
      /* Notify Electron main */
      const reply: unknown = MY_ELECTRON_API.newMailSync(title, body)
      console.log({reply});
    }
  }


  /** After first render only */
  async firstUpdated() {
    console.log("<snapmail-page> firstUpdated()");
    /** setup notificationHandler */
    this._dvm.setSignalHandler((s :AppSignal) => {this.handleSignal(s)});
    /** */
    void customElements.whenDefined('vaadin-button').then(() => {
      this.handleInputElem.addEventListener("keyup", (event) => {
        if (event.key == "Enter") {
          void this.setUsername();
        }
      });
    });
    /** Probe */
    try {
      this._myHandle = await this._dvm.snapmailZvm.getMyHandle();
      console.log("<snapmail-page> firstUpdated()", this._myHandle, this.startingNickname);
      if ((this._myHandle == "<unknown>"  || this._myHandle == "<noname>") && this.startingNickname) {
        this._myHandle = this.startingNickname;
        await this,this._dvm.snapmailZvm.setHandle(this.startingNickname);
      }
      await this._dvm.probeAll();
    } catch(error: unknown) {
      console.error('probeAll() FAILED');
      console.error({ error })
      alert("Failed to connect to holochain. Conductor service might not be up and running.");
    }
    /** -- Change title color in debug -- */
    const titleLayout = this.shadowRoot.getElementById('titleLayout') as HorizontalLayout;
    if (HAPP_BUILD_MODE == 'Debug') {
      titleLayout.style.backgroundColor = "#ec8383d1";
    }
    if (MY_ELECTRON_API || this.noTitle || (HAPP_BUILD_MODE != 'Debug' && HAPP_ENV == HappEnvType.We)) {
      titleLayout.style.display = "none";
      // if (BUILD_MODE === 'dev') {
      //   /** -- Update Title with DNA ID */
      //   const rootTitle = document.getElementById('rootTitle') as HTMLTitleElement;
      //   console.assert(rootTitle);
      //   //rootTitle.textContent = "SnapMail v" + version + "  - " + DNA.NETWORK_ID;
      //   rootTitle.textContent = rootTitle.textContent + " (" + dnaId + ")";
      // }
    }
    /** -- Update Abbr -- */
    const handleAbbr: HTMLElement = this.shadowRoot.getElementById('handleAbbr');
    handleAbbr.title = "agentId: " + this.cell.agentPubKey;
    const titleAbbr: HTMLElement = this.shadowRoot.getElementById('titleAbbr');
    titleAbbr.title = this.cell.dnaHash;
    /** -- Loading Done -- */
    const loadingBar = this.shadowRoot.getElementById('loadingBar') as ProgressBar;
    loadingBar.style.display = "none";
    const mainPage = this.shadowRoot.getElementById('mainPage') as VerticalLayout;
    mainPage.style.display = "flex";
    /* init Send progress bar */
    this.sendProgressBarElem.style.display = "none";
    /* Init Electron specific variables */
    void this.initElectron();
  }


  /** */
  updated() {
    if (!this._canHideHandleInput) {
      this.handleInputElem.focus();
    }
  }


  /** */
  async initElectron(): Promise<void> {
    if (!MY_ELECTRON_API) {
      return;
    }
    console.log("Calling getMyHandle() for ELECTRON");
    const startingHandle = await this._dvm.snapmailZvm.getMyHandle();
    console.log("getMyHandle() returned: " + startingHandle);
    console.log("startingInfo sending dnaHash =", this.cell.dnaHash);
    const reply = MY_ELECTRON_API.startingInfo(startingHandle, decodeHashFromBase64(this.cell.dnaHash))
    console.log("startingInfo reply =", reply);
    if (reply != "<noname>") {
      await this.setUsername(reply);
    }
  }


  /** -- Handle -- */


  /** */
  async setUsername(maybeHandle?: string) {
    const newHandle = maybeHandle? maybeHandle : this.handleInputElem.value;
    console.log('setUsername()', newHandle);
    /*const _ah =*/ await this._dvm.snapmailZvm.setHandle(newHandle);
    this._myHandle = newHandle;
    this.handleInputElem.value = '';
    this.hideHandleInput(true);

    /** - Update my Handle in the contacts grid */
    void this._dvm.snapmailZvm.probeHandles();
  }


  /** */
  hideHandleInput(canHideInput: boolean): void {
    //console.log("hideHandleInput()", canHideInput);
    this._canHideHandleInput = canHideInput;
    if (!canHideInput && this._myHandle !== '<unknown>' && this._myHandle !== '<noname>') {
      this.handleInputElem.value = this._myHandle
    } else {
      this.handleInputElem.value = ''
    }
  }


  /** -- */

  /** */
  disableSendButton(isDisabled: boolean): void {
    console.log("disableSendButton()", isDisabled);
    if (this._actionMenuItems[2].disabled == isDisabled) {
      return;
    }
    /** Deep-copy MenuBarItems so it can trigger a new render */
    const items = JSON.parse(JSON.stringify(this._actionMenuItems)) as MenuBarItem[];
    items[2].disabled = isDisabled;
    this._actionMenuItems = items;
    this.requestUpdate();
  }


  /** */
  selectContact(candidate: AgentPubKeyB64, count: number) {
    for(const contactItem of this.contactsElem.allContacts) {
      if(contactItem.agentIdB64 !== candidate) {
        continue;
      }
      for (let i = 0; i < count; i++) {
        this.contactsElem.toggleContact(contactItem);
      }
      break;
    }
    this.contactsElem.updateContacts(true);
    //this.contactsElem.updateSelection();
  }


  /** */
  onFileboxMenuItemSelected(menuItemName: string) {
    if (!this._currentMailItem) {
      console.log("onFileboxMenuItemSelected() no mail selected");
      return;
    }
    /* -- Handle 'Print' -- */
    if (menuItemName === 'Print') {
      const mailText = into_mailText(this.zPerspective.usernameMap, this._currentMailItem)
      /** Save to disk */
      const blob = new Blob([mailText], { type: 'text/plain'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this._currentMailItem.mail.subject + ".txt";
      a.addEventListener('click', () => {}, false);
      a.click();
    }

    /* -- Handle 'Trash' -- */
    if (menuItemName === 'Trash') {
      this._replyOf = undefined;
      void this._dvm.snapmailZvm.deleteMail(encodeHashToBase64(this._currentMailItem.ah))
        .then((/*maybeAh: ActionHash | null*/) => this._dvm.snapmailZvm.probeMails()) // On delete, refresh filebox
      this.fileboxElem.resetSelection();
    }
    /* -- Handle 'Reply to sender' -- */
    if (menuItemName === 'Reply to sender') {
      this.mailWriteElem.subject = 'Re: ' + this._currentMailItem.mail.subject;
      this._replyOf = encodeHashToBase64(this._currentMailItem.ah);
      console.log("this._replyOf set to", this._replyOf);
      this.contactsElem.resetSelection();
      this.selectContact(encodeHashToBase64(this._currentMailItem.author), 1)
      this.disableSendButton(this.contactsElem.selectedContacts.length == 0);
    }

    /* -- Handle 'Reply to All' -- */
    if (menuItemName === 'Reply to all') {
      this._replyOf = encodeHashToBase64(this._currentMailItem.ah);
      this.mailWriteElem.subject = 'Re: ' + this._currentMailItem.mail.subject;
      this.contactsElem.resetSelection();
      /* TO */
      for (const agentId of this._currentMailItem.mail.to) {
        //const to_username = this.zPerspective.usernameMap.get(encodeHashToBase64(agentId));
        this.selectContact(encodeHashToBase64(agentId), 1);
      }
      /* CC */
      for (const agentId of this._currentMailItem.mail.cc) {
        //const cc_username = this.zPerspective.usernameMap.get(encodeHashToBase64(agentId));
        this.selectContact(encodeHashToBase64(agentId), 2);
      }
      /* BCC */
      if (this._currentMailItem.bcc) {
        for (const agentId of this._currentMailItem.bcc) {
          //const bcc_username = this.zPerspective.usernameMap.get(encodeHashToBase64(agentId));
          this.selectContact(encodeHashToBase64(agentId), 3);
        }
      }
      /* Done */
      this.disableSendButton(this.contactsElem.selectedContacts.length == 0);
    }
    /** -- Handle 'Forward' -- */
    if (menuItemName === 'Forward') {
      this.mailWriteElem.subject = 'Fwd: ' + this._currentMailItem.mail.subject;
      let fwd = '\n\n';
      fwd += '> ' + 'Mail from: '
        + this.zPerspective.usernameMap[encodeHashToBase64(this._currentMailItem.author)]
        + ' at ' + customDateString(this._currentMailItem.date)
        + '\n';
      const arrayOfLines = this._currentMailItem.mail.payload.match(/[^\r\n]+/g);
      for (const line of arrayOfLines) {
        fwd += '> ' + line + '\n';
      }
      this.mailWriteElem.content = fwd;
    }

    /** -- Handle 'Refresh' -- */
    if (menuItemName === 'Refresh') {
      //console.log('Refresh called');
      void this._dvm.probeAll();
    }
  }


  /** */
  onMailSelected(item: MailGridItem) {
    console.log('onMailSelected()', item);
    this._replyOf = undefined;
    if (!item) {
      return;
    }
    this._currentMailItem = item.mailItem;
    void this._dvm.snapmailZvm.acknowledgeMail(item.id);
  }


  /** */
  clearWriteMail() {
    this._replyOf = undefined;
    this.mailWriteElem.reset();
    this.contactsElem.resetSelection();
    this.disableSendButton(true);
  }


  /** Perform send mail action */
  async sendAction(): Promise<void> {
    /** Submit each attachment */
    const files = this.mailWriteElem.files;
    const filesToSend: ActionHash[] = [];
    for (const file of files) {
      // /** Causes stack error on big files */
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
      const chunksToSend: EntryHash[] = [];
      for (let i = 0; i < splitObj.numChunks; ++i) {
        const eh = await this._dvm.snapmailZvm.writeChunk(splitObj.dataHash, i, splitObj.chunks[i]);
        chunksToSend.push(eh);
      }
      const ah = await this._dvm.snapmailZvm.writeManifest(splitObj.dataHash, file.name, filetype, file.size, chunksToSend);
      filesToSend.push(ah);
    }

    /* Get contact Lists */
    const selection = this.contactsElem.selectedContacts;
    if (!selection || selection.length == 0) {
      console.log('Send Mail Failed: No recipient selected')
      return;
    }

    const toList: AgentPubKey[] = [];
    const ccList: AgentPubKey[] = [];
    const bccList: AgentPubKey[] = [];
    /* Get recipients from contactGrid */
    for (const contactItem of selection) {
      console.log('recipient: ', contactItem.agentIdB64);
      const agentId = decodeHashFromBase64(contactItem.agentIdB64);
      switch (contactItem.recipientType) {
        case '': break;
        case 'to': toList.push(agentId); break;
        case 'cc': ccList.push(agentId); break;
        case 'bcc': bccList.push(agentId); break;
        default: console.error('unknown recipientType');
      }
    }

    /* Create Mail */
    const mail: SendMailInput = {
      subject: this.mailWriteElem.getSubject()? this.mailWriteElem.getSubject(): "",
      payload: this.mailWriteElem.getContent()? this.mailWriteElem.getContent(): "",
      reply_of: this._replyOf? decodeHashFromBase64(this._replyOf) : undefined,
      to: toList, cc: ccList, bcc: bccList,
      manifest_address_list: filesToSend,
    };
    console.log('sending mail:', mail);
    /* Send Mail */
    /*const outmail_hh =*/ await this._dvm.snapmailZvm.sendMail(mail);

    /** Clear UI */
    this.clearWriteMail();
    this.contactsElem.resetSelection();
  }


  /** */
  onActionMenuSelected(actionName: string) {
    /** Clear */
    if (actionName === 'Clear') {
      this.clearWriteMail();
      return;
    }
    /** Send */
    if (actionName === 'Send') {
      /** Hide actionMenu and display progress bar */
      const sendingTitle = this.shadowRoot.getElementById('sendingTitle');
      this.sendProgressBarElem.style.display = "block";
      sendingTitle.style.display = "block";
      this.actionMenuElem.style.display = "none";
      /** Perform send */
      void this.sendAction().then(() => {
        /** Show actionMenu and hid progress bar */
        this.sendProgressBarElem.style.display = "none";
        sendingTitle.style.display = "none";
        this.actionMenuElem.style.display = "block";
      });
    }
  }


  /** */
  render() {
    console.log("<snapmail-page>.render()", this._myHandle, this._actionMenuItems, this.actionMenuElem? this.actionMenuElem.items : "<none>");

    /** */
    return html`
      <!-- Loading Spinner -->
      <vaadin-progress-bar id="loadingBar" indeterminate value="0"></vaadin-progress-bar>
      
      <!-- MAIN VERTICAL LAYOUT -->
      <vaadin-vertical-layout theme="spacing-s" style="flex:1; display:none; height:100%; gap:0;" id="mainPage">

        <!-- TITLE BAR: Can be hidden in firstUpdated() -->
        <vaadin-horizontal-layout id="titleLayout" theme="spacing-xs" style="background-color:beige; width:100%;">
          <abbr title="dna" id="titleAbbr">
            <img src="favicon.ico" width="32" height="32" alt="favicon" style="padding-left: 5px;padding-top: 5px;"/>
          </abbr>
          <span id="snapTitle" style="text-align: center; font-size: larger; padding: 10px 0px 10px 5px;">SnapMail</span>
          <span id="networkIdDisplay" style="text-align: center; font-size: small; padding: 15px 2px 0px 5px;"></span>
          <!--        <span style="text-align: center; font-size: larger; padding: 10px 10px 10px 5px;"> - </span>-->
        </vaadin-horizontal-layout>
        
        <!-- Vertical split between filebox&Inmail and the rest -->
        <vaadin-split-layout orientation="vertical" style="width:100%; height:100%; margin-top:0px;">
            
          <!-- Vertical split between filebox and Inmail -->
          <vaadin-split-layout orientation="vertical" style="width:100%; height:50%; margin-top:0px;">
            <snapmail-filebox id="snapmailFilebox"
                              style="min-height:50px; margin-top:0;height: auto;"
                              @menu-item-selected="${(e: CustomEvent<string>) => {this.onFileboxMenuItemSelected(e.detail)}}"
                              @mail-item-selected="${(e: CustomEvent<MailGridItem>) => {this.onMailSelected(e.detail)}}"
            ></snapmail-filebox>
            <vaadin-horizontal-layout theme="spacing-xs" style="min-height:120px; height:50%; width:100%; margin-top: 4px; flex: 1 1 100px">
              <snapmail-mail-view style="width:70%;height:100%;"
                                  .inMailItem="${this._currentMailItem}" 
                                  .usernameMap="${this.zPerspective.usernameMap}"
              ></snapmail-mail-view>
              <snapmail-att-view style="width:30%;height:100%;display:flex;" 
                                 .inMailItem="${this._currentMailItem}"
              ></snapmail-att-view>
            </vaadin-horizontal-layout>
          </vaadin-split-layout>

          <!-- OUT-MAIL AREA -->
          <vaadin-vertical-layout style="width:100%; height:50%">
            <h4 style="margin:10px 0px 0px 0px;">&#128394; Write Mail</h4>
            <!-- Horizontal split between Write and Contacts -->              
            <vaadin-split-layout style="min-height:50px; height:100%; width:100%; margin:0px;">
              <snapmail-mail-write id="mailWrite"
                                   style="min-width: 40px; width: 65%;"
              ></snapmail-mail-write>
              <snapmail-contacts id="snapmailContacts"
                                 style="min-width: 20px; width: 35%;"
                                 @contact-selected="${(e: CustomEvent<string[]>) => {this.disableSendButton(e.detail.length == 0)}}"></snapmail-contacts>
            </vaadin-split-layout>
    
            <!-- ACTION MENU BAR -->
            <div style="width:100%; display:flex;justify-content: flex-end">
                <vaadin-menu-bar id="ActionBar" theme="primary"
                                 style="height:40px; margin-top:5px; margin-bottom:10px;"
                                 .items="${this._actionMenuItems}"
                                 @item-selected="${(e:MenuBarItemSelectedEvent) => {this.onActionMenuSelected(e.detail.value.text)}}"
                >
                </vaadin-menu-bar>
            </div>
    
            <!-- Handle MENU -->
            <div style="margin-left: auto;display: flex;">
                <h4 style="margin: 14px 10px 0px 0px;">Username:</h4>
                <abbr title="handle" id="handleAbbr" style="margin-left:0px;">
                    <vaadin-button id="handleDisplay" 
                                   style="min-width: 100px;"
                                   .hidden="${!this._canHideHandleInput}"
                                   @click=${() => {this.hideHandleInput(false);}}>
                        <span>${this._myHandle}</span>
                        <vaadin-icon icon="lumo:edit" slot="suffix"></vaadin-icon>
                    </vaadin-button>
                </abbr>
                <!-- <vcf-tooltip id="handleDisplayTT" for="handleDisplay" position="bottom">fucking tooltip</vcf-tooltip> -->
                <vaadin-text-field id="myHandleInput" clear-button-visible 
                                   placeholder="username"
                                   .hidden="${this._canHideHandleInput}"
                ></vaadin-text-field>
                <vaadin-button id="setMyHandleButton" theme="icon"
                               title="unknown"
                               .hidden="${this._canHideHandleInput}"
                               @click=${(e) => this.setUsername(e.detail.value as string)}>
                    <vaadin-icon icon="lumo:checkmark" slot="prefix"></vaadin-icon>
                </vaadin-button>
                <vaadin-button id="cancelHandleButton" theme="icon"
                               .hidden="${this._canHideHandleInput}"
                               @click=${() => {this.hideHandleInput(true);}}>
                    <vaadin-icon icon="lumo:cross" slot="prefix"></vaadin-icon>
                </vaadin-button>
            </div>
              
         
            <!-- Progress Bar -->
            <h3 style="margin:10px 0 5px 0;display:none;" id="sendingTitle">Sending</h3>
            <vaadin-progress-bar indeterminate value="0" id="sendProgressBar" style="margin-bottom:20px;"></vaadin-progress-bar>
          </vaadin-vertical-layout>
            
        </vaadin-split-layout>
        
      </vaadin-vertical-layout>          
    `;
  }

}
