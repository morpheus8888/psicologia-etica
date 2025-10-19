'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { cn } from '@/utils/Helpers';

import styles from './AnimatedDiary.module.css';

const FLIP_DURATION_MS = 720;

type AnimatedDiaryProps = {
  pages: React.ReactNode[];
  className?: string;
  style?: React.CSSProperties;
  onSpreadChange?: (index: number) => void;
};

type Spread = {
  left: React.ReactNode;
  right: React.ReactNode;
};

type AnimationState = {
  direction: 'next' | 'prev';
  targetIndex: number;
};

type CoverVariant = 'desk' | 'leather-front' | 'leather-back';

const CoverSurface: React.FC<{ variant: CoverVariant; label: string }> = ({ variant, label }) => (
  <div
    className={cn(
      styles.pageInner,
      styles.coverSurface,
      variant === 'desk' && styles.coverDesk,
      variant === 'leather-front' && styles.coverLeatherFront,
      variant === 'leather-back' && styles.coverLeatherBack,
    )}
  >
    {label}
  </div>
);

const createSpreads = (pages: React.ReactNode[]): Spread[] => {
  const nodes = [...pages];
  if (nodes.length % 2 !== 0) {
    nodes.push(null);
  }
  const spreads: Spread[] = [];
  for (let index = 0; index < nodes.length; index += 2) {
    spreads.push({
      left: nodes[index],
      right: nodes[index + 1],
    });
  }
  return spreads;
};

const BlankPage = () => (
  <div className={styles.placeholder}>Pagina vuota</div>
);

const ensureNode = (node: React.ReactNode) => (node === null || node === undefined
  ? <BlankPage />
  : node);

const AnimatedDiary: React.FC<AnimatedDiaryProps> = ({
  pages,
  className,
  style,
  onSpreadChange,
}) => {
  const augmentedPages = useMemo(() => {
    const frontDesk = (
      <CoverSurface key="cover-desk-front" variant="desk" label="Scrivania" />
    );
    const frontLeather = (
      <CoverSurface key="cover-leather-front" variant="leather-front" label="Diario — Copertina" />
    );
    const backLeather = (
      <CoverSurface key="cover-leather-back" variant="leather-back" label="Copertina — Retro" />
    );
    const backDesk = (
      <CoverSurface key="cover-desk-back" variant="desk" label="Scrivania" />
    );
    return [frontDesk, frontLeather, ...pages, backLeather, backDesk];
  }, [pages]);

  const spreads = useMemo(() => createSpreads(augmentedPages), [augmentedPages]);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [animation, setAnimation] = useState<AnimationState | null>(null);
  const animationTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (spreads.length === 0) {
      if (spreadIndex !== 0) {
        setSpreadIndex(0);
      }
      return;
    }
    if (spreadIndex > spreads.length - 1) {
      setSpreadIndex(spreads.length - 1);
    }
  }, [spreadIndex, spreads.length]);

  useEffect(() => {
    if (!animation) {
      return;
    }
    if (animationTimerRef.current !== null) {
      window.clearTimeout(animationTimerRef.current);
    }
    animationTimerRef.current = window.setTimeout(() => {
      setSpreadIndex(animation.targetIndex);
      setAnimation(null);
      onSpreadChange?.(animation.targetIndex);
    }, FLIP_DURATION_MS);
    return () => {
      if (animationTimerRef.current !== null) {
        window.clearTimeout(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    };
  }, [animation, onSpreadChange]);

  useEffect(() => () => {
    if (animationTimerRef.current !== null) {
      window.clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }
  }, []);

  const currentSpread = spreads[spreadIndex] ?? { left: null, right: null };
  const nextSpread = spreadIndex < spreads.length - 1 ? spreads[spreadIndex + 1] : null;
  const previousSpread = spreadIndex > 0 ? spreads[spreadIndex - 1] : null;

  const isAnimating = Boolean(animation);
  const animationDirection = animation?.direction ?? null;

  const canGoPrev = !isAnimating && spreadIndex > 0;
  const canGoNext = !isAnimating && spreadIndex < spreads.length - 1;

  const handleNext = useCallback(() => {
    if (!canGoNext) {
      return;
    }
    const targetIndex = spreadIndex + 1;
    setAnimation({ direction: 'next', targetIndex });
  }, [canGoNext, spreadIndex]);

  const handlePrev = useCallback(() => {
    if (!canGoPrev) {
      return;
    }
    const targetIndex = spreadIndex - 1;
    setAnimation({ direction: 'prev', targetIndex });
  }, [canGoPrev, spreadIndex]);

  const leftPage = animationDirection === 'prev' && previousSpread
    ? ensureNode(previousSpread.left)
    : ensureNode(currentSpread.left);

  const rightPage = animationDirection === 'next' && nextSpread
    ? ensureNode(nextSpread.right)
    : ensureNode(currentSpread.right);

  const nextFlipFront = ensureNode(currentSpread.right);
  const nextFlipBack = ensureNode(nextSpread?.left ?? null);

  const prevFlipFront = ensureNode(currentSpread.left);
  const prevFlipBack = ensureNode(previousSpread?.right ?? null);

  return (
    <div className={cn(styles.root, className)} style={style}>
      <div className={styles.stage}>
        <div
          className={styles.book}
          style={{ '--flip-duration': `${FLIP_DURATION_MS}ms` } as React.CSSProperties}
        >
          <div className={styles.spread}>
            <div className={cn(styles.page, styles.pageLeft)}>
              <div className={styles.pageInner}>
                {leftPage}
              </div>
            </div>
            <div className={cn(styles.page, styles.pageRight)}>
              <div className={styles.pageInner}>
                {rightPage}
              </div>
            </div>

            <div
              className={cn(
                styles.flipSurface,
                styles.flipSurfaceNext,
                animationDirection === 'next' && styles.flipSurfaceActive,
              )}
            >
              <div className={styles.flipFace}>
                <div className={styles.faceContent}>{nextFlipFront}</div>
              </div>
              <div className={cn(styles.flipFace, styles.flipFaceBack)}>
                <div className={styles.faceContent}>{nextFlipBack}</div>
              </div>
            </div>

            <div
              className={cn(
                styles.flipSurface,
                styles.flipSurfacePrev,
                animationDirection === 'prev' && styles.flipSurfaceActive,
              )}
            >
              <div className={styles.flipFace}>
                <div className={styles.faceContent}>{prevFlipFront}</div>
              </div>
              <div className={cn(styles.flipFace, styles.flipFaceBack)}>
                <div className={styles.faceContent}>{prevFlipBack}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {spreads.length > 1 && (
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.button}
            onClick={handlePrev}
            disabled={!canGoPrev}
          >
            ← Precedente
          </button>
          <span className={styles.progress}>
            Spread&nbsp;
            {spreadIndex + 1}
            /
            {spreads.length}
          </span>
          <button
            type="button"
            className={styles.button}
            onClick={handleNext}
            disabled={!canGoNext}
          >
            Successivo →
          </button>
        </div>
      )}

      {spreads.length > 1 && (
        <div className={styles.dots}>
          {spreads.map((_, index) => (
            <span
              key={`dot-${index.toString()}`}
              className={cn(styles.dot, index === spreadIndex && styles.dotActive)}
            />
          ))}
        </div>
      )}

      <p className={styles.note}>
        Prototipo leggero: animazione CSS 3D con pagine accoppiate (sinistra/destra) e controlli di navigazione.
      </p>
    </div>
  );
};

export { AnimatedDiary };
