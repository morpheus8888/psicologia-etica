'use client';

import React, {
  useCallback,
  useMemo,
} from 'react';

import { cn } from '@/utils/Helpers';

import { useFlipbookEngineContext, useFlipbookSettingsContext } from '../FlipbookProvider';
import { createSpreads } from '../utils/geometry';
import styles from './FlipbookPagedView.module.css';

type FlipbookPagedViewProps = {
  pages: React.ReactNode[];
};

const EmptyPage = () => (
  <div className="flex h-full items-center justify-center text-sm italic text-muted-foreground">
    —
  </div>
);

const FlipbookPagedView: React.FC<FlipbookPagedViewProps> = ({ pages }) => {
  const { settings } = useFlipbookSettingsContext();
  const engine = useFlipbookEngineContext();

  const spreads = useMemo(() => createSpreads(pages, settings.twoPage), [pages, settings.twoPage]);

  const currentSpread = spreads[engine.state.spreadIndex] ?? { left: null, right: null };
  const nextSpread = spreads[engine.state.spreadIndex + 1] ?? null;
  const prevSpread = spreads[engine.state.spreadIndex - 1] ?? null;
  const nextBackNode = settings.twoPage ? nextSpread?.left ?? null : nextSpread?.right ?? null;
  const prevFrontNode = settings.twoPage ? currentSpread.left : currentSpread.right;
  const prevBackNode = settings.twoPage ? prevSpread?.right ?? null : prevSpread?.right ?? null;

  const animationDuration = Math.round(Math.max(420, 720 / settings.speed + settings.inertia * 220));

  const attachGestures = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      engine.attachGestures(node);
    }
  }, [engine]);

  const renderNode = (node: React.ReactNode | null | undefined) => node ?? <EmptyPage />;

  return (
    <div className={styles.root}>
      <div className={styles.stage} ref={attachGestures}>
        <div
          className={styles.book}
          style={{ '--flipbook-duration': `${animationDuration}ms` } as React.CSSProperties}
        >
          <div className={styles.spread}>
            {settings.twoPage && (
              <div className={cn(styles.page, styles.pageLeft)}>
                <div className={styles.pageLined} aria-hidden="true" />
                <div className={styles.pageInner}>{renderNode(currentSpread.left)}</div>
              </div>
            )}
            <div className={cn(styles.page, settings.twoPage ? styles.pageRight : styles.pageSingle)}>
              <div className={styles.pageLined} aria-hidden="true" />
              <div className={styles.pageInner}>{renderNode(currentSpread.right)}</div>
            </div>

            <div
              className={cn(
                styles.flipSurface,
                styles.flipSurfaceNext,
                engine.state.direction === 'next' && engine.state.isAnimating && styles.flipSurfaceActive,
              )}
            >
              <div className={styles.flipFace}>
                <div className={styles.faceContent}>{renderNode(currentSpread.right)}</div>
              </div>
              <div className={cn(styles.flipFace, styles.flipFaceBack)}>
                <div className={styles.faceContent}>{renderNode(nextBackNode)}</div>
              </div>
            </div>

            <div
              className={cn(
                styles.flipSurface,
                styles.flipSurfacePrev,
                engine.state.direction === 'prev' && engine.state.isAnimating && styles.flipSurfaceActive,
              )}
            >
              <div className={styles.flipFace}>
                <div className={styles.faceContent}>{renderNode(prevFrontNode)}</div>
              </div>
              <div className={cn(styles.flipFace, styles.flipFaceBack)}>
                <div className={styles.faceContent}>{renderNode(prevBackNode)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { FlipbookPagedView };
