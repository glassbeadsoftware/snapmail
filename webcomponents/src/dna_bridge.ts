
import {ActionHash, AdminWebsocket, AgentPubKey, AppWebsocket, CellId, EntryHash, InstalledAppInfo} from '@holochain/client';
//import {AppSignal} from '@holochain/client';
//import {CapSecret} from "@holochain/client/lib/hdk/capabilities";
//import { AdminWebsocket, AppWebsocket } from '../../holochain-conductor-api/lib';
import {AgnosticClient} from '@holochain-open-dev/cell-client';
//import {serializeHash} from "@holochain-open-dev/utils";
//import { EntryHashB64, ActionHashB64, AgentPubKeyB64 } from '@holochain-open-dev/core-types';
import { htos } from './utils';
import {MailItem, SendMailInput} from "./types";
import {NETWORK_ID} from "./snapmail";


const DEFAULT_TIMEOUT = 9999
let g_adminWs: AdminWebsocket




/** */
export class DnaBridge {
  constructor(public client: AgnosticClient, public mainCellId: CellId) {
  }


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


  // /**  */
  // async rsmConnectApp(signalCallback: any): Promise<CellId> {
  //   const env = window.location;
  //   const installed_app_id = NETWORK_ID !== '' ? APP_ID + '-' + NETWORK_ID : APP_ID;
  //   console.log('*** installed_app_id = ' + installed_app_id)
  //   console.log(env);
  //   console.log('*** Connecting to Snapmail app at ' + APP_URL + ' ...')
  //   g_appWs = await AppWebsocket.connect(APP_URL, DEFAULT_TIMEOUT, signalCallback);
  //   console.log('*** Connected to Snapmail app: ' + JSON.stringify(g_appWs));
  //   const appInfo = await g_appWs.appInfo({installed_app_id}, 1000);
  //   console.log({appInfo})
  //   if (appInfo === null) {
  //     alert("happ not installed in conductor: " + installed_app_id)
  //   }
  //   g_cellId = appInfo.cell_data[0].cell_id;
  //   // for (const cell of appInfo.cell_data) {
  //   //   console.log({cell})
  //   //   if (cell.cell_nick === NETWORK_ID) {
  //   //     g_cellId = cell.cell_id;
  //   //   }
  //   // }
  //   if (g_cellId === undefined) {
  //     console.error('Failed to find cell with NETWORK_ID = ' + NETWORK_ID);
  //     throw 'Failed to find cell with NETWORK_ID';
  //   }
  //   console.log({g_cellId})
  //
  //   /** Get handle from electron */
  //   if (IS_ELECTRON && window.require) {
  //     console.log("Calling getMyHandle() for ELECTRON");
  //     const startingHandle = await getMyHandle();
  //     console.log("getMyHandle() returned: " + startingHandle);
  //     const ipc = window.require('electron').ipcRenderer;
  //     const reply = ipc.sendSync('startingInfo', startingHandle, g_cellId[0]);
  //     console.log({reply});
  //     if (reply != "<noname>") {
  //       const callResult = await setHandle(reply);
  //       console.log({callResult});
  //     }
  //   }
  //
  //   /** Done */
  //   await dumpState(g_cellId)
  //   return g_cellId;
  // }


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
  async dumpState(cellId: CellId) {
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
  async callDna(functionName: string, payload: any, timeout?: number): Promise<any> {
    //console.debug("callDna: " + functionName)
    //console.debug({payload})
    const result = this.client.callZome(this.mainCellId, "snapmail", functionName, payload, timeout ? timeout : 10 * 1000);
    //console.debug("callZome: " + functionName + "() result")
    //console.debug({result})
    return result;
  }


  // /** */
  // async callDna(functionName: string, payload: any, timeout?: number): Promise<any> {
  //   if (g_appWs === undefined) {
  //     console.error("App Client Websocket not connected!")
  //     return Promise.reject("App Client Websocket not connected!")
  //   }
  //   const t = timeout !== undefined ? timeout : DEFAULT_TIMEOUT;
  //   //console.log("*** callDna() => " + functionName + '() ; timeout = ' + t)
  //   let result = undefined;
  //   try {
  //     result = await g_appWs.callZome({
  //         cap_secret: null,
  //         cell_id: g_cellId,
  //         zome_name: "snapmail",
  //         fn_name: functionName,
  //         provenance: g_cellId[1],
  //         payload,
  //       },
  //       t
  //     )
  //   } catch (err) {
  //     console.error("*** callDna() => " + functionName + '() failed:')
  //     console.error({err})
  //     // FIXME: Put back when Holochain connection problems are resolved
  //     // alert("Holochain failed.\n Connection to holochain might be lost. Reload App or refresh web page to attempt reconnection");
  //     return Promise.reject("callZome() failed. Possibility lost connection to holochain.")
  //   }
  //   //console.log("*** callDna() => " + functionName + '() result:')
  //   //console.log({result})
  //   return result;
  // }


  /** -- Handle -- */



  async getMyHandle(): Promise<string> {
    return await this.callDna('get_my_handle', null)
  }



  async getHandle(agentId: AgentPubKey): Promise<any> {
    return await this.callDna('get_handle', {agentId})
  }


  async setHandle(username: string): Promise<any> {
    return await this.callDna('set_handle', username)
  }


  async getAllHandles(): Promise<any> {
    return await this.callDna('get_all_handles', null)
  }


  async findAgent(handle: string): Promise<any> {
    return await this.callDna('find_agent', handle)
  }

  async pingAgent(agentHash: Uint8Array): Promise<boolean> {
    console.log('*** pingAgent() called for: ' + htos(agentHash));
    return await this.callDna('ping_agent', agentHash, 3000)
  }


  // -- Mail -- //

  async sendMail(input: SendMailInput): Promise<any> {
    return await this.callDna('send_mail', input)
  }


  // export async function getMail(otherAgentId) {
  //   return await callDna('get_mail', otherAgentId)
  // }


  async deleteMail(mailAddress: ActionHash): Promise<ActionHash | null> {
    return await this.callDna('delete_mail', mailAddress)
  }

  async getAllMails(): Promise<MailItem[]> {
    return await this.callDna('get_all_mails', null)
  }



  async checkMailInbox(): Promise<any> {
    return await this.callDna('check_mail_inbox', null)
  }



  async checkAckInbox(): Promise<any> {
    return await this.callDna('check_ack_inbox', null)
  }



  async acknowledgeMail(mailAddress: ActionHash): Promise<any> {
    return await this.callDna('acknowledge_mail', mailAddress)
  }


  /** -- File -- */

  async writeManifest(
    dataHash: string,
    filename: string,
    filetype: string,
    orig_filesize: number,
    chunks: EntryHash[]): Promise<any> {
    const params = {
      data_hash: dataHash,
      filename, filetype, orig_filesize,
      chunks
    }
    return await this.callDna('write_manifest', params)
  }

  /** */
  async writeChunk(dataHash: string, chunkIndex: number, chunk: string) {
    const params = {
      data_hash: dataHash,
      chunk_index: chunkIndex,
      chunk
    }
    return await this.callDna('write_chunk', params)
  }

  /** */


  async getChunk(chunkAddress: ActionHash): Promise<any> {
    return await this.callDna('get_chunk', chunkAddress)
  }

  async getManifest(manifestAddress: ActionHash): Promise<any> {
    return await this.callDna('get_manifest', manifestAddress)
  }

  async findManifest(dataHash: ActionHash): Promise<any> {
    return await this.callDna('find_manifest', dataHash)
  }

  // export async function getAllManifests() {
  //   return await callDna('get_all_manifests', null)
  // }

  async getMissingAttachments(from: AgentPubKey, inmail_address: ActionHash): Promise<number> {
    return await this.callDna('get_missing_attachments', {from, inmail_address})
  }
}
