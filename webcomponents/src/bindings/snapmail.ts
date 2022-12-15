/* This file is generated by zits. Do not edit manually */

import {
/** Types */
HoloHash,
AgentPubKey,
DnaHash,
WasmHash,
EntryHash,
ActionHash,
AnyDhtHash,
KitsuneAgent,
KitsuneSpace,
InstalledAppId,
Signature,
CellId,
DnaProperties,
RoleId,
InstalledCell,
Timestamp,
HoloHashed,
/** Action */
SignedActionHashed,
ActionHashed,
ActionType,
Action,
NewEntryAction,
Dna,
AgentValidationPkg,
InitZomesComplete,
CreateLink,
DeleteLink,
OpenChain,
CloseChain,
Update,
Delete,
Create,
/** Capabilities */
CapSecret,
CapClaim,
ZomeCallCapGrant,
CapAccess,
CapGrant,
/** CounterSigning */
//CounterSigningSessionData,
//PreflightRequest,
//CounterSigningSessionTimes,
//ActionBase,
//CounterSigningAgents,
//PreflightBytes,
//Role,
//CountersigningAgentState,
/** DhtOps */
DhtOpType,
DhtOp,
getDhtOpType,
getDhtOpAction,
getDhtOpEntry,
getDhtOpSignature,
/** Entry */
EntryVisibility,
AppEntryType,
EntryType,
EntryContent,
Entry,
/** Record */
Record,
RecordEntry,
/** admin types */
ZomeName,
MembraneProof,
ZomeDefinition,
IntegrityZome,
CoordinatorZome,
DnaDefinition,
ResourceBytes,
ResourceMap,
CellProvisioning,
HoloHashB64,
DnaVersionSpec,
DnaVersionFlexible,
NetworkSeed,
ZomeLocation,
   } from '@holochain/client';

import {
// Common
Dictionary,
EntryHashB64,
ActionHashB64,
DhtOpHashB64,
DnaHashB64,
AgentPubKeyB64,
AnyDhtHashB64,
DhtOpHash,
// DnaFile
DnaFile,
DnaDef,
Zomes,
WasmCode,
// entry-details
EntryDetails,
RecordDetails,
Details,
DetailsType,
EntryDhtStatus,
// Validation
ValidationStatus,
ValidationReceipt,
   } from '@holochain-open-dev/core-types';

export interface DmPacket {
  from: AgentPubKey
  dm: DirectMessageProtocol
}

export enum DirectMessageProtocolType {
	Failure = 'Failure',
	Success = 'Success',
	Mail = 'Mail',
	Ack = 'Ack',
	Chunk = 'Chunk',
	FileManifest = 'FileManifest',
	RequestChunk = 'RequestChunk',
	RequestManifest = 'RequestManifest',
	UnknownEntry = 'UnknownEntry',
	Ping = 'Ping',
}
export type DirectMessageProtocolVariantFailure = {failure: string}
export type DirectMessageProtocolVariantSuccess = {success: string}
export type DirectMessageProtocolVariantMail = {mail: MailMessage}
export type DirectMessageProtocolVariantAck = {ack: AckMessage}
export type DirectMessageProtocolVariantChunk = {chunk: FileChunk}
export type DirectMessageProtocolVariantFileManifest = {fileManifest: FileManifest}
export type DirectMessageProtocolVariantRequestChunk = {requestChunk: EntryHash}
export type DirectMessageProtocolVariantRequestManifest = {requestManifest: EntryHash}
export type DirectMessageProtocolVariantUnknownEntry = {unknownEntry: null}
export type DirectMessageProtocolVariantPing = {ping: null}
export type DirectMessageProtocol = 
 | DirectMessageProtocolVariantFailure | DirectMessageProtocolVariantSuccess | DirectMessageProtocolVariantMail | DirectMessageProtocolVariantAck | DirectMessageProtocolVariantChunk | DirectMessageProtocolVariantFileManifest | DirectMessageProtocolVariantRequestChunk | DirectMessageProtocolVariantRequestManifest | DirectMessageProtocolVariantUnknownEntry | DirectMessageProtocolVariantPing;

