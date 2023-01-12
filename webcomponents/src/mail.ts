/**
 * Functions for manipulating mailItems
 */

import {AgentPubKey} from "@holochain/client";

import {htos} from './utils'
//import {MailItem} from "./bindings/snapmail";
import {UsernameMap} from "./viewModel/snapmail.perspective";
import {DEV_MODE} from "./snapmail";
import {MailItem, MailStateVariantIn, MailStateVariantOut} from "./bindings/snapmail.types";

const checkMarkEmoji = String.fromCodePoint(0x2714); //FE0F
const suspensionPoints = String.fromCodePoint(0x2026);
const returnArrowEmoji = String.fromCodePoint(0x21A9);

/**
 * All Folders for fileBox
 * @type {{ALL: string, TRASH: string, SENT: string, INBOX: string}}
 */
export const systemFolders = {
  ALL: String.fromCodePoint(0x1F4C1) + ' All',
  INBOX: String.fromCodePoint(0x1F4E5) + ' Inbox',
  SENT: String.fromCodePoint(0x1F4E4) + ' Sent',
  TRASH: String.fromCodePoint(0x1F5D1) + ' Trash'
};


/** Return True if mail has been deleted */
export function isMailDeleted(mailItem: MailItem): boolean {
  console.log({isMailDeleted_mail: mailItem})
  if ("In" in mailItem.state) {
    const inState = (mailItem.state as MailStateVariantIn).In;
    console.log({inState})
    return 'Deleted' in inState;
  }
  if ("Out" in mailItem.state) {
    const outState = (mailItem.state as MailStateVariantOut).Out;
    console.log({outState})
    return 'Deleted' in outState;
  }
  console.error('isMailDeleted() Invalid mailItem object', mailItem)
  return false;
}


/** Return True if mail is an OutMail */
export function is_OutMail(mailItem: MailItem): boolean {
  if ("In" in mailItem.state) {
    return false;
  }
  if ("Out" in mailItem.state) {
    return true;
  }
  console.error('is_OutMail() Invalid mailItem object', mailItem)
  return false;
}


/**
 * Return True if mail has been acknoweldged by this agent
 */
export function hasMailBeenOpened(mailItem) {
  if (is_OutMail(mailItem)) {
    return true;
  }
  if ("In" in mailItem.state) {
    const inState = (mailItem.state as MailStateVariantIn).In;
    return !('Unacknowledged' in inState);
  }
  console.error('hasMailBeenOpened() Invalid mailItem object')
  return false;
}


/** Return mailItem class */
export function determineMailCssClass(mailItem: MailItem): string {
  if ("Out" in mailItem.state) {
    const outMailState = (mailItem.state as MailStateVariantOut).Out;
    if ('Unsent' in outMailState) return ''; // 'pending';
    if ('AllSent' in outMailState) return ''; // 'partially';
    if ('AllReceived' in outMailState) return '';
    if ('AllAcknowledged' in outMailState) return ''; // 'received';
    if ('Deleted' in outMailState) return 'deleted';
    return outMailState === "Deleted" ? 'deleted' : '';
  }

  if ("In" in mailItem.state) {
    const inState = (mailItem.state as MailStateVariantIn).In;
    if ('Unacknowledged' in inState) return 'newmail';
    if ('AckUnsent' in inState) return ''; //'pending';
    if ('AckPending' in inState) return ''; // 'partially';
    if ('AckDelivered' in inState) return ''; // 'received';
    if ('Deleted' in inState) return 'deleted';
  }
  console.error('determineMailCssClass() Invalid mailItem object', mailItem);
}


/** */
export function customDateString(unixTimestamp: number): string {
  const date = new Date(unixTimestamp * 1000);
  let hours: any = date.getHours();
  let minutes: any = date.getMinutes();
  if (minutes < 10) {
    minutes = '0' + minutes
  }
  if (hours < 10) {
    hours = '0' + hours
  }
  const dday = date.toDateString() + ', ' + hours + ':' + minutes
  return dday
}


/** */
function vecToUsernames(usernameMap: UsernameMap, agentVec: AgentPubKey[]): string {
  let line = '';
  for (const item of agentVec) {
    if (line.length > 0) {
      line += ',';
    }
    line += ' ' + getUsername(usernameMap, item);
  }
  return line;
}


