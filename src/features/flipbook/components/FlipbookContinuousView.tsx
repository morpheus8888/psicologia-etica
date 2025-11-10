'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
} from 'react';

import { useFlipbookEngineContext } from '../FlipbookProvider';
import styles from './FlipbookContinuousView.module.css';

type FlipbookContinuousViewProps = {
  pages: React.ReactNode[];
};

const FlipbookContinuousView: React.FC<FlipbookContinuousViewProps> = ({ pages }) => {
  const engine = useFlipbookEngineContext();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = useCallback(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }
    const maxScroll = node.scrollHeight - node.clientHeight;
    const ratio = maxScroll <= 0 ? 0 : node.scrollTop / maxScroll;
    engine.setContinuousOffset(ratio);
  }, [engine]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }
    node.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      node.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  useEffect(() => {
    engine.registerExternalController({
      scrollToPage: (page: number) => {
        const node = containerRef.current;
        if (!node) {
          return;
        }
        const clampedPage = Math.max(0, Math.min(pages.length - 1, page));
        const targetNode = node.children.item(clampedPage) as HTMLElement | null;
        if (!targetNode) {
          return;
        }
        node.scrollTo({
          top: targetNode.offsetTop,
          behavior: 'smooth',
        });
      },
    });
    return () => {
      engine.registerExternalController(null);
    };
  }, [engine, pages.length]);

  return (
    <div className={styles.container} ref={containerRef}>
      {pages.map((page, index) => (
        <div key={`continuous-page-${index.toString()}`} className={styles.page}>
          <div className={styles.pageInner}>{page ?? <span className="text-sm italic text-muted-foreground">—</span>}</div>
        </div>
      ))}
    </div>
  );
};

export { FlipbookContinuousView };
