// A person's display name (whatever they typed at signup, or later renamed
// to in Settings) — not a fixed pair of literal names. Kept as a named alias
// since it's threaded through a lot of signatures (author, from, to, ...).
export type User = string;

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
  postDate: string; // raw 'YYYY-MM-DD', for sorting/month filtering — `date` above is the pretty display string
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
  seriesId: string;
  billMonth: string;
  // How often it recurs: 1 = monthly, 2 = every 2 months, 3 = every 3 months, 12 = yearly.
  frequencyMonths: number;
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

export type EventRecurrence = 'none' | 'weekly' | 'monthly' | 'yearly';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  category: 'anniversary' | 'birthday' | 'trip' | 'date' | 'reminder';
  location: string;
  notes: string;
  // 'none' = a fixed one-off date (the original, only behavior). Anything
  // else repeats forever forward from `date`, which stays the anchor/first
  // occurrence — see calendarRecurrence.ts for how a given day/upcoming-list
  // entry gets matched against it.
  recurrence: EventRecurrence;
}

export interface Goal {
  id: string;
  title: string;
  emoji: string;
  completed: boolean;
  completedDate?: string;
  // Big life goals (a wedding, a down payment) can carry a savings target —
  // separate from Money's SavingsGoal, which tracks everyday budget funds.
  // A goal with no target is just a plain checklist item.
  target?: number;
  current?: number;
  deadline?: string;
  // Whose dream this is — 'both' for shared goals, or one person's own (a display name).
  owner: string;
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
  category?: string;
}

export interface Mood {
  emoji: string;
  label: string;
}

export interface Place {
  id: string;
  name: string;
  flag: string;
  images: string[];
  visitedDate?: string;
  memoryIds: string[];
}

export interface TripPlace {
  id: string;
  name: string;
  location?: string;
  activity?: string;
  costMin?: number;
  costMax?: number;
}

export interface TripDay {
  id: string;
  day: number;
  date?: string;
  places: TripPlace[];
}

export interface TripLodging {
  id: string;
  name: string;
  address?: string;
  checkIn?: string;
  checkOut?: string;
  note?: string;
}

export interface Trip {
  id: string;
  title: string;
  emoji: string;
  destination: string;
  // Optional — a trip can start life knowing only a rough day count, before
  // exact dates are picked.
  startDate?: string;
  endDate?: string;
  budget: number;
  checklist: { id: string; text: string; done: boolean }[];
  itinerary: TripDay[];
  lodging: TripLodging[];
  notes: string;
  status: 'planning' | 'upcoming' | 'completed';
}

export interface Capsule {
  id: string;
  from: User;
  to: string; // a display name, or 'both'
  title: string;
  occasion?: string;
  message: string;
  unlockDate: string;
  opened: boolean;
  createdDate: string;
}

export interface CycleLog {
  id: string;
  startDate: string;
  endDate?: string;
}

export interface StoryQuote {
  id: string;
  text: string;
}

export interface Debt {
  id: string;
  debtorName: string;
  amount: number;
  note?: string;
  date: string;
  dueDate?: string;
  paid: boolean;
  paidDate?: string;
  createdBy: User;
}

export interface PlaylistItem {
  id: string;
  title: string;
  artist: string;
  emoji: string;
  image?: string;
  durationSeconds?: number;
  releaseDate?: string;
  previewUrl?: string;
  note: string;
  addedBy: User;
}

export interface MoodEntry {
  date: string;
  moods: Record<string, Mood>;
}

export interface WishItem {
  id: string;
  from: User;
  wish: string;
  date: string;
  drawn: boolean;
  price?: string;
  link?: string;
  linkImage?: string;
  linkTitle?: string;
  linkDescription?: string;
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
  image?: string;
}

// A category id (fav_categories.id) — user-defined and editable, not a
// fixed set. Kept as a named alias since it's threaded through a lot of
// signatures (addFavPlace, removeFavPlace, ...).
export type FavCategory = string;

export interface FavCategoryItem {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

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

export interface ChatMessage {
  id: string;
  senderId: string;
  sender: User;
  mine: boolean;
  text: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  audioDuration: number | null;
  sticker: string | null;
  stickerImageUrl: string | null;
  createdAt: string;
  read: boolean;
  // Optimistic-send state — set the instant the user hits send, before the
  // network round trip confirms it, so the bubble appears immediately
  // instead of only once realtime delivers it back a moment later.
  pending?: boolean;
  failed?: boolean;
  // Stable React key across the optimistic → confirmed swap (where `id`
  // itself changes from a temp client id to the real row id) — keeps the
  // same DOM node instead of unmounting/remounting it, so the "just sent"
  // fade-in animation doesn't replay a second time the moment it confirms.
  clientKey?: string;
}

export interface CustomSticker {
  id: string;
  imageUrl: string;
  createdBy: User;
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
  cycleLogs: CycleLog[];
  storyQuotes: StoryQuote[];
  debts: Debt[];
  notifications: AppNotification[];
  chatMessages: ChatMessage[];
  unreadChatCount: number;
  // Ephemeral (never persisted) — set true while a "typing" broadcast has
  // arrived more recently than its own auto-clear timeout; see context.tsx's
  // chat realtime channel.
  partnerTyping: boolean;
  customStickers: CustomSticker[];
  moods: Record<string, Mood | null>;
  moodHistory: MoodEntry[];
  places: Place[];
  trips: Trip[];
  capsules: Capsule[];
  playlist: PlaylistItem[];
  wishes: WishItem[];
  dateIdeas: DateIdea[];
  dateIdeaPresets: DateIdea[];
  dateIdeaHistory: DateIdeaDraw[];
  gratitude: GratitudeEntry[];
  dateRequests: DateRequest[];
  postReactions: { [postId: string]: { [emoji: string]: { count: number; reacted: boolean } } };
  darkMode: boolean;
  favPlaces: Record<string, FavPlace[]>;
  favCategories: FavCategoryItem[];
  relationshipStart: string | null;
  streak: number;
  // True once both partners have already qualified today — see streak.ts.
  streakLitToday: boolean;
}
