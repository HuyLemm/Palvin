import { useState } from 'react';
import { useApp } from '../context';
import Icon from '../components/Icon';

const PRESET_IDEAS = [
  { emoji: '🍜', text: 'Thử một quán mì mới chưa đến bao giờ' },
  { emoji: '🎬', text: 'Xem phim tại nhà, tắt điện thoại hẳn' },
  { emoji: '🌅', text: 'Dậy sớm xem bình minh cùng nhau' },
  { emoji: '🧁', text: 'Làm bánh cùng nhau, dù có thất bại' },
  { emoji: '🚲', text: 'Đạp xe không cần điểm đến' },
  { emoji: '📷', text: 'Đi chụp ảnh phố phường, random' },
  { emoji: '☕', text: 'Ngồi cà phê cả buổi sáng, không vội' },
  { emoji: '🎮', text: 'Chơi board game hoặc video game cùng nhau' },
  { emoji: '🌿', text: 'Đi chợ hoa, mua một chậu cây mới' },
  { emoji: '🛁', text: 'Spa tại nhà — mặt nạ, nhạc nhẹ, nến thơm' },
  { emoji: '🎨', text: 'Cùng vẽ tranh (không cần đẹp)' },
  { emoji: '🎵', text: 'Mỗi người chọn 5 bài hát, nghe cùng nhau' },
  { emoji: '🌙', text: 'Ra ban công ngắm sao buổi tối' },
  { emoji: '📖', text: 'Đọc sách cùng nhau ở một quán ổn' },
  { emoji: '🍕', text: 'Tự làm pizza tại nhà' },
  { emoji: '💌', text: 'Viết thư tay cho nhau, đọc cùng lúc' },
  { emoji: '🎤', text: 'Hát karaoke tại nhà, to hết cỡ' },
  { emoji: '🏊', text: 'Đi bơi buổi sáng sớm' },
  { emoji: '🌸', text: 'Ngắm hoàng hôn ở một điểm cao' },
  { emoji: '🎪', text: 'Đi dạo trung tâm thương mại không mua gì' },
];

interface Props { onBack: () => void; }

