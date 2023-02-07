import {
  ActionHash, ActionHashB64,
  AgentPubKey, AgentPubKeyB64,
  AnyDhtHash, AppSignalCb,
  decodeHashFromBase64,
  encodeHashToBase64,
  EntryHash
} from '@holochain/client';
import {ZomeViewModel} from "@ddd-qc/lit-happ";
import {SnapmailProxy} from "../bindings/snapmail.proxy";
import {defaultPerspective, SnapmailPerspective} from "./snapmail.perspective";
import {
  FileManifest, FindManifestOutput,
  SendMailInput, SignalProtocol, SignalProtocolType
} from "../bindings/snapmail.types";
import {AppSignal} from "@holochain/client/lib/api/app/types";
import {determineMailCssClass, is_OutMail, isMailDeleted} from "../mail";

/** */
export class SnapmailZvm extends ZomeViewModel {

  static readonly ZOME_PROXY = SnapmailProxy;
  get zomeProxy(): SnapmailProxy {return this._zomeProxy as SnapmailProxy;}


  private _canPing = true;

  get canPing(): boolean { return this._canPing}

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
  readonly signalHandler: AppSignalCb = (appSignal: AppSignal) => {
    console.log('snapmail.zvm.signalHandler():', appSignal);
    const payload: SignalProtocol = appSignal.payload as SignalProtocol;
    /** Handle 'ReceivedMail' signal */
    if (SignalProtocolType.ReceivedMail in payload) {
      //const mailItem: MailItem = payload.ReceivedMail;
      //this._perspective.mailMap[encodeHashToBase64(mailItem.ah)] = mailItem;
      //this.notifySubscribers();
      void this.probeMails();
    }
  }


  /** */
  async probeHandles() {
    const handleItems = await this.zomeProxy.getAllHandles();
    console.log("probeHandles()", handleItems);
    this._perspective.usernameMap = {};
    for(const handleItem of handleItems) {
      /* TODO: exclude self from list when in prod? */
      const agentId = encodeHashToBase64(handleItem.agent_pub_key);
      //console.log('' + handleItem.name + ': ' + agentIdB64);
      this._perspective.usernameMap[agentId] = handleItem.username;
      if(this._perspective.pingMap[agentId] === undefined) {
        console.log("  ADDING TO pingMap: ", agentId);
        this._perspective.pingMap[agentId] = 0;
        this._perspective.responseMap[agentId] = false;
      }
    }
    this.notifySubscribers();
  }


  /** Get stats from mailMap */
  countMails(): number[] {
    let trashCount = 0;
    let inboxCount = 0;
    let sentCount = 0;
    let newCount = 0;

    for (const mailItem of Object.values(this._perspective.mailMap)) {
      const isDeleted = isMailDeleted(mailItem);
      const isOutMail = is_OutMail(mailItem);
      if (isOutMail) {
        sentCount = sentCount + 1;
      }
      if (isDeleted) {
        trashCount = trashCount + 1;
      }
      if (!isDeleted && !isOutMail) {
        inboxCount = inboxCount + 1;
      }
      if (determineMailCssClass(mailItem) === 'newmail') {
        newCount = newCount + 1;
      }
    }
    return [newCount, inboxCount, sentCount, trashCount];
  }


  /** Get latest mails and rebuild mailMap */
  async probeMails() {
    const mailItems = await this.zomeProxy.getAllMails();
    this._perspective.mailMap = {};
    for (const mailItem of mailItems) {
      this._perspective.mailMap[encodeHashToBase64(mailItem.ah)] = mailItem;
    }
    this.notifySubscribers();
  }


  /** Ping oldest pinged agent */
  pingNextAgent(): void {
    console.log("   pingNextAgent() pingMap", this.perspective.pingMap);
    //console.log({responseMap: this.perspective.responseMap});
    /* Skip if empty map */
    if (Object.keys(this.perspective.pingMap).length === 0) {
      return;
    }
    this._canPing = false;
    /* Sort pingMap by value to get oldest pinged agent */
    const sortedPings = Object.entries(this.perspective.pingMap)
      .sort((a, b) => a[1] - b[1]);
    //console.log("   sortedPings:", sortedPings);
    /* Ping first agent in sorted list */
    const pingedAgentB64 = sortedPings[0][0];
    const pingedAgent = decodeHashFromBase64(pingedAgentB64);
    //console.log("pinging: ", pingedAgentB64);
    if (pingedAgentB64 === this.cell.agentPubKey) {
      //console.log("pinging self");
      this.storePingResult(pingedAgentB64, true);
      this._canPing = true;
      return;
    }
    //const contactGrid = this.contactGridElem;
    this.zomeProxy.pingAgent(pingedAgent)
      .then((result: boolean) => {
        this.storePingResult(pingedAgentB64, result);
        this._canPing = true;
      })
      .catch((error) => {
        console.error('Ping failed for: ' + pingedAgentB64);
        console.error(error);
        this.storePingResult(pingedAgentB64, false);
      })
  }


  /** */
  storePingResult(agentId: AgentPubKeyB64, isAgentPresent: boolean) {
    //console.log("storePingResult() responseMap[" + agentId + "] | " + isAgentPresent)
    //console.log("storePingResult() before pingMap[" + agentId + "]", this.perspective.pingMap)
    this.perspective.responseMap[agentId] = isAgentPresent;
    this.perspective.pingMap[agentId] = Date.now();
    //console.log("storePingResult() after pingMap", this.perspective.pingMap);
    this.notifySubscribers();
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
    //await this.probeMails();
    return ah;
  }


  /** -- Mail -- */

  async acknowledgeMail(inmailAh: ActionHashB64): Promise<EntryHash> {
    return this.zomeProxy.acknowledgeMail(decodeHashFromBase64(inmailAh));
  }

  async deleteMail(ah: ActionHashB64): Promise<ActionHash | null> {
    return this.zomeProxy.deleteMail(decodeHashFromBase64(ah));
  }


    /** -- File -- */

    async getMissingAttachments(from: AgentPubKey, inmail_ah: ActionHash): Promise<number> {
      return this.zomeProxy.getMissingAttachments({from, inmail_ah});

    }


    async getManifest(manifestAddress: AnyDhtHash): Promise<FileManifest> {
      return this.zomeProxy.getManifest(manifestAddress);
    }


    async findManifest(contentHash: string): Promise<FindManifestOutput> {
      return this.zomeProxy.findManifest(contentHash);
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
    chunks: EntryHash[]): Promise<ActionHash> {
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
