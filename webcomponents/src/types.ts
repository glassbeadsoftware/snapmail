
import { ActionHash, AgentPubKey, EntryHash } from '@holochain/client';

export type UsernameMap = Map<string, string>;

export interface HandleItem {
  name: string,
  agentId: AgentPubKey,
  handle_eh: EntryHash,
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

export interface MailItem {
  ah: ActionHash,
  /** OutMail = reply_of ; InMail = reply */
  reply?: ActionHash | null,
  reply_of?: ActionHash | null,
  author: AgentPubKey,
  mail: Mail,
  state: MailState,
  // pub delivery_states: Map<AgentPubKey, DeliveryState>
  bcc?: AgentPubKey[],
  date: number,
  status?: string,
}


export interface Mail {
  date_sent: number,
  subject: string,
  payload: string,
  to: AgentPubKey[],
  cc: AgentPubKey[],
  attachments: AttachmentInfo[],
}


export interface AttachmentInfo {
  manifest_eh: EntryHash,
  data_hash: string,
  filename: string,
  filetype: string,
  orig_filesize: number,
}


export interface SendMailInput {
  subject: string,
  payload: string,
  reply_of: ActionHash | null,
  to: Uint8Array[],
  cc: Uint8Array[],
  bcc: Uint8Array[],
  manifest_address_list: ActionHash[],
}


export interface FileManifest {
  data_hash: string,
  filename: string,
  filetype: string,
  orig_filesize: number,
  chunks: EntryHash[],
  content?: string
}


export interface FileChunk {
  data_hash: string,
  chunk_index: number,
  chunk: string,
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
