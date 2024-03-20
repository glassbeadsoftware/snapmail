import {DevTestNames, setup} from "@ddd-qc/we-utils";
import {AppletServices} from "@lightningrodlabs/we-applet";
import {blockTypes} from "./appletServices/blockTypes";
import {devtestNames, setupSnapmailEntryView} from "./devtest";
import {getAttachableInfo} from "./appletServices/getAttachableInfo";
import {search} from "./appletServices/search";
import {createSnapmailApplet} from "./createSnapmailApplet";
import {SnapmailEntryType} from "@snapmail/elements";
import {AppAgentClient, RoleName, ZomeName} from "@holochain/client";
import {HrlWithContext} from "@lightningrodlabs/we-applet/dist/types";




/** */
export async function setupSnapmailApplet() {
  /** Determine appletView */
  let APPLET_VIEW = "main";
  try {
    APPLET_VIEW = process.env.APPLET_VIEW;
    //console.log(`HAPP_ENV defined by process.ENV: "${happEnv}"`);
  } catch (e) {
  }
  console.log("Snapmail we-applet setup() APPLET_VIEW", APPLET_VIEW);
  switch(APPLET_VIEW) {
      /** Entry views */
    case SnapmailEntryType.InMail:
    case SnapmailEntryType.OutMail: return setupSnapmailEntryView();
      ///** Block views */
      //case FilesBlockType.ViewMail:
      //case FilesBlockType.CreateMail:
      //case FilesBlockType.ViewInbox:
      /** Main View */
    case "main":
    default: return setupSnapmailsMainView();
  }
}


/** */
async function setupSnapmailsMainView() {
  const appletServices: AppletServices = {
    creatables: {},
    getAttachableInfo,
    blockTypes,
    search,
    bindAsset,
  };

  return setup(appletServices, createSnapmailApplet, devtestNames);
}

/** */
export async function bindAsset(
  appletClient: AppAgentClient,
  srcWal: HrlWithContext,
  dstWal: HrlWithContext,
  dstRoleName: RoleName,
  dstIntegrityZomeName: ZomeName,
  dstEntryType: string,
): Promise<void> {

}

///
export default setupSnapmailApplet;
