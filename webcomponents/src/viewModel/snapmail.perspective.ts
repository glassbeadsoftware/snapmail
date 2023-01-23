import { MailItem} from "../bindings/snapmail.types";
import {ActionHashB64, AgentPubKey, AgentPubKeyB64} from "@holochain/client";

export type UsernameMap = Map<string, string>;

// FIXME
export interface SnapmailPerspective {
  /* Map of (agentIdB64 -> username) */
  usernameMap: UsernameMap,
  /* Map of (agentIdB64 -> timestamp of last ping) */
  pingMap: Map<string, number>,
  /* Map of (agentIdB64 -> bool) */
  responseMap: Map<string, boolean>,
  /* Map of (mailId -> mailItem) */
  mailMap: Map<ActionHashB64, MailItem>,
  /** folderName -> mailId */
  folderMap: Map<string, string>,
  /** */
  myHandle: string,
}


export function defaultPerspective(): SnapmailPerspective {
  return {
    usernameMap: new Map(),
    pingMap: new Map(),
    responseMap: new Map(),
    mailMap:  new Map(),
    folderMap: new Map(),
    myHandle: "<noname>",
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


export interface MailGridItem {
  id: ActionHashB64,
  status: string,
  username: string,
  subject: string,
  date: string,
  attachment: string,
}
