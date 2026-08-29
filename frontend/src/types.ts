export type User = 'Alvin' | 'Paoi';

export interface Comment {
  id: string;
  author: User;
  text: string;
  date: string;
}

export interface Post {
  id: string;
  author: User;
  date: string;
  images: string[];
  caption: string;
  likes: number;
  liked: boolean;
  saved: boolean;
  comments: Comment[];
  location?: string;
}

export interface Memory {
  id: string;
  title: string;
  date: string;
  year: number;
  location: string;
  description: string;
  image: string;
  favorite: boolean;
  people: User[];
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  categoryEmoji: string;
  amount: number;
  paidBy: User | 'Both';
  date: string;
  note: string;
  type?: 'expense' | 'income';
}

export interface Bill {
  id: string;
  title: string;
  emoji: string;
  category: 'rent' | 'utilities' | 'internet' | 'subscription' | 'other';
  amount: number;
  dueDay: number;
  paid: boolean;
  paidDate?: string;
  reminder: boolean;
  note?: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  emoji: string;
  current: number;
  target: number;
  deadline: string;
}

export interface LoveNote {
  id: string;
  from: User;
  to: User;
  message: string;
  date: string;
  mood: string;
  read: boolean;
}

export interface SecretNote {
  id: string;
  from: User;
  message: string;
  unlockDate: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  category: 'anniversary' | 'birthday' | 'trip' | 'date' | 'reminder';
  location: string;
  notes: string;
}

export interface Goal {
  id: string;
  title: string;
  emoji: string;
  completed: boolean;
  completedDate?: string;
}

export interface AppNotification {
  id: string;
  message: string;
  emoji: string;
  date: string;
  createdAt: string;
  read: boolean;
  actor?: User;
  targetScreen?: string;
  targetId?: string;
  previewImageUrl?: string;
  previewText?: string;
}

export interface Mood {
  emoji: string;
  label: string;
}

export interface Place {
  id: string;
  name: string;
  flag: string;
  image: string;
  memoryIds: string[];
}

export interface Trip {
  id: string;
  title: string;
  emoji: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  checklist: { id: string; text: string; done: boolean }[];
  notes: string;
  status: 'planning' | 'upcoming' | 'completed';
}

export interface Capsule {
  id: string;
  from: User;
  to: 'Alvin' | 'Paoi' | 'both';
  message: string;
  unlockDate: string;
  opened: boolean;
  createdDate: string;
}

export interface Countdown {
  id: string;
  title: string;
  emoji: string;
  date: string;
  color: string;
}

export interface PlaylistItem {
  id: string;
  title: string;
  artist: string;
  emoji: string;
  note: string;
  addedBy: User;
}

export interface MoodEntry {
  date: string;
  Alvin?: Mood;
  Paoi?: Mood;
}

export interface WishItem {
  id: string;
  from: User;
  wish: string;
  date: string;
  drawn: boolean;
  price?: string;
  link?: string;
}

export interface LoveLetter {
  id: string;
  from: User;
  to: User;
  title: string;
  body: string;
  date: string;
  stationery: string;
  font: string;
}

export interface DateRequest {
  id: string;
  from: User;
  to: User;
  category: string;
  categoryEmoji: string;
  activity: string;
  location: string;
  date: string;
  time: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  responseNote: string;
  createdAt: string;
  respondedAt?: string;
}

export interface GratitudeEntry {
  id: string;
  from: User;
  text: string;
  date: string;
}

export interface FavPlace {
  id: string;
  name: string;
  note?: string;
}

export type FavCategory = 'food' | 'cafe' | 'bida' | 'gaming';

export interface Reaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

export interface DateIdea {
  id: string;
  emoji: string;
  text: string;
}

export interface DateIdeaDraw {
  id: string;
  emoji: string;
  text: string;
}

export interface AppState {
  posts: Post[];
  memories: Memory[];
  expenses: Expense[];
  savingsGoals: SavingsGoal[];
  bills: Bill[];
  loveNotes: LoveNote[];
  secretNotes: SecretNote[];
  loveLetters: LoveLetter[];
  events: CalendarEvent[];
  goals: Goal[];
  notifications: AppNotification[];
  moods: { Alvin: Mood | null; Paoi: Mood | null };
  moodHistory: MoodEntry[];
  favorites: { song: string; food: string; movie: string; cafe: string; place: string };
  places: Place[];
  trips: Trip[];
  capsules: Capsule[];
  countdowns: Countdown[];
  playlist: PlaylistItem[];
  wishes: WishItem[];
  dateIdeas: DateIdea[];
  dateIdeaHistory: DateIdeaDraw[];
  gratitude: GratitudeEntry[];
  dateRequests: DateRequest[];
  postReactions: { [postId: string]: { [emoji: string]: { count: number; reacted: boolean } } };
  darkMode: boolean;
  favPlaces: { food: FavPlace[]; cafe: FavPlace[]; bida: FavPlace[]; gaming: FavPlace[] };
  relationshipStart: string | null;
  streak: number;
}
