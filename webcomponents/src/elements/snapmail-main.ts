import {ZomeElement} from "@ddd-qc/lit-happ";
import {ContactGridItem, MailGridItem, SnapmailPerspective} from "../viewModel/snapmail.perspective";
import {SnapmailZvm} from "../viewModel/snapmail.zvm";
import {css, html} from "lit";
import {Icon} from "@vaadin/vaadin-icon";
import {ProgressBar} from "@vaadin/progress-bar";
import {Button} from "@vaadin/button";
import {Upload} from "@vaadin/upload";
import {Grid, GridColumn} from "@vaadin/grid";
import {MenuBar, MenuBarItem} from "@vaadin/menu-bar";
import {ComboBox} from "@vaadin/combo-box";
import {TextField} from "@vaadin/text-field";
import {TextArea} from "@vaadin/text-area";
import {Notification} from "@vaadin/notification";
import {Dialog} from "@vaadin/dialog";
import {VerticalLayout} from "@vaadin/vertical-layout";
import {HorizontalLayout} from "@vaadin/horizontal-layout";
import {SplitLayout} from "@vaadin/split-layout";
import {GridSortColumn} from "@vaadin/grid/vaadin-grid-sort-column";
import {ActionHash, decodeHashFromBase64, encodeHashToBase64, EntryHash} from "@holochain/client";
import {customDateString, into_mailText, systemFolders} from "../mail";
import {property} from "lit/decorators";
import {SnapmailMailWrite} from "./snapmail-mail-write";
import {SnapmailContacts} from "./snapmail-contacts";
import {arrayBufferToBase64, splitFile} from "../utils";
import {SendMailInput} from "../bindings/snapmail.types";
import {SnapmailFilebox} from "./snapmail-filebox";


/**
 *
 */
export class SnapmailPage extends ZomeElement<SnapmailPerspective, SnapmailZvm> {
  constructor() {
    super(SnapmailZvm.DEFAULT_ZOME_NAME);
  }


  @property()
  noTitle = false;

  private _myHandle = '<unknown>';
  private _replyOf?: ActionHash;

  private _currentMailItem?: MailGridItem;


  private readonly _actionMenuItems: MenuBarItem[] = [
    { text: 'Clear' },
    //{ text: '+File', disabled: true },
    { text: 'Snap', disabled: true },
    { text: 'Send', disabled: true }
  ];

  get handleButtonElem(): Button {
    return this.shadowRoot!.getElementById("handleDisplay") as Button;
  }

