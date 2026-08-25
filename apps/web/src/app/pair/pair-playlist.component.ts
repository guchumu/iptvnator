import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RemotePlaylistPairService } from '@iptvnator/services';
import {
    normalizeRemotePlaylistDeviceId,
    toInfiniTvLoginFields,
    type InfiniTvLoginFields,
} from '@iptvnator/shared/interfaces';

@Component({
    selector: 'app-pair-playlist',
    imports: [FormsModule, TranslatePipe],
    templateUrl: './pair-playlist.component.html',
    styleUrl: './pair-playlist.component.scss',
})
export class PairPlaylistComponent implements OnInit {
    private readonly remotePair = inject(RemotePlaylistPairService);
    private readonly route = inject(ActivatedRoute);
    private readonly translate = inject(TranslateService);

    deviceId = '';
    listName = '';
    serverUrl = '';
    username = '';
    password = '';
    m3uUrl = '';
    readonly message = signal('');
    readonly error = signal('');
    readonly sending = signal(false);
    readonly infinitv = signal<InfiniTvLoginFields | null>(null);
    readonly copied = signal('');

    ngOnInit(): void {
        const fromQuery = normalizeRemotePlaylistDeviceId(
            this.route.snapshot.queryParamMap.get('id')
        );
        this.deviceId = fromQuery ?? '';
    }

    formatDeviceId(): void {
        this.deviceId =
            normalizeRemotePlaylistDeviceId(this.deviceId) ?? this.deviceId;
    }

    async submit(): Promise<void> {
        this.formatDeviceId();
        this.message.set('');
        this.error.set('');
        this.copied.set('');
        const fields = toInfiniTvLoginFields({
            m3uUrl: this.m3uUrl,
            serverUrl: this.serverUrl,
            username: this.username,
            password: this.password,
        });
        if (!fields) {
            this.error.set(this.translate.instant('PAIR.ERROR_PAYLOAD'));
            return;
        }
        this.infinitv.set(fields);

        const deviceId = normalizeRemotePlaylistDeviceId(this.deviceId);
        if (!deviceId) {
            this.message.set(this.translate.instant('PAIR.INFINITV_ONLY'));
            return;
        }

        this.sending.set(true);
        try {
            await this.remotePair.submitAssignment(deviceId, {
                listName: this.listName,
                serverUrl: this.serverUrl,
                username: this.username,
                password: this.password,
                m3uUrl: this.m3uUrl,
            });
            this.message.set(this.translate.instant('PAIR.SUCCESS'));
        } catch (error) {
            const key =
                error instanceof Error && error.message.startsWith('PAIR.')
                    ? error.message
                    : 'PAIR.ERROR_NETWORK';
            this.error.set(this.translate.instant(key));
        } finally {
            this.sending.set(false);
        }
    }

    async copyField(label: string, value: string): Promise<void> {
        if (!value) {
            return;
        }
        try {
            await navigator.clipboard.writeText(value);
            this.copied.set(label);
        } catch {
            this.copied.set('');
        }
    }
}
