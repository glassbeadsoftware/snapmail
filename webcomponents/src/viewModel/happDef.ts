import {HvmDef} from "@ddd-qc/lit-happ";
import {SnapmailDvm} from "./snapmail.dvm";

export const DEFAULT_SNAPMAIL_DEF: HvmDef = {
  id: "snapmail",
  dvmDefs: [{ctor: SnapmailDvm, isClonable: false}],
}
