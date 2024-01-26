import { html } from "lit";
import { state, customElement } from "lit/decorators.js";
import {ContextProvider} from '@lit/context';
import {AdminWebsocket, AppWebsocket, InstalledAppId} from "@holochain/client";
import {DEFAULT_SNAPMAIL_DEF, IS_ELECTRON, SnapmailDvm, weClientContext} from "@snapmail/elements";
import {HvmDef, HappElement, cellContext} from "@ddd-qc/lit-happ";
import {AppletHash, AppletView, WeServices} from "@lightningrodlabs/we-applet";


const SNAPMAIL_DEFAULT_COORDINATOR_ZOME_NAME = "snapmail"

let HC_APP_PORT: number;
let HC_ADMIN_PORT: number;

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
    console.log("HC_APP_PORT not defined")
  }
}

//console.log("      HAPP_ID =", DEFAULT_SNAPMAIL_DEF.id)
console.log("  HC_APP_PORT =", HC_APP_PORT);
console.log("HC_ADMIN_PORT =", HC_ADMIN_PORT);
//console.log("  IS_ELECTRON =", IS_ELECTRON);


/** */
@customElement("snapmail-app")
export class SnapmailApp extends HappElement {

  /** */
  constructor(appWs?: AppWebsocket,
              private _adminWs?: AdminWebsocket,
              private _canAuthorizeZfns?: boolean,
              readonly appId?: InstalledAppId,
              public appletView?: AppletView,
              private _weServices?: WeServices,
              private _appletHash?: AppletHash,
              private _startingNickname?: string,
  ) {
    super(appWs? appWs : HC_APP_PORT, appId);
    console.log("<snapmail-app> ctor", appId, appWs);
    if (_canAuthorizeZfns == undefined) {
      this._canAuthorizeZfns = true;
    }
    if (_weServices) {
      console.log(`\t\tProviding context "${weClientContext}" | in host `, _weServices, this);
      new ContextProvider(this, weClientContext, _weServices);
    }
  }


  static readonly HVM_DEF: HvmDef = DEFAULT_SNAPMAIL_DEF;

  @state() private _loaded = false;
  @state() private _hasHolochainFailed = true;


  get snapmailDvm(): SnapmailDvm { return this.hvm.getDvm(SnapmailDvm.DEFAULT_BASE_ROLE_NAME)! as SnapmailDvm }


  /** -- Methods -- */

  /** */
  async hvmConstructed() {
    console.log("hvmConstructed()", this._adminWs, this._canAuthorizeZfns)

    /** Authorize all zome calls */
    if (!this._adminWs && this._canAuthorizeZfns) {
      this._adminWs = await AdminWebsocket.connect(new URL(`ws://localhost:${HC_ADMIN_PORT}`));
      console.log("hvmConstructed() connect() called", this._adminWs);
    }
    if (this._adminWs && this._canAuthorizeZfns) {
      await this.hvm.authorizeAllZomeCalls(this._adminWs);
      console.log("*** Zome call authorization complete");
    } else {
      if (!this._canAuthorizeZfns) {
        console.warn("No adminWebsocket provided (Zome call authorization done)")
      } else {
        console.log("Zome call authorization done externally")
      }
    }

    /** Probe EntryDefs */
    const allAppEntryTypes = await this.snapmailDvm.fetchAllEntryDefs();
    console.log("happInitialized(), allAppEntryTypes", allAppEntryTypes);
    console.log(`${SNAPMAIL_DEFAULT_COORDINATOR_ZOME_NAME} entries`, allAppEntryTypes[SNAPMAIL_DEFAULT_COORDINATOR_ZOME_NAME]);
    if (allAppEntryTypes[SNAPMAIL_DEFAULT_COORDINATOR_ZOME_NAME].length == 0) {
      console.warn(`No entries found for ${SNAPMAIL_DEFAULT_COORDINATOR_ZOME_NAME}`);
    } else {
      this._hasHolochainFailed = false;
    }

    /** Provide Cell Context */
    //console.log({cell: this.snapmailDvm.cell});
    new ContextProvider(this, cellContext, this.snapmailDvm.cell);
  }


  /** */
  //async perspectiveInitializedOffline(): Promise<void> {}


  /** */
  async perspectiveInitializedOnline(): Promise<void> {
    console.log("<snapmail-app>.perspectiveInitializedOnline()");
    await this.hvm.probeAll();
    console.log("*** probeAll complete");
    this._loaded = true;
  }


  /** */
  shouldUpdate(): boolean {
    const canUpdate = super.shouldUpdate();
    console.log("<snapmail-app>.shouldUpdate()", canUpdate/*, this._offlinePerspectiveloaded*/);
    /** Wait for offlinePerspective */
    return canUpdate /*&& this._offlinePerspectiveloaded*/;
  }


  /** */
  render() {
    console.log("<snapmail-app>.render()", this._loaded)
    if (!this._loaded) {
      return html`<span>Loading...</span>`;
    }
    if(this._hasHolochainFailed) {
      return html`<div style="width: auto; height: auto; font-size: 4rem;">
        ${"Failed to connect to Holochain Conductor and/or \"Snapmail\" cell."};
      </div>
      `;
    }

    if (this._weServices) {

    }

    /** render page */
    return html`<snapmail-page .noTitle="${IS_ELECTRON}" .startingNickname=${this._startingNickname}></snapmail-page>`;
    //return html`<h1>HI MOM</h1>`;
  }

}
