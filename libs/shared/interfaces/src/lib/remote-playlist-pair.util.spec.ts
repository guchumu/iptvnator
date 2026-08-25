import {
    createRemotePlaylistDeviceId,
    normalizeRemotePlaylistDeviceId,
    REMOTE_PLAYLIST_DEVICE_ID_PATTERN,
    toInfiniTvLoginFields,
} from './remote-playlist-pair.util';

describe('remote playlist pair helpers', () => {
    it('formats a 6-character device id with dashes', () => {
        expect(normalizeRemotePlaylistDeviceId('ab12cd')).toBe('AB-12-CD');
        expect(normalizeRemotePlaylistDeviceId('AB-12-CD')).toBe('AB-12-CD');
        expect(normalizeRemotePlaylistDeviceId('ab-12-cd extra')).toBe(
            'AB-12-CD'
        );
        expect(normalizeRemotePlaylistDeviceId('abc')).toBeNull();
        expect(REMOTE_PLAYLIST_DEVICE_ID_PATTERN.test('ZZ-99-AA')).toBe(true);
    });

    it('creates a valid random device id', () => {
        const id = createRemotePlaylistDeviceId();
        expect(normalizeRemotePlaylistDeviceId(id)).toBe(id);
    });

    it('maps an M3U pairing payload onto InfiniTV login fields', () => {
        expect(
            toInfiniTvLoginFields({
                m3uUrl: 'http://provider.example/list.m3u',
                serverUrl: 'http://ignored',
                username: 'u',
                password: 'p',
            })
        ).toEqual({
            mode: 'm3u',
            serverUrl: 'http://provider.example/list.m3u',
            username: '',
            password: '',
        });
    });

    it('maps Xtream pairing payload onto InfiniTV login fields', () => {
        expect(
            toInfiniTvLoginFields({
                serverUrl: 'http://panel.example:8080',
                username: 'alice',
                password: 'secret',
            })
        ).toEqual({
            mode: 'xtream',
            serverUrl: 'http://panel.example:8080',
            username: 'alice',
            password: 'secret',
        });
    });

    it('returns null when pairing fields are incomplete', () => {
        expect(toInfiniTvLoginFields({ serverUrl: 'http://x' })).toBeNull();
        expect(toInfiniTvLoginFields({})).toBeNull();
    });
});
