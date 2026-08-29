import { useRef, useState } from 'react';

const REVEAL = 76;       // px width of the red delete button revealed on a partial swipe
const DELETE_AT = 140;   // swipe past this far and it deletes immediately, no button tap needed

export default function SwipeToDelete({ children, onDelete, borderRadius = 14 }: {
  children: React.ReactNode;
  onDelete: () => void;
  borderRadius?: number;
}) {
  const [dragX, setDragX] = useState(0); // 0 = resting, negative = swiped left
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState(false);
  const startX = useRef(0);
  const startDragX = useRef(0);
  const draggedFar = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    startDragX.current = dragX;
    draggedFar.current = false;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > 8) draggedFar.current = true;
    setDragX(Math.min(0, Math.max(startDragX.current + delta, -240)));
  };

  const settle = () => {
    setDragging(false);
    setDragX(x => {
      if (x <= -DELETE_AT) {
        setRemoving(true);
        setTimeout(onDelete, 180);
        return -400;
      }
      return x <= -REVEAL / 2 ? -REVEAL : 0;
    });
  };

  // Swallow the click that follows a real drag so it doesn't also open the
  // notification underneath — but let a plain tap (no drag) through.
  const onClickCapture = (e: React.MouseEvent) => {
    if (draggedFar.current) { e.stopPropagation(); draggedFar.current = false; }
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => { setRemoving(true); setTimeout(onDelete, 150); }}
          style={{
            // Tracks the drag distance directly (not a fixed reveal width) so
            // the red panel grows and shrinks right along with the finger.
            width: Math.min(-dragX, 400),
            transition: dragging ? 'none' : 'width 0.2s ease',
            background: '#DC2626', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" />
          </svg>
        </button>
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={settle}
        onPointerCancel={settle}
        onClickCapture={onClickCapture}
        style={{
          transform: `translateX(${dragX}px)`,
          opacity: removing ? 0 : 1,
          transition: dragging ? 'none' : 'transform 0.2s ease, opacity 0.15s ease',
          touchAction: 'pan-y',
        }}
      >
        {children}
      </div>
    </div>
  );
}
