export type TvNavDirection = 'up' | 'down' | 'left' | 'right';

const BACK_KEYS = new Set(['Escape', 'Backspace', 'BrowserBack', 'GoBack']);
const BACK_KEYCODES = new Set([4, 27, 8, 10009, 461]);
const OK_KEYS = new Set(['Enter', 'OK', 'Select', 'NumpadEnter']);
const OK_KEYCODES = new Set([13, 23]);
const PLAY_PAUSE_KEYS = new Set([
    'MediaPlayPause',
    'MediaPlay',
    'MediaPause',
    ' ',
]);

export interface StreamBoxNativeInfo {
    isTv?: boolean;
    hasExo?: boolean;
    hasVlc?: boolean;
    engine?: string;
    versionName?: string;
}

export function nativeTvFlag(win: Window = window): boolean | null {
    try {
        const native = win.StreamBoxNative;
        if (native && typeof native.isTv !== 'undefined') {
            return !!native.isTv;
        }
    } catch {
        // ignore
    }
    return null;
}

export function isNativeCapacitorApp(win: Window = window): boolean {
    try {
        const cap = win.Capacitor;
        if (
            cap &&
            (typeof cap.isNativePlatform === 'function'
                ? cap.isNativePlatform()
                : cap.isNative)
        ) {
            return true;
        }
    } catch {
        // ignore
    }
    try {
        const native = win.StreamBoxNative;
        if (native && (native.hasExo || native.hasVlc)) {
            return true;
        }
    } catch {
        // ignore
    }
    return false;
}

/**
 * 10-foot TV environment. Fire Stick / Silk and Android TV user
 * agents, `?tv=1`, and `localStorage iptvnator:force-tv=1` mark the PWA.
 * `window.StreamBoxNative.isTv` from the Capacitor APK wins when present.
 * Electron is never treated as TV.
 */
export function detectTvRuntime(win: Window = window): boolean {
    if (typeof win === 'undefined') {
        return false;
    }
    if (win.electron) {
        return false;
    }

    try {
        const params = new URLSearchParams(win.location?.search ?? '');
        if (params.get('tv') === '1' || params.get('tv') === 'true') {
            return true;
        }
    } catch {
        // ignore
    }
    try {
        if (win.localStorage?.getItem('iptvnator:force-tv') === '1') {
            return true;
        }
    } catch {
        // ignore
    }

    const nativeTv = nativeTvFlag(win);
    const ua = win.navigator?.userAgent ?? '';
    const isFireTv = /AFT|AmazonWebAppPlatform|Silk/i.test(ua);
    const isAndroidTv = /Android/i.test(ua) && /(TV|AOSP)/i.test(ua);
    const markedTv = /StreamBoxTV|IptvnatorTV|Leanback/i.test(ua);
    const coarse = win.matchMedia?.('(pointer: coarse)').matches ?? false;
    const noHover = win.matchMedia?.('(hover: none)').matches ?? false;
    const wide = Math.max(win.innerWidth || 0, win.screen?.width || 0) >= 960;
    const tall = (win.innerHeight || 0) >= 500;
    const heuristicTv =
        isFireTv ||
        isAndroidTv ||
        markedTv ||
        (coarse && noHover && wide && tall);

    return nativeTv === true || (nativeTv !== false && heuristicTv);
}

export function applyTvLayoutClasses(
    win: Window = window,
    isTv = detectTvRuntime(win)
): boolean {
    const doc = win.document;
    if (!doc) {
        return isTv;
    }
    doc.documentElement.classList.toggle('is-tv', isTv);
    if (isNativeCapacitorApp(win) && isTv) {
        doc.documentElement.classList.add('is-native-tv');
    } else {
        doc.documentElement.classList.remove('is-native-tv');
    }
    const applyBody = () => {
        doc.body?.classList.toggle('is-tv', isTv);
    };
    applyBody();
    if (!doc.body) {
        doc.addEventListener('DOMContentLoaded', applyBody, { once: true });
    }
    return isTv;
}

export function isTvLayout(doc: Document = document): boolean {
    return (
        doc.documentElement.classList.contains('is-tv') ||
        doc.body?.classList.contains('is-tv') === true
    );
}

export function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return true;
    }
    return target.isContentEditable;
}

export function isBackKey(event: KeyboardEvent): boolean {
    return BACK_KEYS.has(event.key) || BACK_KEYCODES.has(event.keyCode);
}

export function isConfirmKey(event: KeyboardEvent): boolean {
    return OK_KEYS.has(event.key) || OK_KEYCODES.has(event.keyCode);
}

export function isPlayPauseKey(event: KeyboardEvent): boolean {
    return PLAY_PAUSE_KEYS.has(event.key);
}

export function navDirectionFromEvent(
    event: KeyboardEvent
): TvNavDirection | null {
    switch (event.key) {
        case 'ArrowUp':
            return 'up';
        case 'ArrowDown':
            return 'down';
        case 'ArrowLeft':
            return 'left';
        case 'ArrowRight':
            return 'right';
        default:
            return null;
    }
}

export function isTvFocusable(element: HTMLElement): boolean {
    if (
        element.hasAttribute('disabled') ||
        element.getAttribute('aria-disabled') === 'true'
    ) {
        return false;
    }
    const style = element.ownerDocument.defaultView?.getComputedStyle(element);
    if (!style || style.display === 'none' || style.visibility === 'hidden') {
        return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 2 && rect.height > 2;
}

export function queryTvFocusables(root: ParentNode = document): HTMLElement[] {
    return Array.from(
        root.querySelectorAll<HTMLElement>('[data-tv-focus]')
    ).filter(isTvFocusable);
}

export function pickSpatialNeighbor(
    current: DOMRect,
    candidates: { element: HTMLElement; rect: DOMRect }[],
    direction: TvNavDirection
): HTMLElement | null {
    const cx = current.left + current.width / 2;
    const cy = current.top + current.height / 2;
    let best: HTMLElement | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
        const ox = candidate.rect.left + candidate.rect.width / 2;
        const oy = candidate.rect.top + candidate.rect.height / 2;
        const dx = ox - cx;
        const dy = oy - cy;
        const inDirection =
            direction === 'right'
                ? dx > 8
                : direction === 'left'
                  ? dx < -8
                  : direction === 'down'
                    ? dy > 8
                    : dy < -8;
        if (!inDirection) {
            continue;
        }
        const primary =
            direction === 'left' || direction === 'right'
                ? Math.abs(dx)
                : Math.abs(dy);
        const secondary =
            direction === 'left' || direction === 'right'
                ? Math.abs(dy)
                : Math.abs(dx);
        const score = primary + secondary * 3;
        if (score < bestScore) {
            bestScore = score;
            best = candidate.element;
        }
    }

    return best;
}
