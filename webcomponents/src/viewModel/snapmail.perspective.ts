import {MailItem} from "../bindings/snapmail.types";
import {AgentPubKeyB64} from "@holochain/client";
import {Dictionary} from "@ddd-qc/cell-proxy";


/** */
export type SnapmailPerspective = SnapmailPerspectiveCore & SnapmailPerspectiveLive

/** */
export interface SnapmailPerspectiveLive {
  /* Map of (agentIdB64 -> timestamp of last ping) */
  pingMap: Dictionary<number>,
  /* Map of (agentIdB64 -> bool) */
  responseMap: Dictionary<boolean>,
  // /** folderName -> mailId */
  // folderMap: Dictionary<ActionHashB64>,
  /** */
  myHandle: string,
}

/** */
export interface SnapmailPerspectiveCore {
  /* agentPubKey -> username */
  usernameMap: Dictionary<string>,
  /* mailAh -> mailItem */
  mailMap: Dictionary<MailItem>,
}


export function defaultPerspective(): SnapmailPerspective {
  return {
    /** Core */
    usernameMap: {},
    mailMap:  {},
    /** Live */
    pingMap: {},
    responseMap: {},
    //folderMap: {},
    myHandle: "<unknown>",

  }
}


export interface ContactGridItem {
  status: string,
  username: string,
  recipientType: string,
  agentIdB64: AgentPubKeyB64,
}



// export interface InMailStateMat {
//   Unacknowledged?: null,
//   AckUnsent?: null,
//   AckPending?: null,
//   AckDelivered?: null,
//   Deleted?: null,
// }


// export interface DeliveryStateMat {
//   Unsent?: null,
//   Pending?: null,
//   Delivered?: null,
// }
//
//
// export interface OutMailStateMat {
//   Unsent?: null,
//   AllSent?: null,
//   AllReceived?: null,
//   AllAcknowledged?: null,
//   Deleted?: null,
// }


// //export type MailState = OutMailState | InMailState
// export interface MailStateMat {
//   In?: InMailStateMat,
//   Out?: OutMailStateMat,
// }

