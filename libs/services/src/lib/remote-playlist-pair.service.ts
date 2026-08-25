import { Injectable, computed, inject, signal } from '@angular/core';
import {
    buildRemotePlaylistPairUrl,
    createRemotePlaylistDeviceId,
    isRemotePlaylistAssignment,
    normalizeRemotePlaylistDeviceId,
    REMOTE_PLAYLIST_DEVICE_ID_STORAGE_KEY,
    REMOTE_PLAYLIST_LAST_TS_STORAGE_KEY,
    type RemotePlaylistAssignment,
} from '@iptvnator/shared/interfaces';
import { RuntimeCapabilitiesService } from './runtime-capabilities.service';

const POLL_MS = 4000;

@Injectable({ providedIn: 'root' })
export class RemotePlaylistPairService {
    private readonly runtime = inject(RuntimeCapabilitiesService);

    readonly deviceId = signal(readOrCreateDeviceId());
    readonly pairUrl = computed(() =>
        buildRemotePlaylistPairUrl(
            globalThis.location?.origin ?? '',
            this.deviceId()
        )
    );
    readonly isAvailable = computed(() => !this.runtime.isElectron);
    readonly lastAssignment = signal<RemotePlaylistAssignment | null>(null);

    private pollTimer: ReturnType<typeof setInterval> | null = null;
    private inFlight = false;

    startPolling(): void {
        if (!this.isAvailable() || this.pollTimer) {
            return;
        }
        void this.pollOnce();
        this.pollTimer = setInterval(() => {
            void this.pollOnce();
        }, POLL_MS);
    }

    stopPolling(): void {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    markImported(ts: number): void {
        writeLastTs(ts);
    }

    async submitAssignment(
        deviceId: string,
        payload: {
            listName?: string;
            m3uUrl?: string;
            password?: string;
            serverUrl?: string;
            username?: string;
        }
    ): Promise<RemotePlaylistAssignment> {
        const normalized = normalizeRemotePlaylistDeviceId(deviceId);
        if (!normalized) {
            throw new Error('PAIR.ERROR_DEVICE');
        }
        const response = await fetch(pairEndpoint(normalized), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const body = (await response.json().catch(() => null)) as unknown;
        if (!response.ok || !isRemotePlaylistAssignment(body)) {
            throw new Error('PAIR.ERROR_PAYLOAD');
        }
        return body;
    }

    private async pollOnce(): Promise<void> {
        if (this.inFlight) {
            return;
        }
        this.inFlight = true;
        try {
            const response = await fetch(pairEndpoint(this.deviceId()));
            if (!response.ok) {
                return;
            }
            const body = (await response.json()) as unknown;
            if (!isRemotePlaylistAssignment(body)) {
                return;
            }
            if (body.ts <= readLastTs()) {
                return;
            }
            this.lastAssignment.set(body);
        } catch {
            // Keep waiting; a missing backend should not toast every few seconds.
        } finally {
            this.inFlight = false;
        }
    }
}

function pairEndpoint(deviceId: string): string {
    return `/api/pair/${encodeURIComponent(deviceId)}`;
}

function readOrCreateDeviceId(): string {
    try {
        const existing = normalizeRemotePlaylistDeviceId(
            localStorage.getItem(REMOTE_PLAYLIST_DEVICE_ID_STORAGE_KEY)
        );
        if (existing) {
            return existing;
        }
        const created = createRemotePlaylistDeviceId();
        localStorage.setItem(REMOTE_PLAYLIST_DEVICE_ID_STORAGE_KEY, created);
        return created;
    } catch {
        return createRemotePlaylistDeviceId();
    }
}

function readLastTs(): number {
    try {
        const raw = localStorage.getItem(REMOTE_PLAYLIST_LAST_TS_STORAGE_KEY);
        const value = raw ? Number(raw) : 0;
        return Number.isFinite(value) ? value : 0;
    } catch {
        return 0;
    }
}

function writeLastTs(ts: number): void {
    try {
        localStorage.setItem(REMOTE_PLAYLIST_LAST_TS_STORAGE_KEY, String(ts));
    } catch {
        // Ignore quota / private-mode failures.
    }
}
