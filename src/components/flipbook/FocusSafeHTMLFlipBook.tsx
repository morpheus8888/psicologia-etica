'use client';

import { PageFlip } from 'page-flip';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
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

const FocusSafeHTMLFlipBook = forwardRef<PageFlipHandle, FocusSafeFlipBookProps>(
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
    const pageFlipRef = useRef<PageFlip | null>(null);
    const childRefs = useRef<(HTMLElement | null)[]>([]);
    const previousLengthRef = useRef(0);
    const previousKeysRef = useRef<(string | number | null)[] | null>(null);
    const initialStartPageRef = useRef<number | undefined>(
      typeof rawSettings.startPage === 'number' ? rawSettings.startPage : undefined,
    );
    const layoutFrameRef = useRef<number | null>(null);
    const settingsSignatureRef = useRef<string | null>(null);
    const lastObservedSizeRef = useRef<{ width: number; height: number } | null>(null);

    const [flattenedPages, setFlattenedPages] = useState<React.ReactElement[]>([]);

    useImperativeHandle(
      ref,
      () => ({
        pageFlip: () => pageFlipRef.current ?? undefined,
      }),
      [],
    );

    useEffect(() => {
      if (typeof rawSettings.startPage === 'number') {
        initialStartPageRef.current = rawSettings.startPage;
      }
    }, [rawSettings.startPage]);

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

    void startPage;
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

    const settingsSignature = useMemo(() => JSON.stringify(flipSettings), [flipSettings]);

    const callbacksRef = useRef<{
      onFlip?: FocusSafeFlipBookProps['onFlip'];
      onChangeOrientation?: FocusSafeFlipBookProps['onChangeOrientation'];
      onChangeState?: FocusSafeFlipBookProps['onChangeState'];
      onInit?: FocusSafeFlipBookProps['onInit'];
      onUpdate?: FocusSafeFlipBookProps['onUpdate'];
    }>({
      onFlip,
      onChangeOrientation,
      onChangeState,
      onInit,
      onUpdate,
    });

    useEffect(() => {
      callbacksRef.current = {
        onFlip,
        onChangeOrientation,
        onChangeState,
        onInit,
        onUpdate,
      };
    }, [onFlip, onChangeOrientation, onChangeState, onInit, onUpdate]);

    const attachEvents = useCallback((instance: PageFlip) => {
      instance.off('flip');
      instance.off('changeOrientation');
      instance.off('changeState');
      instance.off('init');
      instance.off('update');

      instance.on('flip', (event: unknown) => {
        callbacksRef.current.onFlip?.(event);
      });
      instance.on('changeOrientation', (event: unknown) => {
        callbacksRef.current.onChangeOrientation?.(event);
      });
      instance.on('changeState', (event: unknown) => {
        callbacksRef.current.onChangeState?.(event);
      });
      instance.on('init', (event: unknown) => {
        callbacksRef.current.onInit?.(event);
      });
      instance.on('update', (event: unknown) => {
        callbacksRef.current.onUpdate?.(event);
      });
    }, []);

    const scheduleLayoutUpdate = useCallback(() => {
      const instance = pageFlipRef.current;
      if (!instance || typeof instance.update !== 'function') {
        return;
      }
      if (typeof window === 'undefined') {
        instance.update();
        return;
      }
      if (layoutFrameRef.current !== null) {
        window.cancelAnimationFrame(layoutFrameRef.current);
      }
      layoutFrameRef.current = window.requestAnimationFrame(() => {
        layoutFrameRef.current = null;
        instance.update();
      });
    }, []);

    useEffect(() => {
      if (!children) {
        if (flattenedPages.length > 0) {
          setFlattenedPages([]);
        }
        previousKeysRef.current = null;
        if (previousLengthRef.current !== 0) {
          previousLengthRef.current = 0;
        }
        return;
      }

      const collected: React.ReactElement[] = [];
      collectElementChildren(children, collected);
      const nextKeys = collected.map(child => child.key ?? null);
      const lengthChanged = collected.length !== previousLengthRef.current;
      const keysChanged = () => {
        const previous = previousKeysRef.current;
        if (!previous) {
          return true;
        }
        if (previous.length !== nextKeys.length) {
          return true;
        }
        for (let index = 0; index < nextKeys.length; index += 1) {
          if (previous[index] !== nextKeys[index]) {
            return true;
          }
        }
        return false;
      };

      const requiresRebuild = !renderOnlyPageLengthChange || lengthChanged || keysChanged();

      if (!requiresRebuild) {
        scheduleLayoutUpdate();
        return;
      }

      if (lengthChanged && collected.length < previousLengthRef.current) {
        pageFlipRef.current?.clear?.();
      }

      previousKeysRef.current = nextKeys;
      setFlattenedPages(collected);
    }, [children, flattenedPages.length, renderOnlyPageLengthChange, scheduleLayoutUpdate]);

    const pageNodes = useMemo(() => {
      childRefs.current = Array.from({ length: flattenedPages.length }, () => null as HTMLElement | null);
      return flattenedPages.map((child, index) => {
        const handleRef = (node: HTMLElement | null) => {
          childRefs.current[index] = node;
        };
        return React.cloneElement(child, { ref: handleRef });
      });
    }, [flattenedPages]);

    useLayoutEffect(() => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const nodes = childRefs.current.filter((node): node is HTMLElement => Boolean(node));

      if (nodes.length === 0) {
        previousLengthRef.current = 0;
        pageFlipRef.current?.clear?.();
        return;
      }

      const signatureChanged = settingsSignatureRef.current !== settingsSignature;
      let instance = pageFlipRef.current;

      const createInstance = () => {
        if (instance) {
          instance.off('flip');
          instance.off('changeOrientation');
          instance.off('changeState');
          instance.off('init');
          instance.off('update');
          instance.destroy();
        }
        instance = new PageFlip(container, {
          ...flipSettings,
          renderOnlyPageLengthChange,
          ...(typeof initialStartPageRef.current === 'number' ? { startPage: initialStartPageRef.current } : {}),
        } as Record<string, unknown>);
        pageFlipRef.current = instance;
        settingsSignatureRef.current = settingsSignature;
        attachEvents(instance);
        initialStartPageRef.current = undefined;
      };

      if (!instance || signatureChanged) {
        createInstance();
        instance!.loadFromHTML(nodes);
        previousLengthRef.current = nodes.length;
        scheduleLayoutUpdate();
        return;
      }

      const lengthChanged = nodes.length !== previousLengthRef.current;

      if (!renderOnlyPageLengthChange || lengthChanged) {
        instance.updateFromHtml(nodes);
        previousLengthRef.current = nodes.length;
        scheduleLayoutUpdate();
        return;
      }

      scheduleLayoutUpdate();
    }, [
      attachEvents,
      flipSettings,
      pageNodes,
      renderOnlyPageLengthChange,
      scheduleLayoutUpdate,
      settingsSignature,
    ]);

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
        const { width: nextWidth, height: nextHeight } = entry.contentRect;
        const previousSize = lastObservedSizeRef.current;
        if (
          previousSize
          && Math.abs(previousSize.width - nextWidth) < 0.5
          && Math.abs(previousSize.height - nextHeight) < 0.5
        ) {
          return;
        }
        lastObservedSizeRef.current = { width: nextWidth, height: nextHeight };

        const instance = pageFlipRef.current;
        if (!instance || typeof instance.update !== 'function') {
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

    useEffect(() => {
      return () => {
        if (layoutFrameRef.current !== null && typeof window !== 'undefined') {
          window.cancelAnimationFrame(layoutFrameRef.current);
        }
        const instance = pageFlipRef.current;
        if (instance) {
          instance.off('flip');
          instance.off('changeOrientation');
          instance.off('changeState');
          instance.off('init');
          instance.off('update');
          instance.destroy();
        }
        pageFlipRef.current = null;
      };
    }, []);

    return (
      <div ref={containerRef} className={className} style={style}>
        {pageNodes}
      </div>
    );
  },
);

FocusSafeHTMLFlipBook.displayName = 'FocusSafeHTMLFlipBook';

export type { FocusSafeFlipBookProps, PageFlipHandle };
export { FocusSafeHTMLFlipBook };
