declare module 'page-flip' {
  export type PageFlipEvent = unknown;

  export class PageFlip {
    constructor(element: HTMLElement, settings?: Record<string, unknown>);

    clear(): void;
    destroy(): void;
    flip(pageIndex: number, corner?: 'top' | 'bottom'): void;
    flipNext(corner?: 'top' | 'bottom'): void;
    flipPrev(corner?: 'top' | 'bottom'): void;
    getCurrentPageIndex(): number;
    getFlipController(): unknown;
    getPageCount(): number;
    loadFromHTML(nodes: HTMLElement[]): void;
    off(event: string): void;
    on(event: string, callback: (event: PageFlipEvent) => void): void;
    turnToNextPage(): void;
    turnToPage(pageIndex: number): void;
    turnToPrevPage(): void;
    update(): void;
    updateFromHtml(nodes: HTMLElement[]): void;
    getState(): string;
  }
}
