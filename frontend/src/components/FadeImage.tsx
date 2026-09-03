import { useLayoutEffect, useRef, useState, type CSSProperties, type MouseEventHandler } from 'react';

// Drop-in replacement for a plain <img>: shows a shimmering placeholder
// (instead of a blank hole) until the image actually finishes loading, then
// cross-fades it in. `style` is applied to the wrapper (border radius, size,
// absolute positioning, ...) exactly like it used to sit on the <img> itself
// — objectFit is pulled out and applied to the inner <img> specifically.
export default function FadeImage({ src, alt = '', style, className, onClick }: {
  src: string;
  alt?: string;
  style?: CSSProperties;
  className?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
}) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // context.tsx preloads every image up front before the app even opens —
  // for one already sitting in the browser's HTTP cache, `complete` is
  // already true the instant this mounts. Catching that synchronously
  // before paint (useLayoutEffect) skips the shimmer-then-fade entirely
  // instead of still playing a 300ms fade-in for an image that was never
  // actually waiting on anything.
  useLayoutEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, [src]);
  const { objectFit, position, ...rest } = style ?? {};
  return (
    <div
      className={className}
      onClick={onClick}
      style={{ overflow: 'hidden', position: position ?? 'relative', background: 'var(--bg)', ...rest }}
    >
      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, var(--bg) 25%, var(--border) 40%, var(--bg) 55%)',
          backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite',
        }} />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        style={{ width: '100%', height: '100%', objectFit: objectFit ?? 'cover', display: 'block', position: 'relative', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
      />
    </div>
  );
}
