/** */
export interface NetworkSettings {
    proxyUrl: string;
    bootstrapUrl: string;
    canMdns: boolean;
    canProxy: boolean;
}
/** */
export declare function loadNetworkConfig(sessionDataPath: string): NetworkSettings | undefined;
/** */
export declare function saveNetworkConfig(sessionDataPath: string, networkSettings: NetworkSettings): boolean;
