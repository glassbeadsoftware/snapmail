/** */
export declare function initApp(userDataPath: string, appDataPath: string, dnaVersionFilename: string, runningZomeHashFilePath: string, uidListFilename: string): {
    sessionDataPath: string;
    uidList: string[];
};
/** */
export declare function addUidToDisk(newUid: string, sessionDataPath: string, uidListFilename: string): boolean;
