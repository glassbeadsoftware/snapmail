
import {ActionHash, AdminWebsocket, AgentPubKey, AppWebsocket, CellId, EntryHash} from '@holochain/client';
//import {AppSignal} from '@holochain/client';
//import { AdminWebsocket, AppWebsocket } from '../../holochain-conductor-api/lib';
import { htos } from './utils';
import {SendMailInput} from "./types";
//import {CapSecret} from "@holochain/client/lib/hdk/capabilities";

const DEFAULT_TIMEOUT = 9999

const HREF_PORT = window.location.port
let ADMIN_PORT = 1234
let APP_ID = 'snapmail-app'
let APP_PORT: string | null = '' + parseInt(HREF_PORT) + 800
export let NETWORK_ID: string | null = ''

export const IS_ELECTRON = (HREF_PORT === ""); // No HREF PORT when run by Electron

// Use different values when in electron
if (IS_ELECTRON) {
  APP_ID = 'snapmail-app'
  ADMIN_PORT = 1235
  const searchParams = new URLSearchParams(window.location.search);
  APP_PORT = searchParams.get("APP");
  NETWORK_ID = searchParams.get("UID");
  console.log({APP_ID})
}

const ADMIN_URL = `ws://localhost:${ADMIN_PORT}`
const APP_URL =`ws://localhost:${APP_PORT}`

let g_adminWs: AdminWebsocket
let g_cellId: CellId
let g_appWs: AppWebsocket


// /** Default signal callback */
// const receiveSignal = (signal: AppSignal) => {
//   // impl...
//   console.log('Received signal:')
//   console.log({signal})
//   //resolve()
// }


// -- micro API -- //

//
// export async function rsmConnectAdmin() {
//   g_adminWs = await AdminWebsocket.connect(ADMIN_URL, DEFAULT_TIMEOUT)
//   console.log('*** Connected to RSM Admin: ' + JSON.stringify(g_adminWs))
//   // g_adminWs.generateAgentPubKey().then((newKey) => {
//   //     g_newKey = newKey
//   //     console.log({newKey})
//   //     printAdmin()
//   // })
// }


/**  */
export async function rsmConnectApp(signalCallback: any) {
  const env = window.location;
  const installed_app_id = NETWORK_ID !== '' ? APP_ID + '-' + NETWORK_ID : APP_ID;
  console.log('*** installed_app_id = ' + installed_app_id)
  console.log(env);
  console.log('*** Connecting to Snapmail app at ' + APP_URL + ' ...')
  g_appWs = await AppWebsocket.connect(APP_URL, DEFAULT_TIMEOUT, signalCallback);
  console.log('*** Connected to Snapmail app: ' + JSON.stringify(g_appWs));
  const appInfo = await g_appWs.appInfo({ installed_app_id }, 1000);
  console.log({appInfo})
  if (appInfo === null) {
    alert("happ not installed in conductor: " + installed_app_id)
  }
  g_cellId = appInfo.cell_data[0].cell_id;
  // for (const cell of appInfo.cell_data) {
  //   console.log({cell})
  //   if (cell.cell_nick === NETWORK_ID) {
  //     g_cellId = cell.cell_id;
  //   }
  // }
  if (g_cellId === undefined) {
    console.error('Failed to find cell with NETWORK_ID = ' + NETWORK_ID);
    throw 'Failed to find cell with NETWORK_ID';
  }
  console.log({g_cellId})

  /** Get handle from electron */
  if (IS_ELECTRON && window.require) {
    console.log("Calling getMyHandle() for ELECTRON");
    const startingHandle = await getMyHandle();
    console.log("getMyHandle() returned: " + startingHandle);
    const ipc = window.require('electron').ipcRenderer;
    const reply = ipc.sendSync('startingInfo', startingHandle, g_cellId[0]);
    console.log({reply});
    if (reply != "<noname>") {
      const callResult = await setHandle(reply);
      console.log({callResult});
    }
  }

  /** Done */
  await dumpState(g_cellId)
  return g_cellId;
}


// /** */
// const printAdmin = () => {
//   console.log("printAdmin:")
//   g_adminWs.listDnas().then((dnaList) => {
//     console.log({dnaList})
//   })
//   g_adminWs.listCellIds().then((cellList) => {
//     console.log({cellList})
//   })
//   g_adminWs.listActiveApps().then((appList) => {
//     console.log({appList})
//   })
// }


