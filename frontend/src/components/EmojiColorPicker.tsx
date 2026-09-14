import Icon from './Icon';

// Shared "Icon" + "Color" picker pair — the same emoji-grid-then-color-swatch
// layout that kept getting hand-copied into every add/edit modal that lets
// you personalize something (a favourites category, a Quick Actions button,
// a jar). Each usage brings its own choice lists and current value/setter
// pair; this only owns the shared layout and styling.
export default function EmojiColorPicker({
  emojiChoices, emoji, onEmojiChange,
  colorChoices, color, onColorChange,
}: {
  emojiChoices: string[];
  emoji: string;
  onEmojiChange: (e: string) => void;
  colorChoices: string[];
  color: string;
  onColorChange: (c: string) => void;
}) {
  return (
    <>
      <div>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Icon</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {emojiChoices.map(e => (
            <button key={e} onClick={() => onEmojiChange(e)} style={{ width: 36, height: 36, border: emoji === e ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', borderRadius: 10, background: emoji === e ? 'var(--sakura-light)' : 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji={e} size={16} /></button>
          ))}
        </div>
      </div>
      <div>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Color</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {colorChoices.map(c => (
            <button key={c} onClick={() => onColorChange(c)} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: color === c ? '3px solid var(--ink)' : '3px solid transparent', cursor: 'pointer' }} />
          ))}
        </div>
      </div>
    </>
  );
}
