export const REMOTE_PLAYLIST_DEVICE_ID_PATTERN =
    /^[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2}$/;

export const REMOTE_PLAYLIST_DEVICE_ID_STORAGE_KEY = 'iptvnator:device-id';
export const REMOTE_PLAYLIST_LAST_TS_STORAGE_KEY = 'iptvnator:pair-last-ts';

export interface RemotePlaylistAssignment {
    readonly status: 'listo';
    readonly m3uUrl: string;
    readonly serverUrl: string;
    readonly username: string;
    readonly password: string;
    readonly listName: string;
    readonly ts: number;
}

export interface RemotePlaylistWaiting {
    readonly status: 'esperando';
}

export type RemotePlaylistPairResponse =
    | RemotePlaylistAssignment
    | RemotePlaylistWaiting;

const DEVICE_ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function normalizeRemotePlaylistDeviceId(
    raw: string | null | undefined
): string | null {
    const compact = String(raw ?? '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6);
    if (compact.length !== 6) {
        return null;
    }
    const formatted = `${compact.slice(0, 2)}-${compact.slice(2, 4)}-${compact.slice(4, 6)}`;
    return REMOTE_PLAYLIST_DEVICE_ID_PATTERN.test(formatted)
        ? formatted
        : null;
}

export function createRemotePlaylistDeviceId(): string {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    let compact = '';
    for (const byte of bytes) {
        compact += DEVICE_ID_CHARS[byte % DEVICE_ID_CHARS.length];
    }
    return `${compact.slice(0, 2)}-${compact.slice(2, 4)}-${compact.slice(4, 6)}`;
}

export function isRemotePlaylistAssignment(
    value: unknown
): value is RemotePlaylistAssignment {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const data = value as Partial<RemotePlaylistAssignment>;
    if (data.status !== 'listo' || typeof data.ts !== 'number') {
        return false;
    }
    const m3uUrl = typeof data.m3uUrl === 'string' ? data.m3uUrl.trim() : '';
    const serverUrl =
        typeof data.serverUrl === 'string' ? data.serverUrl.trim() : '';
    const username =
        typeof data.username === 'string' ? data.username.trim() : '';
    const password =
        typeof data.password === 'string' ? data.password.trim() : '';
    return m3uUrl !== '' || (serverUrl !== '' && username !== '' && password !== '');
}

export function buildRemotePlaylistPairUrl(
    origin: string,
    deviceId: string
): string {
    const normalizedOrigin = origin.replace(/\/+$/, '');
    return `${normalizedOrigin}/pair?id=${encodeURIComponent(deviceId)}`;
}

/**
 * Maps an IPTVnator pairing payload onto Extreme InfiniTV's login screen:
 * one Server URL field plus optional Username / Password.
 * M3U URLs go in Server URL with credentials left blank.
 */
export interface InfiniTvLoginFields {
    readonly mode: 'm3u' | 'xtream';
    readonly serverUrl: string;
    readonly username: string;
    readonly password: string;
}

export function toInfiniTvLoginFields(input: {
    m3uUrl?: string;
    serverUrl?: string;
    username?: string;
    password?: string;
}): InfiniTvLoginFields | null {
    const m3uUrl = input.m3uUrl?.trim() ?? '';
    const serverUrl = input.serverUrl?.trim() ?? '';
    const username = input.username?.trim() ?? '';
    const password = input.password?.trim() ?? '';
    if (m3uUrl) {
        return {
            mode: 'm3u',
            serverUrl: m3uUrl,
            username: '',
            password: '',
        };
    }
    if (serverUrl && username && password) {
        return {
            mode: 'xtream',
            serverUrl,
            username,
            password,
        };
    }
    return null;
}