  get handleInputElem(): TextField {
    return this.shadowRoot!.getElementById("myNewHandleInput") as TextField;
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

  /** After first render only */
  async firstUpdated() {
    console.log("<snapmail-page> firstUpdated()");
  }

  /** -- Handle -- */


  /** */
  async setUsername(maybeHandle?: string) {
    const newHandle = maybeHandle? maybeHandle : this.handleInputElem.value;
    console.log('setUsername()', newHandle);
    /*const callResult =*/ await this._zvm.setHandle(newHandle)
    this._myHandle = newHandle;
    this.handleInputElem.value = '';
    this.hideHandleInput(true);

    // FIXME
    // /** - Update my Handle in the contacts grid */
    // for (const item of this.contactGridElem.items!) {
    //   const contactItem: ContactGridItem = item as ContactGridItem;
    //   if (contactItem.agentIdB64 === this.agentPubKey) {
    //     contactItem.username = newHandle;
    //   }
    // }
    this.disableSendButton(this.contactsElem.selectedContacts.length == 0);
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


  /** -- */

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


  /** */
  selectContact(candidate: string, count: number) {
    for(const contactItem of this.contactsElem.allContacts) {
      if(contactItem.username !== candidate) {
        continue;
      }
      for (let i = 0; i < count; i++) {
        this.contactsElem.toggleContact(contactItem);
      }
      break;
    }
  }



  /** */
  onFileboxMenuItemSelected(menuItemName: string) {
    //const currentMailItem =  this._selectedItems[0];
    const currentMailItem =  this._currentMailItem;
    if (!currentMailItem) {
      console.warn("onFileboxMenuItemSelected() no mail selected");
      return;
    }
    /* -- Handle 'Print' -- */
    if (menuItemName === 'Print') {
      const mailItem = this.perspective.mailMap.get(encodeHashToBase64(currentMailItem.id));
      const mailText = into_mailText(this.perspective.usernameMap, mailItem!)
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
    if (menuItemName === 'Trash') {
      this._replyOf = undefined;
      this._zvm.deleteMail(currentMailItem.id)
        .then((/*maybeAh: ActionHash | null*/) => this._zvm.probeMails()) // On delete, refresh filebox
      this.fileboxElem.reset();
    }
    /* -- Handle 'Reply to sender' -- */
    if (menuItemName === 'Reply to sender') {
      this.mailWriteElem.subject = 'Re: ' + currentMailItem.subject;
      this._replyOf = currentMailItem.id;
      console.log("this._replyOf set to", encodeHashToBase64(this._replyOf));
      this.contactsElem.resetSelection();
      this.selectContact(currentMailItem.username, 1)
      this.disableSendButton(this.contactsElem.selectedContacts.length == 0);
    }

    /* -- Handle 'Reply to All' -- */
    if (menuItemName === 'Reply to all') {
      const mailItem = this.perspective.mailMap.get(encodeHashToBase64(currentMailItem.id));
      this._replyOf = currentMailItem.id;
      if (mailItem) {
        this.mailWriteElem.subject = 'Re: ' + currentMailItem.subject;
        this.contactsElem.resetSelection();
        /* TO */
        for (const agentId of mailItem.mail.to) {
          const to_username = this.perspective.usernameMap.get(encodeHashToBase64(agentId));
          this.selectContact(to_username!, 1);
        }
        /* CC */
        for (const agentId of mailItem.mail.cc) {
          const cc_username = this.perspective.usernameMap.get(encodeHashToBase64(agentId));
          this.selectContact(cc_username!, 2);
        }
        /* BCC */
        if (mailItem.bcc) {
          for (const agentId of mailItem.bcc) {
            const bcc_username = this.perspective.usernameMap.get(encodeHashToBase64(agentId));
            this.selectContact(bcc_username!, 3);
          }
        }
        /* Done */
        this.disableSendButton(this.contactsElem.selectedContacts.length == 0);
      }
    }
    /** -- Handle 'Forward' -- */
    if (menuItemName === 'Forward') {
      this.mailWriteElem.subject = 'Fwd: ' + currentMailItem.subject;
      const mailItem = this.perspective.mailMap.get(encodeHashToBase64(currentMailItem.id));
      let fwd = '\n\n';
      fwd += '> ' + 'Mail from: ' + this.perspective.usernameMap.get(encodeHashToBase64(mailItem!.author)) + ' at ' + customDateString(mailItem!.date) + '\n';
      const arrayOfLines = mailItem!.mail.payload.match(/[^\r\n]+/g);
      for (const line of arrayOfLines!) {
        fwd += '> ' + line + '\n';
      }
      this.mailWriteElem.content = fwd;
    }

    /** -- Handle 'Refresh' -- */
    if (menuItemName === 'Refresh') {
      //console.log('Refresh called');
      this._zvm.probeAll();
    }
  }


  /** */
  onMailSelected(item:any) {
    console.log('onMailSelected()', item);
    this._replyOf = undefined;
    if (!item) {
      return;
    }
    this._currentMailItem = item;
    this._zvm.acknowledgeMail(item.id);
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
        const eh = await this._zvm.writeChunk(splitObj.dataHash, i, splitObj.chunks[i]);
        chunksToSend.push(eh);
      }
      const ah = await this._zvm.writeManifest(splitObj.dataHash, file.name, filetype, file.size, chunksToSend)
      filesToSend.push(ah);
    }

    /* Get contact Lists */
    const selection = this.contactsElem.selectedContacts;
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
        case 'to': toList.push(decodeHashFromBase64(contactItem.agentIdB64)); break;
        case 'cc': ccList.push(decodeHashFromBase64(contactItem.agentIdB64)); break;
        case 'bcc': bccList.push(decodeHashFromBase64(contactItem.agentIdB64)); break;
        default: console.error('unknown recipientType');
      }
    }

