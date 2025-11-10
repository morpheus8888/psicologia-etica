let liveRegion: HTMLElement | null = null;

const ensureLiveRegion = (): HTMLElement | null => {
  if (typeof document === 'undefined') {
    return null;
  }
  if (liveRegion && document.body.contains(liveRegion)) {
    return liveRegion;
  }
  const region = document.createElement('div');
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  region.setAttribute('data-flipbook-live-region', 'true');
  region.style.position = 'fixed';
  region.style.top = '-9999px';
  region.style.left = '-9999px';
  region.style.width = '1px';
  region.style.height = '1px';
  region.style.overflow = 'hidden';
  document.body.appendChild(region);
  liveRegion = region;
  return liveRegion;
};

export const announceFlipbookMessage = (message: string): void => {
  const region = ensureLiveRegion();
  if (!region) {
    return;
  }
  region.textContent = message;
};

export const createPageAnnouncement = (pageIndex: number, totalPages: number): string => {
  const safeIndex = Number.isFinite(pageIndex) ? pageIndex : 0;
  const bounded = Math.max(0, Math.min(totalPages - 1, safeIndex));
  return `Pagina ${bounded + 1} di ${totalPages}`;
};

export const focusElement = (element: HTMLElement | null): void => {
  if (!element) {
    return;
  }
  window.requestAnimationFrame(() => {
    element.focus({ preventScroll: true });
  });
};
