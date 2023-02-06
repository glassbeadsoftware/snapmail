import {
  AdminWebsocket,
  AppWebsocket,
} from "@holochain/client";
import {
  WeApplet,
  AppletRenderers,
  WeServices,
  AppletInfo,
} from "@lightningrodlabs/we-applet";
import {SnapmailApp} from "snapmail";


const snapmailApplet: WeApplet = {
  async appletRenderers(
    appWebsocket: AppWebsocket,
    adminWebsocket: AdminWebsocket,
    _weServices: WeServices,
    _appletAppInfo: AppletInfo[],
  ): Promise<AppletRenderers> {
    return {
      full(element: HTMLElement, registry: CustomElementRegistry) {
        console.log("snapmailApplet.full()")
        registry.define("snapmail-app", SnapmailApp);
        const app = new SnapmailApp(appWebsocket, adminWebsocket, "snapmail-applet");
        app.style = "flex:1;display: flex;";
        element.appendChild(app);
      },
      blocks: [],
    };
  },
};


export default snapmailApplet;
