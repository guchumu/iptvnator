/* SystemJS module definition */
declare const nodeModule: NodeModule;
interface NodeModule {
    id: string;
}

import type { ElectronBridgeApi } from '@iptvnator/shared/interfaces';

declare global {
    interface Window {
        electron: ElectronBridgeApi;
        process: NodeJS.Process;
        require: NodeRequire;
        Capacitor?: {
            isNativePlatform?: () => boolean;
            isNative?: boolean;
            Plugins?: {
                NativePlayer?: {
                    play?: (options: Record<string, unknown>) => Promise<unknown>;
                    stop?: () => Promise<unknown>;
                    addListener?: (
                        event: string,
                        cb: (ev: unknown) => void
                    ) => void;
                };
            };
        };
    }
}