    /* Create Mail */
    const mail: SendMailInput = {
      subject: this.mailWriteElem.subject,
      payload: this.mailWriteElem.content,
      reply_of: this._replyOf,
      to: toList, cc: ccList, bcc: bccList,
      manifest_address_list: filesToSend,
    };
    console.log('sending mail:', mail)
    /* Send Mail */
    const outmail_hh = await this._zvm.sendMail(mail);

    /** Clear Write UI */
    this.clearWriteMail();
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
    console.log("*** <snapmail-main>.render() ***");

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

        <!-- Vertical split between filebox and Inmail -->
        <vaadin-split-layout orientation="vertical" style="width:100%; height:50%; margin-top:0px;">
            <snapmail-filebox id="snapmailFilebox"
                    @menu-item-selected="${(e:any) => {this.onFileboxMenuItemSelected(e.detail)}}"
            ></snapmail-filebox>
            <vaadin-horizontal-layout theme="spacing-xs" style="min-height:120px; height:50%; width:100%; margin-top: 4px; flex: 1 1 100px">
              <snapmail-mail-view .inMailItem="${this._currentMailItem}" .usernameMap="${this.perspective.usernameMap}"></snapmail-mail-view>
              <snapmail-att-view .inMailItem="${this._currentMailItem}"></snapmail-att-view>
            </vaadin-horizontal-layout>
        </vaadin-split-layout>

        <!-- Horizontal split between Write and Contacts -->
        <h4 style="margin:10px 0px 0px 0px;">&#128394; Write Mail</h4>
        <vaadin-split-layout style="min-height:50px; height:100%; width:100%; margin:0px;">
          <snapmail-mail-write id="mailWrite" ></snapmail-mail-write>
          <snapmail-contacts id="snapmailContacts"></snapmail-contacts>
        </vaadin-split-layout>

        <!-- ACTION MENU BAR -->
        <div style="width:100%; display:flex;justify-content: flex-end">
            <vaadin-menu-bar id="ActionBar" theme="primary"
                             style="height:40px; margin-top:5px; margin-bottom:10px;"
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
                               @click=${() => {this.hideHandleInput(false);}}>
                    <span>${this._myHandle}</span>
                    <vaadin-icon icon="lumo:edit" slot="suffix"></vaadin-icon>
                </vaadin-button>
            </abbr>
            <!-- <vcf-tooltip id="handleDisplayTT" for="handleDisplay" position="bottom">fucking tooltip</vcf-tooltip> -->
            <vaadin-text-field id="myNewHandleInput" clear-button-visible 
                               placeholder="username"
                               @keyup="${(e:any) => {if (e.keyCode == 13) this.setUsername()}}}"
            ></vaadin-text-field>
            <vaadin-button theme="icon" id="setMyHandleButton" title="unknown" @click=${(e:any) => this.setUsername(e.detail.value)}>
                <vaadin-icon icon="lumo:checkmark" slot="prefix"></vaadin-icon>
            </vaadin-button>
            <vaadin-button theme="icon" id="cancelHandleButton" @click=${() => {this.hideHandleInput(true);}}>
                <vaadin-icon icon="lumo:cross" slot="prefix"></vaadin-icon>
            </vaadin-button>
        </div>
          
        <vaadin-menu-bar open-on-hover id="ContactsMenu" style="margin-top:2px;"></vaadin-menu-bar>
        
        <!-- Progress Bar -->
        <h3 style="margin:10px 0 5px 0;display:none;" id="sendingTitle">Sending</h3>
        <vaadin-progress-bar indeterminate value="0" id="sendProgressBar" style="margin-bottom:20px;"></vaadin-progress-bar>
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