export interface MailMessage {
  mail: Mail
  outmail_eh: EntryHash
  mail_signature: Signature
}

export interface AckMessage {
  outmail_eh: EntryHash
  ack_signature: Signature
}

export type FindManifestOutput = FileManifest | null;

export type ZomeManifestVec = FileManifest[];

export interface GetMissingAttachmentsInput {
  from: AgentPubKey
  inmail_ah: ActionHash
}

export interface GetMissingChunksInput {
  from: AgentPubKey
  manifest_eh: EntryHash
}

export interface WriteManifestInput {
  data_hash: string
  filename: string
  filetype: string
  orig_filesize: number
  chunks: EntryHash[]
}

export interface HandleItem {
  name: string
  agentId: AgentPubKey
  handle_eh: EntryHash
}

export interface CommitPendingAckInput {
  outack_eh: EntryHash
  outmail_eh: EntryHash
  original_sender: AgentPubKey
}

export type DeleteMailOutput = ActionHash | null;

export type GetMailOutput = InMail | OutMail | null;

export interface SendMailInput {
  subject: string
  payload: string
  reply_of?: ActionHash
  to: AgentPubKey[]
  cc: AgentPubKey[]
  bcc: AgentPubKey[]
  manifest_address_list: ActionHash[]
}

export interface CommitPendingMailInput {
  mail: PendingMail
  outmail_eh: EntryHash
  destination: AgentPubKey
}

export enum SignalProtocolType {
	ReceivedMail = 'ReceivedMail',
	ReceivedAck = 'ReceivedAck',
	ReceivedFile = 'ReceivedFile',
}
export type SignalProtocolVariantReceivedMail = {receivedMail: MailItem}
export type SignalProtocolVariantReceivedAck = {receivedAck: ReceivedAck}
export type SignalProtocolVariantReceivedFile = {receivedFile: FileManifest}
export type SignalProtocol = 
 | SignalProtocolVariantReceivedMail | SignalProtocolVariantReceivedAck | SignalProtocolVariantReceivedFile;

export interface ReceivedAck {
  from: AgentPubKey
  for_mail: ActionHash
}

/** Entry representing a file chunk. */
export interface FileChunk {
  data_hash: string
  chunk_index: number
  chunk: string
}

/**
 * Entry representing a file in chunks.
 * All chunks must be committed beforehand.
 */
export interface FileManifest {
  data_hash: string
  filename: string
  filetype: string
  orig_filesize: number
  chunks: EntryHash[]
  content?: string
}

/** Entry representing the username of an Agent */
export interface Handle {
  name: string
}

export enum SnapmailEntryType {
	PubEncKey = 'PubEncKey',
	Handle = 'Handle',
	InMail = 'InMail',
	OutMail = 'OutMail',
	OutAck = 'OutAck',
	InAck = 'InAck',
	PendingMail = 'PendingMail',
	PendingAck = 'PendingAck',
	DeliveryConfirmation = 'DeliveryConfirmation',
	FileChunk = 'FileChunk',
	FileManifest = 'FileManifest',
}
export type SnapmailEntryVariantPubEncKey = {pubEncKey: PubEncKey}
export type SnapmailEntryVariantHandle = {handle: Handle}
export type SnapmailEntryVariantInMail = {inMail: InMail}
export type SnapmailEntryVariantOutMail = {outMail: OutMail}
export type SnapmailEntryVariantOutAck = {outAck: OutAck}
export type SnapmailEntryVariantInAck = {inAck: InAck}
export type SnapmailEntryVariantPendingMail = {pendingMail: PendingMail}
export type SnapmailEntryVariantPendingAck = {pendingAck: PendingAck}
export type SnapmailEntryVariantDeliveryConfirmation = {deliveryConfirmation: DeliveryConfirmation}
export type SnapmailEntryVariantFileChunk = {fileChunk: FileChunk}
export type SnapmailEntryVariantFileManifest = {fileManifest: FileManifest}
export type SnapmailEntry = 
 | SnapmailEntryVariantPubEncKey | SnapmailEntryVariantHandle | SnapmailEntryVariantInMail | SnapmailEntryVariantOutMail | SnapmailEntryVariantOutAck | SnapmailEntryVariantInAck | SnapmailEntryVariantPendingMail | SnapmailEntryVariantPendingAck | SnapmailEntryVariantDeliveryConfirmation | SnapmailEntryVariantFileChunk | SnapmailEntryVariantFileManifest;

