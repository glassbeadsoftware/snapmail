import {ActionHash, AgentPubKey, CellId, EntryHash } from '@holochain/client';
//import {AppSignal} from '@holochain/client';
//import {CapSecret} from "@holochain/client/lib/hdk/capabilities";
import {AgnosticClient} from '@holochain-open-dev/cell-client';
//import { EntryHashB64, ActionHashB64, AgentPubKeyB64 } from '@holochain-open-dev/core-types';
import { htos } from './utils';
import {MailItem, SendMailInput} from "./bindings/snapmail";


const DEFAULT_TIMEOUT = 9999



/** */
export class SnapmailZvm {
  constructor(public client: AgnosticClient, public mainCellId: CellId) {
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
  //     // TODO: Put back when Holochain connection problems are resolved
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
