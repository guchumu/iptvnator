import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import {
    isBackKey,
    isConfirmKey,
    isPlayPauseKey,
    isTvLayout,
    isTypingTarget,
    NativeTvPlayerService,
    navDirectionFromEvent,
    pickSpatialNeighbor,
    queryTvFocusables,
    type TvNavDirection,
} from '@iptvnator/services';

const TV_FOCUSED_CLASS = 'tv-focused';

@Injectable({ providedIn: 'root' })
export class TvRemoteService {
    private readonly router = inject(Router);
    private readonly nativeTv = inject(NativeTvPlayerService);
    private started = false;
    private lastFocused: HTMLElement | null = null;

    start(): void {
        if (this.started || typeof document === 'undefined' || !isTvLayout()) {
            return;
        }
        this.started = true;
        document.addEventListener('keydown', this.onKeyDown, true);
        this.router.events
            .pipe(
                filter(
                    (event): event is NavigationEnd =>
                        event instanceof NavigationEnd
                )
            )
            .subscribe(() => {
                this.lastFocused = null;
                this.scheduleInitialFocus();
            });
        this.scheduleInitialFocus();
    }

    private readonly onKeyDown = (event: KeyboardEvent): void => {
        if (
            !isTvLayout() ||
            (isTypingTarget(event.target) && !isBackKey(event))
        ) {
            return;
        }
        if (this.isMaterialMenuOpen() && !isBackKey(event)) {
            return;
        }

        const direction = navDirectionFromEvent(event);
        if (direction) {
            event.preventDefault();
            this.moveFocus(direction);
            return;
        }
        if (isConfirmKey(event)) {
            event.preventDefault();
            this.activateFocused();
            return;
        }
        if (isPlayPauseKey(event)) {
            event.preventDefault();
            this.toggleInlinePlayback();
            return;
        }
        if (isBackKey(event)) {
            if (this.handleBack()) {
                event.preventDefault();
                event.stopPropagation();
            }
        }
    };

    private isMaterialMenuOpen(): boolean {
        return !!document.querySelector('.cdk-overlay-pane .mat-mdc-menu-panel');
    }

    private handleBack(): boolean {
        if (this.nativeTv.isPlaying()) {
            void this.nativeTv.stop();
            return true;
        }
        if (document.fullscreenElement) {
            void document.exitFullscreen();
            return true;
        }

        const backdrop = document.querySelector<HTMLElement>(
            '.cdk-overlay-backdrop.cdk-overlay-backdrop-showing'
        );
        if (backdrop) {
            backdrop.click();
            return true;
        }

        const url = this.router.url;
        if (/\/workspace\/playlists\//.test(url)) {
            void this.router.navigateByUrl('/workspace/sources');
            return true;
        }
        if (
            url.includes('/workspace/settings') ||
            url.includes('/workspace/search') ||
            url.includes('/workspace/recent')
        ) {
            void this.router.navigateByUrl('/workspace/sources');
            return true;
        }
        // Stay inside the PWA on the home/sources screen.
        return url.includes('/workspace');
    }

    private activateFocused(): void {
        const focused = this.currentFocusable();
        if (!focused) {
            this.scheduleInitialFocus();
            return;
        }
        focused.click();
    }

    private toggleInlinePlayback(): void {
        const video = document.querySelector('video');
        if (!video) {
            return;
        }
        if (video.paused) {
            void video.play();
        } else {
            video.pause();
        }
    }

    private moveFocus(direction: TvNavDirection): void {
        const focusables = queryTvFocusables();
        if (focusables.length === 0) {
            return;
        }
        const current =
            this.currentFocusable() ?? this.preferredInitial(focusables);
        if (!current) {
            return;
        }
        const currentRect = current.getBoundingClientRect();
        const next = pickSpatialNeighbor(
            currentRect,
            focusables
                .filter((element) => element !== current)
                .map((element) => ({
                    element,
                    rect: element.getBoundingClientRect(),
                })),
            direction
        );
        if (next) {
            this.focusElement(next);
            return;
        }
        this.nudgeScroll(current, direction);
    }

    private nudgeScroll(element: HTMLElement, direction: TvNavDirection): void {
        const parent = nearestScrollParent(element);
        if (!parent) {
            return;
        }
        const delta = direction === 'up' || direction === 'left' ? -120 : 120;
        if (direction === 'up' || direction === 'down') {
            parent.scrollBy({ top: delta, behavior: 'smooth' });
        } else {
            parent.scrollBy({ left: delta, behavior: 'smooth' });
        }
    }

    private currentFocusable(): HTMLElement | null {
        const active = document.activeElement;
        if (active instanceof HTMLElement && active.matches('[data-tv-focus]')) {
            return active;
        }
        if (this.lastFocused?.isConnected) {
            return this.lastFocused;
        }
        return document.querySelector<HTMLElement>(
            `.${TV_FOCUSED_CLASS}[data-tv-focus]`
        );
    }

    private preferredInitial(focusables: HTMLElement[]): HTMLElement | null {
        return (
            focusables.find((el) => el.classList.contains('active')) ??
            focusables.find((el) => el.classList.contains('selected')) ??
            focusables.find(
                (el) => el.getAttribute('aria-current') === 'page'
            ) ??
            focusables[0] ??
            null
        );
    }

    private scheduleInitialFocus(): void {
        requestAnimationFrame(() => {
            const existing = this.currentFocusable();
            if (existing && isElementVisible(existing)) {
                this.focusElement(existing);
                return;
            }
            const next = this.preferredInitial(queryTvFocusables());
            if (next) {
                this.focusElement(next);
            }
        });
    }

    private focusElement(element: HTMLElement): void {
        document
            .querySelectorAll(`.${TV_FOCUSED_CLASS}`)
            .forEach((node) => node.classList.remove(TV_FOCUSED_CLASS));
        if (!element.hasAttribute('tabindex')) {
            element.tabIndex = -1;
        }
        element.classList.add(TV_FOCUSED_CLASS);
        this.lastFocused = element;
        try {
            element.focus({ preventScroll: true });
        } catch {
            element.focus();
        }
        element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
}

function isElementVisible(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return rect.width > 2 && rect.height > 2;
}

function nearestScrollParent(element: HTMLElement): HTMLElement | null {
    let parent = element.parentElement;
    while (parent) {
        const canScroll =
            parent.scrollHeight > parent.clientHeight + 8 ||
            parent.scrollWidth > parent.clientWidth + 8;
        if (canScroll) {
            return parent;
        }
        parent = parent.parentElement;
    }
    return document.scrollingElement instanceof HTMLElement
        ? document.scrollingElement
        : null;
}
