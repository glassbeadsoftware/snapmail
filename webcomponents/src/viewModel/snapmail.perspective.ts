import {MailItem} from "../bindings/snapmail.types";
import {Dictionary, AgentIdMap, ActionIdMap, AgentId, ActionId} from "@ddd-qc/cell-proxy";


/** */
export type SnapmailPerspective = SnapmailPerspectiveCore & SnapmailPerspectiveLive

/** */
export interface SnapmailPerspectiveLive {
  /* Map of (agentId -> timestamp of last ping) */
  pingMap: AgentIdMap<number>,
  /* Map of (agentId -> bool) */
  responseMap: AgentIdMap<boolean>,
  // /** folderName -> mailId */
  // folderMap: Dictionary<ActionHashB64>,
  /** */
  myHandle: string,
}

/** */
export interface SnapmailPerspectiveCore {
  /* agentPubKey -> username */
  usernameMap: AgentIdMap<string>,
  /* mailAh -> mailItem */
  mailMap: ActionIdMap<MailItem>,
}


export function createNewPerspective(): SnapmailPerspective {
  return {
    /** Core */
    usernameMap: new AgentIdMap(),
    mailMap:  new ActionIdMap(),
    /** Live */
    pingMap: new AgentIdMap(),
    responseMap: new AgentIdMap(),
    //folderMap: {},
    myHandle: "<unknown>",

  }
}


export interface ContactGridItem {
  status: string,
  username: string,
  recipientType: string,
  agentId: AgentId,
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

