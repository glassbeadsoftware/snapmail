import { LitElement, html } from "lit";
import { state } from "lit/decorators.js";
//import {ContextProvider} from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
//import {CellId} from "@holochain/client";
import {HolochainClient} from "@holochain-open-dev/cell-client";
import {serializeHash} from '@holochain-open-dev/utils';
import {AppWebsocket, CellId} from "@holochain/client";
import {SnapmailController} from "@snapmail/elements";


let APP_ID = 'snapmail'
let HC_PORT:any = process.env.HC_PORT;
let NETWORK_ID: any = null
export const IS_ELECTRON = (window.location.port === ""); // No HREF PORT when run by Electron
if (IS_ELECTRON) {
  APP_ID = 'main-app'
  let searchParams = new URLSearchParams(window.location.search);
  HC_PORT = searchParams.get("PORT");
  NETWORK_ID = searchParams.get("UID");
  console.log(NETWORK_ID)
}

// FIXME
//const HC_PORT = process.env.HC_PORT
//const HC_PORT = 8889
console.log("HC_PORT = " + HC_PORT + " || " + process.env.HC_PORT);


/** */
export class SnapmailApp extends ScopedElementsMixin(LitElement) {

  @state() loaded = false;

  _cellId: CellId | null = null;
  _hcClient: HolochainClient | null = null;

  /** */
  async firstUpdated() {
    /** Connect appWebsocket */
    const wsUrl = `ws://localhost:${HC_PORT}`
     const appWebsocket = await AppWebsocket.connect(wsUrl);
    console.log({appWebsocket})
    this._hcClient = new HolochainClient(appWebsocket)
    /** Get appInfo */
    const installed_app_id = NETWORK_ID == null || NETWORK_ID == ''
      ? APP_ID
      : APP_ID + '-' + NETWORK_ID;
    console.log({installed_app_id})
    const appInfo = await this._hcClient.appWebsocket.appInfo({installed_app_id});
    this._cellId  = appInfo.cell_data[0].cell_id;
    /** Send dnaHash to electron */
    if (IS_ELECTRON) {
      const ipc = window.require('electron').ipcRenderer;
      const dnaHashB64 = serializeHash(this._cellId[0])
      /*let _reply =*/ ipc.sendSync('dnaHash', dnaHashB64);
    }
    /** Done */
    this.loaded = true;
  }

  // /** Don't shadowRoot */
  // protected createRenderRoot(): Element | ShadowRoot {
  //   return this;
  // }

  /** */
  render() {
    console.log("snapmail-app render() called!")
    if (!this.loaded) {
      return html`<span>Loading...</span>`;
    }
    return html`
       <snapmail-controller 
               style="background-color: white;margin:0px 3px 0px 5px; height:100%;"
               .cellId=${this._cellId}
               .hcClient=${this._hcClient}
       ></snapmail-controller>
    `;
  }


  /** */
  static get scopedElements() {
    return {
      "snapmail-controller": SnapmailController,
    };
  }
}
