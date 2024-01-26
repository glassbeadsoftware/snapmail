/* This file is generated by zits. Do not edit manually */

import {
/** types.ts */
HoloHash,
AgentPubKey,
DnaHash,
WasmHash,
EntryHash,
ActionHash,
AnyDhtHash,
ExternalHash,
KitsuneAgent,
KitsuneSpace,
HoloHashB64,
AgentPubKeyB64,
DnaHashB64,
WasmHashB64,
EntryHashB64,
ActionHashB64,
AnyDhtHashB64,
InstalledAppId,
Signature,
CellId,
DnaProperties,
RoleName,
InstalledCell,
Timestamp,
Duration,
HoloHashed,
NetworkInfo,
FetchPoolInfo,
/** hdk/action.ts */
SignedActionHashed,
RegisterAgentActivity,
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
/** hdk/capabilities.ts */
CapSecret,
CapClaim,
GrantedFunctionsType,
GrantedFunctions,
ZomeCallCapGrant,
CapAccessType,
CapAccess,
CapGrant,
///** hdk/countersigning.ts */
//CounterSigningSessionData,
//PreflightRequest,
//CounterSigningSessionTimes,
//ActionBase,
//CounterSigningAgents,
//PreflightBytes,
//Role,
//CountersigningAgentState,
/** hdk/dht-ops.ts */
DhtOpType,
DhtOp,
getDhtOpType,
getDhtOpAction,
getDhtOpEntry,
getDhtOpSignature,
/** hdk/entry.ts */
EntryVisibility,
AppEntryDef,
EntryType,
EntryContent,
Entry,
/** hdk/record.ts */
Record as HcRecord,
RecordEntry as HcRecordEntry,
/** hdk/link.ts */
AnyLinkableHash,
ZomeIndex,
LinkType,
LinkTag,
RateWeight,
RateBucketId,
RateUnits,
Link,
/** api/admin/types.ts */
InstalledAppInfoStatus,
DeactivationReason,
DisabledAppReason,
StemCell,
ProvisionedCell,
ClonedCell,
CellType,
CellInfo,
AppInfo,
MembraneProof,
FunctionName,
ZomeName,
ZomeDefinition,
IntegrityZome,
CoordinatorZome,
DnaDefinition,
ResourceBytes,
ResourceMap,
CellProvisioningStrategy,
CellProvisioning,
DnaVersionSpec,
DnaVersionFlexible,
AppRoleDnaManifest,
AppRoleManifest,
AppManifest,
AppBundle,
AppBundleSource,
NetworkSeed,
ZomeLocation,
   } from '@holochain/client';

import {
/** Common */
DhtOpHashB64,
//DnaHashB64, (duplicate)
//AnyDhtHashB64, (duplicate)
DhtOpHash,
/** DnaFile */
DnaFile,
DnaDef,
Zomes,
WasmCode,
/** entry-details */
EntryDetails,
RecordDetails,
Details,
DetailsType,
EntryDhtStatus,
/** Validation */
ValidationStatus,
ValidationReceipt,
   } from '@holochain-open-dev/core-types';

export const REMOTE_ENDPOINT = "receive_dm";

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
export type DirectMessageProtocolVariantFailure = {Failure: string}
export type DirectMessageProtocolVariantSuccess = {Success: string}
export type DirectMessageProtocolVariantMail = {Mail: MailMessage}
export type DirectMessageProtocolVariantAck = {Ack: AckMessage}
export type DirectMessageProtocolVariantChunk = {Chunk: FileChunk}
export type DirectMessageProtocolVariantFileManifest = {FileManifest: FileManifest}
export type DirectMessageProtocolVariantRequestChunk = {RequestChunk: EntryHash}
export type DirectMessageProtocolVariantRequestManifest = {RequestManifest: EntryHash}
export type DirectMessageProtocolVariantUnknownEntry = {UnknownEntry: null}
export type DirectMessageProtocolVariantPing = {Ping: null}
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
  username: string
  agent_pub_key: AgentPubKey
  handle_eh: EntryHash
}

export interface CommitPendingAckInput {
  outack_eh: EntryHash
  outmail_eh: EntryHash
  original_sender: AgentPubKey
}

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

/** Listing all Holochain Path used in this DNA */
export const Directory = "directory";

/**  */
export interface SnapmailSignal {
  from: AgentPubKey
  kind: string
  payload: SignalProtocol
}

export enum SignalProtocolType {
	ReceivedMail = 'ReceivedMail',
	ReceivedAck = 'ReceivedAck',
	ReceivedFile = 'ReceivedFile',
}
export type SignalProtocolVariantReceivedMail = {ReceivedMail: MailItem}
export type SignalProtocolVariantReceivedAck = {ReceivedAck: ActionHash}
export type SignalProtocolVariantReceivedFile = {ReceivedFile: FileManifest}
export type SignalProtocol = 
 | SignalProtocolVariantReceivedMail | SignalProtocolVariantReceivedAck | SignalProtocolVariantReceivedFile;

