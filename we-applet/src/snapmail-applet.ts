import {LitElement, html, css} from "lit";
import { state, property } from "lit/decorators.js";
import {ScopedElementsMixin} from "@open-wc/scoped-elements";
import {AppWebsocket, CellId} from "@holochain/client";
import {HolochainClient} from "@holochain-open-dev/cell-client";
import {InstalledAppletInfo} from "@lightningrodlabs/we-applet";

import {SnapmailController} from "@snapmail/elements";


/** */
export class SnapmailApplet extends ScopedElementsMixin(LitElement) {

  @property()
  appWebsocket!: AppWebsocket;

  @property()
  appletAppInfo!: InstalledAppletInfo[];

  // @property()
  // profilesStore!: ProfilesStore;

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
             noTitle
             .cellId=${this._cellId}
             .hcClient=${this._hcClient}
             style="flex:1; display:flex;height: 100%;"
      ></snapmail-controller>
    `;
  }


  /** */
  static get scopedElements() {
    return {
      "snapmail-controller": SnapmailController,
    };
  }


  /** */
  static get styles() {
    return css``
  }

}
