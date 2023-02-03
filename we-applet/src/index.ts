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
    weServices: WeServices,
    appletAppInfo: AppletInfo[],
  ): Promise<AppletRenderers> {
    return {
      full(element: HTMLElement, registry: CustomElementRegistry) {
        registry.define("snapmail-applet", SnapmailApp);
        const app = new SnapmailApp(appWebsocket, "snapmail-applet");
        element.appendChild(app);

        //element.innerHTML = `<snapmail-applet style="flex:1;display: flex;"></snapmail-applet>`;
        //const appletElement = element.querySelector("snapmail-applet") as any;
        //appletElement.appWebsocket =  appWebsocket;
        //appletElement.appletAppInfo = appletAppInfo;
        //appletElement.profilesStore = weServices.profilesStore;
      },
      blocks: [],
    };
  },
};


export default snapmailApplet;
