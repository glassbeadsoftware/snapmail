import { html } from "lit";
import { state } from "lit/decorators.js";
import {AdminWebsocket, AppWebsocket, InstalledAppId} from "@holochain/client";
import {DEFAULT_SNAPMAIL_DEF, MY_ELECTRON_API, SnapmailDvm, SnapmailPage} from "@snapmail/elements";
import {HvmDef, HappElement, cellContext} from "@ddd-qc/lit-happ";
import {ContextProvider} from '@lit-labs/context';

let HC_APP_PORT: number;
let HC_ADMIN_PORT: number;
export const IS_ELECTRON = typeof MY_ELECTRON_API !== 'undefined'
if (IS_ELECTRON) {
  const APP_ID = 'snapmail-app'
  console.log("URL =", window.location.toString())
  const searchParams = new URLSearchParams(window.location.search);
  const urlPort = searchParams.get("APP");
  if(!urlPort) {
    console.error("Missing APP value in URL", window.location.search)
  }
  HC_APP_PORT = Number(urlPort);
  const urlAdminPort = searchParams.get("ADMIN");
  HC_ADMIN_PORT = Number(urlAdminPort);
  const NETWORK_ID = searchParams.get("UID");
  console.log(NETWORK_ID);
  DEFAULT_SNAPMAIL_DEF.id = APP_ID + '-' + NETWORK_ID;  // override installed_app_id
} else {
  try {
    HC_APP_PORT = Number(process.env.HC_APP_PORT);
    HC_ADMIN_PORT = Number(process.env.HC_ADMIN_PORT);
  } catch (e) {
    console.log("process.env.HC_APP_PORT not defined")
  }
}

console.log("APP_ID =", DEFAULT_SNAPMAIL_DEF.id)
console.log("HC_APP_PORT", HC_APP_PORT);
console.log("HC_ADMIN_PORT", HC_ADMIN_PORT);
console.log("IS_ELECTRON", IS_ELECTRON);

/** */
export class SnapmailApp extends HappElement {

  @state() private _loaded = false;

  static readonly HVM_DEF: HvmDef = DEFAULT_SNAPMAIL_DEF;


  /** */
  constructor(appWs?: AppWebsocket, private _adminWs?: AdminWebsocket, appId?: InstalledAppId) {
    super(appWs? appWs : HC_APP_PORT, appId);
  }

  get snapmailDvm(): SnapmailDvm { return this.hvm.getDvm(SnapmailDvm.DEFAULT_BASE_ROLE_NAME)! as SnapmailDvm }



  /** */
  async happInitialized() {
    console.log("happInitialized()...", this.hvm.appId, this.snapmailDvm.cell.dnaHash);
    /** Provide Cell Context */
    //console.log({cell: this.snapmailDvm.cell});
    new ContextProvider(this, cellContext, this.snapmailDvm.cell);
    /** Authorize all zome calls */
    if (!this._adminWs) {
      this._adminWs = await AdminWebsocket.connect(`ws://localhost:${HC_ADMIN_PORT}`);
    }
    //console.log({ adminWs });
    await this.hvm.authorizeAllZomeCalls(this._adminWs);
    console.log("*** Zome call authorization complete");
    /** Probe */
    await this.hvm.probeAll();
    console.log("*** probeAll complete");
    /** Done */
    this._loaded = true;
  }


  /** */
  render() {
    console.log("<snapmail-app>.render()", this._loaded)
    if (!this._loaded) {
      return html`<span>Loading...</span>`;
    }
    return html`
        <snapmail-page .noTitle="${IS_ELECTRON}"></snapmail-page>
    `;
  }


  /** */
  static get scopedElements() {
    return {
      "snapmail-page": SnapmailPage,
    };
  }
}