export const SNAPMAIL_DEFAULT_INTEGRITY_ZOME_NAME = "snapmail_model";

export const SNAPMAIL_DEFAULT_COORDINATOR_ZOME_NAME = "snapmail";

export const SNAPMAIL_DEFAULT_ROLE_NAME = "rSnapmail";

export const DIRECT_SEND_TIMEOUT_MS = 1000;

export const DIRECT_SEND_CHUNK_TIMEOUT_MS = 10000;

export const CHUNK_MAX_SIZE = 200 * 1024;

export const FILE_MAX_SIZE = 10 * 1024 * 1024;

/** PSEUDO CONDITIONAL COMPILATION FOR DEBUGGING / TESTING */
export const CAN_DM = true;

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
  username: string
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
export type SnapmailEntryVariantPubEncKey = {PubEncKey: PubEncKey}
export type SnapmailEntryVariantHandle = {Handle: Handle}
export type SnapmailEntryVariantInMail = {InMail: InMail}
export type SnapmailEntryVariantOutMail = {OutMail: OutMail}
export type SnapmailEntryVariantOutAck = {OutAck: OutAck}
export type SnapmailEntryVariantInAck = {InAck: InAck}
export type SnapmailEntryVariantPendingMail = {PendingMail: PendingMail}
export type SnapmailEntryVariantPendingAck = {PendingAck: PendingAck}
export type SnapmailEntryVariantDeliveryConfirmation = {DeliveryConfirmation: DeliveryConfirmation}
export type SnapmailEntryVariantFileChunk = {FileChunk: FileChunk}
export type SnapmailEntryVariantFileManifest = {FileManifest: FileManifest}
export type SnapmailEntry = 
 | SnapmailEntryVariantPubEncKey | SnapmailEntryVariantHandle | SnapmailEntryVariantInMail | SnapmailEntryVariantOutMail | SnapmailEntryVariantOutAck | SnapmailEntryVariantInAck | SnapmailEntryVariantPendingMail | SnapmailEntryVariantPendingAck | SnapmailEntryVariantDeliveryConfirmation | SnapmailEntryVariantFileChunk | SnapmailEntryVariantFileManifest;

/** List of all Link kinds handled by this Zome */
export type LinkKind =
  | {Members: null} | {AckInbox: null} | {MailInbox: null} | {Handle: null} | {Pending: null} | {Pendings: null} | {EncKey: null};
export enum LinkKindType {
	Members = 'Members',
	AckInbox = 'AckInbox',
	MailInbox = 'MailInbox',
	Handle = 'Handle',
	Pending = 'Pending',
	Pendings = 'Pendings',
	EncKey = 'EncKey',
}

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
  | {Unacknowledged: null} | {AckUnsent: null} | {AckPending: null} | {AckDelivered: null} | {Deleted: null};
export enum InMailStateType {
	Unacknowledged = 'Unacknowledged',
	AckUnsent = 'AckUnsent',
	AckPending = 'AckPending',
	AckDelivered = 'AckDelivered',
	Deleted = 'Deleted',
}

/** State of a single delivery of a mail or ack to a unique recipient */
export type DeliveryState =
  | {Unsent: null} | {Pending: null} | {Delivered: null};
export enum DeliveryStateType {
	Unsent = 'Unsent',
	Pending = 'Pending',
	Delivered = 'Delivered',
}

/** Possible states of an OutMail entry */
export type OutMailState =
  | {Unsent: null} | {AllSent: null} | {AllReceived: null} | {AllAcknowledged: null} | {Deleted: null};
export enum OutMailStateType {
	Unsent = 'Unsent',
	AllSent = 'AllSent',
	AllReceived = 'AllReceived',
	AllAcknowledged = 'AllAcknowledged',
	Deleted = 'Deleted',
}

export enum MailStateType {
	In = 'In',
	Out = 'Out',
}
export type MailStateVariantIn = {In: InMailState}
export type MailStateVariantOut = {Out: OutMailState}
export type MailState = 
 | MailStateVariantIn | MailStateVariantOut;

export interface MailItem {
  ah: ActionHash
  author: AgentPubKey
  mail: Mail
  state: MailState
  bcc: AgentPubKey[]
  date: number
  /** UI Things */
  reply?: ActionHash
  reply_of?: ActionHash
  status?: string
}

export type RecipientKind =
  | {TO: null} | {CC: null} | {BCC: null};
export enum RecipientKindType {
	To = 'To',
	Cc = 'Cc',
	Bcc = 'Bcc',
}

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

/** Entry representing an AcknowledgmentReceipt on the DHT waiting to be received */
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
