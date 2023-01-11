import {ActionHash, AgentPubKey, AnyDhtHash, EntryHash} from '@holochain/client';
import {ZomeViewModel} from "@ddd-qc/lit-happ";
import {SnapmailProxy} from "../bindings/snapmail.proxy";
import {defaultPerspective, SnapmailPerspective} from "./snapmail.perspective";
import {
  DeleteMailOutput,
  FileManifest, FindManifestOutput,
  GetMissingAttachmentsInput,
  SendMailInput
} from "../bindings/snapmail.types";
import {htos, stoh} from "../utils";

/** */
export class SnapmailZvm extends ZomeViewModel {

  static readonly ZOME_PROXY = SnapmailProxy;
  get zomeProxy(): SnapmailProxy {return this._zomeProxy as SnapmailProxy;}


  private _canPing = true;


  /** -- ViewModel -- */

  private _perspective: SnapmailPerspective = defaultPerspective();


  /* */
  get perspective(): SnapmailPerspective {
    return this._perspective;
  }

  /* */
  protected hasChanged(): boolean {
    // TODO
    return true;
  }


  /** */
  async probeAll() {
    await this.probeHandles();
    await this.zomeProxy.checkAckInbox();
    await this.zomeProxy.checkMailInbox();
    await this.probeMails();
  }



  /** */
  async probeHandles() {
    const handleItems = await this.zomeProxy.getAllHandles();
    this._perspective.usernameMap.clear();
    for(const handleItem of handleItems) {
      /* TODO: exclude self from list when in prod? */
      const agentIdB64 = htos(handleItem.agentId);
      console.log('' + handleItem.name + ': ' + agentIdB64);
      this._perspective.usernameMap.set(agentIdB64, handleItem.name);
      if(this._perspective.pingMap.get(agentIdB64) === undefined) {
        //console.log("ADDING TO pingMap: " + agentId);
        this._perspective.pingMap.set(agentIdB64, 0);
        this._perspective.responseMap.set(agentIdB64, false);
      }
    }
  }


  /** */
  async probeMails() {
    const mailItems = await this.zomeProxy.getAllMails();

    /** */

    // let trashCount = 0;
    // let inboxCount = 0;
    // let sentCount = 0;
    // let newCount = 0;
    //
    // const items = [];

    this._perspective.mailMap.clear();


    for (const mailItem of mailItems) {
      //console.log({mailItem})
      this._perspective.mailMap.set(htos(mailItem.ah), mailItem);

      // FIXME
      // const isDeleted = isMailDeleted(mailItem);
      // const isOutMail = is_OutMail(mailItem);

      /** Counters */
      // if (isOutMail) {
      //   sentCount = sentCount + 1;
      // }
      // if (isDeleted) {
      //   trashCount = trashCount + 1;
      // }
      // if (!isDeleted && !isOutMail) {
      //   inboxCount = inboxCount + 1;
      // }
      // if (determineMailCssClass(mailItem) === 'newmail') {
      //   newCount = newCount + 1;
      // }


      //const gridItem = into_gridItem(this._perspective.usernameMap, mailItem);
      //items.push(gridItem);
    }
    //console.log('Counters: ' + newCount + ' / ' + inboxCount + ' / ' + sentCount + ' / ' + trashCount + ' / '+ mailItems.length);
  }



  /** Ping oldest pinged agent */
  pingNextAgent(): void {
    //console.log({this._pingMap});
    //console.log({this._responseMap});
    /* Skip if empty map */
    if (this.perspective.pingMap.size === 0) {
      return;
    }
    this._canPing = false;
    /* Sort g_pingMap by value to get oldest pinged agent */
    const nextMap = new Map([...this.perspective.pingMap.entries()]
      .sort((a, b) => a[1] - b[1]));
    console.log({nextMap})
    /* Ping first agent in sorted list */
    const pingedAgentB64 = nextMap.keys().next().value
    const pingedAgent = stoh(pingedAgentB64);
    console.log("pinging: ", pingedAgentB64);
    if (pingedAgentB64 === this.agentPubKey) {
      console.log("pinging self");
      this.storePingResult({}, pingedAgentB64);
      this._canPing = true;
      return;
    }
    //const contactGrid = this.contactGridElem;
    this.zomeProxy.pingAgent(pingedAgent)
      .then((result: boolean) => {
        this.storePingResult(result, pingedAgentB64);
        this._canPing = true;
        //contactGrid.render();
      })
      .catch((error: any) => {
        console.error('Ping failed for: ' + pingedAgentB64);
        console.error({ error })
        this.storePingResult(undefined, pingedAgentB64);
        //contactGrid.render();
      })
  }


  /** */
  storePingResult(callResult: any, agentB64: string) {
    const isAgentPresent = callResult !== undefined && callResult.Err === undefined
    console.log("storePingResult() " + agentB64 + " | " + isAgentPresent)
    this.perspective.responseMap.set(agentB64, isAgentPresent);
    this.perspective.pingMap.set(agentB64, Date.now());
  }




  /** -- -- */

  async pingAgent(destination: AgentPubKey): Promise<boolean> {
    return this.zomeProxy.pingAgent(destination);
  }


  /** -- Handle -- */

  async setHandle(newName: string): Promise<ActionHash> {
    return this.zomeProxy.setHandle(newName);
  }

  async getMyHandle(): Promise<string> {
    return this.zomeProxy.getMyHandle();
  }

  async sendMail(input: SendMailInput): Promise<ActionHash> {
    const ah = await this.zomeProxy.sendMail(input);
    await this.probeMails();
    return ah;
  }


  /** -- Mail -- */

  async acknowledgeMail(inmailAh: ActionHash): Promise<EntryHash> {
    return this.zomeProxy.acknowledgeMail(inmailAh);
  }

  async deleteMail(ah: ActionHash): Promise<DeleteMailOutput> {
    return this.zomeProxy.deleteMail(ah);

  }


    /** -- File -- */

    async getMissingAttachments(from: AgentPubKey, inmail_ah: ActionHash): Promise<number> {
      return this.zomeProxy.getMissingAttachments({from, inmail_ah});

    }


    async getManifest(manifestAddress: AnyDhtHash): Promise<FileManifest> {
      return this.zomeProxy.getManifest(manifestAddress);
    }


    async findManifest(dataHash: string): Promise<FindManifestOutput> {
      return this.zomeProxy.findManifest(dataHash);
    }

    async getChunk(chunkEh: EntryHash): Promise<string> {
      return this.zomeProxy.getChunk(chunkEh);
    }

    /** */
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
    return this.zomeProxy.writeManifest(params);
  }

  /** */
  async writeChunk(dataHash: string, chunkIndex: number, chunk: string): Promise<EntryHash> {
    const params = {
      data_hash: dataHash,
      chunk_index: chunkIndex,
      chunk
    }
    return this.zomeProxy.writeChunk(params);
  }
}
