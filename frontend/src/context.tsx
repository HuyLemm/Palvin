// Force full-page reload when this module changes to avoid stale context refs.
if (import.meta.hot) {
  import.meta.hot.accept(() => { window.location.reload(); });
}

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { initialState } from './data';
import type { AppState, User, Post, Memory, Expense, SavingsGoal, LoveNote, SecretNote, CalendarEvent, Goal, CycleLog, StoryQuote, Debt, Mood, Bill, Trip, Capsule, PlaylistItem, WishItem, LoveLetter, GratitudeEntry, DateRequest, FavPlace, FavCategory, FavCategoryItem, Place, DateIdea, ChatMessage } from './types';
import { fetchChatMessages, sendChatMessageRow, markChatReadFrom, fetchUnreadChatCount, uploadChatFile } from './chat';
import type { NewChatMessage } from './chat';
import { readBootCache, writeBootCache, clearBootCache } from './bootCache';
import { supabase } from './lib/supabaseClient';
import {
  updatePhoto as authUpdatePhoto, updateNotifyPrefs as authUpdateNotifyPrefs, getCurrentProfile, getPartnerProfile, logout as authLogout,
  sendInvite as apiSendInvite, respondInvite as apiRespondInvite, cancelInvite as apiCancelInvite, getMyInvites,
  updateDisplayName as authUpdateDisplayName, changePassword as authChangePassword, touchLastActive, setForegroundState, updateDarkModePref,
  type PendingInvite, type AuthProfile, type NotifyPrefs,
} from './auth';
import {
  fetchPosts, createPost, addPostComment, setLiked, setSaved, toggleReaction, updatePostRow, deletePostRow,
} from './feed';
import {
  fetchNotifications, markNotificationRead, markAllNotificationsRead, deleteNotificationRow, passesNotifyPrefs,
} from './notifications';
import {
  fetchMemories, createMemory, setMemoryFavorite,
} from './memories';
import {
  fetchEvents, createEvent, updateEventRow, deleteEventRow,
} from './calendar';
import {
  fetchCycleLogs, createCycleLog, updateCycleLogRow, deleteCycleLogRow,
} from './cycle';
import {
  fetchStoryQuotes, createStoryQuote, updateStoryQuoteRow, deleteStoryQuoteRow,
} from './storyQuotes';
import {
  fetchDebts, createDebt, updateDebtRow, setDebtPaidRow, deleteDebtRow,
} from './debts';
import {
  fetchExpenses, createExpense, updateExpenseRow, deleteExpenseRow,
  fetchBills, createBill, updateBillRow, setBillPaid, deleteBillRow, rollBillsForward,
  fetchSavingsGoals, createSavingsGoal, updateSavingsGoalCurrent, updateSavingsGoalRow, deleteSavingsGoalRow,
} from './money';
import {
  fetchLoveNotes, createLoveNote, markLoveNoteRead,
  fetchLoveLetters, createLoveLetter, deleteLoveLetterRow,
  fetchSecretNotes, createSecretNote,
} from './loveNotes';
import {
  fetchGoals, createGoal, setGoalCompleted, setGoalCurrent, updateGoalRow, deleteGoalRow,
} from './futureUs';
import {
  fetchCoupleSettings, updateRelationshipStart,
  fetchFavPlaces, createFavPlace, updateFavPlaceRow, deleteFavPlace,
  fetchFavCategories, createFavCategory, updateFavCategoryRow, deleteFavCategoryRow,
} from './favourites';
import {
  fetchPlaces, createPlace, updatePlaceRow, deletePlaceRow,
} from './places';
import {
  fetchPlaylist, createPlaylistItem, updatePlaylistItemRow, deletePlaylistItemRow,
} from './playlist';
import {
  fetchTrips, createTrip as createTripRow, updateTripRow, deleteTripRow,
} from './trips';
import {
  fetchCapsules, createCapsule, openCapsuleRow, updateCapsuleRow, deleteCapsuleRow,
} from './capsules';
import {
  fetchWishes, createWish, updateWishRow, setWishDrawnRow, deleteWishRow,
} from './wishes';
import {
  fetchDateIdeas, createDateIdea, updateDateIdeaRow, deleteDateIdeaRow,
  fetchDateIdeaPresets, updateDateIdeaPresetRow, deleteDateIdeaPresetRow,
  fetchDateIdeaHistory, recordDateIdeaDraw,
} from './dateIdeas';
import {
  fetchGratitude, createGratitude, updateGratitudeRow, deleteGratitudeRow,
} from './gratitude';
import {
  fetchDateRequests, createDateRequest, respondToDateRequest, updateDateRequestRow, deleteDateRequestRow,
} from './dateRequests';
import {
  fetchMoodHistory, upsertMood,
} from './moods';
import { createHug } from './hugs';
import { fetchStreak, markActiveToday } from './streak';

interface ToastItem { id: string; message: string; emoji: string; leaving?: boolean; }

interface AppContextType {
  state: AppState;
  currentUser: User;

