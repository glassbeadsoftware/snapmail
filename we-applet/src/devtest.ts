import {
    createDefaultWeServicesMock,
    DevTestNames,
    AppletViewInfo,
    setupDevtest,
    AssetViewInfo
} from "@ddd-qc/we-utils";
import {EntryHash, fakeActionHash} from "@holochain/client";
import {emptyEntryAppletView} from "@ddd-qc/we-utils/dist/mocks/renderInfoMock";
import {snake} from "@ddd-qc/cell-proxy";
import {createSnapmailApplet, ViewFileContext} from "./createSnapmailApplet";
import {AppletView} from "@lightningrodlabs/we-applet";
import {
    SNAPMAIL_DEFAULT_INTEGRITY_ZOME_NAME,
    SNAPMAIL_DEFAULT_ROLE_NAME,
    SnapmailDvm,
    SnapmailEntryType
} from "@snapmail/elements";

export const devtestNames: DevTestNames = {
    installed_app_id: "snapmail-applet",
    provisionedRoleName: SNAPMAIL_DEFAULT_ROLE_NAME,
}

//----------------------------------------------------------------------------------------------------------------------
// Block Views
//----------------------------------------------------------------------------------------------------------------------

// export type BlockViewInfo = {
//     type: "block";
//     block: string;
//     context: any;
// }

/** */
export function setupSnapmailBlockView(blockName: string) {
    const context: ViewFileContext = {
        detail: "none",
    }
    const appletView = {
        type: "block",
        block: blockName,
        context,
    } as AppletView;
    return setupDevtest(createSnapmailApplet, devtestNames, createDefaultWeServicesMock, appletView);
}


//----------------------------------------------------------------------------------------------------------------------
// Entry Views
//----------------------------------------------------------------------------------------------------------------------

/** */
export async function setupSnapmailEntryView() {
    console.log("setupSnapmailEntryView()");
    const context: ViewFileContext = {
        detail: "none",
    }
    const appletView = createInMailRenderInfo(await fakeActionHash(), context);
    return setupDevtest(createSnapmailApplet, devtestNames, createDefaultWeServicesMock, appletView);
}


/** */
function createInMailRenderInfo(eh: EntryHash, context: ViewFileContext): AssetViewInfo {
    const entryInfo = emptyEntryAppletView as AssetViewInfo;
    entryInfo.roleName = SNAPMAIL_DEFAULT_ROLE_NAME;
    entryInfo.integrityZomeName = SNAPMAIL_DEFAULT_INTEGRITY_ZOME_NAME;
    entryInfo.entryType = snake(SnapmailEntryType.InMail);
    entryInfo.wal.hrl[1] = eh;
    entryInfo.wal.context = context;

    return entryInfo;
}
