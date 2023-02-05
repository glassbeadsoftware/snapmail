import { html } from "lit";
import { state } from "lit/decorators.js";
import {AdminWebsocket, AppWebsocket, getSigningCredentials, InstalledAppId} from "@holochain/client";
import {DEFAULT_SNAPMAIL_DEF, MY_ELECTRON_API, SnapmailDvm, SnapmailPage} from "@snapmail/elements";
import {HvmDef, HappElement, cellContext} from "@ddd-qc/lit-happ";
import {ContextProvider} from '@lit-labs/context';

let HC_APP_PORT: number;
let HC_ADMIN_PORT: number;
export const IS_ELECTRON = (window.location.port === ""); // No HREF PORT when run by Electron
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
  HC_APP_PORT = Number(process.env.HC_APP_PORT);
  HC_ADMIN_PORT = Number(process.env.HC_ADMIN_PORT);
}

console.log("APP_ID =", DEFAULT_SNAPMAIL_DEF.id)
console.log("HC_APP_PORT", HC_APP_PORT);
console.log("HC_ADMIN_PORT", HC_ADMIN_PORT);

/** */
export class SnapmailApp extends HappElement {

  @state() private _loaded = false;

  static readonly HVM_DEF: HvmDef = DEFAULT_SNAPMAIL_DEF;

  private _adminWs;

  // constructor() {
  //   super(HC_APP_PORT);
  // }

  /** */
  constructor(socket?: AppWebsocket, appId?: InstalledAppId) {
    super(socket? socket : HC_APP_PORT, appId);
  }

  get snapmailDvm(): SnapmailDvm { return this.hvm.getDvm(SnapmailDvm.DEFAULT_BASE_ROLE_NAME)! as SnapmailDvm }



  /** */
  async happInitialized() {
    console.log("happInitialized()...", this.hvm.appId, this.snapmailDvm.cell.dnaHash);
    /** Provide Cell Context */
    //console.log({cell: this.snapmailDvm.cell});
    new ContextProvider(this, cellContext, this.snapmailDvm.cell);
    /** Authorize all zome calls */
    this._adminWs = await AdminWebsocket.connect(`ws://localhost:${HC_ADMIN_PORT}`);
    //console.log({ adminWs });
    await this.hvm.authorizeAllZomeCalls(this._adminWs);
    await this._adminWs.authorizeSigningCredentials(this.snapmailDvm.cell.id);
    console.log("*** Zome call authorization complete");
    /** Probe */
    await this.hvm.probeAll();
    /** Send dnaHash to electron */
    if (IS_ELECTRON) {
      let _reply = MY_ELECTRON_API.dnaHashSync(this.snapmailDvm.cell.dnaHash);
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
