
import {asCellProxy, wrapPathInSvg} from "@ddd-qc/we-utils";
import {AppClient, encodeHashToBase64} from "@holochain/client";
import {pascal} from "@ddd-qc/cell-proxy";
import {mdiFileOutline, mdiEmailOutline} from "@mdi/js";
import {AssetInfo, RecordInfo, WAL} from "@theweave/api";
import {
    SnapmailDvm,
    SnapmailEntryType,
    GetMailOutput, SnapmailProxy, SNAPMAIL_DEFAULT_ROLE_NAME, SNAPMAIL_DEFAULT_INTEGRITY_ZOME_NAME
} from "@snapmail/elements";


/** */
export async function getAssetInfo(
    appletClient: AppClient,
    wal: WAL,
    recordInfo?: RecordInfo,
): Promise<AssetInfo | undefined> {
    console.log("Snapmail/we-applet/getAssetInfo():", wal, recordInfo);
    if (!recordInfo) {
        throw new Error(`Snapmail/we-applet/getAssetInfo(): Missing recordInfo'.`);
    }
    if (recordInfo.roleName != SNAPMAIL_DEFAULT_ROLE_NAME) {
        throw new Error(`Snapmail/we-applet/getAssetInfo(): Unknown role name '${recordInfo.roleName}'.`);
    }
    if (recordInfo.integrityZomeName != SNAPMAIL_DEFAULT_INTEGRITY_ZOME_NAME) {
        throw new Error(`Snapmail/we-applet/getAssetInfo(): Unknown zome '${recordInfo.integrityZomeName}'.`);
    }

    const mainAppInfo = await appletClient.appInfo();
    const pEntryType = pascal(recordInfo.entryType);

    console.log("Snapmail/we-applet/getAssetInfo(): pEntryType", pEntryType);
    switch (pEntryType) {
        case SnapmailEntryType.InMail:
        case SnapmailEntryType.OutMail:
            console.log("Snapmail/we-applet/getAssetInfo(): mail info", wal);
            const cellProxy = await asCellProxy(
                appletClient,
                undefined, // hrlc.hrl[0],
                mainAppInfo.installed_app_id,
                SnapmailDvm.DEFAULT_BASE_ROLE_NAME);
            console.log("Snapmail/we-applet/getAssetInfo(): cellProxy", cellProxy);
            const proxy/*: SnapmailProxy */ = new SnapmailProxy(cellProxy);
            console.log("Snapmail/we-applet/getAssetInfo(): getFile()", encodeHashToBase64(wal.hrl[1]), proxy);
            const mailOutput: GetMailOutput = await proxy.getMail(wal.hrl[1]);
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
            throw new Error(`Snapmail/we-applet/getAssetInfo(): Unhandled entry type ${recordInfo.entryType}.`);
    }
}




