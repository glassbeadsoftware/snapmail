import { AppWebsocket, InstalledAppId } from "@holochain/client";
import { SnapmailDvm, SnapmailPage } from "@snapmail/elements";
import { HvmDef, HappElement } from "@ddd-qc/lit-happ";
export declare const IS_ELECTRON: boolean;
/** */
export declare class SnapmailApp extends HappElement {
    private _loaded;
    static readonly HVM_DEF: HvmDef;
    private _adminWs;
    /** */
    constructor(socket?: AppWebsocket, appId?: InstalledAppId);
    get snapmailDvm(): SnapmailDvm;
    /** */
    happInitialized(): Promise<void>;
    /** */
    render(): import("lit-html").TemplateResult<1>;
    /** */
    static get scopedElements(): {
        "snapmail-page": typeof SnapmailPage;
    };
}
