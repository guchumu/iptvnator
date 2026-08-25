import { Injectable, signal } from '@angular/core';
import { isNativeCapacitorApp } from './tv-runtime';

export interface NativeTvPlayRequest {
    url: string;
    title?: string;
    mime?: string;
}

type NativePlayerPlugin = {
    play: (opts: Record<string, unknown>) => Promise<{ engine?: string }>;
    stop?: () => Promise<void>;
    addListener?: (
        event: string,
        cb: (ev: { stopped?: boolean; engine?: string }) => void
    ) => void;
};

function mimeForUrl(url: string): string {
    if (/\.m3u8(\?|$)/i.test(url) || url.toLowerCase().includes('.m3u8')) {
        return 'application/x-mpegURL';
    }
    if (/\.mpd(\?|$)/i.test(url)) {
        return 'application/dash+xml';
    }
    return 'video/mp2t';
}

function nativePlayerPlugin(win: Window = window): NativePlayerPlugin | null {
    try {
        if (!isNativeCapacitorApp(win)) {
            return null;
        }
        const capacitor = win.Capacitor as
            | { Plugins?: { NativePlayer?: NativePlayerPlugin } }
            | undefined;
        const plugin = capacitor?.Plugins?.NativePlayer;
        return plugin && typeof plugin.play === 'function' ? plugin : null;
    } catch {
        return null;
    }
}

@Injectable({ providedIn: 'root' })
export class NativeTvPlayerService {
    private generation = 0;
    private eventsBound = false;
    readonly playing = signal(false);

    isAvailable(win: Window = window): boolean {
        return nativePlayerPlugin(win) !== null;
    }

    shouldPlay(
        playback: { streamUrl?: string; drm?: unknown } | null | undefined,
        win: Window = window
    ): boolean {
        const url = playback?.streamUrl?.trim();
        return (
            this.isAvailable(win) &&
            !!url &&
            playback?.drm === undefined
        );
    }

    isPlaying(): boolean {
        return this.playing();
    }

    async playFromPlayback(
        playback: { streamUrl?: string; title?: string; drm?: unknown } | null
    ): Promise<boolean> {
        if (!this.shouldPlay(playback)) {
            await this.stop();
            return false;
        }
        return this.play({
            url: playback?.streamUrl ?? '',
            title: playback?.title,
        });
    }

    async play(request: NativeTvPlayRequest): Promise<boolean> {
        const plugin = nativePlayerPlugin();
        const url = request.url.trim();
        if (!plugin || !url) {
            return false;
        }
        this.bindEvents(plugin);
        const gen = ++this.generation;
        try {
            await plugin.play({
                url,
                title: request.title ?? '',
                mime: request.mime || mimeForUrl(url),
                fullscreen: true,
            });
            if (gen !== this.generation) {
                return true;
            }
            this.playing.set(true);
            return true;
        } catch {
            if (gen === this.generation) {
                this.playing.set(false);
            }
            return false;
        }
    }

    async stop(): Promise<void> {
        this.generation += 1;
        this.playing.set(false);
        const plugin = nativePlayerPlugin();
        if (!plugin?.stop) {
            return;
        }
        try {
            await plugin.stop();
        } catch {
            // Native stop is best-effort; the next play replaces the session.
        }
    }

    private bindEvents(plugin: NativePlayerPlugin): void {
        if (this.eventsBound || typeof plugin.addListener !== 'function') {
            return;
        }
        this.eventsBound = true;
        plugin.addListener('nativePlayer', (ev) => {
            if (ev?.stopped) {
                this.playing.set(false);
            }
        });
    }
}
