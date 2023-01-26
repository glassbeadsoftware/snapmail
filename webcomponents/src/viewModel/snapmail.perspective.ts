import {MailItem} from "../bindings/snapmail.types";
import {AgentPubKeyB64} from "@holochain/client";
import {Dictionary} from "@ddd-qc/cell-proxy";

export type UsernameMap = Dictionary<string>;

/** */
export interface SnapmailPerspective {
  /* Map of (agentIdB64 -> username) */
  usernameMap: UsernameMap,
  /* Map of (agentIdB64 -> timestamp of last ping) */
  pingMap: Dictionary<number>,
  /* Map of (agentIdB64 -> bool) */
  responseMap: Dictionary<boolean>,
  /* Map of (mailId -> mailItem) */
  mailMap: Dictionary<MailItem>,
  // /** folderName -> mailId */
  // folderMap: Dictionary<ActionHashB64>,
  /** */
  myHandle: string,
}


export function defaultPerspective(): SnapmailPerspective {
  return {
    usernameMap: {},
    pingMap: {},
    responseMap: {},
    mailMap:  {},
    //folderMap: {},
    myHandle: "<unknown>",
  }
}


export interface InMailState {
  Unacknowledged?: null,
  AckUnsent?: null,
  AckPending?: null,
  AckDelivered?: null,
  Deleted?: null,
}


export interface DeliveryState {
  Unsent?: null,
  Pending?: null,
  Delivered?: null,
}


export interface OutMailState {
  Unsent?: null,
  AllSent?: null,
  AllReceived?: null,
  AllAcknowledged?: null,
  Deleted?: null,
}


//export type MailState = OutMailState | InMailState
export interface MailState {
  In?: InMailState,
  Out?: OutMailState,
}


export interface ContactGridItem {
  status: string,
  username: string,
  recipientType: string,
  agentIdB64: AgentPubKeyB64,
}
