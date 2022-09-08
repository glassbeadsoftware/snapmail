import {
  AdminWebsocket,
  AppWebsocket,
  InstalledAppInfo,
  // InstalledAppletInfo,
} from "@holochain/client";
import {
  WeApplet,
  AppletRenderers,
  WeServices,
  // WeInfo,
} from "@lightningrodlabs/we-applet";

//import { SnapmailApplet } from "./snapmail-applet";


// +++++++++++ to be removed if implemented in @lightningrodlabs/we-applet
export interface WeInfo {
  logoSrc: string;
  name: string;
}
export interface InstalledAppletInfo {
  weInfo: WeInfo,
  installedAppInfo: InstalledAppInfo,
}
// ++++++++++++


const snapmailApplet: WeApplet = {
  async appletRenderers(
    appWebsocket: AppWebsocket,
    adminWebsocket: AdminWebsocket,
    weServices: WeServices,
    appletAppInfo: InstalledAppletInfo[],
  ): Promise<AppletRenderers> {
    return {
      full(element: HTMLElement, registry: CustomElementRegistry) {
        if ((appletAppInfo as any).length > 1) {
          console.error("Wrong type of appletAppInfo passed. Expected only a single 'InstalledAppletInfo' but got multiple.")
        } else {
          element.innerHTML = ``;
          // registry.define("snapmail-applet", SnapmailApplet); /// ??
          // element.innerHTML = `<snapmail-applet style="flex: 1; display: flex;"></snapmail-applet>`;
          // let appletElement = element.querySelector("snapmail-applet") as any;
          //
          // appletElement.appWebsocket =  appWebsocket;
          // appletElement.profilesStore = weServices.profilesStore;
          // appletElement.appletAppInfo = appletAppInfo;
        }
      },
      blocks: [],
    };
  },
};


export default snapmailApplet;
