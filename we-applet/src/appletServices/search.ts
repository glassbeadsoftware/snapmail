import {
    AgentPubKeyB64,
    AppAgentClient,
    decodeHashFromBase64,
    encodeHashToBase64,
} from "@holochain/client";
import {AppletHash, HrlWithContext} from "@lightningrodlabs/we-applet/dist/types";
import {WeServices} from "@lightningrodlabs/we-applet/dist/api";
import {asCellProxy} from "@ddd-qc/we-utils";
import {MailItem, SNAPMAIL_DEFAULT_ROLE_NAME, SnapmailProxy} from "@snapmail/elements";


/** */
export interface SnapmailSearchContext {
    author: AgentPubKeyB64,
    mail: MailItem,
}


/** Return EntryHashs of Manifests whose name match the search filter */
export async function search(
    appletClient: AppAgentClient,
    appletHash: AppletHash,
    weServices: WeServices,
    searchFilter: string,
): Promise<Array<HrlWithContext>> {
    console.log("Snapmail/we-applet/search():", searchFilter);
    const searchLC = searchFilter.toLowerCase();

    /** Get Cell proxy */
    const mainAppInfo = await appletClient.appInfo();
    const cellProxy = await asCellProxy(
        appletClient,
        undefined,
        mainAppInfo.installed_app_id,
        SNAPMAIL_DEFAULT_ROLE_NAME);
    console.log("Snapmail/we-applet/search(): cellProxy", cellProxy);
    const proxy/*: SnapmailProxy */ = new SnapmailProxy(cellProxy);
    const dnaHash = decodeHashFromBase64(proxy.cell.dnaHash);

    /** Search Private InMail */
    const mails: MailItem[] = await proxy.getAllMails();
    const matching: MailItem[] = mails.filter((mail) => mail.mail.subject.toLowerCase().includes(searchLC));


    /** Transform results into HrlWithContext */
    const results: Array<HrlWithContext> = matching
        .map((mail) => { return {
            hrl: [dnaHash, mail.ah],
            context: {author: encodeHashToBase64(mail.author), mail} as SnapmailSearchContext,
        }})

    /** Done */
    return results;
}
