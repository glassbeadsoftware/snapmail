import {
  AppAgentWebsocket, encodeHashToBase64,
} from "@holochain/client";
//import { msg } from "@lit/localize";
import {
  RenderInfo,
  WeServices,
} from "@lightningrodlabs/we-applet";
import {AppletViewInfo} from "@ddd-qc/we-utils";
import {SnapmailApp} from "snapmail";


export interface ViewFileContext {
  detail: string,
}


/** */
export async function createSnapmailApplet(
  renderInfo: RenderInfo,
  weServices: WeServices,
): Promise<SnapmailApp> {

  if (renderInfo.type =="cross-applet-view") {
    throw Error("cross-applet-view not implemented by Snapmail");
  }

  const appletViewInfo = renderInfo as unknown as AppletViewInfo;
  const mainAppAgentWs = appletViewInfo.appletClient as AppAgentWebsocket;

  const mainAppWs = mainAppAgentWs.appWebsocket;

  console.log("createSnapmailApplet() client", appletViewInfo.appletClient);
  console.log("createSnapmailApplet() thisAppletId", appletViewInfo.appletHash);

  const mainAppInfo = await appletViewInfo.appletClient.appInfo();

  console.log("createSnapmailApplet() mainAppInfo", mainAppInfo, encodeHashToBase64(mainAppInfo.agent_pub_key));


  /** Create SnapmailApp */
  const app = new SnapmailApp(
      mainAppWs,
      undefined,
      false,
      mainAppInfo.installed_app_id,
      appletViewInfo.view,
      weServices,
      appletViewInfo.appletHash);
  console.log("createSnapmailApplet() app", app);
  /** Done */
  return app;

}
