import { useApp } from '../context';
import EmptyState from '../components/EmptyState';
import PostCard from '../components/PostCard';
import Icon from '../components/Icon';

export default function SavedPosts() {
  const { state, goBack } = useApp();
  const saved = state.posts.filter(p => p.saved);

  return (
    <div style={{ paddingBottom: 24 }}>
      <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>

      {saved.length === 0 ? (
        <EmptyState icon="🔖" title="No saved posts yet" sub="Tap the bookmark icon on a post to save it here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {saved.map(post => (
            <PostCard key={post.id} post={post} reactions={state.postReactions[post.id] ?? {}} />
          ))}
        </div>
      )}
    </div>
  );
}
