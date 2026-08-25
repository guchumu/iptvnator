import {
    isRemotePlaylistAssignment,
    normalizeRemotePlaylistDeviceId,
    type RemotePlaylistAssignment,
    type RemotePlaylistPairResponse,
} from '@iptvnator/shared/interfaces';

const MAX_FIELD_LENGTH = 2048;
const MAX_NAME_LENGTH = 64;

export function createRemotePlaylistPairStore() {
    const assignments = new Map<string, RemotePlaylistAssignment>();

    return {
        get(deviceId: string): RemotePlaylistPairResponse {
            const normalized = normalizeRemotePlaylistDeviceId(deviceId);
            if (!normalized) {
                return { status: 'esperando' };
            }
            return assignments.get(normalized) ?? { status: 'esperando' };
        },
        put(
            deviceId: string,
            payload: unknown
        ): RemotePlaylistAssignment | { error: string; status: number } {
            const normalized = normalizeRemotePlaylistDeviceId(deviceId);
            if (!normalized) {
                return { error: 'Invalid device id', status: 400 };
            }
            const parsed = parseAssignmentPayload(payload);
            if ('error' in parsed) {
                return parsed;
            }
            assignments.set(normalized, parsed);
            return parsed;
        },
    };
}

export type RemotePlaylistPairStore = ReturnType<
    typeof createRemotePlaylistPairStore
>;

function parseAssignmentPayload(
    payload: unknown
): RemotePlaylistAssignment | { error: string; status: number } {
    if (!payload || typeof payload !== 'object') {
        return { error: 'Missing playlist payload', status: 400 };
    }
    const body = payload as Record<string, unknown>;
    const m3uUrl = readTrimmed(body['m3uUrl'], MAX_FIELD_LENGTH);
    let serverUrl = readTrimmed(body['serverUrl'], MAX_FIELD_LENGTH);
    let username = readTrimmed(body['username'], MAX_FIELD_LENGTH);
    let password = readTrimmed(body['password'], MAX_FIELD_LENGTH);
    const listName = readTrimmed(body['listName'], MAX_NAME_LENGTH);

    if (m3uUrl && !serverUrl) {
        username = '';
        password = '';
    }

    const assignment: RemotePlaylistAssignment = {
        status: 'listo',
        m3uUrl,
        serverUrl,
        username,
        password,
        listName,
        ts: Date.now(),
    };

    if (!isRemotePlaylistAssignment(assignment)) {
        return {
            error: 'Provide an M3U URL or Xtream server, username and password',
            status: 400,
        };
    }

    return assignment;
}

function readTrimmed(value: unknown, maxLength: number): string {
    if (typeof value !== 'string') {
        return '';
    }
    return value.trim().slice(0, maxLength);
}
