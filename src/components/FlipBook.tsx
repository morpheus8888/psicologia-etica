'use client';

/**
 * Reusable FlipBook component (client-only) for Next.js App Router.
 *
 * Features
 * - Dynamic import of react-pageflip with { ssr: false } to avoid hydration issues
 * - Rectangular pages and covers (no border radius)
 * - Front/Back hard covers with optional wood texture via `coverTextureUrl`
 * - Responsive sizing with configurable min/max and size="stretch" by default
 * - Page/Cover implemented with React.forwardRef as required by react-pageflip
 * - Styling customizable via `className`, `style` and CSS var `--cover-bg`
 */

import dynamic from 'next/dynamic';
import React, { forwardRef } from 'react';

import { cn } from '@/utils/Helpers';

type Dimensions = {
  width?: number;
  height?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  size?: 'stretch' | 'fixed';
};

export type FlipBookProps = {
  pages: React.ReactElement[];
  coverFront?: React.ReactNode;
  coverBack?: React.ReactNode;
  coverTextureUrl?: string;
  dimensions?: Dimensions;
  className?: string;
  style?: React.CSSProperties;
};

// Import HTMLFlipBook only on the client to prevent SSR/hydration issues
type HTMLFlipBookUnknownProps = Record<string, unknown>;

const HTMLFlipBook = dynamic(() => import('react-pageflip'), {
  ssr: false,
}) as React.ComponentType<HTMLFlipBookUnknownProps>;

export type PageProps = React.HTMLAttributes<HTMLDivElement>;

export const Page = forwardRef<HTMLDivElement, PageProps>(
  ({ className, style, children, ...rest }, ref) => (
    <div
      ref={ref}
      {...rest}
      className={cn('m-0 h-full w-full bg-white p-6 text-foreground [border-radius:0]', className)}
      style={{
        borderRadius: 0,
        ...style,
      }}
    >
      {children}
    </div>
  ),
);
Page.displayName = 'Page';

export type PageCoverProps = React.HTMLAttributes<HTMLDivElement> & {
  textureUrl?: string;
  className?: string;
};

type CSSVarStyle = React.CSSProperties & {
  '--cover-bg'?: string;
};

export const PageCover = forwardRef<HTMLDivElement, PageCoverProps>(
  ({ textureUrl, className, style, children, ...rest }, ref) => {
    const fallbackBg = 'linear-gradient(135deg, #5a4a3b 0%, #3b2f24 40%, #2a221b 100%)';
    const coverBg = textureUrl ? `url(${textureUrl})` : fallbackBg;

    const mergedStyle: CSSVarStyle = {
      'borderRadius': 0,
      '--cover-bg': coverBg,
      ...style,
    };

    return (
      <div
        ref={ref}
        data-density="hard"
        {...rest}
        className={cn(
          'm-0 h-full w-full bg-[image:var(--cover-bg)] bg-cover bg-center p-6 text-white [border-radius:0]',
          className,
        )}
        style={mergedStyle}
      >
        {children}
      </div>
    );
  },
);
PageCover.displayName = 'PageCover';

const defaultDimensions: Required<Dimensions> = {
  size: 'stretch',
  width: 540,
  height: 680,
  minWidth: 360,
  maxWidth: 880,
  minHeight: 480,
  maxHeight: 980,
};

export const FlipBook: React.FC<FlipBookProps> = ({
  pages,
  coverFront,
  coverBack,
  coverTextureUrl,
  dimensions,
  className,
  style,
}) => {
  const dims = { ...defaultDimensions, ...(dimensions ?? {}) };

  return (
    <div className={className} style={style}>
      <HTMLFlipBook
        showCover
        size={dims.size}
        width={dims.width}
        height={dims.height}
        minWidth={dims.minWidth}
        maxWidth={dims.maxWidth}
        minHeight={dims.minHeight}
        maxHeight={dims.maxHeight}
        drawShadow={false}
        className="[&_.page-wrapper]:[border-radius:0] [&_.page]:[border-radius:0]"
        // Per docs/react-pageflip.md: renderOnlyPageLengthChange evita reload completo quando il contenuto cambia,
        // così non perdiamo il focus durante la scrittura.
        renderOnlyPageLengthChange
      >
        <PageCover textureUrl={coverTextureUrl}>{coverFront}</PageCover>
        {pages.map((element, index) => {
          const resolvedKey = element.key ?? `page-${index}`;
          return (
            <Page key={resolvedKey}>
              {element}
            </Page>
          );
        })}
        <PageCover textureUrl={coverTextureUrl}>{coverBack}</PageCover>
      </HTMLFlipBook>
    </div>
  );
};

export default FlipBook;
