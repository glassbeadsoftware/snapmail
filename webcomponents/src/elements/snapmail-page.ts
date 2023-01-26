import {DnaElement} from "@ddd-qc/lit-happ";
import {SnapmailPerspective} from "../viewModel/snapmail.perspective";
import {css, html} from "lit";
import {Icon} from "@vaadin/vaadin-icon";
import {ProgressBar} from "@vaadin/progress-bar";
import {Button} from "@vaadin/button";
import {MenuBar, MenuBarItem} from "@vaadin/menu-bar";
import {TextField} from "@vaadin/text-field";
import {Notification} from "@vaadin/notification";
import {Dialog} from "@vaadin/dialog";
import {VerticalLayout} from "@vaadin/vertical-layout";
import {HorizontalLayout} from "@vaadin/horizontal-layout";
import {SplitLayout} from "@vaadin/split-layout";
import {
  ActionHash,
  ActionHashB64,
  AgentPubKey, AgentPubKeyB64, AppSignal,
  decodeHashFromBase64,
  encodeHashToBase64,
  EntryHash
} from "@holochain/client";
import {customDateString, into_mailText, MailGridItem} from "../mail";
import {property, state} from "lit/decorators.js";
import {SnapmailMailWrite} from "./snapmail-mail-write";
import {SnapmailContacts} from "./snapmail-contacts";
import {arrayBufferToBase64, splitFile} from "../utils";
import {
  FileManifest,
  MailItem,
  ReceivedAck,
  SendMailInput,
  SignalProtocol,
  SignalProtocolType
} from "../bindings/snapmail.types";
import {SnapmailFilebox} from "./snapmail-filebox";
import {SnapmailAttView} from "./snapmail-att-view";
import {SnapmailMailView} from "./snapmail-mail-view";
import {DEV_MODE, MY_ELECTRON_API} from "../electron";
import '@vaadin/vaadin-icon';
import '@vaadin/vaadin-lumo-styles';
import {SnapmailDvm} from "../viewModel/snapmail.dvm";

/**
 *
 */
export class SnapmailPage extends DnaElement<unknown, SnapmailDvm> {
  constructor() {
    super(SnapmailDvm.DEFAULT_BASE_ROLE_NAME);
  }


  @property()
  noTitle = false;

  @state() private _myHandle = '<unknown>';
  @state() private _canHideHandleInput = true;
  private _replyOf?: ActionHashB64;
  @state() private _currentMailItem?: MailItem;


  private readonly _actionMenuItems: MenuBarItem[] = [
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
    return this.shadowRoot!.getElementById("handleDisplay") as Button;
  }

  get handleInputElem(): TextField {
    return this.shadowRoot!.getElementById("myHandleInput") as TextField;
  }


  get actionMenuElem() : MenuBar {
    return this.shadowRoot!.getElementById("ActionBar") as MenuBar;
  }

  get mailWriteElem() : SnapmailMailWrite {
    return this.shadowRoot!.getElementById("mailWrite") as SnapmailMailWrite;
  }

  get contactsElem() : SnapmailContacts {
    return this.shadowRoot!.getElementById("snapmailContacts") as SnapmailContacts;
  }

  get sendProgressBarElem() : ProgressBar {
    return this.shadowRoot!.getElementById("sendProgressBar") as ProgressBar;
  }

  get fileboxElem() : SnapmailFilebox {
    return this.shadowRoot!.getElementById("snapmailFilebox") as SnapmailFilebox;
  }


  /** -- Methods -- */


  /** */
  handleSignal(signalwrapper: AppSignal) {
    console.log('<snapmail-page>.Received signal:', signalwrapper);

    const payload: SignalProtocol = signalwrapper.payload as SignalProtocol;

    /** Handle 'ReceivedMail' signal */
    if (SignalProtocolType.ReceivedMail in payload) {
      const item: MailItem = payload.ReceivedMail;
      console.log("received_mail:", item);
      const notification = this.shadowRoot!.getElementById('notifyMail') as Notification;
      notification.open();

      const mail = payload.ReceivedMail;
      const pingedAgentB64 = encodeHashToBase64(mail.author);
      this._dvm.snapmailZvm.storePingResult(pingedAgentB64, true);

      if (MY_ELECTRON_API) {
        //console.log("handleSignal for ELECTRON");
        console.log({mail});
        const author_name = this.zPerspective.usernameMap[encodeHashToBase64(mail.author)] || 'unknown user';

        /** ELECTRON NOTIFICATION */
        const NOTIFICATION_TITLE = 'New mail received from ' + author_name;
        const NOTIFICATION_BODY = payload.ReceivedMail.mail.subject;
        //const CLICK_MESSAGE = 'Notification clicked';

        // - Do Notification directly from web UI
        //new Notification(NOTIFICATION_TITLE, { body: NOTIFICATION_BODY })
        //  .onclick = () => console.log(CLICK_MESSAGE)

        /* Notify Electron main */
        const reply = MY_ELECTRON_API.newMailSync(NOTIFICATION_TITLE, NOTIFICATION_BODY)
        console.log({reply});
      }
      //this._dvm.snapmailZvm.probeMails();
      return;
    }

    /** Handle 'ReceivedAck' signal */
    if (SignalProtocolType.ReceivedAck in payload) {
      const item: ReceivedAck = payload.ReceivedAck;
      console.log("received_ack:", item);
      const pingedAgentB64 = encodeHashToBase64(item.from);
      this._dvm.snapmailZvm.storePingResult(pingedAgentB64, true);
      const notification = this.shadowRoot!.getElementById('notifyAck') as Notification;
      notification.open();
      this._dvm.snapmailZvm.probeMails();
      return;
    }

    /** Handle 'ReceivedFile' signal */
    if (SignalProtocolType.ReceivedFile in payload) {
      const item: FileManifest = payload.ReceivedFile;
      console.log("received_file:", item);
      const notification = this.shadowRoot!.getElementById('notifyFile') as Notification;
      notification.open();
      return
    }
  }


