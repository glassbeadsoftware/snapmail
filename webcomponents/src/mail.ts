/**
 * Functions for manipulating mailItems
 */

import {AgentPubKey} from "@holochain/client";

import {htos} from './utils'
import {InMailState, MailItem, OutMailState, UsernameMap} from "./types";

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
  const state = mailItem.state;
  if (state.In) {
    return state.In.hasOwnProperty('Deleted')
  }
  if (state.Out) {
    return state.Out.hasOwnProperty('Deleted');
  }
  console.error('Invalid mailItem object', mailItem)
  return false;
}


/** Return True if mail is an OutMail */
export function is_OutMail(mailItem: MailItem): boolean {
  const state = mailItem.state;
  if (state.In) {
    return false;
  }
  if (state.Out) {
    return true;
  }
  console.error('Invalid mailItem object', mailItem)
  return false;
}


// /**
//  * Return True if mail has been acknoweldged by this agent
//  */
// function hasMailBeenOpened(mailItem) {
//   //console.log('hasMailBeenOpened()? ' + JSON.stringify(mailItem.state));
//   let state = mailItem.state;
//
//   if (state.hasOwnProperty('Out')) {
//     return true;
//   }
//   if (state.hasOwnProperty('In')) {
//     return state.In === 'Acknowledged' || state.In === 'AckReceived' || state.In === 'Deleted';
//   }
//   console.error('Invalid mailItem object')
//   return false;
// }


/** Return mailItem class */
export function determineMailCssClass(mailItem: MailItem): string {
  const state = mailItem.state;
  if (state.Out) {
    // if (state.Out.hasOwnProperty('Unsent')) return ''; // 'pending';
    // if (state.Out.hasOwnProperty('AllSent')) return ''; // 'partially';
    // if (state.Out.hasOwnProperty('AllReceived')) return '';
    // if (state.Out.hasOwnProperty('AllAcknowledged')) return ''; // 'received';
    // if (state.Out.hasOwnProperty('Deleted')) return 'deleted';
    return state.Out.Deleted? 'deleted' : '';
  }
  if (state.In) {
    if (state.In.hasOwnProperty('Unacknowledged')) return 'newmail';
    if (state.In.hasOwnProperty('AckUnsent')) return ''; //'pending';
    if (state.In.hasOwnProperty('AckPending')) return ''; // 'partially';
    if (state.In.hasOwnProperty('AckDelivered')) return ''; // 'received';
    if (state.In.hasOwnProperty('Deleted')) return 'deleted';
  }
  console.error('Invalid mailItem object', mailItem);
  return '';
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
  if (mailItem.state.Out) {
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
  //console.log('determineMailClass()? ' + JSON.stringify(mailItem.state));
  const state = mailItem.state;
  if (state.Out) {
    if (state.Out.hasOwnProperty('Unsent')) return suspensionPoints;
    if (state.Out.hasOwnProperty('AllSent')) return suspensionPoints;
    if (state.Out.hasOwnProperty('AllReceived')) return checkMarkEmoji;
    if (state.Out.hasOwnProperty('AllAcknowledged')) return checkMarkEmoji;
    if (state.Out.hasOwnProperty('Deleted')) return '';
  }
  if (state.In) {
    if (mailItem.reply) {
      return returnArrowEmoji;
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
  if (process.env.DEV_MODE === 'dev') {
    intext += '\n\nDEBUG INFO';
    intext += '\nState: ' + JSON.stringify(mailItem.state);
    intext += '\nActionHash: ' + htos(mailItem.ah);
    intext += '\nReply: ' + JSON.stringify(mailItem.reply);
    intext += '\nstatus: ' + JSON.stringify(mailItem.status);
    intext += '\nFiles: ' + mailItem.mail.attachments.length;
  }

  return intext;
}
