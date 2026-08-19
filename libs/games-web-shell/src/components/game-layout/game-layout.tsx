import { Box } from '@radix-ui/themes';
import {
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

import './game-layout.scss';

const GAME_LAYOUT_DESIGN_WIDTH = 1200;
const GAME_LAYOUT_DESIGN_HEIGHT = 675;

const ASPECT_16_9 = GAME_LAYOUT_DESIGN_WIDTH / GAME_LAYOUT_DESIGN_HEIGHT;
const DESKTOP_MIN_WIDTH = 768;

const getViewportSize = (): { width: number; height: number } => {
  if (typeof document === 'undefined') {
    return {
      width: GAME_LAYOUT_DESIGN_WIDTH,
      height: GAME_LAYOUT_DESIGN_HEIGHT,
    };
  }
  const vv = window.visualViewport;
  const root = document.documentElement;
  return {
    width: Math.max(vv?.width ?? root.clientWidth, 1),
    height: Math.max(vv?.height ?? root.clientHeight, 1),
  };
};

const calculateGameLayoutScale = (
  viewportWidth: number,
  viewportHeight: number,
): number => {
  if (viewportWidth / viewportHeight > ASPECT_16_9) {
    return viewportHeight / GAME_LAYOUT_DESIGN_HEIGHT;
  }
  return viewportWidth / GAME_LAYOUT_DESIGN_WIDTH;
};

const gameLayoutInnerStyle = (
  scale: number,
  viewportWidth: number,
  viewportHeight: number,
): CSSProperties | undefined => {
  if (viewportWidth < DESKTOP_MIN_WIDTH) return undefined;
  if (!(viewportWidth / viewportHeight > ASPECT_16_9)) {
    return { height: `${viewportHeight / scale}px` };
  }
  return { width: `${viewportWidth / scale}px` };
};

type GameLayoutProps = {
  aside: ReactNode;
  footer: ReactNode;
  children: ReactNode;
};

export const GameLayout = ({ aside, footer, children }: GameLayoutProps) => {
  const [{ width: vw, height: vh }, setViewport] = useState(() =>
    getViewportSize(),
  );

  useLayoutEffect(() => {
    const root = document.documentElement;

    const read = () => setViewport(getViewportSize());
    read();

    window.addEventListener('orientationchange', read);

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', read);
      vv.addEventListener('scroll', read);
    }

    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(read);
      ro.observe(root);
      return () => {
        ro.disconnect();
        window.removeEventListener('orientationchange', read);
        vv?.removeEventListener('resize', read);
        vv?.removeEventListener('scroll', read);
      };
    }

    window.addEventListener('resize', read);
    return () => {
      window.removeEventListener('resize', read);
      window.removeEventListener('orientationchange', read);
      vv?.removeEventListener('resize', read);
      vv?.removeEventListener('scroll', read);
    };
  }, []);

  const isDesktop = vw >= DESKTOP_MIN_WIDTH;

  const scale = useMemo(
    () => (isDesktop ? calculateGameLayoutScale(vw, vh) : 1),
    [isDesktop, vw, vh],
  );

  const innerStyle = useMemo(
    () => (isDesktop ? gameLayoutInnerStyle(scale, vw, vh) : undefined),
    [isDesktop, scale, vw, vh],
  );

  const stageStyle = useMemo((): CSSProperties | undefined => {
    if (!isDesktop) return undefined;
    return {
      position: 'absolute',
      left: 0,
      top: 0,
      width: GAME_LAYOUT_DESIGN_WIDTH,
      height: GAME_LAYOUT_DESIGN_HEIGHT,
      transformOrigin: '0 0',
      transform: `scale(${scale})`,
    };
  }, [isDesktop, scale]);

  const layoutBody = (
    <>
      <main className="game-layout-main" role="main">
        <aside className="game-layout-game-controls">{aside}</aside>
        <section className="game-layout-game-space">{children}</section>
      </main>
      <div className="game-layout-footer">{footer}</div>
    </>
  );

  return (
    <div className="game-layout-shell">
      <div className="game-layout-root">
        {isDesktop ? (
          <div className="game-layout-stage" style={stageStyle}>
            <Box className="game-layout-container" style={innerStyle}>
              {layoutBody}
            </Box>
          </div>
        ) : (
          <Box className="game-layout-container game-layout-container--fluid">
            {layoutBody}
          </Box>
        )}
      </div>
    </div>
  );
};