  /** After first render only */
  async firstUpdated() {
    console.log("<snapmail-page> firstUpdated()");

    this.initNotification();

    customElements.whenDefined('vaadin-button').then(() => {
      this.handleInputElem.addEventListener("keyup", (event) => {
        if (event.keyCode == 13) {
          this.setUsername();
        }
      });
    });

    /** Probe */
    try {
      this._myHandle = await this._dvm.snapmailZvm.getMyHandle();
      await this._dvm.probeAll();
    } catch(error:any) {
      console.error('probeAll() FAILED');
      console.error({ error })
      alert("Failed to connect to holochain. Conductor service might not be up and running.");
    }


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
    handleAbbr.title = "agentId: " + this.cell.agentPubKey;
    const titleAbbr = this.shadowRoot!.getElementById('titleAbbr') as HTMLElement;
    titleAbbr.title = this.cell.dnaHash;
    /** -- Loading Done -- */
    const loadingBar = this.shadowRoot!.getElementById('loadingBar') as ProgressBar;
    loadingBar.style.display = "none";
    const mainPage = this.shadowRoot!.getElementById('mainPage') as VerticalLayout;
    mainPage.style.display = "flex";
    /* init Send progress bar */
    this.sendProgressBarElem.style.display = "none";
    /* Init Electron specific variables */
    this.initElectron();
  }


  /** */
  updated() {
    if (!this._canHideHandleInput) {
      this.handleInputElem.focus();
    }
  }


