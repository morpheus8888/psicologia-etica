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

const collectElementChildren = (node: React.ReactNode): React.ReactElement[] => {
  if (Array.isArray(node)) {
    const collected: React.ReactElement[] = [];
    node.forEach((item) => {
      collectElementChildren(item).forEach(child => collected.push(child));
    });
    return collected;
  }

  if (!node || typeof node === 'boolean') {
    return [];
  }

  if (!React.isValidElement(node)) {
    return [];
  }

  if (node.type === React.Fragment) {
    return collectElementChildren(node.props.children);
  }

  return [node];
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
        startPage,
        startZIndex,
        swipeDistance,
        useMouseEvents,
        usePortrait,
        width,
      ],
    );

    useEffect(() => {
      if (!children) {
        previousKeysRef.current = null;
        if (pages.length > 0) {
          childDomNodesRef.current = [];
          setPages([]);
        }
        return;
      }

      const childElements = collectElementChildren(children);
      const nextKeys = childElements.map(child => child.key ?? null);

      const childCount = childElements.length;
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
      if (childElements.length < previousLengthRef.current) {
        refreshOnPageDelete();
      }

      setPages(childElements);
    }, [children, pages.length, refreshOnPageDelete, renderOnlyPageLengthChange]);

    useEffect(() => {
      if (!containerRef.current) {
        childDomNodesRef.current = [];
        return;
      }
      const nodes = Array.from(containerRef.current.children).filter(
        (node): node is HTMLElement => node instanceof HTMLElement,
      );
      childDomNodesRef.current = nodes;
    }, [pages]);

    useEffect(() => {
      const instance = pageFlipRef.current;
      if (pages.length === 0 || childDomNodesRef.current.length === 0) {
        return;
      }

      removeHandlers();

      if (!instance && containerRef.current) {
        pageFlipRef.current = new PageFlip(containerRef.current, {
          ...flipSettings,
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