  // Auth session
  authed: boolean;
  authLoading: boolean;
  profileLoaded: boolean;   // true once refreshAuthProfile() has resolved at least once — gates isLinked from flashing false
  isLinked: boolean;
  isLinkedSettled: boolean; // true once isLinked's value can be trusted as final — see the state declaration for why this can lag isLinked itself briefly
  isAdmin: boolean; // the app-owner's own account — can edit/delete either partner's stuff everywhere, not just their own
  dataReady: boolean;       // true once the couple's initial data fetches have settled (or timed out) — see BOOT_DOMAIN_COUNT below
  imagesReady: boolean;     // true once every image referenced by that data has finished downloading (or timed out)
  hydratedFromCache: boolean; // true when this render was seeded from last session's cached snapshot — lets App.tsx skip the loading screen
  passwordRecovery: boolean; // true once the user landed here via a "forgot password" email link — App.tsx shows the reset-password screen instead of the normal app until this clears
  completePasswordRecovery: (newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  myProfile: AuthProfile | null;
  partnerProfile: AuthProfile | null;
  refreshAuthProfile: () => Promise<void>;
  logout: () => void;

  // Partner invite (visible in Settings + the notifications bell)
  pendingInvite: PendingInvite | null;   // someone invited me, waiting for my response
  sentInvite: PendingInvite | null;      // I invited someone, waiting for their response
  invitePartner: (username: string) => Promise<{ ok: boolean; error?: string }>;
  acceptInvite: (id: string) => Promise<void>;
  rejectInvite: (id: string) => Promise<void>;
  cancelSentInvite: (id: string) => Promise<void>;

  // Navigation
  screen: string;
  selectedId: string | null;
  navigate: (s: string, id?: string) => void;
  goBack: () => void;
  // Bumped on every navigate() (push) — lets a screen with its own internal
  // sub-navigation (e.g. Us) detect "the user re-tapped my tab while I was
  // already open" and reset to its default view, distinct from goBack()
  // (pop) landing back on the same screen, which should restore whatever
  // sub-view was showing before the deeper navigation.
  navSeq: number;
  lastNavWasPop: boolean;

  // Toast
  toasts: ToastItem[];
  toast: (msg: string, emoji?: string, opts?: { passive?: boolean }) => void;

  // Create modal
  createModal: boolean;
  createStep: string | null;
  openCreate: (step?: string) => void;
  closeCreate: () => void;
  celebration: boolean;

  // Posts
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  addComment: (postId: string, text: string) => void;
  addPost: (p: Omit<Post, 'id' | 'liked' | 'saved' | 'comments' | 'postDate'> & { postDate?: string }) => void;
  editPost: (id: string, data: { caption: string; location?: string }) => void;
  deletePost: (id: string) => void;

  // Memories
  addMemory: (m: Omit<Memory, 'id' | 'favorite'>) => void;
  toggleFavorite: (id: string) => void;

  // Expenses
  addExpense: (e: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, e: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;

  // Savings
  addSavingsGoal: (g: Omit<SavingsGoal, 'id'>) => void;
  updateSavingsGoal: (id: string, g: Omit<SavingsGoal, 'id' | 'current'>) => void;
  deleteSavingsGoal: (id: string) => void;
  addToGoal: (id: string, amount: number) => void;
  withdrawFromGoal: (id: string, amount: number) => void;

  // Love notes
  addLoveNote: (n: Omit<LoveNote, 'id' | 'read'>) => void;
  markNoteRead: (id: string) => void;
  addSecretNote: (n: Omit<SecretNote, 'id'>) => void;

  // Events
  addEvent: (e: Omit<CalendarEvent, 'id'>) => void;
  updateEvent: (id: string, e: Omit<CalendarEvent, 'id'>) => void;
  deleteEvent: (id: string) => void;

  // Cycle tracker
  addCycleLog: (l: Omit<CycleLog, 'id'>) => void;
  updateCycleLog: (id: string, l: Omit<CycleLog, 'id'>) => void;
  deleteCycleLog: (id: string) => void;

  // Story quotes
  addStoryQuote: (text: string) => void;
  updateStoryQuote: (id: string, text: string) => void;
  deleteStoryQuote: (id: string) => void;
  addDebt: (d: Omit<Debt, 'id' | 'paid' | 'paidDate'>) => void;
  updateDebt: (id: string, d: Omit<Debt, 'id' | 'paid' | 'paidDate'>) => void;
  toggleDebtPaid: (id: string) => void;
  deleteDebt: (id: string) => void;

  // Goals
  addGoal: (g: Omit<Goal, 'id' | 'completed' | 'current'>) => void;
  updateGoal: (id: string, g: Omit<Goal, 'id' | 'completed' | 'current' | 'completedDate'>) => void;
  toggleGoal: (id: string) => void;
  deleteGoal: (id: string) => void;
  contributeToGoal: (id: string, amount: number) => void;

  // Mood
  setMood: (user: User, mood: Mood) => void;


  // Notifications
  markNotifRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
  updateNotifyPrefs: (prefs: NotifyPrefs) => void;
  updateDisplayName: (name: string) => Promise<{ ok: boolean; error?: string }>;
  changePassword: (newPassword: string) => Promise<{ ok: boolean; error?: string }>;

  // Bills
  addBill: (b: Omit<Bill, 'id' | 'seriesId' | 'billMonth'>) => void;
  updateBill: (id: string, b: Omit<Bill, 'id' | 'seriesId' | 'billMonth' | 'paid' | 'paidDate'>) => void;
  toggleBillPaid: (id: string) => void;
  deleteBill: (id: string) => void;

  // Trips
  addTrip: (t: Omit<Trip, 'id'>) => void;
  updateTrip: (t: Trip) => void;
  deleteTrip: (id: string) => void;
  toggleTripCheck: (tripId: string, itemId: string) => void;

  // Capsules
  addCapsule: (c: Omit<Capsule, 'id'>) => void;
  openCapsule: (id: string) => void;
  updateCapsule: (c: Capsule) => void;
  deleteCapsule: (id: string) => void;

  // Playlist
  addToPlaylist: (p: Omit<PlaylistItem, 'id'>) => void;
  updatePlaylist: (id: string, p: { title: string; artist: string; emoji: string; image?: string; durationSeconds?: number; releaseDate?: string; previewUrl?: string; note?: string; addedBy?: User }) => void;
  removeFromPlaylist: (id: string) => void;

  // Wishes
  addWish: (w: Omit<WishItem, 'id' | 'drawn'>) => void;
  updateWish: (id: string, w: { wish: string; price?: string; link?: string; linkImage?: string; linkTitle?: string; linkDescription?: string }) => void;
  drawWish: (id: string, drawn?: boolean) => void;
  removeWish: (id: string) => void;

  // Date ideas
  addDateIdea: (i: Omit<DateIdea, 'id'>) => void;
  updateDateIdea: (id: string, i: { emoji: string; text: string }) => void;
  removeDateIdea: (id: string) => void;
  updateDateIdeaPreset: (id: string, i: { emoji: string; text: string }) => void;
  removeDateIdeaPreset: (id: string) => void;
  drawDateIdea: (idea: { emoji: string; text: string }) => void;

  // Love letters
  addLoveLetter: (l: Omit<LoveLetter, 'id'>) => void;
  deleteLoveLetter: (id: string) => void;

  // Hugs
  sendHug: (from: User, message: string, kind?: 'hug' | 'thinking') => void;

  // Date requests
  submitDateRequest: (req: Omit<DateRequest, 'id' | 'status' | 'responseNote' | 'createdAt'>) => void;
  respondToRequest: (id: string, status: 'approved' | 'rejected', note: string) => void;
  updateDateRequest: (id: string, req: Pick<DateRequest, 'category' | 'categoryEmoji' | 'activity' | 'location' | 'date' | 'time' | 'reason'>) => void;
  deleteDateRequest: (id: string) => void;

  // Gratitude
  addGratitude: (entry: Omit<GratitudeEntry, 'id'>) => void;
  updateGratitude: (id: string, text: string) => void;
  deleteGratitude: (id: string) => void;

  // Reactions
  addReaction: (postId: string, emoji: string) => void;

  // Fav places
  addFavPlace: (cat: FavCategory, place: Omit<FavPlace, 'id'>) => void;
  updateFavPlace: (cat: FavCategory, id: string, place: { name: string; note?: string; image?: string }) => void;
  removeFavPlace: (cat: FavCategory, id: string) => void;
  addFavCategory: (cat: { label: string; emoji: string; color: string }) => void;
  updateFavCategory: (id: string, cat: { label: string; emoji: string; color: string }) => void;
  removeFavCategory: (id: string) => void;

  // Places
  addPlace: (p: { name: string; flag?: string; images: string[]; visitedDate?: string }) => void;
  updatePlace: (id: string, p: { name: string; flag?: string; images: string[]; visitedDate?: string }) => void;
  deletePlace: (id: string) => void;

  // Dark mode
  toggleDarkMode: () => void;

  // Anniversary date
  setRelationshipStart: (date: string) => void;

  // Profile photos
  profilePhotos: Record<string, string>;
  updateProfilePhoto: (photoUrl: string) => void;

  // Chat
  sendChatMessage: (msg: NewChatMessage) => void;
  markChatRead: () => void;
  uploadChatMedia: (file: File | Blob, ext: string) => Promise<string | null>;
}

const Ctx = createContext<AppContextType>(null!);
export const useApp = () => useContext(Ctx);

let idCounter = 1000;
const uid = () => String(++idCounter);

// Every image URL that could show up anywhere in the app, gathered once the
// couple's data has finished loading — see the imagesReady effect below.
// Deduped via a Set since e.g. the same avatar URL appears on every post.
function collectImageUrls(state: AppState, profilePhotos: Record<string, string>): string[] {
  const urls = new Set<string>();
  for (const p of state.posts) for (const u of p.images) if (u) urls.add(u);
  for (const m of state.memories) if (m.image) urls.add(m.image);
  for (const pl of state.places) for (const u of pl.images) if (u) urls.add(u);
  for (const list of Object.values(state.favPlaces)) for (const f of list) if (f.image) urls.add(f.image);
  for (const p of state.playlist) if (p.image) urls.add(p.image);
  for (const w of state.wishes) if (w.linkImage) urls.add(w.linkImage);
  for (const m of state.chatMessages) if (m.imageUrl) urls.add(m.imageUrl);
  for (const url of Object.values(profilePhotos)) if (url) urls.add(url);
  return Array.from(urls);
}

// Never rejects — one broken/slow image URL shouldn't hang the whole batch
// (and by extension the loading screen) forever.
function preloadImage(url: string): Promise<void> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Seeds the very first render from last session's snapshot (if any) so a
  // warm reopen shows real content immediately instead of the loading
  // screen — see bootCache.ts. Wrong-account safety needs no extra code:
  // refreshProfiles() below always overwrites myProfile/partnerProfile/
  // currentUser/isLinked with the real fetch, and every refreshX() effect
  // re-fires whenever those change, so a mismatched cache self-heals the
  // instant the real check resolves.
  const [bootCache] = useState(() => readBootCache());
  // A real useState (not a plain derived const) specifically so logout()
  // can reset it — otherwise, once true, it stays true for the rest of the
  // tab's life, and stillResolvingSession's `!hydratedFromCache && ...`
  // guard in App.tsx would keep skipping the loading screen forever even
  // after signing out and into a *different* account in the same tab,
  // showing that account's screens flash by half-loaded instead of behind
  // the loading screen the way a genuine cold boot would.
  const [hydratedFromCache, setHydratedFromCache] = useState(() => !!bootCache);

  const [state, setState] = useState<AppState>(() => bootCache?.state ?? initialState);
  const [currentUser, setCurrentUser] = useState<User>(() => bootCache?.currentUser ?? '');
  // Optimistically true when hydrated — otherwise the real getSession()
  // check (which takes a beat) would leave `authed` false for a moment and
  // flash the AuthScreen overlay before the loading screen would have
  // covered it. Self-corrects the instant getSession()/onAuthStateChange
  // resolves if the cached account is no longer actually signed in.
  const [authed, setAuthed] = useState(() => hydratedFromCache);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isLinked, setIsLinked] = useState(() => bootCache?.isLinked ?? false);
  // True once we're actually SURE whether the couple is linked or not — not
  // just once the first refreshProfiles() call has resolved. Supabase fires
  // both an INITIAL_SESSION auth event and a separate getSession() call at
  // boot, each independently triggering refreshProfiles(); on rare timing,
  // one can resolve (briefly, correctly or not) before the other lands. Until
  // this is true, App.tsx keeps showing the loading screen instead of ever
  // flashing CoupleLocked for a couple that turns out to be linked a moment
  // later. See refreshProfiles() below.
  const [isLinkedSettled, setIsLinkedSettled] = useState(() => hydratedFromCache);
  const isLinkedSettledRef = useRef(hydratedFromCache);
  const unsettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [myProfile, setMyProfile] = useState<AuthProfile | null>(() => bootCache?.myProfile ?? null);
  const [partnerProfile, setPartnerProfile] = useState<AuthProfile | null>(() => bootCache?.partnerProfile ?? null);
  // The app owner's own account — can edit/delete either partner's stuff
  // everywhere (posts, gratitude entries, wishlist items, ...), not just
  // their own. Name-based rather than a DB flag since there are exactly two
  // accounts on this whole app and it'll never need to scale past that.
  const isAdmin = myProfile?.displayName.toLowerCase() === 'alvinne';
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
  const [sentInvite, setSentInvite] = useState<PendingInvite | null>(null);
  const [profilePhotos, setProfilePhotos] = useState<Record<string, string>>({});
  const [stack, setStack] = useState<{ screen: string; id?: string }[]>([{ screen: 'home' }]);
  const [navSeq, setNavSeq] = useState(0);
  const [lastNavWasPop, setLastNavWasPop] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [createModal, setCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<string | null>(null);
  const [celebration, setCelebration] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toastExitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const current = stack[stack.length - 1];
  const screen = current.screen;
  const selectedId = current.id ?? null;

  // Read inside the chat realtime subscription below without forcing that
  // effect to re-subscribe on every single navigation.
  const screenRef = useRef(screen);
  useEffect(() => { screenRef.current = screen; }, [screen]);

  const navigate = useCallback((s: string, id?: string) => {
    setStack(prev => [...prev, { screen: s, id }]);
    setNavSeq(n => n + 1);
    setLastNavWasPop(false);
  }, []);

  const goBack = useCallback(() => {
    setStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
    setLastNavWasPop(true);
  }, []);

  // Fire-and-forget: logs "I did something today" for the streak. The RPC
  // itself only advances couples.streak_count once EVERY profile in the
  // couple has logged today — see mark_active_today() in
  // 0050_streak_activity.sql. Re-fetches full streak info afterward (rather
  // than trusting the RPC's returned count alone) so streakLitToday — which
  // controls the flame's color — stays accurate too.
  const markActive = useCallback(() => {
    markActiveToday().then(() => {
      fetchStreak().then(({ count, litToday }) => setState(s => ({ ...s, streak: count, streakLitToday: litToday })));
    });
  }, []);

  const toast = useCallback((msg: string, emoji = '🌸', opts?: { passive?: boolean }) => {
    const id = uid();
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (toastExitTimer.current) clearTimeout(toastExitTimer.current);
    // Only one toast on screen at a time — a new one replaces whatever is
    // currently showing instead of stacking on top of it.
    setToasts([{ id, message: msg, emoji }]);
    toastTimer.current = setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
      toastExitTimer.current = setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 200);
    }, 3000);
    // Every success toast in this file marks a real user action — except
    // error toasts ('⚠️') and toasts fired passively from a realtime
    // subscription (e.g. seeing the partner's own action), which pass
    // { passive: true } explicitly.
    if (emoji !== '⚠️' && !opts?.passive) markActive();
  }, [markActive]);

  const openCreate = (step?: string) => { setCreateModal(true); setCreateStep(step ?? null); };
  const closeCreate = () => { setCreateModal(false); setCreateStep(null); };

  // Posts — backed by Supabase (posts/post_comments/post_likes/post_saves/post_reactions)
  const toggleLike = async (id: string) => {
    if (!myProfile) return;
    const post = state.posts.find(p => p.id === id);
    if (!post) return;
    const nextLiked = !post.liked;
    setState(s => ({
      ...s,
      posts: s.posts.map(p => p.id === id ? { ...p, liked: nextLiked, likes: nextLiked ? p.likes + 1 : p.likes - 1 } : p),
    }));
    const { error } = await setLiked(id, myProfile.id, nextLiked);
    if (error) { toast('Something went wrong', '⚠️'); refreshPosts(); }
  };

  const toggleSave = async (id: string) => {
    if (!myProfile) return;
    const post = state.posts.find(p => p.id === id);
    if (!post) return;
    const nextSaved = !post.saved;
    setState(s => ({ ...s, posts: s.posts.map(p => p.id === id ? { ...p, saved: nextSaved } : p) }));
    const { error } = await setSaved(id, myProfile.id, nextSaved);
    if (error) { toast('Something went wrong', '⚠️'); refreshPosts(); }
  };

  const addComment = async (postId: string, text: string) => {
    if (!myProfile) return;
    const { error } = await addPostComment(postId, myProfile.id, text);
    if (error) { toast('Something went wrong', '⚠️'); return; }
    refreshPosts();
  };

  const addPost = async (p: Omit<Post, 'id' | 'liked' | 'saved' | 'comments' | 'postDate'> & { postDate?: string }) => {
    if (!myProfile) return;
    const { error } = await createPost(myProfile.id, { images: p.images, caption: p.caption, location: p.location, postDate: p.postDate });
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshPosts();
    // No manual success toast here — the realtime `notifications` subscription
    // above pops one for both accounts (including the poster) a moment later.
  };

  const editPost = async (id: string, data: { caption: string; location?: string }) => {
    setState(s => ({ ...s, posts: s.posts.map(p => p.id === id ? { ...p, caption: data.caption, location: data.location } : p) }));
    const { error } = await updatePostRow(id, data);
    if (error) { toast('Something went wrong', '⚠️'); refreshPosts(); return; }
    toast('Post updated ✏️');
  };

  const deletePost = async (id: string) => {
    setState(s => ({ ...s, posts: s.posts.filter(p => p.id !== id) }));
    const { error } = await deletePostRow(id);
    if (error) { toast('Something went wrong', '⚠️'); refreshPosts(); return; }
    toast('Post deleted 🗑️');
  };

  // Memories — backed by Supabase
  const addMemory = async (m: Omit<Memory, 'id' | 'favorite'>) => {
    if (!myProfile || !partnerProfile) return;
    const occurredOn = new Date(m.date).toISOString().slice(0, 10);
    const { error } = await createMemory(myProfile.id, [myProfile.id, partnerProfile.id], {
      title: m.title, occurredOn, location: m.location, description: m.description, image: m.image,
    });
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshMemories();
    // No manual toast — the realtime `notifications` subscription pops one for both accounts.
  };

  const toggleFavorite = async (id: string) => {
    const mem = state.memories.find(m => m.id === id);
    if (!mem) return;
    const nextFav = !mem.favorite;
    setState(s => ({ ...s, memories: s.memories.map(x => x.id === id ? { ...x, favorite: nextFav } : x) }));
    const { error } = await setMemoryFavorite(id, nextFav);
    if (error) { toast('Something went wrong', '⚠️'); refreshMemories(); }
  };

  // Expenses — backed by Supabase
  const resolveProfileId = (who: User | 'Both'): string | null => {
    if (who === 'Both') return null;
    if (myProfile?.displayName === who) return myProfile.id;
    if (partnerProfile?.displayName === who) return partnerProfile.id;
    return null;
  };

  const addExpense = async (e: Omit<Expense, 'id'>) => {
    const { error } = await createExpense(resolveProfileId(e.paidBy), {
      title: e.title, category: e.category, categoryEmoji: e.categoryEmoji, amount: e.amount, date: e.date, note: e.note, type: e.type,
    });
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshMoney();
    toast('Expense saved.', '💰');
  };

  const updateExpense = async (id: string, e: Omit<Expense, 'id'>) => {
    const prev = state.expenses;
    setState(s => ({ ...s, expenses: s.expenses.map(x => x.id === id ? { ...x, ...e } : x) }));
    const { error } = await updateExpenseRow(id, resolveProfileId(e.paidBy), {
      title: e.title, category: e.category, categoryEmoji: e.categoryEmoji, amount: e.amount, date: e.date, note: e.note, type: e.type,
    });
    if (error) { toast('Something went wrong', '⚠️'); setState(s => ({ ...s, expenses: prev })); return; }
    toast('Transaction updated.', '✏️');
  };

  const deleteExpense = async (id: string) => {
    setState(s => ({ ...s, expenses: s.expenses.filter(e => e.id !== id) }));
    const { error } = await deleteExpenseRow(id);
    if (error) { toast('Something went wrong', '⚠️'); refreshMoney(); return; }
    toast('Expense removed.', '🗑️');
  };

  // Savings — backed by Supabase
  const addSavingsGoal = async (g: Omit<SavingsGoal, 'id'>) => {
    const { error } = await createSavingsGoal(g);
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshMoney();
    toast('Savings goal added! 💰');
  };

  const updateSavingsGoal = async (id: string, g: Omit<SavingsGoal, 'id' | 'current'>) => {
    const prev = state.savingsGoals;
    setState(s => ({ ...s, savingsGoals: s.savingsGoals.map(x => x.id === id ? { ...x, ...g } : x) }));
    const { error } = await updateSavingsGoalRow(id, g);
    if (error) { toast('Something went wrong', '⚠️'); setState(s => ({ ...s, savingsGoals: prev })); return; }
    toast('Fund updated.', '✏️');
  };

  const deleteSavingsGoal = async (id: string) => {
    setState(s => ({ ...s, savingsGoals: s.savingsGoals.filter(g => g.id !== id) }));
    const { error } = await deleteSavingsGoalRow(id);
    if (error) { toast('Something went wrong', '⚠️'); refreshMoney(); return; }
    toast('Fund deleted.', '🗑️');
  };

  const addToGoal = async (id: string, amount: number) => {
    const goal = state.savingsGoals.find(g => g.id === id);
    if (!goal || amount <= 0) return;
    const nextCurrent = Math.min(goal.current + amount, goal.target);
    const delta = nextCurrent - goal.current;
    if (delta <= 0) return;
    setState(s => ({ ...s, savingsGoals: s.savingsGoals.map(g => g.id === id ? { ...g, current: nextCurrent } : g) }));
    const { error } = await updateSavingsGoalCurrent(id, nextCurrent);
    if (error) { toast('Something went wrong', '⚠️'); refreshMoney(); return; }
    // Deposits move money out of everyday spending, so mirror it as an expense in Money.
    await createExpense(resolveProfileId(currentUser), {
      title: `Deposit to ${goal.title}`, category: 'Savings', categoryEmoji: goal.emoji || '💰',
      amount: delta, date: new Date().toISOString().split('T')[0], note: `Deposited into "${goal.title}"`, type: 'expense',
    });
    await refreshMoney();
    toast('Deposited into the fund! 🎉');
  };

  const withdrawFromGoal = async (id: string, amount: number) => {
    const goal = state.savingsGoals.find(g => g.id === id);
    if (!goal || amount <= 0) return;
    const nextCurrent = Math.max(goal.current - amount, 0);
    const delta = goal.current - nextCurrent;
    if (delta <= 0) return;
    setState(s => ({ ...s, savingsGoals: s.savingsGoals.map(g => g.id === id ? { ...g, current: nextCurrent } : g) }));
    const { error } = await updateSavingsGoalCurrent(id, nextCurrent);
    if (error) { toast('Something went wrong', '⚠️'); refreshMoney(); return; }
    // Withdrawals bring money back into everyday spending, so mirror it as income in Money.
    await createExpense(resolveProfileId(currentUser), {
      title: `Withdraw from ${goal.title}`, category: 'Savings', categoryEmoji: goal.emoji || '💰',
      amount: delta, date: new Date().toISOString().split('T')[0], note: `Withdrew from "${goal.title}"`, type: 'income',
    });
    await refreshMoney();
    toast('Withdrawn from the fund! 💸');
  };

  // Love notes / secret notes — backed by Supabase
  const addLoveNote = async (n: Omit<LoveNote, 'id' | 'read'>) => {
    const fromId = resolveProfileId(n.from);
    const toId = resolveProfileId(n.to);
    if (!fromId || !toId) return;
    const { error } = await createLoveNote(fromId, toId, n.message, n.mood);
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshLoveStuff();
    // No manual toast — the realtime `notifications` subscription pops one for both accounts.
  };

  const markNoteRead = async (id: string) => {
    setState(s => ({ ...s, loveNotes: s.loveNotes.map(n => n.id === id ? { ...n, read: true } : n) }));
    const { error } = await markLoveNoteRead(id);
    if (error) refreshLoveStuff();
  };

  const addSecretNote = async (n: Omit<SecretNote, 'id'>) => {
    const fromId = resolveProfileId(n.from);
    if (!fromId) return;
    const { error } = await createSecretNote(fromId, n.message, n.unlockDate);
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshLoveStuff();
    toast('Secret note saved 🔐');
  };

  // Events — backed by Supabase
  const addEvent = async (e: Omit<CalendarEvent, 'id'>) => {
    const { error } = await createEvent(e);
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshEvents();
    toast('Event added to calendar 📅');
  };

  const updateEvent = async (id: string, e: Omit<CalendarEvent, 'id'>) => {
    setState(s => ({ ...s, events: s.events.map(x => x.id === id ? { ...x, ...e } : x) }));
    const { error } = await updateEventRow(id, e);
    if (error) { toast('Something went wrong', '⚠️'); refreshEvents(); return; }
    toast('Event updated ✏️');
  };

  const deleteEvent = async (id: string) => {
    setState(s => ({ ...s, events: s.events.filter(e => e.id !== id) }));
    const { error } = await deleteEventRow(id);
    if (error) { toast('Something went wrong', '⚠️'); refreshEvents(); }
  };

  // Cycle tracker — backed by Supabase
  const addCycleLog = async (l: Omit<CycleLog, 'id'>) => {
    const { error } = await createCycleLog(l);
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshCycleLogs();
    toast('Cycle logged 🌸');
  };

  const updateCycleLog = async (id: string, l: Omit<CycleLog, 'id'>) => {
    setState(s => ({ ...s, cycleLogs: s.cycleLogs.map(x => x.id === id ? { ...x, ...l } : x) }));
    const { error } = await updateCycleLogRow(id, l);
    if (error) { toast('Something went wrong', '⚠️'); refreshCycleLogs(); }
  };

  const deleteCycleLog = async (id: string) => {
    setState(s => ({ ...s, cycleLogs: s.cycleLogs.filter(l => l.id !== id) }));
    const { error } = await deleteCycleLogRow(id);
    if (error) { toast('Something went wrong', '⚠️'); refreshCycleLogs(); }
  };

  // Story quotes — backed by Supabase
  const addStoryQuote = async (text: string) => {
    const { error } = await createStoryQuote(text);
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshStoryQuotes();
    toast('Quote added ✨');
  };

  const updateStoryQuote = async (id: string, text: string) => {
    setState(s => ({ ...s, storyQuotes: s.storyQuotes.map(q => q.id === id ? { ...q, text } : q) }));
    const { error } = await updateStoryQuoteRow(id, text);
    if (error) { toast('Something went wrong', '⚠️'); refreshStoryQuotes(); }
  };

  const deleteStoryQuote = async (id: string) => {
    setState(s => ({ ...s, storyQuotes: s.storyQuotes.filter(q => q.id !== id) }));
    const { error } = await deleteStoryQuoteRow(id);
    if (error) { toast('Something went wrong', '⚠️'); refreshStoryQuotes(); }
  };

  // Debts ("Sổ nợ") — backed by Supabase
  const addDebt = async (d: Omit<Debt, 'id' | 'paid' | 'paidDate'>) => {
    const { error } = await createDebt(resolveProfileId(d.createdBy), d);
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshDebts();
    toast('Debt recorded 📝');
  };

  const updateDebt = async (id: string, d: Omit<Debt, 'id' | 'paid' | 'paidDate'>) => {
    setState(s => ({ ...s, debts: s.debts.map(x => x.id === id ? { ...x, ...d } : x) }));
    const { error } = await updateDebtRow(id, resolveProfileId(d.createdBy), d);
    if (error) { toast('Something went wrong', '⚠️'); refreshDebts(); return; }
    toast('Debt updated ✏️');
  };

  const toggleDebtPaid = async (id: string) => {
    const debt = state.debts.find(x => x.id === id);
    if (!debt) return;
    const nextPaid = !debt.paid;
    const paidDate = nextPaid ? new Date().toISOString().slice(0, 10) : undefined;
    setState(s => ({ ...s, debts: s.debts.map(x => x.id === id ? { ...x, paid: nextPaid, paidDate } : x) }));
    const { error } = await setDebtPaidRow(id, nextPaid);
    if (error) { toast('Something went wrong', '⚠️'); refreshDebts(); return; }
    toast(nextPaid ? 'Marked as paid 🎉' : 'Marked as unpaid');
  };

  const deleteDebt = async (id: string) => {
    setState(s => ({ ...s, debts: s.debts.filter(x => x.id !== id) }));
    const { error } = await deleteDebtRow(id);
    if (error) refreshDebts();
  };

  // Goals
  const addGoal = async (g: Omit<Goal, 'id' | 'completed' | 'current'>) => {
    const ownerId = g.owner === 'both' ? null : resolveProfileId(g.owner);
    const { error } = await createGoal({ title: g.title, emoji: g.emoji, target: g.target, deadline: g.deadline, ownerId });
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshGoals();
    toast('Goal added ✨');
  };

  const updateGoal = async (id: string, g: Omit<Goal, 'id' | 'completed' | 'current' | 'completedDate'>) => {
    const ownerId = g.owner === 'both' ? null : resolveProfileId(g.owner);
    setState(s => ({ ...s, goals: s.goals.map(x => x.id === id ? { ...x, title: g.title, emoji: g.emoji, owner: g.owner, target: g.target, deadline: g.deadline } : x) }));
    const { error } = await updateGoalRow(id, { title: g.title, emoji: g.emoji, target: g.target, deadline: g.deadline, ownerId });
    if (error) { toast('Something went wrong', '⚠️'); refreshGoals(); return; }
    toast('Goal updated ✏️');
  };

  // Contributing enough to reach the target auto-completes the goal — the
  // same celebration path as manually checking it off — since hitting the
  // savings number IS the goal for this kind, not a separate step.
  const contributeToGoal = async (id: string, amount: number) => {
    const goal = state.goals.find(g => g.id === id);
    if (!goal || goal.target == null || amount <= 0) return;
    const nextCurrent = Math.min((goal.current ?? 0) + amount, goal.target);
    if (nextCurrent === goal.current) return;
    const reachedTarget = nextCurrent >= goal.target && !goal.completed;
    const completedDate = reachedTarget ? new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : goal.completedDate ?? null;
    setState(s => ({ ...s, goals: s.goals.map(g => g.id === id ? { ...g, current: nextCurrent, completed: reachedTarget ? true : g.completed, completedDate: reachedTarget ? completedDate ?? undefined : g.completedDate } : g) }));
    if (reachedTarget) {
      setCelebration(true);
      setTimeout(() => setCelebration(false), 2000);
      toast('Goal completed! ❤️', '🎉');
    } else {
      toast('Contributed to the goal 💪');
    }
    const { error } = await setGoalCurrent(id, nextCurrent);
    if (error) { toast('Something went wrong', '⚠️'); refreshGoals(); return; }
    if (reachedTarget) {
      const { error: err2 } = await setGoalCompleted(id, true, completedDate);
      if (err2) refreshGoals();
    }
  };

  const toggleGoal = async (id: string) => {
    const goal = state.goals.find(g => g.id === id);
    if (!goal) return;
    const nextCompleted = !goal.completed;
    const completedDate = nextCompleted ? new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null;
    setState(s => ({ ...s, goals: s.goals.map(g => g.id === id ? { ...g, completed: nextCompleted, completedDate: completedDate ?? undefined } : g) }));
    if (nextCompleted) {
      setCelebration(true);
      setTimeout(() => setCelebration(false), 2000);
      toast('Goal completed! ❤️', '🎉');
    }
    const { error } = await setGoalCompleted(id, nextCompleted, completedDate);
    if (error) { toast('Something went wrong', '⚠️'); refreshGoals(); }
  };

  const deleteGoal = async (id: string) => {
    setState(s => ({ ...s, goals: s.goals.filter(g => g.id !== id) }));
    const { error } = await deleteGoalRow(id);
    if (error) refreshGoals();
  };

  // Mood — backed by Supabase
  const setMood = async (user: User, mood: Mood) => {
    const profileId = resolveProfileId(user);
    if (!profileId) return;
    const { error } = await upsertMood(profileId, mood.emoji, mood.label);
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshMoods();
    toast(`Mood updated!`, mood.emoji);
  };

  // Notifications — backed by Supabase (shared couple activity feed)
  const markNotifRead = async (id: string) => {
    setState(s => ({ ...s, notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) }));
    const { error } = await markNotificationRead(id);
    if (error) refreshNotifications();
  };

  const markAllRead = async () => {
    setState(s => ({ ...s, notifications: s.notifications.map(n => ({ ...n, read: true })) }));
    const { error } = await markAllNotificationsRead();
    if (error) refreshNotifications();
  };

  const deleteNotification = async (id: string) => {
    setState(s => ({ ...s, notifications: s.notifications.filter(n => n.id !== id) }));
    const { error } = await deleteNotificationRow(id);
    if (error) refreshNotifications();
  };

  // Bills — backed by Supabase
  const addBill = async (b: Omit<Bill, 'id' | 'seriesId' | 'billMonth'>) => {
    const { error } = await createBill({ ...b, seriesId: crypto.randomUUID(), billMonth: new Date().toISOString().slice(0, 7) });
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshMoney();
    toast('Bill added!', '🧾');
  };

  const updateBill = async (id: string, b: Omit<Bill, 'id' | 'seriesId' | 'billMonth' | 'paid' | 'paidDate'>) => {
    const prev = state.bills;
    setState(s => ({ ...s, bills: s.bills.map(x => x.id === id ? { ...x, ...b } : x) }));
    const { error } = await updateBillRow(id, b);
    if (error) { toast('Something went wrong', '⚠️'); setState(s => ({ ...s, bills: prev })); return; }
    toast('Bill updated.', '✏️');
  };

  const toggleBillPaid = async (id: string) => {
    const bill = state.bills.find(b => b.id === id);
    if (!bill) return;
    const nextPaid = !bill.paid;
    const paidDate = nextPaid ? new Date().toISOString().slice(0, 10) : null;
    setState(s => ({ ...s, bills: s.bills.map(x => x.id === id ? { ...x, paid: nextPaid, paidDate: paidDate ?? undefined } : x) }));
    const { error } = await setBillPaid(id, nextPaid, paidDate);
    if (error) { toast('Something went wrong', '⚠️'); refreshMoney(); return; }
    // Mirror the payment (or its reversal) into Thu chi, same as goal deposit/withdraw.
    // Tagged with billId so deleting the bill later also removes these (on delete cascade).
    const today = new Date().toISOString().slice(0, 10);
    await createExpense(resolveProfileId(currentUser), nextPaid ? {
      title: `Paid bill: ${bill.title}`, category: 'Bills', categoryEmoji: bill.emoji || '🧾',
      amount: bill.amount, date: today, note: `Paid the "${bill.title}" bill`, type: 'expense', billId: bill.id,
    } : {
      title: `Unpaid bill: ${bill.title}`, category: 'Bills', categoryEmoji: bill.emoji || '🧾',
      amount: bill.amount, date: today, note: `Marked the "${bill.title}" bill unpaid`, type: 'income', billId: bill.id,
    });
    await refreshMoney();
  };

  const deleteBill = async (id: string) => {
    setState(s => ({ ...s, bills: s.bills.filter(b => b.id !== id) }));
    const { error } = await deleteBillRow(id);
    if (error) { toast('Something went wrong', '⚠️'); refreshMoney(); return; }
    // The bill's linked Thu chi transactions are removed by the DB's on-delete
    // cascade — refresh so the local expenses list reflects that too.
    await refreshMoney();
    toast('Bill deleted.', '🗑️');
  };

  // Trips — backed by Supabase
  const addTrip = async (t: Omit<Trip, 'id'>) => {
    const { error } = await createTripRow(t);
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshTrips();
    toast('Trip added! ✈️');
  };
  const updateTrip = async (t: Trip) => {
    setState(s => ({ ...s, trips: s.trips.map(x => x.id === t.id ? t : x) }));
    const { error } = await updateTripRow(t.id, t);
    if (error) { toast('Something went wrong', '⚠️'); refreshTrips(); }
  };
  const deleteTrip = async (id: string) => {
    setState(s => ({ ...s, trips: s.trips.filter(t => t.id !== id) }));
    const { error } = await deleteTripRow(id);
    if (error) { refreshTrips(); return; }
    toast('Trip removed.', '🗑️');
  };
  const toggleTripCheck = (tripId: string, itemId: string) => {
    const t = state.trips.find(x => x.id === tripId);
    if (!t) return;
    updateTrip({ ...t, checklist: t.checklist.map(c => c.id === itemId ? { ...c, done: !c.done } : c) });
  };

  // Capsules — backed by Supabase
  const addCapsule = async (c: Omit<Capsule, 'id'>) => {
    const fromId = resolveProfileId(c.from);
    const toId = c.to === 'both' ? null : resolveProfileId(c.to);
    if (!fromId) return;
    const { error } = await createCapsule(fromId, toId, c.title, c.occasion, c.message, c.unlockDate);
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshCapsules();
    toast('Capsule sealed! 💌');
  };
  const openCapsule = async (id: string) => {
    setState(s => ({ ...s, capsules: s.capsules.map(c => c.id === id ? { ...c, opened: true } : c) }));
    const { error } = await openCapsuleRow(id);
    if (error) refreshCapsules();
  };
  const updateCapsule = async (c: Capsule) => {
    setState(s => ({ ...s, capsules: s.capsules.map(x => x.id === c.id ? c : x) }));
    const toId = c.to === 'both' ? null : resolveProfileId(c.to);
    const { error } = await updateCapsuleRow(c.id, toId, c.title, c.occasion, c.message, c.unlockDate);
    if (error) { toast('Something went wrong', '⚠️'); refreshCapsules(); }
  };
  const deleteCapsule = async (id: string) => {
    setState(s => ({ ...s, capsules: s.capsules.filter(c => c.id !== id) }));
    const { error } = await deleteCapsuleRow(id);
    if (error) refreshCapsules();
  };