/** List of all Link kinds handled by this Zome */
export type LinkKind =
  | "Members" | "AckInbox" | "MailInbox" | "Handle" | "Pending" | "Pendings" | "EncKey";

/** Entry for a received Acknowledgement Receipt */
export interface DeliveryConfirmation {
  /** EntryHash to OutMail or OutAck on same chain */
  package_eh: EntryHash
  recipient: AgentPubKey
}

/** Entry for a received Acknowledgement Receipt */
export interface InAck {
  outmail_eh: EntryHash
  from: AgentPubKey
  /** Signed outmail_eh */
  from_signature: Signature
}

/** Entry representing a received mail. */
export interface InMail {
  mail: Mail
  date_received: number
  outmail_eh: EntryHash
  from: AgentPubKey
  from_signature: Signature
}

/** Possible states of an InMail entry */
export type InMailState =
  | "Unacknowledged" | "AckUnsent" | "AckPending" | "AckDelivered" | "Deleted";

/** State of a single delivery of a mail or ack to a unique recipient */
export type DeliveryState =
  | "Unsent" | "Pending" | "Delivered";

/** Possible states of an OutMail entry */
export type OutMailState =
  | "Unsent" | "AllSent" | "AllReceived" | "AllAcknowledged" | "Deleted";

export enum MailStateType {
	In = 'In',
	Out = 'Out',
}
export type MailStateVariantIn = {in: InMailState}
export type MailStateVariantOut = {out: OutMailState}
export type MailState = 
 | MailStateVariantIn | MailStateVariantOut;

export interface MailItem {
  ah: ActionHash
  reply?: ActionHash
  author: AgentPubKey
  mail: Mail
  state: MailState
  bcc: AgentPubKey[]
  date: number
}

export type RecipientKind =
  | "TO" | "CC" | "BCC";

/**
 * Core content of all *Mail Entries
 * Mail can have Zero public recipient (but must have at least one public or private recipient)
 */
export interface Mail {
  date_sent: number
  subject: string
  payload: string
  to: AgentPubKey[]
  cc: AgentPubKey[]
  attachments: AttachmentInfo[]
}

/** Metadata for a mail attachment */
export interface AttachmentInfo {
  manifest_eh: EntryHash
  data_hash: string
  filename: string
  filetype: string
  orig_filesize: number
}

/** Entry for an Acknowledgement Receipt of a Mail authored by this agent */
export interface OutAck {
  inmail_eh: EntryHash
}

/** Entry representing an authored mail. It is private. */
export interface OutMail {
  mail: Mail
  reply_of?: ActionHash
  bcc: AgentPubKey[]
}

/** Entry representing an AcknowldegmentReceipt on the DHT waiting to be received */
export interface PendingAck {
  outmail_eh: EntryHash
  /** Signed outmail_eh */
  from_signature: Signature
}

/**
 * Entry representing a mail on the DHT waiting to be received by recipient.
 * The recipient is the agentId where the entry is linked from.
 * The mail is encrypted with the recipient's public encryption key.
 */
export interface PendingMail {
  encrypted_mail: unknown
  outmail_eh: EntryHash
  from_signature: Signature
}

/** Entry representing the Public Encryption Key of an Agent */
export interface PubEncKey {
  value: Uint8Array
}
