import { ElectronHolochainOptions, StateSignal } from "@lightningrodlabs/electron-holochain";
import { NetworkSettings } from "./networkSettings";
/** Messages displayed on the splashscreen */
export declare enum StateSignalText {
    IsFirstRun = "Welcome to Snapmail...",
    IsNotFirstRun = "Loading...",
    CreatingKeys = "Creating cryptographic keys...",
    RegisteringDna = "Registering Profiles DNA to Holochain...",
    InstallingApp = "Installing DNA bundle to Holochain...",
    EnablingApp = "Enabling DNA...",
    AddingAppInterface = "Attaching API network port...",
    UnknownState = "Application is in an unknown state..."
}
/** */
export declare function stateSignalToText(state: StateSignal): StateSignalText;
/** */
export declare function createHolochainOptions(uid: string, storagePath: string, networkSettings: NetworkSettings): ElectronHolochainOptions;
/** */
export declare function loadDnaVersion(sessionDataPath: string): string | undefined;