// Playlist — backed by Supabase
  const addToPlaylist = async (p: Omit<PlaylistItem, 'id'>) => {
    const addedById = resolveProfileId(p.addedBy) ?? myProfile?.id;
    if (!addedById) return;
    const { error } = await createPlaylistItem(addedById, { title: p.title, artist: p.artist, emoji: p.emoji, image: p.image, durationSeconds: p.durationSeconds, releaseDate: p.releaseDate, previewUrl: p.previewUrl, note: p.note });
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshPlaylist();
    toast('Added to playlist! 🎵');
  };
  const updatePlaylist = async (id: string, p: { title: string; artist: string; emoji: string; image?: string; durationSeconds?: number; releaseDate?: string; previewUrl?: string; note?: string; addedBy?: User }) => {
    const addedById = p.addedBy ? resolveProfileId(p.addedBy) : null;
    setState(s => ({ ...s, playlist: s.playlist.map(x => x.id === id ? { ...x, ...p, addedBy: p.addedBy ?? x.addedBy } : x) }));
    const { error } = await updatePlaylistItemRow(id, addedById, p);
    if (error) refreshPlaylist();
  };
  const removeFromPlaylist = async (id: string) => {
    setState(s => ({ ...s, playlist: s.playlist.filter(p => p.id !== id) }));
    const { error } = await deletePlaylistItemRow(id);
    if (error) refreshPlaylist();
  };

  // Wishes — backed by Supabase
  const addWish = async (w: Omit<WishItem, 'id' | 'drawn'>) => {
    const fromId = resolveProfileId(w.from);
    if (!fromId) return;
    const { error } = await createWish(fromId, { wish: w.wish, date: w.date, price: w.price, link: w.link, linkImage: w.linkImage, linkTitle: w.linkTitle, linkDescription: w.linkDescription });
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshWishes();
    toast('Wish dropped in the jar! 🫙', '✨');
  };
  const updateWish = async (id: string, w: { wish: string; price?: string; link?: string; linkImage?: string; linkTitle?: string; linkDescription?: string }) => {
    setState(s => ({ ...s, wishes: s.wishes.map(x => x.id === id ? { ...x, ...w } : x) }));
    const { error } = await updateWishRow(id, w);
    if (error) { toast('Something went wrong', '⚠️'); refreshWishes(); }
  };
  const drawWish = async (id: string, drawn: boolean = true) => {
    setState(s => ({ ...s, wishes: s.wishes.map(w => w.id === id ? { ...w, drawn } : w) }));
    const { error } = await setWishDrawnRow(id, drawn);
    if (error) refreshWishes();
  };
  const removeWish = async (id: string) => {
    setState(s => ({ ...s, wishes: s.wishes.filter(w => w.id !== id) }));
    const { error } = await deleteWishRow(id);
    if (error) refreshWishes();
  };

  // Date ideas — backed by Supabase
  const addDateIdea = async (i: Omit<DateIdea, 'id'>) => {
    if (!myProfile) return;
    const { error } = await createDateIdea(myProfile.id, { emoji: i.emoji, text: i.text });
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshDateIdeas();
    toast('Idea added! ✨');
  };
  const removeDateIdea = async (id: string) => {
    setState(s => ({ ...s, dateIdeas: s.dateIdeas.filter(i => i.id !== id) }));
    const { error } = await deleteDateIdeaRow(id);
    if (error) refreshDateIdeas();
  };
  const updateDateIdea = async (id: string, i: { emoji: string; text: string }) => {
    const prev = state.dateIdeas;
    setState(s => ({ ...s, dateIdeas: s.dateIdeas.map(x => x.id === id ? { ...x, ...i } : x) }));
    const { error } = await updateDateIdeaRow(id, i);
    if (error) { toast('Something went wrong', '⚠️'); setState(s => ({ ...s, dateIdeas: prev })); return; }
    toast('Idea updated.', '✏️');
  };
  // Presets — same shape as custom ideas, just their own table (see 0032).
  const updateDateIdeaPreset = async (id: string, i: { emoji: string; text: string }) => {
    const prev = state.dateIdeaPresets;
    setState(s => ({ ...s, dateIdeaPresets: s.dateIdeaPresets.map(x => x.id === id ? { ...x, ...i } : x) }));
    const { error } = await updateDateIdeaPresetRow(id, i);
    if (error) { toast('Something went wrong', '⚠️'); setState(s => ({ ...s, dateIdeaPresets: prev })); return; }
    toast('Idea updated.', '✏️');
  };
  const removeDateIdeaPreset = async (id: string) => {
    setState(s => ({ ...s, dateIdeaPresets: s.dateIdeaPresets.filter(i => i.id !== id) }));
    const { error } = await deleteDateIdeaPresetRow(id);
    if (error) refreshDateIdeaPresets();
  };
  const drawDateIdea = async (idea: { emoji: string; text: string }) => {
    if (!myProfile) return;
    const { error } = await recordDateIdeaDraw(myProfile.id, idea);
    if (!error) refreshDateIdeaHistory();
  };

  // Love letters
  const addLoveLetter = async (l: Omit<LoveLetter, 'id'>) => {
    const fromId = resolveProfileId(l.from);
    const toId = resolveProfileId(l.to);
    if (!fromId || !toId) return;
    const { error } = await createLoveLetter(fromId, toId, { title: l.title, body: l.body, stationery: l.stationery, font: l.font });
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshLoveStuff();
    // No manual toast — the realtime `notifications` subscription pops one for both accounts.
  };
  const deleteLoveLetter = async (id: string) => {
    setState(s => ({ ...s, loveLetters: s.loveLetters.filter(l => l.id !== id) }));
    const { error } = await deleteLoveLetterRow(id);
    if (error) refreshLoveStuff();
  };

  // Hugs — backed by Supabase (notify_new_hug trigger pushes the shared
  // notification via the existing realtime subscription).
  const sendHug = async (from: User, message: string, kind: 'hug' | 'thinking' = 'hug') => {
    const to = (myProfile?.displayName === from ? partnerProfile?.displayName : myProfile?.displayName) ?? from;
    const fromId = resolveProfileId(from);
    if (!fromId) return;
    const { error } = await createHug(fromId, message, kind);
    if (error) { toast('Something went wrong', '⚠️'); return; }
    toast(kind === 'thinking' ? `${from} is thinking of ${to} 💭` : `${from} sent ${to} a hug 🫂`, '🌸');
  };

  // Date requests — backed by Supabase (notify_new_date_request/notify_date_request_response
  // triggers push the shared notification, matching the original inline behaviour).
  const submitDateRequest = async (req: Omit<DateRequest, 'id' | 'status' | 'responseNote' | 'createdAt'>) => {
    const fromId = resolveProfileId(req.from);
    const toId = resolveProfileId(req.to);
    if (!fromId || !toId) return;
    const { error } = await createDateRequest(fromId, toId, req);
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshDateRequests();
    toast(`Request submitted! Waiting on ${req.to} to approve 📋`, '✨');
  };

  const respondToRequest = async (id: string, status: 'approved' | 'rejected', note: string) => {
    setState(s => ({
      ...s,
      dateRequests: s.dateRequests.map(r =>
        r.id === id ? { ...r, status, responseNote: note, respondedAt: new Date().toISOString() } : r
      ),
    }));
    const { error } = await respondToDateRequest(id, status, note);
    if (error) { refreshDateRequests(); return; }
    toast(status === 'approved' ? 'Request approved! 🎉' : 'Request rejected', status === 'approved' ? '✅' : '❌');
  };

  // Only ever called from the "mine" tab on a still-pending request — once
  // approved/rejected, DatePermit hides the edit/delete controls entirely.
  const updateDateRequest = async (id: string, req: Pick<DateRequest, 'category' | 'categoryEmoji' | 'activity' | 'location' | 'date' | 'time' | 'reason'>) => {
    const prev = state.dateRequests;
    setState(s => ({ ...s, dateRequests: s.dateRequests.map(r => r.id === id ? { ...r, ...req } : r) }));
    const { error } = await updateDateRequestRow(id, req);
    if (error) { toast('Something went wrong', '⚠️'); setState(s => ({ ...s, dateRequests: prev })); return; }
    toast('Request updated.', '✏️');
  };

  const deleteDateRequest = async (id: string) => {
    setState(s => ({ ...s, dateRequests: s.dateRequests.filter(r => r.id !== id) }));
    const { error } = await deleteDateRequestRow(id);
    if (error) { toast('Something went wrong', '⚠️'); refreshDateRequests(); return; }
    toast('Request deleted.', '🗑️');
  };

  // Gratitude
  const addGratitude = async (entry: Omit<GratitudeEntry, 'id'>) => {
    const fromId = resolveProfileId(entry.from);
    if (!fromId) return;
    const { error } = await createGratitude(fromId, entry.text, entry.date);
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshGratitude();
    toast('Gratitude saved 🌸', '💕');
  };

  const updateGratitude = async (id: string, text: string) => {
    const prev = state.gratitude;
    setState(s => ({ ...s, gratitude: s.gratitude.map(g => g.id === id ? { ...g, text } : g) }));
    const { error } = await updateGratitudeRow(id, text);
    if (error) { toast('Something went wrong', '⚠️'); setState(s => ({ ...s, gratitude: prev })); return; }
    toast('Updated.', '✏️');
  };

  const deleteGratitude = async (id: string) => {
    setState(s => ({ ...s, gratitude: s.gratitude.filter(g => g.id !== id) }));
    const { error } = await deleteGratitudeRow(id);
    if (error) { toast('Something went wrong', '⚠️'); refreshGratitude(); return; }
    toast('Deleted.', '🗑️');
  };

  // Reactions
  const addReaction = async (postId: string, emoji: string) => {
    if (!myProfile) return;
    const existing = state.postReactions[postId]?.[emoji];
    const reacted = existing?.reacted ?? false;
    setState(s => ({
      ...s,
      postReactions: {
        ...s.postReactions,
        [postId]: {
          ...s.postReactions[postId],
          [emoji]: { count: reacted ? (existing!.count - 1) : ((existing?.count ?? 0) + 1), reacted: !reacted },
        },
      },
    }));
    const { error } = await toggleReaction(postId, myProfile.id, emoji, reacted);
    if (error) { toast('Something went wrong', '⚠️'); refreshPosts(); }
  };

  // Fav places
  const addFavPlace = async (cat: FavCategory, place: Omit<FavPlace, 'id'>) => {
    const { error } = await createFavPlace(cat, place);
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshFavorites();
    toast('Added!', '✨');
  };
  const updateFavPlace = async (cat: FavCategory, id: string, place: { name: string; note?: string; image?: string }) => {
    setState(s => ({ ...s, favPlaces: { ...s.favPlaces, [cat]: (s.favPlaces[cat] ?? []).map(p => p.id === id ? { ...p, ...place } : p) } }));
    const { error } = await updateFavPlaceRow(id, place);
    if (error) refreshFavorites();
  };
  const removeFavPlace = async (cat: FavCategory, id: string) => {
    setState(s => ({ ...s, favPlaces: { ...s.favPlaces, [cat]: (s.favPlaces[cat] ?? []).filter(p => p.id !== id) } }));
    const { error } = await deleteFavPlace(id);
    if (error) refreshFavorites();
  };

  const addFavCategory = async (cat: { label: string; emoji: string; color: string }) => {
    const { data, error } = await createFavCategory(cat);
    if (error || !data) { toast('Something went wrong', '⚠️'); return; }
    setState(s => ({ ...s, favCategories: [...s.favCategories, data as FavCategoryItem] }));
  };
  const updateFavCategory = async (id: string, cat: { label: string; emoji: string; color: string }) => {
    setState(s => ({ ...s, favCategories: s.favCategories.map(c => c.id === id ? { ...c, ...cat } : c) }));
    const { error } = await updateFavCategoryRow(id, cat);
    if (error) refreshFavorites();
  };
  const removeFavCategory = async (id: string) => {
    setState(s => {
      const { [id]: _removed, ...restPlaces } = s.favPlaces;
      return { ...s, favCategories: s.favCategories.filter(c => c.id !== id), favPlaces: restPlaces };
    });
    const { error } = await deleteFavCategoryRow(id);
    if (error) refreshFavorites();
  };

  // Places
  const addPlace = async (p: { name: string; flag?: string; images: string[]; visitedDate?: string }) => {
    const { error } = await createPlace(p);
    if (error) { toast('Something went wrong', '⚠️'); return; }
    await refreshPlaces();
    toast('Place added!', '📍');
  };
  const updatePlace = async (id: string, p: { name: string; flag?: string; images: string[]; visitedDate?: string }) => {
    setState(s => ({ ...s, places: s.places.map(x => x.id === id ? { ...x, name: p.name, flag: p.flag ?? '', images: p.images, visitedDate: p.visitedDate } : x) }));
    const { error } = await updatePlaceRow(id, p);
    if (error) { toast('Something went wrong', '⚠️'); refreshPlaces(); return; }
    toast('Place updated ✏️');
  };
  const deletePlace = async (id: string) => {
    setState(s => ({ ...s, places: s.places.filter(p => p.id !== id) }));
    const { error } = await deletePlaceRow(id);
    if (error) refreshPlaces();
  };

  // Dark mode — persisted per ACCOUNT (profiles.dark_mode), not per couple,
  // so switching it never affects what the partner sees on their device.
  const toggleDarkMode = async () => {
    if (!myProfile) return;
    const next = !myProfile.darkMode;
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.removeAttribute('data-theme');
    }
    setState(s => ({ ...s, darkMode: next }));
    setMyProfile(p => p ? { ...p, darkMode: next } : p);
    const res = await updateDarkModePref(myProfile.id, next);
    if (!res.ok) toast('Something went wrong', '⚠️');
  };

  // Anniversary date — either partner can set/edit it, persisted per couple.
  const setRelationshipStart = async (date: string) => {
    if (!myProfile?.coupleId) return;
    setState(s => ({ ...s, relationshipStart: date }));
    const { error } = await updateRelationshipStart(myProfile.coupleId, date);
    if (error) { toast('Something went wrong', '⚠️'); refreshFavorites(); return; }
    toast('Anniversary date updated 📅', '💕');
  };

  const refreshProfiles = useCallback(async () => {
    const me = await getCurrentProfile();
    if (!me) {
      clearBootCache();
      setHydratedFromCache(false);
      setMyProfile(null); setPartnerProfile(null); setProfilePhotos({}); setIsLinked(false);
      setProfileLoaded(true);
      setIsLinkedSettled(true); isLinkedSettledRef.current = true;
      // getCurrentProfile() calls auth.getUser() (server-validated, unlike
      // getSession()'s local-only check), so landing here means either the
      // account itself is gone (e.g. an admin wipe) or there was never a
      // real session — either way `authed` must not stay true from a stale
      // locally-cached session, or the app falls through to "waiting to
      // link a partner" instead of the login screen. signOut() clears the
      // stale token and fires onAuthStateChange(null), which sets authed
      // false correctly; it's a harmless no-op if there was no session.
      supabase.auth.signOut();
      return;
    }
    const partner = await getPartnerProfile();
    setMyProfile(me);
    setPartnerProfile(partner);
    if (partner) {
      if (unsettleTimerRef.current) { clearTimeout(unsettleTimerRef.current); unsettleTimerRef.current = null; }
      setIsLinked(true);
      setIsLinkedSettled(true); isLinkedSettledRef.current = true;
    } else {
      setIsLinked(false);
      // Don't trust "not linked" as final on the very first read — give the
      // other concurrent boot call (see isLinkedSettled's comment above) a
      // beat to land first in case it finds the real partner.
      if (!isLinkedSettledRef.current && !unsettleTimerRef.current) {
        unsettleTimerRef.current = setTimeout(() => {
          setIsLinkedSettled(true); isLinkedSettledRef.current = true;
          unsettleTimerRef.current = null;
        }, 1200);
      }
    }
    const photos: Record<string, string> = {};
    if (me.photoUrl) photos[me.displayName] = me.photoUrl;
    if (partner?.photoUrl) photos[partner.displayName] = partner.photoUrl;
    setProfilePhotos(photos);
    setCurrentUser(me.displayName);
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    // Neither getSession() nor refreshProfiles() had a timeout of their own —
    // on a slow/flaky connection this whole chain could hang well past a
    // minute with nothing else able to step in, since dataTimedOut/imagesReady
    // (further down) only start their own clocks once isLinked is already
    // true. This forces the loading screen to give up waiting on THIS step
    // specifically after 8s; the real calls keep running and still correct
    // everything the instant they do resolve, same as the other timeouts.
    let settled = false;
    const bootTimeout = setTimeout(() => {
      if (settled) return;
      setAuthLoading(false);
      setProfileLoaded(true);
    }, 8000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      settled = true;
      clearTimeout(bootTimeout);
      setAuthed(!!session);
      setAuthLoading(false);
      if (session) refreshProfiles(); else setProfileLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      setAuthed(!!session);
      if (session) { setProfileLoaded(false); refreshProfiles(); }
      else { clearBootCache(); setHydratedFromCache(false); setMyProfile(null); setPartnerProfile(null); setProfilePhotos({}); setIsLinked(false); setProfileLoaded(true); }
    });
    return () => { clearTimeout(bootTimeout); sub.subscription.unsubscribe(); };
  }, [refreshProfiles]);

  const refreshInvites = useCallback(async () => {
    const { sent, received } = await getMyInvites();
    setSentInvite(sent[0] ?? null);
    setPendingInvite(received[0] ?? null);
  }, []);

  useEffect(() => {
    if (!authed || isLinked) { setPendingInvite(null); setSentInvite(null); return; }
    refreshInvites();
    const t = setInterval(refreshInvites, 8000);
    return () => clearInterval(t);
  }, [authed, isLinked, refreshInvites]);

  // Tracks which of the couple's initial-load fetches below have completed
  // at least once, purely so the loading screen (App.tsx) can wait for real
  // data instead of hiding the instant the session/profile resolves — that
  // gap used to show ~0.5s of "has UI, but no data yet" on every launch.
  const BOOT_DOMAIN_COUNT = 24;
  const [loadedDomains, setLoadedDomains] = useState<Set<string>>(new Set());
  const markLoaded = useCallback((key: string) => {
    setLoadedDomains(prev => prev.has(key) ? prev : new Set(prev).add(key));
  }, []);
  // Safety valve: never let one stuck/slow fetch hold the loading screen up
  // forever — a few seconds after linking, treat the data as ready regardless.
  const [dataTimedOut, setDataTimedOut] = useState(false);
  useEffect(() => {
    if (!isLinked) { setDataTimedOut(false); return; }
    const t = setTimeout(() => setDataTimedOut(true), 6000);
    return () => clearTimeout(t);
  }, [isLinked]);
  const dataReady = !isLinked || dataTimedOut || loadedDomains.size >= BOOT_DOMAIN_COUNT;

  // Holds the loading screen up until every image the couple's data
  // references has actually finished downloading — chosen deliberately over
  // the faster "show the app, load images in the background" tradeoff: a
  // longer first load, but zero shimmer/placeholder flicker navigating
  // anywhere afterward. Skipped on a warm reopen (hydratedFromCache) same as
  // dataReady — those images are almost certainly still in the browser's own
  // HTTP cache from last time, so blocking on them again would be wasted time.
  const [imagesReady, setImagesReady] = useState(false);
  useEffect(() => {
    if (!dataReady) { setImagesReady(false); return; }
    if (!isLinked) { setImagesReady(true); return; }
    let cancelled = false;
    const urls = collectImageUrls(state, profilePhotos);
    Promise.race([
      Promise.all(urls.map(preloadImage)),
      new Promise<void>(resolve => setTimeout(resolve, 6000)),
    ]).then(() => { if (!cancelled) setImagesReady(true); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataReady, isLinked]);

  // Keeps bootCache warm for the *next* reopen — debounced so a burst of
  // realtime updates (e.g. a flurry of chat messages) writes once, not once
  // per message. Only saves once actually linked, so a not-yet-linked
  // account never seeds a future session with an empty/half-set-up cache.
  const cacheWriteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!isLinked || !myProfile) return;
    if (cacheWriteTimer.current) clearTimeout(cacheWriteTimer.current);
    cacheWriteTimer.current = setTimeout(() => {
      writeBootCache({ userId: myProfile.id, currentUser, myProfile, partnerProfile, isLinked, state });
    }, 800);
    return () => clearTimeout(cacheWriteTimer.current);
  }, [isLinked, myProfile, partnerProfile, currentUser, state]);

  const refreshPosts = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    names[myProfile.id] = myProfile.displayName;
    if (partnerProfile) names[partnerProfile.id] = partnerProfile.displayName;
    const { posts, reactions } = await fetchPosts(myProfile.id, names, myProfile.displayName);
    setState(s => ({ ...s, posts, postReactions: reactions }));
    markLoaded('posts');
  }, [myProfile, partnerProfile, markLoaded]);

  useEffect(() => {
    if (isLinked && myProfile && partnerProfile) refreshPosts();
  }, [isLinked, myProfile, partnerProfile, refreshPosts]);

  const refreshMemories = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    names[myProfile.id] = myProfile.displayName;
    if (partnerProfile) names[partnerProfile.id] = partnerProfile.displayName;
    const memories = await fetchMemories(names);
    setState(s => ({ ...s, memories }));
    markLoaded('memories');
  }, [myProfile, partnerProfile, markLoaded]);

  useEffect(() => {
    if (isLinked && myProfile && partnerProfile) refreshMemories();
  }, [isLinked, myProfile, partnerProfile, refreshMemories]);

  const refreshEvents = useCallback(async () => {
    const events = await fetchEvents();
    setState(s => ({ ...s, events }));
    markLoaded('events');
  }, [markLoaded]);

  useEffect(() => {
    if (isLinked) refreshEvents();
  }, [isLinked, refreshEvents]);

  const refreshCycleLogs = useCallback(async () => {
    const cycleLogs = await fetchCycleLogs();
    setState(s => ({ ...s, cycleLogs }));
    markLoaded('cycleLogs');
  }, [markLoaded]);

  useEffect(() => {
    if (isLinked) refreshCycleLogs();
  }, [isLinked, refreshCycleLogs]);

  const refreshStoryQuotes = useCallback(async () => {
    const storyQuotes = await fetchStoryQuotes();
    setState(s => ({ ...s, storyQuotes }));
    markLoaded('storyQuotes');
  }, [markLoaded]);

  useEffect(() => {
    if (isLinked) refreshStoryQuotes();
  }, [isLinked, refreshStoryQuotes]);

  const refreshDebts = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    names[myProfile.id] = myProfile.displayName;
    if (partnerProfile) names[partnerProfile.id] = partnerProfile.displayName;
    const debts = await fetchDebts(names, myProfile.displayName);
    setState(s => ({ ...s, debts }));
    markLoaded('debts');
  }, [myProfile, partnerProfile, markLoaded]);

  useEffect(() => {
    if (isLinked && myProfile) refreshDebts();
  }, [isLinked, myProfile, refreshDebts]);

  const refreshMoney = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    names[myProfile.id] = myProfile.displayName;
    if (partnerProfile) names[partnerProfile.id] = partnerProfile.displayName;
    const [expenses, billsRaw, savingsGoals] = await Promise.all([fetchExpenses(names, myProfile.displayName), fetchBills(), fetchSavingsGoals()]);
    const bills = await rollBillsForward(billsRaw, new Date().toISOString().slice(0, 7));
    setState(s => ({ ...s, expenses, bills, savingsGoals }));
    markLoaded('money');
  }, [myProfile, partnerProfile, markLoaded]);

  useEffect(() => {
    if (isLinked && myProfile && partnerProfile) refreshMoney();
  }, [isLinked, myProfile, partnerProfile, refreshMoney]);

  const refreshLoveStuff = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    names[myProfile.id] = myProfile.displayName;
    if (partnerProfile) names[partnerProfile.id] = partnerProfile.displayName;
    const partnerName = partnerProfile?.displayName ?? myProfile.displayName;
    const [loveNotes, loveLetters, secretNotes] = await Promise.all([fetchLoveNotes(names, myProfile.displayName, partnerName), fetchLoveLetters(names, myProfile.displayName, partnerName), fetchSecretNotes(names, myProfile.displayName)]);
    setState(s => ({ ...s, loveNotes, loveLetters, secretNotes }));
    markLoaded('loveStuff');
  }, [myProfile, partnerProfile, markLoaded]);

  useEffect(() => {
    if (isLinked && myProfile && partnerProfile) refreshLoveStuff();
  }, [isLinked, myProfile, partnerProfile, refreshLoveStuff]);

  const refreshGoals = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    names[myProfile.id] = myProfile.displayName;
    if (partnerProfile) names[partnerProfile.id] = partnerProfile.displayName;
    const goals = await fetchGoals(names);
    setState(s => ({ ...s, goals }));
    markLoaded('goals');
  }, [myProfile, partnerProfile, markLoaded]);

  useEffect(() => {
    if (isLinked && myProfile) refreshGoals();
  }, [isLinked, myProfile, refreshGoals]);

  const refreshFavorites = useCallback(async () => {
    if (!myProfile?.coupleId) return;
    const [settings, favPlaces, favCategories] = await Promise.all([
      fetchCoupleSettings(myProfile.coupleId), fetchFavPlaces(), fetchFavCategories(),
    ]);
    setState(s => ({
      ...s,
      relationshipStart: settings?.relationshipStart ?? s.relationshipStart,
      favPlaces,
      favCategories,
    }));
    markLoaded('favorites');
  }, [myProfile?.coupleId, markLoaded]);

  // Applies dark mode from the ACCOUNT that's actually signed in on this
  // device — runs whenever myProfile (re)loads, e.g. right after login or a
  // token refresh, so the correct account's own preference always wins over
  // whatever the previous session left the DOM attribute set to.
  useEffect(() => {
    if (!myProfile) return;
    if (myProfile.darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.removeAttribute('data-theme');
    }
    setState(s => (s.darkMode === myProfile.darkMode ? s : { ...s, darkMode: myProfile.darkMode }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myProfile?.darkMode]);

  useEffect(() => {
    if (isLinked && myProfile) refreshFavorites();
  }, [isLinked, myProfile, refreshFavorites]);

  const refreshPlaces = useCallback(async () => {
    const places = await fetchPlaces();
    setState(s => ({ ...s, places }));
    markLoaded('places');
  }, [markLoaded]);

  useEffect(() => {
    if (isLinked) refreshPlaces();
  }, [isLinked, refreshPlaces]);

  const refreshPlaylist = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    names[myProfile.id] = myProfile.displayName;
    if (partnerProfile) names[partnerProfile.id] = partnerProfile.displayName;
    const playlist = await fetchPlaylist(names, myProfile.displayName);
    setState(s => ({ ...s, playlist }));
    markLoaded('playlist');
  }, [myProfile, partnerProfile, markLoaded]);

  useEffect(() => {
    if (isLinked && myProfile && partnerProfile) refreshPlaylist();
  }, [isLinked, myProfile, partnerProfile, refreshPlaylist]);

  const refreshTrips = useCallback(async () => {
    const trips = await fetchTrips();
    setState(s => ({ ...s, trips }));
    markLoaded('trips');
  }, [markLoaded]);

  useEffect(() => {
    if (isLinked) refreshTrips();
  }, [isLinked, refreshTrips]);

  const refreshCapsules = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    names[myProfile.id] = myProfile.displayName;
    if (partnerProfile) names[partnerProfile.id] = partnerProfile.displayName;
    const capsules = await fetchCapsules(names, myProfile.displayName, partnerProfile?.displayName ?? myProfile.displayName);
    setState(s => ({ ...s, capsules }));
    markLoaded('capsules');
  }, [myProfile, partnerProfile, markLoaded]);

  useEffect(() => {
    if (isLinked && myProfile && partnerProfile) refreshCapsules();
  }, [isLinked, myProfile, partnerProfile, refreshCapsules]);

  const refreshWishes = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    names[myProfile.id] = myProfile.displayName;
    if (partnerProfile) names[partnerProfile.id] = partnerProfile.displayName;
    const wishes = await fetchWishes(names, myProfile.displayName);
    setState(s => ({ ...s, wishes }));
    markLoaded('wishes');
  }, [myProfile, partnerProfile, markLoaded]);

  useEffect(() => {
    if (isLinked && myProfile && partnerProfile) refreshWishes();
  }, [isLinked, myProfile, partnerProfile, refreshWishes]);

  const refreshDateIdeas = useCallback(async () => {
    const dateIdeas = await fetchDateIdeas();
    setState(s => ({ ...s, dateIdeas }));
    markLoaded('dateIdeas');
  }, [markLoaded]);

  useEffect(() => {
    if (isLinked) refreshDateIdeas();
  }, [isLinked, refreshDateIdeas]);

  const refreshDateIdeaPresets = useCallback(async () => {
    const dateIdeaPresets = await fetchDateIdeaPresets();
    setState(s => ({ ...s, dateIdeaPresets }));
    markLoaded('dateIdeaPresets');
  }, [markLoaded]);

  useEffect(() => {
    if (isLinked) refreshDateIdeaPresets();
  }, [isLinked, refreshDateIdeaPresets]);

  const refreshDateIdeaHistory = useCallback(async () => {
    const dateIdeaHistory = await fetchDateIdeaHistory();
    setState(s => ({ ...s, dateIdeaHistory }));
    markLoaded('dateIdeaHistory');
  }, [markLoaded]);

  useEffect(() => {
    if (isLinked) refreshDateIdeaHistory();
  }, [isLinked, refreshDateIdeaHistory]);

  const refreshGratitude = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    names[myProfile.id] = myProfile.displayName;
    if (partnerProfile) names[partnerProfile.id] = partnerProfile.displayName;
    const gratitude = await fetchGratitude(names, myProfile.displayName);
    setState(s => ({ ...s, gratitude }));
    markLoaded('gratitude');
  }, [myProfile, partnerProfile, markLoaded]);

  useEffect(() => {
    if (isLinked && myProfile && partnerProfile) refreshGratitude();
  }, [isLinked, myProfile, partnerProfile, refreshGratitude]);

  const refreshDateRequests = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    names[myProfile.id] = myProfile.displayName;
    if (partnerProfile) names[partnerProfile.id] = partnerProfile.displayName;
    const dateRequests = await fetchDateRequests(names, myProfile.displayName, partnerProfile?.displayName ?? myProfile.displayName);
    setState(s => ({ ...s, dateRequests }));
    markLoaded('dateRequests');
  }, [myProfile, partnerProfile, markLoaded]);

  useEffect(() => {
    if (isLinked && myProfile && partnerProfile) refreshDateRequests();
  }, [isLinked, myProfile, partnerProfile, refreshDateRequests]);

