import { NativeTvPlayerService } from './native-tv-player.service';

describe('NativeTvPlayerService', () => {
    const originalCapacitor = window.Capacitor;

    afterEach(() => {
        window.Capacitor = originalCapacitor;
    });

    it('is unavailable in a regular browser', () => {
        window.Capacitor = undefined;
        expect(new NativeTvPlayerService().isAvailable()).toBe(false);
        expect(
            new NativeTvPlayerService().shouldPlay({
                streamUrl: 'https://example.test/live.m3u8',
            })
        ).toBe(false);
    });

    it('plays through Capacitor NativePlayer and skips ClearKey DRM', async () => {
        const play = jest.fn().mockResolvedValue({ engine: 'vlc' });
        const stop = jest.fn().mockResolvedValue(undefined);
        window.Capacitor = {
            isNativePlatform: () => true,
            Plugins: { NativePlayer: { play, stop } },
        };

        const service = new NativeTvPlayerService();
        expect(service.isAvailable()).toBe(true);
        expect(
            service.shouldPlay({
                streamUrl: 'https://example.test/live.m3u8',
            })
        ).toBe(true);
        expect(
            service.shouldPlay({
                streamUrl: 'https://example.test/movie.mpd',
                drm: { keySystem: 'clearkey' },
            })
        ).toBe(false);

        await expect(
            service.playFromPlayback({
                streamUrl: 'https://example.test/live.m3u8',
                title: 'News',
            })
        ).resolves.toBe(true);
        expect(play).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'https://example.test/live.m3u8',
                title: 'News',
                mime: 'application/x-mpegURL',
                fullscreen: true,
            })
        );
        expect(service.isPlaying()).toBe(true);

        await service.stop();
        expect(stop).toHaveBeenCalled();
        expect(service.isPlaying()).toBe(false);
    });
});
