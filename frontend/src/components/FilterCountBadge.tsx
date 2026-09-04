// Small pill showing how many items a filter tab would show — first built
// for Gift Wishlist's tabs, now shared by every other screen's filter-tab
// row so the count style stays consistent app-wide.
//
// No active/inactive color scheme of its own on purpose: every screen picks
// its own active-tab treatment (solid dark fill + white text, pale fill +
// dark text, ...), so a badge hardcoded for one of those combinations goes
// invisible against another (e.g. a "sakura-deep" badge disappears on a
// button whose active background already IS sakura-deep). A neutral dark
// scrim plus `color: inherit` darkens whatever's behind it a little and
// always reads in the parent button's own (already-contrasting) text color,
// so it looks right regardless of which tab style it lands on.
export default function FilterCountBadge({ count }: { count: number }) {
  return (
    <span style={{
      minWidth: 20, height: 20, padding: '0 5px', borderRadius: 99, fontSize: 11.5, fontWeight: 800,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.12)', color: 'inherit',
    }}>{count}</span>
  );
}
