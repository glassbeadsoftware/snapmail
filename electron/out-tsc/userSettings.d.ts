/**
 * Object for handling/storing all user preferences
 */
export declare class SettingsStore {
    path: string;
    data: any;
    constructor(opts: any);
    get(key: any): any;
    set(key: any, val: any): void;
}
/**
 *
 */
export declare function loadUserSettings(initialWidth: number, initialHeight: number): SettingsStore;
