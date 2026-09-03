import { useApp } from '../context';
import type { User } from '../types';

interface Props {
  user: User | string;
  size?: number;
  ring?: boolean;
  story?: boolean;
  photoUrl?: string;
  onClick?: () => void;
}

const ALVIN_GRAD = 'linear-gradient(135deg, var(--sakura-deep), var(--sakura-accent))';
const PAOI_GRAD  = 'linear-gradient(135deg, var(--sakura), var(--sakura-light))';
const PAOI_TEXT  = 'var(--sakura-deep)';

export default function Avatar({ user, size = 40, ring = false, story = false, photoUrl, onClick }: Props) {
  // Every call site used to have to remember to pass photoUrl itself, and
  // most didn't — resolve it here from context so a profile photo shows up
  // everywhere automatically. An explicit photoUrl prop still wins if passed.
  const { profilePhotos, currentUser } = useApp();
  const resolvedPhotoUrl = photoUrl ?? profilePhotos[user as string];
  const isMe = user === currentUser;
  const grad = isMe ? ALVIN_GRAD : PAOI_GRAD;
  const textColor = isMe ? '#fff' : PAOI_TEXT;
  const initial = String(user)[0]?.toUpperCase() ?? '?';

  const ringStyle = ring
    ? { outline: '2.5px solid var(--sakura)', outlineOffset: '2px' }
    : {};
  const storyStyle = story
    ? { outline: '2.5px solid transparent', backgroundImage: 'linear-gradient(white,white), linear-gradient(135deg, var(--sakura), var(--sakura-accent))', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }
    : {};

  if (resolvedPhotoUrl) {
    return (
      <div
        onClick={onClick}
        style={{
          width: size, height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0,
          cursor: onClick ? 'pointer' : 'default',
          ...ringStyle,
        }}
      >
        <img src={resolvedPhotoUrl} alt={String(user)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: grad,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Nunito', sans-serif",
        fontWeight: 700,
        fontSize: size * 0.38,
        color: textColor,
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        ...ringStyle,
        ...storyStyle,
      }}
    >
      {initial}
    </div>
  );
}
