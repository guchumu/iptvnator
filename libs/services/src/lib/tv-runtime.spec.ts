import {
    detectTvRuntime,
    isBackKey,
    isConfirmKey,
    isNativeCapacitorApp,
    pickSpatialNeighbor,
} from './tv-runtime';

function fakeWindow(overrides: Record<string, unknown> = {}): Window {
    return {
        electron: undefined,
        StreamBoxNative: undefined,
        location: { search: '' },
        localStorage: { getItem: () => null },
        navigator: { userAgent: 'Mozilla/5.0' },
        innerWidth: 1280,
        innerHeight: 720,
        screen: { width: 1280 },
        matchMedia: () => ({ matches: false }),
        ...overrides,
    } as unknown as Window;
}

describe('tv-runtime', () => {
    it('never treats Electron as TV', () => {
        expect(
            detectTvRuntime(
                fakeWindow({
                    electron: {},
                    StreamBoxNative: { isTv: true },
                })
            )
        ).toBe(false);
    });

    it('trusts StreamBoxNative.isTv when a leftover native shell sets it', () => {
        expect(
            detectTvRuntime(
                fakeWindow({
                    StreamBoxNative: { isTv: true },
                    navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 12; Mobile)' },
                })
            )
        ).toBe(true);
    });

    it('detects the Capacitor APK and IptvnatorTV user agent', () => {
        expect(
            isNativeCapacitorApp(
                fakeWindow({
                    Capacitor: { isNativePlatform: () => true },
                })
            )
        ).toBe(true);
        expect(
            detectTvRuntime(
                fakeWindow({
                    navigator: {
                        userAgent:
                            'Mozilla/5.0 (Linux; Android 12) IptvnatorTV/1.0 Leanback',
                    },
                })
            )
        ).toBe(true);
    });

    it('does not force TV layout on a phone APK', () => {
        expect(
            detectTvRuntime(
                fakeWindow({
                    StreamBoxNative: { isTv: false },
                    navigator: { userAgent: 'Silk' },
                })
            )
        ).toBe(false);
    });

    it('detects Fire TV and Android TV user agents', () => {
        expect(
            detectTvRuntime(
                fakeWindow({
                    navigator: { userAgent: 'Mozilla/5.0 AFTMM Silk/118' },
                })
            )
        ).toBe(true);
        expect(
            detectTvRuntime(
                fakeWindow({
                    navigator: {
                        userAgent: 'Mozilla/5.0 (Linux; Android 12; SHIELD Android TV)',
                    },
                })
            )
        ).toBe(true);
    });

    it('allows forcing TV layout from the query string', () => {
        expect(
            detectTvRuntime(
                fakeWindow({
                    location: { search: '?tv=1' },
                    navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' },
                })
            )
        ).toBe(true);
    });

    it('recognizes TV remote OK and Back keys', () => {
        expect(isConfirmKey({ key: 'Enter', keyCode: 13 } as KeyboardEvent)).toBe(
            true
        );
        expect(isConfirmKey({ key: 'OK', keyCode: 23 } as KeyboardEvent)).toBe(
            true
        );
        expect(isBackKey({ key: 'Escape', keyCode: 27 } as KeyboardEvent)).toBe(
            true
        );
        expect(isBackKey({ key: 'GoBack', keyCode: 461 } as KeyboardEvent)).toBe(
            true
        );
    });

    it('picks the nearest neighbor in the requested direction', () => {
        const current = { left: 0, top: 0, width: 40, height: 40 } as DOMRect;
        const right = document.createElement('button');
        const below = document.createElement('button');
        const chosen = pickSpatialNeighbor(
            current,
            [
                { element: right, rect: { left: 80, top: 0, width: 40, height: 40 } as DOMRect },
                { element: below, rect: { left: 0, top: 80, width: 40, height: 40 } as DOMRect },
            ],
            'right'
        );
        expect(chosen).toBe(right);
    });
});