export default function DateIdeaJar({ onBack }: Props) {
  const { state, addDateIdea, removeDateIdea, drawDateIdea } = useApp();
  const [picked, setPicked] = useState<typeof PRESET_IDEAS[0] | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [newIdea, setNewIdea] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const customIdeas = state.dateIdeas;
  const history = state.dateIdeaHistory;
  const allIdeas = [...PRESET_IDEAS, ...customIdeas];

  function spin() {
    if (spinning) return;
    setSpinning(true);
    setPicked(null);
    let count = 0;
    const max = 10 + Math.floor(Math.random() * 8);
    const interval = setInterval(() => {
      const rand = allIdeas[Math.floor(Math.random() * allIdeas.length)];
      setPicked(rand);
      count++;
      if (count >= max) {
        clearInterval(interval);
        const final = allIdeas[Math.floor(Math.random() * allIdeas.length)];
        setPicked(final);
        drawDateIdea(final);
        setSpinning(false);
      }
    }, 120);
  }

  function addCustom() {
    if (!newIdea.trim()) return;
    addDateIdea({ emoji: '✨', text: newIdea.trim() });
    setNewIdea('');
    setShowAdd(false);
  }

  return (
    <div style={{ paddingBottom: 32 }}>
      <style>{`
        @keyframes jarSpin {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-8deg) scale(1.05); }
          50% { transform: rotate(8deg) scale(1.08); }
          75% { transform: rotate(-4deg) scale(1.05); }
          100% { transform: rotate(0deg) scale(1); }
        }
        @keyframes ideaReveal {
          0% { opacity: 0; transform: scale(0.8) translateY(10px); }
          60% { transform: scale(1.05) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .jar-anim { animation: jarSpin 0.3s ease infinite; }
        .idea-reveal { animation: ideaReveal 0.4s ease both; }
      `}</style>

      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={15} /> Back</button>

      <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: 'var(--ink)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>Hũ Hẹn Hò <Icon emoji="🫙" size={20} /></p>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 24 }}>Lắc hũ để rút một ý tưởng hẹn hò ngẫu nhiên</p>

      {/* Jar + result */}
      <div className="card" style={{ padding: '32px 24px', textAlign: 'center', marginBottom: 20, background: 'linear-gradient(135deg, #FFF0F4, #FADCE4)' }}>
        <button onClick={spin} disabled={spinning} style={{ background: 'none', border: 'none', cursor: spinning ? 'default' : 'pointer', display: 'inline-block' }}>
          <div className={spinning ? 'jar-anim' : ''} style={{ lineHeight: 1, marginBottom: 16, display: 'inline-block' }}><Icon emoji="🫙" size={72} /></div>
        </button>

        {picked ? (
          <div className={spinning ? '' : 'idea-reveal'} key={picked.text}>
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><Icon emoji={picked.emoji} size={36} /></div>
            <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--ink)', lineHeight: 1.4, marginBottom: 16 }}>{picked.text}</p>
          </div>
        ) : (
          <p style={{ fontSize: 15, color: 'var(--ink-2)', marginBottom: 16 }}>Nhấn vào hũ để rút ý tưởng!</p>
        )}

        <button onClick={spin} disabled={spinning} style={{ padding: '13px 28px', background: spinning ? 'var(--border)' : 'linear-gradient(135deg, var(--sakura), var(--sakura-deep))', border: 'none', borderRadius: 16, color: spinning ? 'var(--ink-2)' : 'white', fontWeight: 700, fontSize: 15, cursor: spinning ? 'default' : 'pointer', boxShadow: spinning ? 'none' : '0 4px 16px rgba(201,95,124,0.3)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {spinning ? <><Icon emoji="🫙" size={16} /> Đang lắc...</> : picked ? <><Icon emoji="🔀" size={16} /> Rút lại</> : <><Icon emoji="🫙" size={16} /> Lắc hũ</>}
        </button>
      </div>

      {/* Add custom */}
      <div className="card" style={{ padding: '16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showAdd ? 12 : 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon emoji="✏️" size={14} /> Thêm ý tưởng của bạn</p>
          <button onClick={() => setShowAdd(v => !v)} style={{ background: 'var(--sakura-light)', border: 'none', borderRadius: 10, padding: '6px 14px', color: 'var(--sakura-deep)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {showAdd ? 'Hủy' : '+ Thêm'}
          </button>
        </div>
        {showAdd && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input-field"
              placeholder="VD: Đi xem triển lãm tranh..."
              value={newIdea}
              onChange={e => setNewIdea(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustom()}
              style={{ flex: 1, padding: '10px 14px', fontSize: 14 }}
              autoFocus
            />
            <button onClick={addCustom} style={{ padding: '10px 16px', background: 'var(--sakura-deep)', border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✓" size={16} /></button>
          </div>
        )}
        {customIdeas.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {customIdeas.map(idea => (
              <div key={idea.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--sakura-light)', borderRadius: 10 }}>
                <Icon emoji={idea.emoji} size={18} />
                <p style={{ fontSize: 13, color: 'var(--ink)', flex: 1 }}>{idea.text}</p>
                <button onClick={() => removeDateIdea(idea.id)} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--ink-2)' }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 10 }}>Đã rút gần đây</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map((idea, i) => (
              <div key={idea.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: 1 - i * 0.08 }}>
                <Icon emoji={idea.emoji} size={22} style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 14, color: 'var(--ink)' }}>{idea.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All ideas list */}
      <div style={{ marginTop: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 10 }}>Tất cả ý tưởng ({allIdeas.length})</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {allIdeas.map((idea, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'white', borderRadius: 12, border: '1px solid var(--border)' }}>
              <Icon emoji={idea.emoji} size={20} />
              <p style={{ fontSize: 13, color: 'var(--ink)', flex: 1 }}>{idea.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
