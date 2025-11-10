'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type {
  FlipbookEngineApi,
  FlipbookEngineHookProps,
  FlipbookEngineState,
  FlipbookExternalController,
  FlipbookNavigationOptions,
} from '../types';
import {
  announceFlipbookMessage,
  createPageAnnouncement,
} from '../utils/accessibility';
import {
  clamp,
  easeOutCubic,
  toSpreadIndex,
} from '../utils/geometry';

const getAnimationDuration = (speed: number, inertia: number) => {
  const base = 680;
  const speedFactor = clamp(speed, 0.2, 2);
  const inertiaBonus = inertia * 320;
  return Math.max(320, (base - inertiaBonus) / speedFactor);
};

export const useFlipbookEngine = ({
  pageCount,
  initialPage = 0,
  settings,
  onPageChange,
  onNavigationComplete,
}: FlipbookEngineHookProps): FlipbookEngineApi => {
  const resolvedInitial = clamp(initialPage, 0, Math.max(pageCount - 1, 0));
  const [state, setState] = useState<FlipbookEngineState>(() => ({
    currentPage: resolvedInitial,
    targetPage: null,
    spreadIndex: toSpreadIndex(resolvedInitial, settings.twoPage),
    progress: 0,
    isAnimating: false,
    direction: null,
    pageCount,
    pagePairs: settings.twoPage ? Math.ceil(pageCount / 2) : pageCount,
    mode: settings.continuousScroll ? 'continuous' : 'paged',
  }));
  const stateRef = useRef(state);
  const animationFrameRef = useRef<number | null>(null);
  const animationStartRef = useRef<number | null>(null);
  const gestureElementRef = useRef<HTMLElement | null>(null);
  const pointerStateRef = useRef<{
    pointerId: number;
    startX: number;
    lastX: number;
    active: boolean;
  }>({
    pointerId: -1,
    startX: 0,
    lastX: 0,
    active: false,
  });
  const wheelBufferRef = useRef(0);
  const controllerRef = useRef<FlipbookExternalController | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const commitPage = useCallback((page: number, options?: { silent?: boolean }) => {
    const previousPage = stateRef.current?.currentPage ?? null;
    setState((current) => {
      if (current.currentPage === page && !current.isAnimating) {
        return {
          ...current,
          pageCount,
          pagePairs: settings.twoPage ? Math.ceil(pageCount / 2) : pageCount,
          mode: settings.continuousScroll ? 'continuous' : 'paged',
        };
      }
      return {
        ...current,
        currentPage: page,
        targetPage: null,
        progress: 0,
        isAnimating: false,
        direction: null,
        spreadIndex: toSpreadIndex(page, settings.twoPage),
        pageCount,
        pagePairs: settings.twoPage ? Math.ceil(pageCount / 2) : pageCount,
        mode: settings.continuousScroll ? 'continuous' : 'paged',
      };
    });
    if (previousPage !== page) {
      onPageChange?.(page);
      onNavigationComplete?.(page);
    }
    if (!options?.silent) {
      announceFlipbookMessage(createPageAnnouncement(page, pageCount));
    }
  }, [onNavigationComplete, onPageChange, pageCount, settings.continuousScroll, settings.twoPage]);

  useEffect(() => () => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    setState((current) => {
      const clampedCurrent = clamp(current.currentPage, 0, Math.max(pageCount - 1, 0));
      const spreadIndex = toSpreadIndex(clampedCurrent, settings.twoPage);
      const pagePairs = settings.twoPage ? Math.ceil(pageCount / 2) : pageCount;
      const mode = settings.continuousScroll ? 'continuous' : 'paged';
      if (
        clampedCurrent === current.currentPage
        && spreadIndex === current.spreadIndex
        && pagePairs === current.pagePairs
        && mode === current.mode
      ) {
        if (pageCount !== current.pageCount) {
          return {
            ...current,
            pageCount,
          };
        }
        return current;
      }
      return {
        ...current,
        currentPage: clampedCurrent,
        spreadIndex,
        pagePairs,
        pageCount,
        mode,
      };
    });
  }, [pageCount, settings.continuousScroll, settings.twoPage]);

  const goToPage = useCallback((page: number, options?: FlipbookNavigationOptions) => {
    const target = clamp(page, 0, Math.max(pageCount - 1, 0));
    const animate = options?.animate ?? true;
    if (!animate) {
      commitPage(target);
      return;
    }
    setState((current) => {
      if (current.currentPage === target) {
        return current;
      }
      return {
        ...current,
        targetPage: target,
        isAnimating: true,
        direction: target > current.currentPage ? 'next' : 'prev',
        progress: 0,
      };
    });
  }, [commitPage, pageCount]);

  const goNext = useCallback((options?: FlipbookNavigationOptions) => {
    let immediateTarget: number | null = null;
    setState((current) => {
      if (current.isAnimating) {
        return current;
      }
      const nextPage = clamp(current.currentPage + 1, 0, Math.max(pageCount - 1, 0));
      if (nextPage === current.currentPage) {
        return current;
      }
      if (options?.animate === false) {
        immediateTarget = nextPage;
        return current;
      }
      return {
        ...current,
        targetPage: nextPage,
        direction: 'next',
        isAnimating: true,
        progress: 0,
      };
    });
    if (immediateTarget !== null) {
      commitPage(immediateTarget);
    }
  }, [commitPage, pageCount]);

  const goPrevious = useCallback((options?: FlipbookNavigationOptions) => {
    let immediateTarget: number | null = null;
    setState((current) => {
      if (current.isAnimating) {
        return current;
      }
      const prevPage = clamp(current.currentPage - 1, 0, Math.max(pageCount - 1, 0));
      if (prevPage === current.currentPage) {
        return current;
      }
      if (options?.animate === false) {
        immediateTarget = prevPage;
        return current;
      }
      return {
        ...current,
        targetPage: prevPage,
        direction: 'prev',
        isAnimating: true,
        progress: 0,
      };
    });
    if (immediateTarget !== null) {
      commitPage(immediateTarget);
    }
  }, [commitPage, pageCount]);

  useEffect(() => {
    if (!state.isAnimating || state.targetPage === null) {
      return;
    }
    const duration = getAnimationDuration(settings.speed, settings.inertia);
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    animationStartRef.current = null;
    const tick = (timestamp: number) => {
      if (animationStartRef.current === null) {
        animationStartRef.current = timestamp;
      }
      const elapsed = timestamp - animationStartRef.current;
      const progress = clamp(easeOutCubic(elapsed / duration), 0, 1);
      setState((current) => {
        if (!current.isAnimating) {
          return current;
        }
        return {
          ...current,
          progress,
        };
      });
      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }
      commitPage(state.targetPage as number);
    };
    animationFrameRef.current = window.requestAnimationFrame(tick);
  }, [commitPage, settings.inertia, settings.speed, state.isAnimating, state.targetPage]);

  const handleWheel = useCallback((event: WheelEvent) => {
    if (!gestureElementRef.current) {
      return;
    }
    if (settings.continuousScroll) {
      return;
    }
    const dominantDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const threshold = 140 - settings.snapThreshold * 60;
    wheelBufferRef.current += dominantDelta;
    wheelBufferRef.current *= 0.85 + settings.inertia * 0.05;
    if (wheelBufferRef.current > threshold) {
      goNext({ source: 'wheel' });
      wheelBufferRef.current = 0;
    } else if (wheelBufferRef.current < -threshold) {
      goPrevious({ source: 'wheel' });
      wheelBufferRef.current = 0;
    }
    if (Math.abs(dominantDelta) > 4) {
      event.preventDefault();
    }
  }, [goNext, goPrevious, settings.continuousScroll, settings.inertia, settings.snapThreshold]);

  const handlePointerDown = useCallback((event: PointerEvent) => {
    if (settings.continuousScroll || (event.pointerType === 'touch' && settings.animation === 'none')) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    pointerStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      lastX: event.clientX,
      active: true,
    };
    gestureElementRef.current?.setPointerCapture(event.pointerId);
  }, [settings.animation, settings.continuousScroll]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const pointerState = pointerStateRef.current;
    if (!pointerState.active || pointerState.pointerId !== event.pointerId) {
      return;
    }
    pointerStateRef.current = {
      ...pointerState,
      lastX: event.clientX,
    };
  }, []);

  const handlePointerUp = useCallback((event: PointerEvent) => {
    const pointerState = pointerStateRef.current;
    if (!pointerState.active || pointerState.pointerId !== event.pointerId) {
      return;
    }
    pointerStateRef.current = {
      pointerId: -1,
      startX: 0,
      lastX: 0,
      active: false,
    };
    const dx = event.clientX - pointerState.startX;
    const direction = dx > 0 ? 'prev' : 'next';
    const threshold = Math.max(40, 120 - settings.snapThreshold * 80);
    if (Math.abs(dx) >= threshold) {
      if (direction === 'next') {
        goNext({ source: 'drag' });
      } else {
        goPrevious({ source: 'drag' });
      }
    }
    gestureElementRef.current?.releasePointerCapture(event.pointerId);
  }, [goNext, goPrevious, settings.snapThreshold]);

  useEffect(() => {
    const element = gestureElementRef.current;
    if (!element) {
      return;
    }
    element.addEventListener('wheel', handleWheel, { passive: false });
    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', handlePointerUp);
    element.addEventListener('pointercancel', handlePointerUp);
    return () => {
      element.removeEventListener('wheel', handleWheel);
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerUp);
      element.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp, handleWheel]);

  const attachGestures = useCallback((element: HTMLElement | null) => {
    gestureElementRef.current = element;
  }, []);

  const setContinuousOffset = useCallback((ratio: number) => {
    if (!Number.isFinite(ratio)) {
      return;
    }
    const safeRatio = clamp(ratio, 0, 1);
    const target = Math.round(safeRatio * Math.max(pageCount - 1, 0));
    commitPage(target);
  }, [commitPage, pageCount]);

  const registerExternalController = useCallback((controller: FlipbookExternalController | null) => {
    controllerRef.current = controller;
  }, []);

  useEffect(() => {
    if (!controllerRef.current?.scrollToPage) {
      return;
    }
    controllerRef.current.scrollToPage(state.currentPage);
  }, [state.currentPage]);

  const api = useMemo<FlipbookEngineApi>(() => ({
    state,
    goToPage,
    goNext,
    goPrevious,
    attachGestures,
    setContinuousOffset,
    registerExternalController,
  }), [attachGestures, goNext, goPrevious, goToPage, registerExternalController, setContinuousOffset, state]);

  return api;
};
