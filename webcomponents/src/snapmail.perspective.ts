
import { ActionHash, AgentPubKey, EntryHash } from '@holochain/client';
import {Mail} from "./bindings/snapmail";

export type UsernameMap = Map<string, string>;


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

export interface MailItemMat {
  ah: ActionHash,
  /** OutMail = reply_of ; InMail = reply */
  reply?: ActionHash,
  reply_of?: ActionHash,
  author: AgentPubKey,
  mail: Mail,
  state: MailState,
  // pub delivery_states: Map<AgentPubKey, DeliveryState>
  bcc?: AgentPubKey[],
  date: number,
  status?: string,
}



export interface ContactGridItem {
  status: string,
  username: string,
  recipientType: string,
  agentIdB64: string,
}


export interface MailGridItem {
  id: Uint8Array,
  status: string,
  username: string,
  subject: string,
  date: string,
  attachment: string,
}
