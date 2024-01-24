import {
  AppAgentWebsocket, decodeHashFromBase64, encodeHashToBase64,
} from "@holochain/client";
//import { msg } from "@lit/localize";
import {
  RenderInfo,
  WeServices,
} from "@lightningrodlabs/we-applet";
import {AppletViewInfo, ProfilesApi} from "@ddd-qc/we-utils";
import {SnapmailApp} from "snapmail";
import {destructureCloneId, ExternalAppProxy} from "@ddd-qc/cell-proxy";
import {
  HCL,
  HappElement,
  HvmDef,
  DvmDef,
  DnaViewModel, snake, pascal,
} from "@ddd-qc/lit-happ";
import {ProfilesDvm, ProfilesProxy} from "@ddd-qc/profiles-dvm";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";
import {decode} from "@msgpack/msgpack";


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

  const maybeMyProfile = await grabMyProfile(appletViewInfo);


  /** Create SnapmailApp */
  const app = new SnapmailApp(
      mainAppWs,
      undefined,
      false,
      mainAppInfo.installed_app_id,
      appletViewInfo.view,
      weServices,
      appletViewInfo.appletHash,
      maybeMyProfile? maybeMyProfile.nickname : undefined);
  console.log("createSnapmailApplet() app", app);
  /** Done */
  return app;
}


/** */
async function grabMyProfile(appletViewInfo: AppletViewInfo): Promise<ProfileMat | undefined> {
  const profilesClient = appletViewInfo.profilesClient;
  const mainAppInfo = await appletViewInfo.appletClient.appInfo();

  /** Determine profilesAppInfo */
  const mainAppAgentWs = appletViewInfo.appletClient as AppAgentWebsocket;
  const mainAppWs = mainAppAgentWs.appWebsocket;
  let profilesAppInfo = await profilesClient.client.appInfo();
  console.log("createThreadsApplet() mainAppInfo", mainAppInfo);
  console.log("createThreadsApplet() profilesAppInfo", profilesAppInfo, profilesClient.roleName);

  /** Check if roleName is actually a cloneId */
  let maybeCloneId = undefined;
  let baseRoleName = profilesClient.roleName;
  const maybeBaseRoleName = destructureCloneId(profilesClient.roleName);
  if (maybeBaseRoleName) {
    baseRoleName = maybeBaseRoleName[0];
    maybeCloneId = profilesClient.roleName;
  }

  /** Determine profilesCellProxy */
  const hcl = new HCL(profilesAppInfo.installed_app_id, baseRoleName, maybeCloneId);
  const profilesApi = new ProfilesApi(profilesClient);
  const profilesAppProxy = new ExternalAppProxy(profilesApi, 10 * 1000);
  await profilesAppProxy.fetchCells(profilesAppInfo.installed_app_id, baseRoleName);
  const profilesCellProxyGen = await profilesAppProxy.createCellProxy(hcl);
  const profilesCellProxy = new ProfilesProxy(profilesCellProxyGen);
  console.log("grabMyProfile() profilesCellProxy", profilesCellProxy);

  // /** Create Profiles DVM */
  // const profilesDef: DvmDef = {ctor: ProfilesDvm, baseRoleName, isClonable: false};
  // const profilesDvm: ProfilesDvm = new profilesDef.ctor(this, profilesAppProxy, new HCL(profilesAppInfo.installed_app_id, baseRoleName, maybeCloneId)) as ProfilesDvm;
  // console.log("createProfilesDvm() dvm", profilesDvm);
  // await this.setupWeProfilesDvm(profilesDvm as ProfilesDvm, encodeHashToBase64(profilesAppInfo.agent_pub_key));
  // const maybeMyProfile = await profilesDvm.profilesZvm.probeProfile(profilesDvm.cell.agentPubKey);

  const rec = await profilesCellProxy.getAgentProfile(decodeHashFromBase64(profilesCellProxy.cell.agentPubKey));
  if (!rec) {
    console.log("grabMyProfile() no Profile found")
    return undefined;
  }
  const profile: ProfileMat = decode((rec.entry as any).Present.entry) as ProfileMat;
  console.log("grabMyProfile() Profile found:", profile);

  return profile;
}