  /** */
  initNotification() {
    /** -- Mail  */
    const notificationMail = this.shadowRoot!.getElementById('notifyMail') as Notification;
    notificationMail.renderer = (root) => {
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
    notification.renderer = (root) => {
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
    notification.renderer = (root) => {
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

    this._dvm.setSignalHandler((s:any) => {this.handleSignal(s)});
  }


  /** */
  async initElectron() {
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
    const _ah = await this._dvm.snapmailZvm.setHandle(newHandle);
    this._myHandle = newHandle;
    this.handleInputElem.value = '';
    this.hideHandleInput(true);

    /** - Update my Handle in the contacts grid */
    this._dvm.snapmailZvm.probeHandles();
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
    //console.log("disableSendButton()", isDisabled);
    if (this.actionMenuElem.items[2].disabled == isDisabled) {
      return;
    }

    this.actionMenuElem.items[2].disabled = isDisabled;
    /** Deep-copy MenuBarItems so it can trigger a new render */
    const items = JSON.parse(JSON.stringify(this.actionMenuElem.items)) as MenuBarItem[];
    items[2].disabled = isDisabled;
    this.actionMenuElem.items = items;
    //this.requestUpdate();
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
      const mailText = into_mailText(this.zPerspective.usernameMap, this._currentMailItem!)
      /** Save to disk */
      const blob = new Blob([mailText], { type: 'text/plain'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this._currentMailItem!.mail.subject + ".txt";
      a.addEventListener('click', () => {}, false);
      a.click();
    }

    /* -- Handle 'Trash' -- */
    if (menuItemName === 'Trash') {
      this._replyOf = undefined;
      this._dvm.snapmailZvm.deleteMail(encodeHashToBase64(this._currentMailItem.ah))
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
        + this.zPerspective.usernameMap[encodeHashToBase64(this._currentMailItem!.author)]
        + ' at ' + customDateString(this._currentMailItem!.date)
        + '\n';
      const arrayOfLines = this._currentMailItem!.mail.payload.match(/[^\r\n]+/g);
      for (const line of arrayOfLines!) {
        fwd += '> ' + line + '\n';
      }
      this.mailWriteElem.content = fwd;
    }

    /** -- Handle 'Refresh' -- */
    if (menuItemName === 'Refresh') {
      //console.log('Refresh called');
      this._dvm.probeAll();
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
    this._dvm.snapmailZvm.acknowledgeMail(item.id);
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
    let filesToSend: ActionHash[] = [];
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
      let chunksToSend: EntryHash[] = [];
      for (let i = 0; i < splitObj.numChunks; ++i) {
        const eh = await this._dvm.snapmailZvm.writeChunk(splitObj.dataHash, i, splitObj.chunks[i]);
        chunksToSend.push(eh);
      }
      const ah = await this._dvm.snapmailZvm.writeManifest(splitObj.dataHash, file.name, filetype, file.size, chunksToSend)
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
    console.log('sending mail:', mail)
    /* Send Mail */
    const outmail_hh = await this._dvm.snapmailZvm.sendMail(mail);

    /** Clear UI */
    this.clearWriteMail();
    this.contactsElem.resetSelection();
  }


  // /** */
  // allowActionMenu(canShowMenu: boolean): void {
  //   if (canShowMenu) {
  //     this.sendProgressBarElem.style.display = "none";
  //     this.actionMenuElem.style.display = "block";
  //   } else  {
  //     this.sendProgressBarElem.style.display = "block";
  //     this.actionMenuElem.style.display = "none";
  //   }
  // }


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
      const sendingTitle = this.shadowRoot!.getElementById('sendingTitle') as HTMLElement;
      this.sendProgressBarElem.style.display = "block";
      sendingTitle.style.display = "block";
      this.actionMenuElem.style.display = "none";
      /** Perform send */
      this.sendAction().then(() => {
        /** Show actionMenu and hid progress bar */
        this.sendProgressBarElem.style.display = "none";
        sendingTitle.style.display = "none";
        this.actionMenuElem.style.display = "block";
      });
    }
  }


  /** */
  render() {
    console.log("<snapmail-page>.render()", this._myHandle);

    return html`
      <!-- Loading Spinner -->
      <vaadin-progress-bar indeterminate value="0" id="loadingBar" ></vaadin-progress-bar>
      <!-- Notifications -->
      <vaadin-notification duration="4000" theme="contrast" position="bottom-center" id="notifyMail"></vaadin-notification>
      <vaadin-notification duration="4000" position="bottom-center" id="notifyAck"></vaadin-notification>
      <vaadin-notification duration="4000" position="bottom-center" id="notifyFile"></vaadin-notification>
      
      <!-- MAIN VERTICAL LAYOUT -->
      <vaadin-vertical-layout theme="spacing-s" style="flex:1; display:none; height:100%; gap:0;" id="mainPage">

        <!-- TITLE BAR -->
        <vaadin-horizontal-layout id="titleLayout" theme="spacing-xs" style="background-color:beige; width:100%;">
          <abbr title="dna" id="titleAbbr">
              <img src="favicon.ico" width="32" height="32" style="padding-left: 5px;padding-top: 5px;"/>
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
                              @menu-item-selected="${(e:any) => {this.onFileboxMenuItemSelected(e.detail)}}"
                              @mail-item-selected="${(e:any) => {this.onMailSelected(e.detail)}}"
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
                                 @contact-selected="${(e:any) => {this.disableSendButton(e.detail.length == 0)}}"></snapmail-contacts>
            </vaadin-split-layout>
    
            <!-- ACTION MENU BAR -->
            <div style="width:100%; display:flex;justify-content: flex-end">
                <vaadin-menu-bar id="ActionBar" theme="primary"
                                 style="height:40px; margin-top:5px; margin-bottom:10px;"
                                 .items="${this._actionMenuItems}"
                                 @item-selected="${(e:any) => {this.onActionMenuSelected(e.detail.value.text)}}"
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
                               @click=${(e:any) => this.setUsername(e.detail.value)}>
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


  /** */
  static get styles() {
    return [
      css`
    `];
  }

  /** */
  static get scopedElements() {
    return {
      "snapmail-att-view": SnapmailAttView,
      "snapmail-mail-view": SnapmailMailView,
      "snapmail-mail-write": SnapmailMailWrite,
      "snapmail-filebox": SnapmailFilebox,
      "snapmail-contacts": SnapmailContacts,
      "vaadin-icon": Icon,
      "vaadin-progress-bar": ProgressBar,
      'vaadin-button':Button,
      'vaadin-menu-bar':MenuBar,
      'vaadin-text-field':TextField,
      'vaadin-notification': Notification,
      'vaadin-dialog':Dialog,
      'vaadin-vertical-layout': VerticalLayout,
      'vaadin-horizontal-layout': HorizontalLayout,
      'vaadin-split-layout': SplitLayout,
    };
  }
}
