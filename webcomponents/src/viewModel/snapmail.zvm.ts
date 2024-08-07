import {AppSignalCb} from '@holochain/client';
import {delay, ZomeViewModel, AgentIdMap, ActionIdMap, AgentId, ActionId, EntryId, DhtId} from "@ddd-qc/lit-happ";
import {SnapmailProxy} from "../bindings/snapmail.proxy";
import {createNewPerspective, SnapmailPerspective} from "./snapmail.perspective";
import {
  FileManifest,
  SendMailInput, SignalProtocolType, SnapmailSignal, WriteManifestInput
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

  private _perspective: SnapmailPerspective = createNewPerspective();


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
  async initializePerspectiveOnline(): Promise<void> {
    await this.probeAllInnerAsync();
  }


  /** */
  async probeAllInnerAsync(): Promise<void> {
    await this.probeHandles();
    await this.zomeProxy.checkAckInbox();
    const newInMails = await this.zomeProxy.checkMailInbox();
    await this.probeMails();
    /** Send notification for each new inMail */
    console.log("SnapmailZvm.probeAllInnerAsync()", newInMails.length);
    const fakeAppSignal: AppSignal = {
      cell_id: this.cell.address.intoId(),
      zome_name: this._zomeProxy.zomeName,
      payload: null,
    };
    for (const new_mail_ah of newInMails) {
      const mailAh = new ActionId(new_mail_ah);
      const mailItem = this._perspective.mailMap.get(mailAh);
      if (!mailItem) {
        console.warn("New InMail not found in perspective");
        continue;
      }
      const signal: SnapmailSignal = {
        kind: SignalProtocolType.ReceivedMail,
        from: this.cell.address.agentId.hash, // Set author to self so it doesn't process a popup
        payload: {ReceivedMail: mailItem}
      }
      fakeAppSignal.payload = signal;
      this._dvmParent.signalHandler(fakeAppSignal);
    }
  }


  /** */
  probeAllInner() {
    /* await */ this.probeAllInnerAsync();
  }


  /** */
  readonly signalHandler: AppSignalCb = (appSignal: AppSignal) => {
    console.log('snapmailZvm.signalHandler():', appSignal);
    //const signal: SnapmailSignal = appSignal.payload as SnapmailSignal;
    /*await */ this.probeMails();
  }


  /** */
  async probeHandles() {
    const handleItems = await this.zomeProxy.getAllHandles();
    console.log("snapmailZvm.probeHandles()", handleItems);
    this._perspective.usernameMap = new AgentIdMap();
    for(const handleItem of handleItems) {
      /* TODO: exclude self from list when in prod? */
      const agentId = new AgentId(handleItem.agent_pub_key);
      //console.log('' + handleItem.name + ': ' + agentIdB64);
      this._perspective.usernameMap.set(agentId, handleItem.username);
      if(this._perspective.pingMap.get(agentId) === undefined) {
        console.log("snapmailZvm - ADDING TO pingMap: ", agentId);
        this._perspective.pingMap.set(agentId, 0);
        this._perspective.responseMap.set(agentId, false);
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

    for (const mailItem of this._perspective.mailMap.values()) {
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
    this._perspective.mailMap = new ActionIdMap();
    for (const mailItem of mailItems) {
      this._perspective.mailMap.set(new ActionId(mailItem.ah), mailItem);
    }
    this.notifySubscribers();
  }


  /** Ping oldest pinged agent */
  pingNextAgent(): void {
    console.log("snapmailZvm.pingNextAgent() pingMap", this._perspective.pingMap);
    //console.log({responseMap: this._perspective.responseMap});
    /* Skip if empty map */
    if (Array.from(this._perspective.pingMap.keys()).length === 0) {
      return;
    }
    this._canPing = false;
    /* Sort pingMap by value to get oldest pinged agent */
    const sortedPings = Array.from(this._perspective.pingMap.entries())
      .sort((a, b) => a[1] - b[1]);
    //console.log("   sortedPings:", sortedPings);
    /* Ping first agent in sorted list */
    const pingedAgentId = sortedPings.entries().next()[0];
    //console.log("pinging: ", pingedAgentB64);
    if (pingedAgentId.equals(this.cell.address.agentId)) {
      //console.log("pinging self");
      this.storePingResult(pingedAgentId, true);
      this._canPing = true;
      return;
    }
    //const contactGrid = this.contactGridElem;
    this.zomeProxy.pingAgent(pingedAgentId.hash)
      .then((result: boolean) => {
        this.storePingResult(pingedAgentId, result);
        this._canPing = true;
      })
      .catch((error) => {
        console.warn('Ping failed for: ' + pingedAgentId);
        console.warn(error);
        this.storePingResult(pingedAgentId, false);
        this._canPing = true;
      })
  }


  /** */
  storePingResult(agentId: AgentId, isAgentPresent: boolean) {
    //console.log("storePingResult() responseMap[" + agentId + "] | " + isAgentPresent)
    //console.log("storePingResult() before pingMap[" + agentId + "]", this._perspective.pingMap)
    this._perspective.responseMap.set(agentId, isAgentPresent);
    this._perspective.pingMap.set(agentId, Date.now());
    //console.log("storePingResult() after pingMap", this._perspective.pingMap);
    this.notifySubscribers();
  }



  /** -- -- */

  async pingAgent(destination: AgentId): Promise<boolean> {
    return this.zomeProxy.pingAgent(destination.hash);
  }


  /** -- Handle -- */

  async setHandle(newName: string): Promise<void> {
    await this.zomeProxy.setHandle(newName);
  }

  async getMyHandle(): Promise<string> {
    return this.zomeProxy.getMyHandle();
  }

  async sendMail(input: SendMailInput): Promise<void> {
    const ah = await this.zomeProxy.sendMail(input);
    //await this.zomeProxy.testEncryption(input.to[0]);
    //await this.probeMails();
  }


  /** -- Mail -- */

  async acknowledgeMail(inmailAh: ActionId): Promise<void> {
    await this.zomeProxy.acknowledgeMail(inmailAh.hash);
  }

  async deleteMail(ah: ActionId): Promise<boolean> {
    const maybe = await this.zomeProxy.deleteMail(ah.hash);
    return !!maybe;
  }


    /** -- File -- */

    async getMissingAttachments(from: AgentId, inmailAh: ActionId): Promise<number> {
      return this.zomeProxy.getMissingAttachments({from: from.hash, inmail_ah: inmailAh.hash});

    }


    async getManifest(manifestAddress: DhtId): Promise<FileManifest> {
      return this.zomeProxy.getManifest(manifestAddress.hash);
    }


    async findManifest(contentHash: string): Promise<FileManifest | null> {
      return this.zomeProxy.findManifest(contentHash);
    }

    async getChunk(chunkEh: EntryId): Promise<string> {
      return this.zomeProxy.getChunk(chunkEh.hash);
    }

    /** */
    async writeManifest(
    dataHash: string,
    filename: string,
    filetype: string,
    orig_filesize: number,
    chunks: EntryId[]): Promise<ActionId> {
    const params: WriteManifestInput = {
      data_hash: dataHash,
      filename, filetype, orig_filesize,
      chunks: chunks.map(id => id.hash)
    }
    const ah = await this.zomeProxy.writeManifest(params);
    return new ActionId(ah);
  }

  /** */
  async writeChunk(dataHash: string, chunkIndex: number, chunk: string): Promise<EntryId> {
    const params = {
      data_hash: dataHash,
      chunk_index: chunkIndex,
      chunk
    }
    const eh =await this.zomeProxy.writeChunk(params);
    return new EntryId(eh);
  }
}
