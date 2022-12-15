import { LitElement, html } from "lit";
import { state } from "lit/decorators.js";
//import {ContextProvider} from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
//import {CellId} from "@holochain/client";
import {HolochainClient} from "@holochain-open-dev/cell-client";
import {AppWebsocket, CellId} from "@holochain/client";
import {SnapmailPage, HC_PORT, ELECTRON_API, NETWORK_ID, APP_ID} from "@snapmail/elements";

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
    console.log({appInfo})
    this._cellId  = appInfo.cell_data[0].cell_id;
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
       <snapmail-page
               .cellId=${this._cellId}
               .hcClient=${this._hcClient}
       ></snapmail-page>
    `;
  }


  /** */
  static get scopedElements() {
    return {
      "snapmail-page": SnapmailPage,
    };
  }
}
