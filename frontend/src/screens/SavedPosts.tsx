import { useApp } from '../context';
import PostCard from '../components/PostCard';
import Icon from '../components/Icon';

export default function SavedPosts() {
  const { state, goBack } = useApp();
  const saved = state.posts.filter(p => p.saved);

  return (
    <div style={{ paddingBottom: 24 }}>
      <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>

      {saved.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ marginBottom: 12 }}><Icon emoji="🔖" size={40} /></div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Chưa lưu bài viết nào</p>
          <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>Bấm biểu tượng bookmark trên bài viết để lưu lại đây.</p>
        </div>
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
