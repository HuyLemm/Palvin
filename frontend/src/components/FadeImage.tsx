import { useState, type CSSProperties, type MouseEventHandler } from 'react';

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
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        style={{ width: '100%', height: '100%', objectFit: objectFit ?? 'cover', display: 'block', position: 'relative', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
      />
    </div>
  );
}