/** */
const dumpState = async (cellId: CellId) => {
  if (g_adminWs === undefined) {
    console.log('dumpState() aborted: g_adminWs undefined')
    //resolve()
    return
  }
  const stateDump = await g_adminWs.dumpState({cell_id: cellId})
  console.log('stateDump of cell:')
  console.log({stateDump})
}


/** */
export async function callDna(functionName: string, payload: any, timeout?: number): Promise<any> {
    if (g_appWs === undefined) {
      console.error("App Client Websocket not connected!")
      return Promise.reject("App Client Websocket not connected!")
    }
    const t = timeout !== undefined? timeout : DEFAULT_TIMEOUT;
    //console.log("*** callDna() => " + functionName + '() ; timeout = ' + t)
  let result = undefined;
  try
  {
    result = await g_appWs.callZome({
        cap_secret: null,
        cell_id: g_cellId,
        zome_name: "snapmail",
        fn_name: functionName,
        provenance: g_cellId[1],
        payload,
      },
      t
    )
  } catch(err) {
    console.error("*** callDna() => " + functionName + '() failed:')
    console.error({err})
    // FIXME: Put back when Holochain connection problems are resolved
    // alert("Holochain failed.\n Connection to holochain might be lost. Reload App or refresh web page to attempt reconnection");
    return Promise.reject("callZome() failed. Possibility lost connection to holochain.")
  }
  //console.log("*** callDna() => " + functionName + '() result:')
  //console.log({result})
  return result;
}

// -- Handle -- //

export async function getMyHandle(): Promise<string> {
  return await callDna('get_my_handle', null)
}

export async function getHandle(agentId: AgentPubKey): Promise<any> {
  return await callDna('get_handle', {agentId})
}

export async function setHandle(username: string): Promise<any> {
  return await callDna('set_handle', username)
}

export async function getAllHandles(): Promise<any> {
  return await callDna('get_all_handles', null)
}

export async function findAgent(handle: string): Promise<any> {
  return await callDna('find_agent', handle)
}

export async function pingAgent(agentHash: Uint8Array): Promise<boolean> {
  console.log('*** pingAgent() called for: ' + htos(agentHash));
  return await callDna('ping_agent', agentHash, 3000)
}

// -- Mail -- //

export async function sendMail(input: SendMailInput): Promise<any> {
  return await callDna('send_mail', input)
}


// export async function getMail(otherAgentId) {
//   return await callDna('get_mail', otherAgentId)
// }

export async function deleteMail(mailAddress: ActionHash): Promise<ActionHash | null> {
  return await callDna('delete_mail', mailAddress)
}

export async function getAllMails(): Promise<any> {
  return await callDna('get_all_mails', null)
}

export async function checkMailInbox(): Promise<any> {
  return await callDna('check_mail_inbox', null)
}

export async function checkAckInbox(): Promise<any> {
  return await callDna('check_ack_inbox', null)
}

export async function acknowledgeMail(mailAddress: ActionHash): Promise<any> {
  return await callDna('acknowledge_mail', mailAddress)
}


/** -- File -- */

export async function writeManifest(
  dataHash: string,
  filename: string,
  filetype: string,
  orig_filesize: number,
  chunks: EntryHash[]): Promise<any>
{
  const params = {
    data_hash: dataHash,
    filename, filetype, orig_filesize,
    chunks
  }
  return await callDna('write_manifest', params)
}

/** */
export async function writeChunk(dataHash: string, chunkIndex: number, chunk: string) {
  const params = {
    data_hash: dataHash,
    chunk_index: chunkIndex,
    chunk
  }
  return await callDna('write_chunk', params)
}

/** */
export async function getChunk(chunkAddress: ActionHash): Promise<any> {
  return await callDna('get_chunk', chunkAddress)
}

export async function getManifest(manifestAddress: ActionHash): Promise<any> {
  return await callDna('get_manifest', manifestAddress)
}

export async function findManifest(dataHash: ActionHash): Promise<any> {
  return await callDna('find_manifest', dataHash)
}

// export async function getAllManifests() {
//   return await callDna('get_all_manifests', null)
// }

export async function getMissingAttachments(from: AgentPubKey, inmail_address: ActionHash): Promise<number> {
  return await callDna('get_missing_attachments', {from, inmail_address})
}
