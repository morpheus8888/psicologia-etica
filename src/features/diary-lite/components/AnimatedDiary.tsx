'use client';

import React, {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { cn } from '@/utils/Helpers';

import styles from './AnimatedDiary.module.css';

const FLIP_DURATION_MS = 720;

type ThemePreset = 'classic' | 'nocturne' | 'minimal';
type FlipMode = '3d' | 'flat';

type AnimatedDiaryAppearance = {
  theme?: ThemePreset;
  textureIntensity?: number;
};

type AnimatedDiaryFlipOptions = {
  durationMs?: number;
  mode?: FlipMode;
};

type AnimatedDiaryProps = {
  pages: React.ReactNode[];
  className?: string;
  style?: React.CSSProperties;
  onSpreadChange?: (index: number) => void;
  appearance?: AnimatedDiaryAppearance;
  flipOptions?: AnimatedDiaryFlipOptions;
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

const CoverSurface: React.FC<{ variant: CoverVariant; label: string; note?: string }> = ({ variant, label, note }) => (
  <div data-cover-variant={variant} className={styles.coverSurface}>
    <span className={styles.coverTitle}>{label}</span>
    {note ? <span className={styles.coverNote}>{note}</span> : null}
  </div>
);

type PageVariant = 'paper' | 'cover-desk' | 'cover-leather-front' | 'cover-leather-back';

type ResolvedPage = {
  variant: PageVariant;
  node: React.ReactNode;
};

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

const isCoverElement = (element: React.ReactElement): element is React.ReactElement<{ 'data-cover-variant': CoverVariant }> => (
  Object.prototype.hasOwnProperty.call(element.props ?? {}, 'data-cover-variant')
);

const resolvePage = (node: React.ReactNode | null | undefined): ResolvedPage => {
  if (node === null || node === undefined) {
    return { variant: 'paper', node: <BlankPage /> };
  }
  if (React.isValidElement(node) && isCoverElement(node)) {
    const coverVariant = node.props['data-cover-variant'];
    const mappedVariant: PageVariant = coverVariant === 'desk'
      ? 'cover-desk'
      : coverVariant === 'leather-front'
        ? 'cover-leather-front'
        : 'cover-leather-back';
    return { variant: mappedVariant, node };
  }
  return { variant: 'paper', node };
};

type CSSVarStyle = CSSProperties & {
  '--flip-duration'?: string;
  '--texture-opacity'?: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const AnimatedDiary: React.FC<AnimatedDiaryProps> = ({
  pages,
  className,
  style,
  onSpreadChange,
  appearance,
  flipOptions,
}) => {
  const augmentedPages = useMemo(() => {
    const frontDesk = (
      <CoverSurface key="cover-desk-front" variant="desk" label="Scrivania" note="Appunti di viaggio" />
    );
    const frontLeather = (
      <CoverSurface key="cover-leather-front" variant="leather-front" label="Diario" note="Premi Successivo →" />
    );
    const backLeather = (
      <CoverSurface key="cover-leather-back" variant="leather-back" label="Grazie" note="Hai raggiunto la fine" />
    );
    const backDesk = (
      <CoverSurface key="cover-desk-back" variant="desk" label="Scrivania" note="Alla prossima pagina" />
    );
    return [frontDesk, frontLeather, ...pages, backLeather, backDesk];
  }, [pages]);

  const spreads = useMemo(() => createSpreads(augmentedPages), [augmentedPages]);
  const pageClassNames = useCallback((variant: PageVariant, side: 'left' | 'right') => cn(
    styles.page,
    side === 'left' ? styles.pageLeft : styles.pageRight,
    variant === 'paper' ? styles.pagePaper : styles.pageCover,
    variant === 'cover-desk' && styles.pageCoverDesk,
    variant === 'cover-leather-front' && styles.pageCoverLeatherFront,
    variant === 'cover-leather-back' && styles.pageCoverLeatherBack,
  ), []);

  const innerClassNames = useCallback((variant: PageVariant) => cn(
    styles.pageInner,
    variant !== 'paper' && styles.pageInnerCover,
  ), []);

  const flipFaceClassNames = useCallback((variant: PageVariant, extra?: string) => cn(
    styles.flipFace,
    variant === 'paper' ? styles.flipFacePaper : styles.flipFaceCover,
    variant === 'cover-desk' && styles.flipFaceCoverDesk,
    variant === 'cover-leather-front' && styles.flipFaceCoverLeatherFront,
    variant === 'cover-leather-back' && styles.flipFaceCoverLeatherBack,
    extra,
  ), []);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [animation, setAnimation] = useState<AnimationState | null>(null);
  const animationTimerRef = useRef<number | null>(null);
  const theme = appearance?.theme ?? 'classic';
  const textureIntensity = clamp(appearance?.textureIntensity ?? 0.28, 0, 0.6);
  const flipDurationMs = clamp(flipOptions?.durationMs ?? FLIP_DURATION_MS, 200, 2000);
  const flipMode: FlipMode = flipOptions?.mode ?? '3d';
  const rootStyle = useMemo<CSSVarStyle>(() => ({
    ...(style ?? {}),
    '--flip-duration': `${flipDurationMs}ms`,
    '--texture-opacity': textureIntensity.toFixed(2),
  }), [style, flipDurationMs, textureIntensity]);

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
    }, flipDurationMs);
    return () => {
      if (animationTimerRef.current !== null) {
        window.clearTimeout(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    };
  }, [animation, flipDurationMs, onSpreadChange]);

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

  const leftResolved = resolvePage(
    animationDirection === 'prev' && previousSpread ? previousSpread.left : currentSpread.left,
  );

  const rightResolved = resolvePage(
    animationDirection === 'next' && nextSpread ? nextSpread.right : currentSpread.right,
  );

  const nextFlipFrontResolved = resolvePage(currentSpread.right);
  const nextFlipBackResolved = resolvePage(nextSpread?.left ?? null);

  const prevFlipFrontResolved = resolvePage(currentSpread.left);
  const prevFlipBackResolved = resolvePage(previousSpread?.right ?? null);

  return (
    <div
      className={cn(styles.root, className)}
      style={rootStyle}
      data-theme={theme}
      data-flip-mode={flipMode}
    >
      <div className={styles.stage}>
        <div
          className={styles.book}
        >
          <div className={styles.spread}>
            <div className={pageClassNames(leftResolved.variant, 'left')}>
              <div className={innerClassNames(leftResolved.variant)}>
                {leftResolved.node}
              </div>
            </div>
            <div className={pageClassNames(rightResolved.variant, 'right')}>
              <div className={innerClassNames(rightResolved.variant)}>
                {rightResolved.node}
              </div>
            </div>

            <div
              className={cn(
                styles.flipSurface,
                styles.flipSurfaceNext,
                animationDirection === 'next' && styles.flipSurfaceActive,
                flipMode === 'flat' && styles.flipSurfaceFlat,
              )}
            >
              <div className={flipFaceClassNames(nextFlipFrontResolved.variant)}>
                <div className={styles.faceContent}>{nextFlipFrontResolved.node}</div>
              </div>
              <div className={flipFaceClassNames(nextFlipBackResolved.variant, styles.flipFaceBack)}>
                <div className={styles.faceContent}>{nextFlipBackResolved.node}</div>
              </div>
            </div>

            <div
              className={cn(
                styles.flipSurface,
                styles.flipSurfacePrev,
                animationDirection === 'prev' && styles.flipSurfaceActive,
                flipMode === 'flat' && styles.flipSurfaceFlat,
              )}
            >
              <div className={flipFaceClassNames(prevFlipFrontResolved.variant)}>
                <div className={styles.faceContent}>{prevFlipFrontResolved.node}</div>
              </div>
              <div className={flipFaceClassNames(prevFlipBackResolved.variant, styles.flipFaceBack)}>
                <div className={styles.faceContent}>{prevFlipBackResolved.node}</div>
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