const refreshMoods = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    names[myProfile.id] = myProfile.displayName;
    if (partnerProfile) names[partnerProfile.id] = partnerProfile.displayName;
    const moodHistory = await fetchMoodHistory(names);
    const today = new Date().toISOString().slice(0, 10);
    const todayEntry = moodHistory.find(e => e.date === today);
    const moods: Record<string, Mood | null> = {};
    moods[myProfile.displayName] = todayEntry?.moods[myProfile.displayName] ?? null;
    if (partnerProfile) moods[partnerProfile.displayName] = todayEntry?.moods[partnerProfile.displayName] ?? null;
    setState(s => ({ ...s, moodHistory, moods }));
    markLoaded('moods');
  }, [myProfile, partnerProfile, markLoaded]);

  useEffect(() => {
    if (isLinked && myProfile && partnerProfile) refreshMoods();
  }, [isLinked, myProfile, partnerProfile, refreshMoods]);

  const refreshStreak = useCallback(async () => {
    const { count, litToday } = await fetchStreak();
    setState(s => ({ ...s, streak: count, streakLitToday: litToday }));
    markLoaded('streak');
  }, [markLoaded]);

  useEffect(() => {
    if (isLinked) refreshStreak();
  }, [isLinked, refreshStreak]);

  const refreshNotifications = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    names[myProfile.id] = myProfile.displayName;
    if (partnerProfile) names[partnerProfile.id] = partnerProfile.displayName;
    const notifications = await fetchNotifications(names, myProfile.id, myProfile.notifyPrefs);
    setState(s => ({ ...s, notifications }));
    markLoaded('notifications');
  }, [myProfile, partnerProfile, markLoaded]);

  // Realtime: pop a toast + prepend the item the instant a notification row is
  // inserted for this couple, instead of waiting on a poll interval.
  useEffect(() => {
    if (!isLinked || !myProfile?.coupleId) return;
    refreshNotifications();
    const coupleId = myProfile.coupleId;
    const myId = myProfile.id;
    const names: Record<string, User> = {};
    names[myProfile.id] = myProfile.displayName;
    if (partnerProfile) names[partnerProfile.id] = partnerProfile.displayName;
    const channel = supabase
      .channel(`notifications-${coupleId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          const row = payload.new as { id: string; emoji: string | null; message: string; read: boolean; actor_profile_id: string | null; target_screen: string | null; target_id: string | null; preview_image_url: string | null; preview_text: string | null; category: string | null };
          // Skip your own actions — you already got a local toast for those
          // when you did them; this feed is only meant to tell the partner.
          if (row.actor_profile_id === myId) return;
          // Skip categories this viewer has muted in Settings > Notifications.
          if (!passesNotifyPrefs(row.category, myProfile.notifyPrefs)) return;
          setState(s => {
            if (s.notifications.some(n => n.id === row.id)) return s;
            const notif = {
              id: row.id, emoji: row.emoji ?? '🔔', message: row.message, read: row.read, date: 'Just now', createdAt: new Date().toISOString(),
              actor: row.actor_profile_id ? names[row.actor_profile_id] : undefined,
              targetScreen: row.target_screen ?? undefined,
              targetId: row.target_id ?? undefined,
              previewImageUrl: row.preview_image_url ?? undefined,
              previewText: row.preview_text ?? undefined,
            };
            return { ...s, notifications: [notif, ...s.notifications] };
          });
          toast(row.message, row.emoji ?? '🔔', { passive: true });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isLinked, myProfile, partnerProfile, refreshNotifications]);

  // Realtime: date_requests has no notification row for deletes (only
  // insert/response do), so an already-open session needs its own direct
  // subscription — covers submit, approve/reject, edit, AND delete, so
  // "Cần duyệt" never shows a pending request that the other side already
  // deleted (or anything else stale) without needing a page reload.
  useEffect(() => {
    if (!isLinked || !myProfile?.coupleId) return;
    const coupleId = myProfile.coupleId;
    const channel = supabase
      .channel(`date-requests-${coupleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'date_requests', filter: `couple_id=eq.${coupleId}` },
        () => { refreshDateRequests(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isLinked, myProfile, refreshDateRequests]);

  // Chat — one live DM thread per couple, Instagram-style. Realtime covers
  // both new messages (INSERT) and read receipts (UPDATE sets read_at).
  const refreshChat = useCallback(async () => {
    if (!myProfile) return;
    const rows = await fetchChatMessages();
    const messages: ChatMessage[] = rows.map(r => ({
      id: r.id,
      senderId: r.sender_profile_id,
      sender: r.sender_profile_id === myProfile.id ? myProfile.displayName : (partnerProfile?.displayName ?? 'Partner'),
      mine: r.sender_profile_id === myProfile.id,
      text: r.text,
      imageUrl: r.image_url,
      audioUrl: r.audio_url,
      audioDuration: r.audio_duration,
      sticker: r.sticker,
      createdAt: r.created_at,
      read: !!r.read_at,
    }));
    setState(s => ({ ...s, chatMessages: messages }));
    markLoaded('chat');
  }, [myProfile, partnerProfile, markLoaded]);

  useEffect(() => {
    if (!isLinked || !myProfile?.coupleId || !partnerProfile) return;
    refreshChat();
    fetchUnreadChatCount(partnerProfile.id).then(count => setState(s => ({ ...s, unreadChatCount: count })));
    const coupleId = myProfile.coupleId;
    const myId = myProfile.id;
    const partnerId = partnerProfile.id;
    const partnerName = partnerProfile.displayName;
    const channel = supabase
      .channel(`chat-${coupleId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          const row = payload.new as { id: string; sender_profile_id: string; text: string | null; image_url: string | null; audio_url: string | null; audio_duration: number | null; sticker: string | null; created_at: string; read_at: string | null };
          const mine = row.sender_profile_id === myId;
          // Own messages are already shown optimistically (and reconciled to
          // this same real id) by sendChatMessage the moment it's sent — an
          // unconditional add here could race ahead of that reconciliation
          // and insert a visible duplicate bubble under the same id/key.
          if (mine) return;
          const onChatScreen = screenRef.current === 'chat';
          setState(s => {
            if (s.chatMessages.some(m => m.id === row.id)) return s;
            const msg: ChatMessage = { id: row.id, senderId: row.sender_profile_id, sender: partnerName, mine: false, text: row.text, imageUrl: row.image_url, audioUrl: row.audio_url, audioDuration: row.audio_duration, sticker: row.sticker, createdAt: row.created_at, read: !!row.read_at };
            return { ...s, chatMessages: [...s.chatMessages, msg], unreadChatCount: !onChatScreen ? s.unreadChatCount + 1 : s.unreadChatCount };
          });
          if (onChatScreen) markChatReadFrom(partnerId);
          else {
            const preview = row.sticker ? `${row.sticker} Sent a sticker` : row.image_url ? '📷 Sent a photo' : row.audio_url ? '🎤 Sent a voice message' : (row.text ?? '').length > 60 ? row.text!.slice(0, 60) + '…' : (row.text ?? '');
            toast(`${partnerName}: ${preview}`, '💬', { passive: true });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          const row = payload.new as { id: string; read_at: string | null };
          setState(s => ({ ...s, chatMessages: s.chatMessages.map(m => m.id === row.id ? { ...m, read: !!row.read_at } : m) }));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isLinked, myProfile, partnerProfile, refreshChat]);

  // Optimistic send: the bubble appears the instant you hit send, marked
  // "Sending..." — otherwise it only showed up once Realtime echoed the
  // insert back (a second or more later), which read as "did that even
  // send?" until it suddenly popped in.
  const sendChatMessage = async (msg: NewChatMessage) => {
    if (!myProfile) return;
    const text = msg.text?.trim();
    if (!text && !msg.imageUrl && !msg.audioUrl && !msg.sticker) return;
    const tempId = `temp-${uid()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      senderId: myProfile.id,
      sender: myProfile.displayName,
      mine: true,
      text: text ?? null,
      imageUrl: msg.imageUrl ?? null,
      audioUrl: msg.audioUrl ?? null,
      audioDuration: msg.audioDuration ?? null,
      sticker: msg.sticker ?? null,
      createdAt: new Date().toISOString(),
      read: false,
      pending: true,
      clientKey: tempId,
    };
    setState(s => ({ ...s, chatMessages: [...s.chatMessages, optimistic] }));
    const { data, error } = await sendChatMessageRow(myProfile.id, { ...msg, text });
    if (error || !data) {
      toast('Something went wrong', '⚠️');
      setState(s => ({ ...s, chatMessages: s.chatMessages.map(m => m.id === tempId ? { ...m, pending: false, failed: true } : m) }));
      return;
    }
    const row = data as { id: string; created_at: string; read_at: string | null };
    setState(s => ({
      ...s,
      chatMessages: s.chatMessages.map(m => m.id === tempId
        ? { ...m, id: row.id, createdAt: row.created_at, read: !!row.read_at, pending: false }
        : m),
    }));
  };

  const uploadChatMedia = async (file: File | Blob, ext: string): Promise<string | null> => {
    if (!myProfile?.coupleId) return null;
    return uploadChatFile(myProfile.coupleId, file, ext);
  };

  const markChatRead = useCallback(() => {
    if (!partnerProfile) return;
    markChatReadFrom(partnerProfile.id);
    setState(s => (s.unreadChatCount === 0 && s.chatMessages.every(m => m.mine || m.read)
      ? s
      : { ...s, unreadChatCount: 0, chatMessages: s.chatMessages.map(m => m.mine ? m : { ...m, read: true }) }));
  }, [partnerProfile]);

  const updateNotifyPrefs = async (prefs: NotifyPrefs) => {
    const res = await authUpdateNotifyPrefs(prefs);
    if (!res.ok) { toast(res.error || 'Something went wrong', '⚠️'); return; }
    await refreshProfiles();
    toast('Updated', '✓');
  };

  const updateDisplayName = async (name: string) => {
    const res = await authUpdateDisplayName(name);
    if (res.ok) { await refreshProfiles(); toast('Name updated 👤'); }
    return res;
  };

  const changePassword = async (newPassword: string) => {
    const res = await authChangePassword(newPassword);
    if (res.ok) toast('Password changed 🔒');
    return res;
  };

  const completePasswordRecovery = async (newPassword: string) => {
    const res = await authChangePassword(newPassword);
    if (res.ok) { setPasswordRecovery(false); toast('Password reset — welcome back 🔒'); }
    return res;
  };

  // Simply opening the app counts as activity — fires once per session
  // (myProfile.id only changes on login/logout, not on every profile edit).
  useEffect(() => {
    if (myProfile?.id) touchLastActive();
  }, [myProfile?.id]);

  // Reports foreground/visibility state to the server so push-notification
  // triggers can skip pushing to someone who's already looking at the app —
  // a heartbeat while visible (not just the visibilitychange edges) keeps
  // app_foreground_at fresh enough for the trigger's staleness check.
  useEffect(() => {
    if (!myProfile?.id) return;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    const markVisible = () => {
      setForegroundState(true);
      if (!heartbeat) heartbeat = setInterval(() => setForegroundState(true), 20000);
    };
    const markHidden = () => {
      if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
      setForegroundState(false);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') markVisible(); else markHidden();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    if (document.visibilityState === 'visible') markVisible();
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (heartbeat) clearInterval(heartbeat);
      markHidden();
    };
  }, [myProfile?.id]);

  const invitePartner = useCallback(async (username: string) => {
    const res = await apiSendInvite(username);
    if (res.ok) { toast('Invite sent 💌'); refreshInvites(); }
    return res;
  }, [refreshInvites]);

  const acceptInvite = useCallback(async (id: string) => {
    const res = await apiRespondInvite(id, true);
    if (!res.ok) { toast(res.error || 'Something went wrong', '⚠️'); return; }
    toast('Connected! 💕', '🎉');
    await refreshProfiles();
    refreshInvites();
  }, [refreshProfiles, refreshInvites]);

  const rejectInvite = useCallback(async (id: string) => {
    const res = await apiRespondInvite(id, false);
    if (!res.ok) { toast(res.error || 'Something went wrong', '⚠️'); return; }
    toast('Invite declined');
    refreshInvites();
  }, [refreshInvites]);

  const cancelSentInvite = useCallback(async (id: string) => {
    await apiCancelInvite(id);
    refreshInvites();
  }, [refreshInvites]);

  const updateProfilePhoto = async (photoUrl: string) => {
    const res = await authUpdatePhoto(photoUrl);
    if (!res.ok) { toast(res.error || 'Something went wrong', '⚠️'); return; }
    await refreshProfiles();
    toast('Photo updated! ✨');
  };

  const logout = useCallback(() => {
    clearBootCache();
    setHydratedFromCache(false);
    authLogout();
  }, []);

  return (
    <Ctx.Provider value={{
      state, currentUser,
      authed, authLoading, profileLoaded, isLinked, isLinkedSettled, isAdmin, dataReady, imagesReady, hydratedFromCache, passwordRecovery, completePasswordRecovery, myProfile, partnerProfile, refreshAuthProfile: refreshProfiles, logout,
      pendingInvite, sentInvite, invitePartner, acceptInvite, rejectInvite, cancelSentInvite,
      screen, selectedId, navigate, goBack, navSeq, lastNavWasPop,
      toasts, toast,
      createModal, createStep, openCreate, closeCreate, celebration,
      toggleLike, toggleSave, addComment, addPost, editPost, deletePost,
      addMemory, toggleFavorite,
      addExpense, updateExpense, deleteExpense,
      addSavingsGoal, updateSavingsGoal, deleteSavingsGoal, addToGoal, withdrawFromGoal,
      addLoveNote, markNoteRead, addSecretNote,
      addEvent, updateEvent, deleteEvent,
      addCycleLog, updateCycleLog, deleteCycleLog,
      addStoryQuote, updateStoryQuote, deleteStoryQuote,
      addDebt, updateDebt, toggleDebtPaid, deleteDebt,
      addGoal, updateGoal, toggleGoal, deleteGoal, contributeToGoal,
      setMood,
      markNotifRead, markAllRead, deleteNotification, updateNotifyPrefs, updateDisplayName, changePassword,
      addBill, updateBill, toggleBillPaid, deleteBill,
      addTrip, updateTrip, deleteTrip, toggleTripCheck,
      addCapsule, openCapsule, updateCapsule, deleteCapsule,
      addToPlaylist, updatePlaylist, removeFromPlaylist,
      addWish, updateWish, drawWish, removeWish,
      addDateIdea, updateDateIdea, removeDateIdea, updateDateIdeaPreset, removeDateIdeaPreset, drawDateIdea,
      addLoveLetter, deleteLoveLetter,
      sendHug,
      submitDateRequest,
      respondToRequest,
      updateDateRequest,
      deleteDateRequest,
      addGratitude,
      updateGratitude,
      deleteGratitude,
      addReaction,
      addFavPlace, updateFavPlace, removeFavPlace, addFavCategory, updateFavCategory, removeFavCategory,
      addPlace, updatePlace, deletePlace,
      toggleDarkMode,
      setRelationshipStart,
      profilePhotos, updateProfilePhoto,
      sendChatMessage, markChatRead, uploadChatMedia,
    }}>
      {children}
    </Ctx.Provider>
  );
}
