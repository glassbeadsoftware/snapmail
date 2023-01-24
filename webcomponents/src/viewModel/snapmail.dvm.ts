import { DnaViewModel, ZvmDef } from "@ddd-qc/lit-happ";
import {AppSignalCb} from "@holochain/client";
import {SnapmailZvm} from "./snapmail.zvm";
import {AppSignal} from "@holochain/client/lib/api/app/types";


/**
 * TODO: Make a "passthrough" DVM generator in dna-client based on ZVM_DEFS
 */
export class SnapmailDvm extends DnaViewModel {

  /** -- DnaViewModel Interface -- */

  static readonly DEFAULT_BASE_ROLE_NAME = "rSnapmail";
  static readonly ZVM_DEFS: ZvmDef[] = [SnapmailZvm];

  readonly signalHandler?: AppSignalCb = this.handleSignal;
  _hostHandler?: AppSignalCb;


  /** QoL Helpers */
  get snapmailZvm(): SnapmailZvm {return this.getZomeViewModel(SnapmailZvm.DEFAULT_ZOME_NAME) as SnapmailZvm}


  /** -- ViewModel Interface -- */

  // TODO
  protected hasChanged(): boolean {return true}

  // TODO
  get perspective(): void {return}


  /** Forward signal to runtime defined host callback */
  handleSignal(signal: AppSignal): void {
    //console.log("SnapmailDvm.handleSignal()", this._hostHandler);
    if (this._hostHandler) {
      this._hostHandler(signal)
    }
  }

  /** */
  setSignalHandler(cb: AppSignalCb): void {
    this._hostHandler = cb;
  }

}
