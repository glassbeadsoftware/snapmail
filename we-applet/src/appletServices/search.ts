import {
    AgentPubKeyB64, AppClient,
    encodeHashToBase64,
} from "@holochain/client";
import {AppletHash, WAL, WeaveServices} from "@theweave/api";
import {asCellProxy, intoHrl} from "@ddd-qc/we-utils";
import {MailItem, SNAPMAIL_DEFAULT_ROLE_NAME, SnapmailProxy} from "@snapmail/elements";
import {ActionId} from "@ddd-qc/cell-proxy";


/** */
export interface SnapmailSearchContext {
    author: AgentPubKeyB64,
    mail: MailItem,
}


/** Return EntryHashs of Manifests whose name match the search filter */
export async function search(
    appletClient: AppClient,
    appletHash: AppletHash,
    weServices: WeaveServices,
    searchFilter: string,
): Promise<Array<WAL>> {
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

    /** Search Private InMail */
    const mails: MailItem[] = await proxy.getAllMails();
    const matching: MailItem[] = mails.filter((mail) => mail.mail.subject.toLowerCase().includes(searchLC));


    /** Transform results into WAL */
    const results: Array<WAL> = matching
        .map((mail) => { return {
            hrl: intoHrl(proxy.cell.address.dnaId, new ActionId(mail.ah)),
            context: {author: encodeHashToBase64(mail.author), mail} as SnapmailSearchContext,
        }})

    /** Done */
    return results;
}
