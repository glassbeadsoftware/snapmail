
import {asCellProxy, wrapPathInSvg} from "@ddd-qc/we-utils";
import {AppAgentClient, encodeHashToBase64, RoleName, ZomeName} from "@holochain/client";
import {pascal} from "@ddd-qc/cell-proxy";
import {mdiFileOutline, mdiEmailOutline} from "@mdi/js";
import {Hrl, AssetInfo} from "@lightningrodlabs/we-applet";
import {
    SnapmailDvm,
    SnapmailEntryType,
    GetMailOutput, SnapmailProxy, SNAPMAIL_DEFAULT_ROLE_NAME, SNAPMAIL_DEFAULT_INTEGRITY_ZOME_NAME
} from "@snapmail/elements";
import {WAL} from "@lightningrodlabs/we-applet/dist/types";


/** */
export async function getAssetInfo(
    appletClient: AppAgentClient,
    roleName: RoleName,
    integrityZomeName: ZomeName,
    entryType: string,
    hrlc: WAL,
): Promise<AssetInfo | undefined> {
    console.log("Snapmail/we-applet/getAssetInfo():", roleName, integrityZomeName, hrlc);
    if (roleName != SNAPMAIL_DEFAULT_ROLE_NAME) {
        throw new Error(`Snapmail/we-applet/getAssetInfo(): Unknown role name '${roleName}'.`);
    }
    if (integrityZomeName != SNAPMAIL_DEFAULT_INTEGRITY_ZOME_NAME) {
        throw new Error(`Snapmail/we-applet/getAssetInfo(): Unknown zome '${integrityZomeName}'.`);
    }

    const mainAppInfo = await appletClient.appInfo();
    const pEntryType = pascal(entryType);

    console.log("Snapmail/we-applet/getAssetInfo(): pEntryType", pEntryType);
    switch (pEntryType) {
        case SnapmailEntryType.InMail:
        case SnapmailEntryType.OutMail:
            console.log("Snapmail/we-applet/getAssetInfo(): mail info", hrlc);
            const cellProxy = await asCellProxy(
                appletClient,
                undefined, // hrlc.hrl[0],
                mainAppInfo.installed_app_id,
                SnapmailDvm.DEFAULT_BASE_ROLE_NAME);
            console.log("Snapmail/we-applet/getAssetInfo(): cellProxy", cellProxy);
            const proxy/*: SnapmailProxy */ = new SnapmailProxy(cellProxy);
            console.log("Snapmail/we-applet/getAssetInfo(): getFile()", encodeHashToBase64(hrlc.hrl[1]), proxy);
            const mailOutput: GetMailOutput = await proxy.getMail(hrlc.hrl[1]);
            if (mailOutput == null) {
                return undefined;
            }
            console.log("Snapmail/we-applet/getAssetInfo(): mail", mailOutput);
            return {
                icon_src: wrapPathInSvg(mdiEmailOutline),
                name: mailOutput.mail.subject,
            };
        break;
        default:
            throw new Error(`Snapmail/we-applet/getAssetInfo(): Unhandled entry type ${entryType}.`);
    }
}




