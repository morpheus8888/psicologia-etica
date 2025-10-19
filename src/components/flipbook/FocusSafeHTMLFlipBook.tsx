'use client';

import { PageFlip } from 'page-flip';
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { IEventProps, IFlipSetting } from 'react-pageflip/build/html-flip-book/settings';

type FocusSafeFlipBookProps = Partial<IFlipSetting & IEventProps> & {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  renderOnlyPageLengthChange?: boolean;
};

type PageFlipHandle = {
  pageFlip: () => PageFlip | undefined;
};

const collectElementChildren = (
  node: React.ReactNode,
  target: React.ReactElement[],
): void => {
  if (!node || typeof node === 'boolean') {
    return;
  }
  if (Array.isArray(node)) {
    node.forEach(child => collectElementChildren(child, target));
    return;
  }
  if (!React.isValidElement(node)) {
    return;
  }
  if (node.type === React.Fragment) {
    collectElementChildren(node.props.children, target);
    return;
  }
  target.push(node);
};

const FocusSafeHTMLFlipBook = React.forwardRef<PageFlipHandle, FocusSafeFlipBookProps>(
  (
    {
      children,
      className,
      style,
      renderOnlyPageLengthChange = true,
      onFlip,
      onChangeOrientation,
      onChangeState,
      onInit,
      onUpdate,
      ...rawSettings
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const childDomNodesRef = useRef<HTMLElement[]>([]);
    const pageFlipRef = useRef<PageFlip>();
    const [pages, setPages] = useState<React.ReactElement[]>([]);
    const previousLengthRef = useRef(0);
    const previousKeysRef = useRef<(string | number | null)[] | null>(null);
    const htmlRefreshModeRef = useRef<'force' | 'length-change' | 'reorder' | null>(null);
    const lastObservedSizeRef = useRef<{ width: number; height: number } | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        pageFlip: () => pageFlipRef.current,
      }),
      [],
    );

    useEffect(() => {
      previousLengthRef.current = pages.length;
    }, [pages.length]);

    const refreshOnPageDelete = useCallback(() => {
      if (pageFlipRef.current) {
        pageFlipRef.current.clear();
      }
    }, []);

    const removeHandlers = useCallback(() => {
      const instance = pageFlipRef.current;
      if (!instance) {
        return;
      }
      instance.off('flip');
      instance.off('changeOrientation');
      instance.off('changeState');
      instance.off('init');
      instance.off('update');
    }, []);

    const settingsMemo = useMemo(() => ({ onFlip, onChangeOrientation, onChangeState, onInit, onUpdate }), [
      onFlip,
      onChangeOrientation,
      onChangeState,
      onInit,
      onUpdate,
    ]);

    const scheduleLayoutUpdate = useCallback(() => {
      if (!renderOnlyPageLengthChange) {
        return;
      }
      const instance = pageFlipRef.current;
      if (!instance?.update) {
        return;
      }
      if (typeof window === 'undefined') {
        instance.update();
        return;
      }
      window.requestAnimationFrame(() => {
        instance.update();
      });
    }, [renderOnlyPageLengthChange]);

    const {
      startPage,
      size,
      width,
      height,
      minWidth,
      maxWidth,
      minHeight,
      maxHeight,
      drawShadow,
      flippingTime,
      usePortrait,
      startZIndex,
      autoSize,
      maxShadowOpacity,
      showCover,
      mobileScrollSupport,
      clickEventForward,
      useMouseEvents,
      swipeDistance,
      showPageCorners,
      disableFlipByClick,
      ...unknownSettings
    } = rawSettings;

    void unknownSettings;

    const flipSettings = useMemo(
      () => ({
        size,
        width,
        height,
        minWidth,
        maxWidth,
        minHeight,
        maxHeight,
        drawShadow,
        flippingTime,
        usePortrait,
        startZIndex,
        autoSize,
        maxShadowOpacity,
        showCover,
        mobileScrollSupport,
        clickEventForward,
        useMouseEvents,
        swipeDistance,
        showPageCorners,
        disableFlipByClick,
      }),
      [
        autoSize,
        clickEventForward,
        disableFlipByClick,
        drawShadow,
        flippingTime,
        height,
        maxHeight,
        maxShadowOpacity,
        maxWidth,
        minHeight,
        minWidth,
        mobileScrollSupport,
        showCover,
        showPageCorners,
        size,
        startZIndex,
        swipeDistance,
        useMouseEvents,
        usePortrait,
        width,
      ],
    );

    const childRefs = useRef<HTMLElement[]>([]);
    const initialStartPageRef = useRef<number | undefined>(typeof startPage === 'number' ? startPage : undefined);

    useEffect(() => {
      if (initialStartPageRef.current === undefined && typeof startPage === 'number') {
        initialStartPageRef.current = startPage;
      }
    }, [startPage]);

    useEffect(() => {
      if (!children) {
        previousKeysRef.current = null;
        childDomNodesRef.current = [];
        setPages([]);
        return;
      }

      const collected: React.ReactElement[] = [];
      collectElementChildren(children, collected);
      const childArray = collected;

      const nextKeys = childArray.map(child => child.key ?? null);
      const childCount = childArray.length;
      const keysChanged = () => {
        if (!previousKeysRef.current) {
          return true;
        }
        if (previousKeysRef.current.length !== nextKeys.length) {
          return true;
        }
        for (let index = 0; index < nextKeys.length; index += 1) {
          if (previousKeysRef.current[index] !== nextKeys[index]) {
            return true;
          }
        }
        return false;
      };

      const lengthChanged = previousLengthRef.current !== childCount;

      let refreshMode: 'force' | 'length-change' | 'reorder' | null = null;
      if (!renderOnlyPageLengthChange) {
        refreshMode = 'force';
      } else if (lengthChanged) {
        refreshMode = 'length-change';
      } else if (keysChanged()) {
        refreshMode = 'reorder';
      }

      if (!refreshMode) {
        scheduleLayoutUpdate();
        return;
      }

      htmlRefreshModeRef.current = refreshMode;
      previousKeysRef.current = nextKeys;
      if (refreshMode === 'length-change' && childCount < previousLengthRef.current) {
        refreshOnPageDelete();
      }

      childRefs.current = [];

      const mapped = childArray.map((child) => {
        const refCallback = (node: HTMLElement | null) => {
          if (node) {
            childRefs.current.push(node);
          }
        };
        // eslint-disable-next-line react/no-clone-element
        return React.cloneElement(child, { ref: refCallback });
      });

      setPages(mapped);
    }, [children, pages.length, refreshOnPageDelete, renderOnlyPageLengthChange, scheduleLayoutUpdate]);

    useEffect(() => {
      childDomNodesRef.current = childRefs.current;
    }, [pages]);

    useEffect(() => {
      const instance = pageFlipRef.current;
      if (pages.length === 0 || childDomNodesRef.current.length === 0) {
        htmlRefreshModeRef.current = null;
        return;
      }

      removeHandlers();

      if (!instance && containerRef.current) {
        const startPageSetting = initialStartPageRef.current;
        pageFlipRef.current = new PageFlip(containerRef.current, {
          ...flipSettings,
          ...(typeof startPageSetting === 'number' ? { startPage: startPageSetting } : {}),
          renderOnlyPageLengthChange,
        } as Record<string, unknown>);
      }

      const nextInstance = pageFlipRef.current;
      if (!nextInstance) {
        return;
      }

      const hasController = Boolean(nextInstance.getFlipController());
      const refreshMode = htmlRefreshModeRef.current;
      htmlRefreshModeRef.current = null;

      if (!hasController) {
        nextInstance.loadFromHTML(childDomNodesRef.current);
      } else if (refreshMode === 'length-change' || refreshMode === 'force') {
        nextInstance.updateFromHtml(childDomNodesRef.current);
      }

      if (settingsMemo.onFlip) {
        nextInstance.on('flip', (event: unknown) => settingsMemo.onFlip?.(event));
      }
      if (settingsMemo.onChangeOrientation) {
        nextInstance.on('changeOrientation', (event: unknown) => settingsMemo.onChangeOrientation?.(event));
      }
      if (settingsMemo.onChangeState) {
        nextInstance.on('changeState', (event: unknown) => settingsMemo.onChangeState?.(event));
      }
      if (settingsMemo.onInit) {
        nextInstance.on('init', (event: unknown) => settingsMemo.onInit?.(event));
      }
      if (settingsMemo.onUpdate) {
        nextInstance.on('update', (event: unknown) => settingsMemo.onUpdate?.(event));
      }

      if (!hasController || renderOnlyPageLengthChange || refreshMode === 'reorder') {
        scheduleLayoutUpdate();
      }
    }, [flipSettings, pages, removeHandlers, renderOnlyPageLengthChange, scheduleLayoutUpdate, settingsMemo]);

    useEffect(() => {
      if (!renderOnlyPageLengthChange) {
        return;
      }
      if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
        return;
      }
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      lastObservedSizeRef.current = { width: rect.width, height: rect.height };

      let frame: number | null = null;
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }
        const { width, height } = entry.contentRect;
        const previous = lastObservedSizeRef.current;
        if (
          previous
          && Math.abs(previous.width - width) < 0.5
          && Math.abs(previous.height - height) < 0.5
        ) {
          return;
        }
        lastObservedSizeRef.current = { width, height };

        const instance = pageFlipRef.current;
        if (!instance?.update) {
          return;
        }
        if (frame !== null) {
          window.cancelAnimationFrame(frame);
        }
        frame = window.requestAnimationFrame(() => {
          frame = null;
          instance.update();
        });
      });

      observer.observe(container);

      return () => {
        if (frame !== null) {
          window.cancelAnimationFrame(frame);
        }
        observer.disconnect();
        lastObservedSizeRef.current = null;
      };
    }, [renderOnlyPageLengthChange]);

    return (
      <div ref={containerRef} className={className} style={style}>
        {pages}
      </div>
    );
  },
);

FocusSafeHTMLFlipBook.displayName = 'FocusSafeHTMLFlipBook';

export type { FocusSafeFlipBookProps, PageFlipHandle };
export { FocusSafeHTMLFlipBook };
