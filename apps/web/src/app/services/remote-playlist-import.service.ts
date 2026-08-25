import { Injectable, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { PlaylistActions, selectAllPlaylistsMeta } from '@iptvnator/m3u-state';
import { DataService, RemotePlaylistPairService } from '@iptvnator/services';
import {
    PLAYLIST_PARSE_BY_URL,
    createRandomId,
    normalizeXtreamServerUrl,
    type Playlist,
    type RemotePlaylistAssignment,
} from '@iptvnator/shared/interfaces';

@Injectable({ providedIn: 'root' })
export class RemotePlaylistImportService {
    private readonly dataService = inject(DataService);
    private readonly remotePair = inject(RemotePlaylistPairService);
    private readonly snackBar = inject(MatSnackBar);
    private readonly store = inject(Store);
    private readonly translate = inject(TranslateService);
    private readonly playlists = toSignal(
        this.store.select(selectAllPlaylistsMeta),
        { initialValue: [] }
    );

    constructor() {
        effect(() => {
            const assignment = this.remotePair.lastAssignment();
            if (!assignment) {
                return;
            }
            untracked(() => {
                this.importAssignment(assignment);
                this.remotePair.markImported(assignment.ts);
            });
        });
    }

    start(): void {
        this.remotePair.startPolling();
    }

    private importAssignment(assignment: RemotePlaylistAssignment): void {
        if (this.alreadyImported(assignment)) {
            this.notify('HOME.PLAYLISTS.REMOTE_PAIR_ALREADY');
            return;
        }

        if (assignment.m3uUrl) {
            this.dataService.sendIpcEvent(PLAYLIST_PARSE_BY_URL, {
                url: assignment.m3uUrl,
                ...(assignment.listName ? { title: assignment.listName } : {}),
            });
            this.notify('HOME.PLAYLISTS.REMOTE_PAIR_IMPORTED');
            return;
        }

        let serverUrl = assignment.serverUrl;
        try {
            serverUrl = normalizeXtreamServerUrl(assignment.serverUrl);
        } catch {
            this.notify('PAIR.ERROR_PAYLOAD');
            return;
        }

        this.store.dispatch(
            PlaylistActions.addPlaylist({
                playlist: {
                    _id: createRandomId(),
                    title: assignment.listName || assignment.username,
                    password: assignment.password,
                    username: assignment.username,
                    serverUrl,
                    importDate: new Date().toISOString(),
                } as Playlist,
            })
        );
        this.notify('HOME.PLAYLISTS.REMOTE_PAIR_IMPORTED');
    }

    private alreadyImported(assignment: RemotePlaylistAssignment): boolean {
        return this.playlists().some((playlist) => {
            if (assignment.m3uUrl) {
                return playlist.url === assignment.m3uUrl;
            }
            return (
                playlist.serverUrl === assignment.serverUrl &&
                playlist.username === assignment.username
            );
        });
    }

    private notify(key: string): void {
        this.snackBar.open(this.translate.instant(key), undefined, {
            duration: 4000,
        });
    }
}
