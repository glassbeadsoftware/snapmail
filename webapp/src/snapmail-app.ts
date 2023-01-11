import { html } from "lit";
import { state } from "lit/decorators.js";
import {encodeHashToBase64} from "@holochain/client";
import {DEFAULT_SNAPMAIL_DEF, SnapmailDvm, SnapmailPage} from "@snapmail/elements";
import {HvmDef, HappElement} from "@ddd-qc/lit-happ";

let HC_APP_PORT: number = Number(process.env.HC_PORT);

export const IS_ELECTRON = (window.location.port === ""); // No HREF PORT when run by Electron
if (IS_ELECTRON) {
  const APP_ID = 'snapmail-app'
  const searchParams = new URLSearchParams(window.location.search);
  const urlPort = searchParams.get("PORT");
  if(!urlPort) {
    console.error("Missing PORT value in URL", window.location.search)
  }
  HC_APP_PORT = Number(urlPort);
  const NETWORK_ID = searchParams.get("UID");
  console.log(NETWORK_ID);
  DEFAULT_SNAPMAIL_DEF.id = APP_ID + '-' + NETWORK_ID;  // override installed_app_id
}

console.log({APP_ID: DEFAULT_SNAPMAIL_DEF.id})
console.log({HC_APP_PORT})


/** */
export class SnapmailApp extends HappElement {

  @state() private _loaded = false;

  static readonly HVM_DEF: HvmDef = DEFAULT_SNAPMAIL_DEF;

  constructor() {
    super(HC_APP_PORT);
  }

  get snapmailDvm(): SnapmailDvm { return this.hvm.getDvm(SnapmailDvm.DEFAULT_BASE_ROLE_NAME)! as SnapmailDvm }


  // /** */
  // async firstUpdated() {
  //   /** Connect appWebsocket */
  //   const wsUrl = `ws://localhost:${HC_PORT}`
  //    const appWebsocket = await AppWebsocket.connect(wsUrl);
  //   console.log({appWebsocket})
  //   this._hcClient = new HolochainClient(appWebsocket)
  //   /** Get appInfo */
  //   const installed_app_id = NETWORK_ID == null || NETWORK_ID == ''
  //     ? APP_ID
  //     : APP_ID + '-' + NETWORK_ID;
  //   console.log({installed_app_id})
  //   const appInfo = await this._hcClient.appWebsocket.appInfo({installed_app_id});
  //   console.log({appInfo})
  //   this._cellId  = appInfo.cell_data[0].cell_id;
  //   /** Done */
  //   this._loaded = true;
  // }

  /** */
  async happInitialized() {
    console.log("happInitialized()")
    //new ContextProvider(this, cellContext, this.taskerDvm.installedCell);
    //this._cellId = this.snapmailDvm.installedCell.cell_id;
    await this.hvm.probeAll();

    /** Send dnaHash to electron */
    if (IS_ELECTRON) {
      const ipc = window.require('electron').ipcRenderer;
      const dnaHashB64 = encodeHashToBase64(this.snapmailDvm.cellId[0])
      let _reply = ipc.sendSync('dnaHash', dnaHashB64);
    }

    /** Done */
    this._loaded = true;
  }



  /** */
  render() {
    console.log("<snapmail-app>.render()")
    if (!this._loaded) {
      return html`<span>Loading...</span>`;
    }
    return html`
       <cell-context .cell="${this.snapmailDvm.cell}">
           <snapmail-page></snapmail-page>
       </cell-context>
    `;
  }


  /** */
  static get scopedElements() {
    return {
      "snapmail-page": SnapmailPage,
    };
  }
}