/** */
function getUsername(usernameMap: UsernameMap, agentHash: Uint8Array): string {
  const authorId = htos(agentHash);
  let username = usernameMap.get(authorId)
  if (username === undefined) {
    username = "<" + authorId.substr(0, 8) + "...>";
  }
  return username;
}


/** Determine which Username to display (recipient or author) */
function determineFromLine(usernameMap: UsernameMap, mailItem: MailItem): string {
  /* Outmail special case */
  if (is_OutMail(mailItem)) {
    if (mailItem.mail.to.length > 0) {
      return 'To: ' + vecToUsernames(usernameMap, mailItem.mail.to)
    } else if (mailItem.mail.cc.length > 0) {
      return 'To: ' + vecToUsernames(usernameMap, mailItem.mail.cc)
    } else if (mailItem.bcc && mailItem.bcc!.length > 0) {
      return 'To: ' + vecToUsernames(usernameMap, mailItem.bcc!)
    }
  }
  return getUsername(usernameMap, mailItem.author);
}


/** Return mailItem status icon */
export function determineMailStatus(mailItem: MailItem): string {
  console.log('determineMailStatus()', mailItem);
  const state = mailItem.state;
  // console.log("determineMailStatus() state", mailItem.state);
  if ("Out" in state) {
    const outMailState = (state as MailStateVariantOut).Out;
    if ('Unsent' in outMailState) return suspensionPoints;
    if ('AllSent' in outMailState) return suspensionPoints;
    if ('AllReceived' in outMailState) return checkMarkEmoji;
    if ('AllAcknowledged' in outMailState) return checkMarkEmoji;
    if ('Deleted' in outMailState) return '';
  } else {
    if ("In" in state) {
      if (mailItem.reply) {
        return returnArrowEmoji;
      }
    }
  }
  return '';
}


/** */
export function into_gridItem(usernameMap: UsernameMap, mailItem: MailItem) {
  /* username */
  // console.log('into_gridItem: ' + htos(mailItem.author) + ' username: ' + username);
  const username = determineFromLine(usernameMap, mailItem);
  /* Date */
  const dateStr = customDateString(mailItem.date)
  /* Attachment Status */
  const attachmentStatus = mailItem.mail.attachments.length > 0? String.fromCodePoint(0x1F4CE) : '';
  /* Status */
  const status = determineMailStatus(mailItem);
  // Done
  const item = {
    "id": mailItem.ah,
    "username": username,
    "subject": mailItem.mail.subject,
    "date": dateStr,
    "attachment": attachmentStatus,
    "status": status,
    "content": mailItem.mail.payload
  };
  return item;
}


/** */
export function into_mailText(usernameMap: UsernameMap, mailItem: MailItem): string {
  let intext = 'Subject: ' + mailItem.mail.subject + '\n\n'
    + mailItem.mail.payload + '\n\n'
    + 'Mail from: ' + usernameMap.get(htos(mailItem.author)) + ' at ' + customDateString(mailItem.date);

  const to_line = vecToUsernames(usernameMap, mailItem.mail.to!);

  const can_cc = mailItem.mail.cc!.length > 0;
  const cc_line = vecToUsernames(usernameMap, mailItem.mail.cc!);

  const can_bcc = mailItem.bcc!.length > 0;
  const bcc_line = vecToUsernames(usernameMap, mailItem.bcc!);

  intext += '\nTo: ' + to_line;
  if (can_cc) {
    intext += '\nCC: ' + cc_line;
  }
  if (can_bcc) {
    intext += '\nBCC: ' + bcc_line;
  }

  /** Debug info */
  if (DEV_MODE === 'dev') {
    intext += '\n\nDEBUG INFO';
    intext += '\nState: ' + JSON.stringify(mailItem.state);
    intext += '\nActionHash: ' + htos(mailItem.ah);
    intext += '\nReply: ' + JSON.stringify(mailItem.reply);
    intext += '\nstatus: ' + JSON.stringify(mailItem.status);
    intext += '\nFiles: ' + mailItem.mail.attachments.length;
  }

  return intext;
}
