import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { RemotePlaylistPairService } from '@iptvnator/services';
import { PairPlaylistComponent } from './pair-playlist.component';

describe('PairPlaylistComponent', () => {
    let submitAssignment: jest.Mock;
    let component: PairPlaylistComponent;

    beforeEach(async () => {
        submitAssignment = jest.fn().mockResolvedValue({
            status: 'listo',
            m3uUrl: 'http://provider.example/list.m3u',
            serverUrl: '',
            username: '',
            password: '',
            listName: '',
            ts: 1,
        });
        await TestBed.configureTestingModule({
            imports: [PairPlaylistComponent],
            providers: [
                {
                    provide: RemotePlaylistPairService,
                    useValue: { submitAssignment },
                },
                {
                    provide: TranslateService,
                    useValue: { instant: (key: string) => key },
                },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: { queryParamMap: { get: () => null } },
                    },
                },
            ],
        }).compileComponents();
        component = TestBed.createComponent(
            PairPlaylistComponent
        ).componentInstance;
        component.ngOnInit();
    });

    it('shows InfiniTV fields without posting when the device id is empty', async () => {
        component.m3uUrl = 'http://provider.example/list.m3u';
        await component.submit();
        expect(submitAssignment).not.toHaveBeenCalled();
        expect(component.infinitv()).toEqual({
            mode: 'm3u',
            serverUrl: 'http://provider.example/list.m3u',
            username: '',
            password: '',
        });
        expect(component.message()).toBe('PAIR.INFINITV_ONLY');
    });

    it('posts to the IPTVnator TV when a device id is present', async () => {
        component.deviceId = 'AB-12-CD';
        component.m3uUrl = 'http://provider.example/list.m3u';
        await component.submit();
        expect(submitAssignment).toHaveBeenCalledWith('AB-12-CD', {
            listName: '',
            serverUrl: '',
            username: '',
            password: '',
            m3uUrl: 'http://provider.example/list.m3u',
        });
        expect(component.message()).toBe('PAIR.SUCCESS');
    });

    it('maps Xtream credentials onto InfiniTV login fields', async () => {
        component.serverUrl = 'http://panel.example:8080';
        component.username = 'alice';
        component.password = 'secret';
        await component.submit();
        expect(component.infinitv()).toEqual({
            mode: 'xtream',
            serverUrl: 'http://panel.example:8080',
            username: 'alice',
            password: 'secret',
        });
    });
});
