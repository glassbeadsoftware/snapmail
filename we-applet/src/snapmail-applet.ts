import { LitElement, html } from "lit";
import { state, property } from "lit/decorators.js";
//import {ContextProvider} from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
//import {CellId} from "@holochain/client";
import {HolochainClient} from "@holochain-open-dev/cell-client";
import {AppWebsocket, CellId} from "@holochain/client";
import {InstalledAppletInfo} from "@lightningrodlabs/we-applet";

import {SnapmailController, HC_PORT, NETWORK_ID, APP_ID} from "@snapmail/elements";


/** */
export class SnapmailApplet extends ScopedElementsMixin(LitElement) {

  @property()
  appWebsocket!: AppWebsocket;

  // @property()
  // profilesStore!: ProfilesStore;

  @property()
  appletAppInfo!: InstalledAppletInfo[];

  @state() loaded = false;

  _cellId: CellId | null = null;
  _hcClient: HolochainClient | null = null;


  /** */
  async firstUpdated() {
    this._hcClient = new HolochainClient(this.appWebsocket)
    //console.log({appletAppInfo: this.appletAppInfo})
    const appInfo = this.appletAppInfo[0].installedAppInfo
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
    console.log("snapmail-applet render() called!")
    if (!this.loaded) {
      return html`<span>Loading...</span>`;
    }
    return html`
       <snapmail-controller
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
