import { Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { QRCodeComponent } from 'angularx-qrcode';
import { RemotePlaylistPairService } from '@iptvnator/services';

@Component({
    selector: 'app-remote-playlist-pair-panel',
    imports: [QRCodeComponent, TranslatePipe],
    templateUrl: './remote-playlist-pair-panel.component.html',
    styleUrl: './remote-playlist-pair-panel.component.scss',
})
export class RemotePlaylistPairPanelComponent {
    private readonly remotePair = inject(RemotePlaylistPairService);

    readonly compact = input(false);

    readonly visible = computed(() => this.remotePair.isAvailable());
    readonly deviceId = this.remotePair.deviceId;
    readonly pairUrl = this.remotePair.pairUrl;
}
