import { DnaViewModel, ZvmDef } from "@ddd-qc/lit-happ";
import {AppSignal, AppSignalCb, encodeHashToBase64} from "@holochain/client";
import {SnapmailZvm} from "./snapmail.zvm";
import {Notification} from "@vaadin/notification";
import {MY_ELECTRON_API} from "../snapmail";


/**
 * TODO: Make a "passthrough" DVM generator in dna-client based on ZVM_DEFS
 */
export class SnapmailDvm extends DnaViewModel {

  /** -- DnaViewModel Interface -- */

  static readonly DEFAULT_BASE_ROLE_NAME = "rSnapmail";
  static readonly ZVM_DEFS: ZvmDef[] = [SnapmailZvm];

  readonly signalHandler?: AppSignalCb = this.handleSignal;


  /** QoL Helpers */
  get snapmailZvm(): SnapmailZvm {return this.getZomeViewModel(SnapmailZvm.DEFAULT_ZOME_NAME) as SnapmailZvm}


  /** -- ViewModel Interface -- */

  // TODO
  protected hasChanged(): boolean {return true}

  // TODO
  get perspective(): void {return}



  /** */
  handleSignal(signalwrapper: AppSignal) {
    console.log('Received signal:', signalwrapper);
    const controller = this.host;
    /** Handle signal */
    if (Object.prototype.hasOwnProperty.call(signalwrapper.data.payload,'ReceivedMail')) {
      const item = signalwrapper.data.payload.ReceivedMail;
      console.log("received_mail:", item);
      const notification = controller.shadowRoot!.getElementById('notifyMail') as Notification;
      notification.open();

      const mail = signalwrapper.data.payload.ReceivedMail;
      const pingedAgentB64 = encodeHashToBase64(mail.author);
      this.snapmailZvm.storePingResult({}, pingedAgentB64);

      if (MY_ELECTRON_API) {
        //console.log("handleSignal for ELECTRON");
        console.log({mail});
        const author_name = this.snapmailZvm.perspective.usernameMap.get(encodeHashToBase64(mail.author)) || 'unknown user';

        /** ELECTRON NOTIFICATION */
        const NOTIFICATION_TITLE = 'New mail received from ' + author_name;
        const NOTIFICATION_BODY = signalwrapper.data.payload.ReceivedMail.mail.subject;
        //const CLICK_MESSAGE = 'Notification clicked';

        // - Do Notification directly from web UI
        //new Notification(NOTIFICATION_TITLE, { body: NOTIFICATION_BODY })
        //  .onclick = () => console.log(CLICK_MESSAGE)

        /* Notify Electron main */
        const reply = MY_ELECTRON_API.newMailSync(NOTIFICATION_TITLE, NOTIFICATION_BODY)
        console.log({reply});
      }

      this.snapmailZvm.probeMails();
      return;
    }
    if (Object.prototype.hasOwnProperty.call(signalwrapper.data.payload,'ReceivedAck')) {
      const item = signalwrapper.data.payload.ReceivedAck;
      console.log("received_ack:", item);
      const pingedAgentB64 = encodeHashToBase64(item.from);
      this.snapmailZvm.storePingResult({}, pingedAgentB64);
      const notification = controller.shadowRoot!.getElementById('notifyAck') as Notification;
      notification.open();
      this.snapmailZvm.probeMails();
      return;
    }
    if (Object.prototype.hasOwnProperty.call(signalwrapper.data.payload,'ReceivedFile')) {
      const item = signalwrapper.data.payload.ReceivedFile;
      console.log("received_file:", item);
      const notification = controller.shadowRoot!.getElementById('notifyFile') as Notification;
      notification.open();
      return
    }
  }


}
