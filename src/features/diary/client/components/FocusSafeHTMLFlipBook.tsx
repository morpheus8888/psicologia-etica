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

      const mustRecreate = (
        !renderOnlyPageLengthChange
        || previousLengthRef.current !== childCount
        || keysChanged()
      );

      if (!mustRecreate) {
        return;
      }

      previousKeysRef.current = nextKeys;
      if (childCount < previousLengthRef.current) {
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
    }, [children, pages.length, refreshOnPageDelete, renderOnlyPageLengthChange]);

    useEffect(() => {
      childDomNodesRef.current = childRefs.current;
    }, [pages]);

    useEffect(() => {
      const instance = pageFlipRef.current;
      if (pages.length === 0 || childDomNodesRef.current.length === 0) {
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

      if (!nextInstance.getFlipController()) {
        nextInstance.loadFromHTML(childDomNodesRef.current);
      } else {
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
    }, [flipSettings, pages, removeHandlers, renderOnlyPageLengthChange, settingsMemo]);

    return (
      <div ref={containerRef} className={className} style={style}>
        {pages}
      </div>
    );
  },
);

FocusSafeHTMLFlipBook.displayName = 'FocusSafeHTMLFlipBook';

export type { PageFlipHandle };
export { FocusSafeHTMLFlipBook };
