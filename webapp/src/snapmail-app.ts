import { LitElement, html } from "lit";
import { state } from "lit/decorators.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
//import {CellId} from "@holochain/client";
import {HolochainClient} from "@holochain-open-dev/cell-client";
//import {ContextProvider} from "@lit-labs/context";
import {serializeHash} from '@holochain-open-dev/utils';
import {AppWebsocket} from "@holochain/client";
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


  /** */
  async firstUpdated() {
    /** Connect appWebsocket */
    const wsUrl = `ws://localhost:${HC_PORT}`
     const appWebsocket = await AppWebsocket.connect(wsUrl);
    console.log({appWebsocket})
    const hcClient = new HolochainClient(appWebsocket)
    /** Get appInfo */
    const installed_app_id = NETWORK_ID == null || NETWORK_ID == ''
      ? APP_ID
      : APP_ID + '-' + NETWORK_ID;
    console.log({installed_app_id})
    const appInfo = await hcClient.appWebsocket.appInfo({installed_app_id});
    const cellId  = appInfo.cell_data[0].cell_id;
    /** Send dnaHash to electron */
    if (IS_ELECTRON) {
      const ipc = window.require('electron').ipcRenderer;
      const dnaHashB64 = serializeHash(cellId[0])
      let _reply = ipc.sendSync('dnaHash', dnaHashB64);
    }
    /** Done */
    this.loaded = true;
  }


  /** */
  render() {
    console.log("snapmail-app render() called!")
    if (!this.loaded) {
      return html`<span>Loading...</span>`;
    }
    return html`
       <snapmail-controller style="background-color: white;margin:0px 3px 0px 5px; height:100%;"></snapmail-controller>
    `;
  }


  /** */
  static get scopedElements() {
    return {
      "snapmail-controller": SnapmailController,
    };
  }
}
