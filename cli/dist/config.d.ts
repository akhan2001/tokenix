import Conf from "conf";
interface TokenixConfig {
    apiKey: string;
    gatewayUrl: string;
    analyticsUrl: string;
}
export declare const config: Conf<TokenixConfig>;
export declare function getKey(): string;
export {};
