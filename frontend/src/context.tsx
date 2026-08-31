// Force full-page reload when this module changes to avoid stale context refs.
if (import.meta.hot) {
  import.meta.hot.accept(() => { window.location.reload(); });
}

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { initialState } from './data';
import type { AppState, User, Post, Memory, Expense, SavingsGoal, LoveNote, SecretNote, CalendarEvent, Goal, Mood, Bill, Trip, Capsule, Countdown, PlaylistItem, WishItem, LoveLetter, GratitudeEntry, DateRequest, FavPlace, FavCategory, FavCategoryItem, Place, DateIdea } from './types';
import { supabase } from './lib/supabaseClient';
import {
  updatePhoto as authUpdatePhoto, updateNotifyPrefs as authUpdateNotifyPrefs, getCurrentProfile, getPartnerProfile, logout as authLogout,
  sendInvite as apiSendInvite, respondInvite as apiRespondInvite, cancelInvite as apiCancelInvite, getMyInvites,
  type PendingInvite, type AuthProfile, type NotifyPrefs,
} from './auth';
import {
  fetchPosts, createPost, addPostComment, setLiked, setSaved, toggleReaction, updatePostRow, deletePostRow,
} from './feed';
import {
  fetchNotifications, markNotificationRead, markAllNotificationsRead, deleteNotificationRow,
} from './notifications';
import {
  fetchMemories, createMemory, setMemoryFavorite,
} from './memories';
import {
  fetchEvents, createEvent, deleteEventRow,
} from './calendar';
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
  fetchCoupleSettings, updateFavoriteField, updateDarkMode, updateRelationshipStart,
  fetchFavPlaces, createFavPlace, updateFavPlaceRow, deleteFavPlace,
  fetchFavCategories, createFavCategory, updateFavCategoryRow, deleteFavCategoryRow,
} from './favourites';
import {
  fetchPlaces, createPlace, deletePlaceRow,
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
  fetchCountdowns, createCountdown, deleteCountdownRow,
} from './countdowns';
import {
  fetchMoodHistory, upsertMood,
} from './moods';
import { createHug } from './hugs';
import { bumpStreak } from './streak';

interface ToastItem { id: string; message: string; emoji: string; leaving?: boolean; }

interface AppContextType {
  state: AppState;
  currentUser: User;

  // Auth session
  authed: boolean;
  authLoading: boolean;
  profileLoaded: boolean;   // true once refreshAuthProfile() has resolved at least once — gates isLinked from flashing false
  isLinked: boolean;
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
  toast: (msg: string, emoji?: string) => void;

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
  addPost: (p: Omit<Post, 'id' | 'liked' | 'saved' | 'comments'>) => void;
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
  deleteEvent: (id: string) => void;

  // Goals
  addGoal: (g: Omit<Goal, 'id' | 'completed' | 'current'>) => void;
  updateGoal: (id: string, g: Omit<Goal, 'id' | 'completed' | 'current' | 'completedDate'>) => void;
  toggleGoal: (id: string) => void;
  deleteGoal: (id: string) => void;
  contributeToGoal: (id: string, amount: number) => void;

  // Mood
  setMood: (user: User, mood: Mood) => void;

  // Favorites
  updateFavorite: (key: string, val: string) => void;

  // Notifications
  markNotifRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
  updateNotifyPrefs: (prefs: NotifyPrefs) => void;

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

  // Countdowns
  addCountdown: (c: Omit<Countdown, 'id'>) => void;
  deleteCountdown: (id: string) => void;

  // Playlist
  addToPlaylist: (p: Omit<PlaylistItem, 'id'>) => void;
  updatePlaylist: (id: string, p: { title: string; artist: string; emoji: string; image?: string; durationSeconds?: number; releaseDate?: string; previewUrl?: string; note?: string }) => void;
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
  addPlace: (p: { name: string; flag?: string; image: string }) => void;
  deletePlace: (id: string) => void;

  // Dark mode
  toggleDarkMode: () => void;

  // Anniversary date
  setRelationshipStart: (date: string) => void;

  // Profile photos
  profilePhotos: Record<string, string>;
  updateProfilePhoto: (photoUrl: string) => void;
}

const Ctx = createContext<AppContextType>(null!);
export const useApp = () => useContext(Ctx);

let idCounter = 1000;
const uid = () => String(++idCounter);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [currentUser, setCurrentUser] = useState<User>('Alvin');
  const [authed, setAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [myProfile, setMyProfile] = useState<AuthProfile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<AuthProfile | null>(null);
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

  const navigate = useCallback((s: string, id?: string) => {
    setStack(prev => [...prev, { screen: s, id }]);
    setNavSeq(n => n + 1);
    setLastNavWasPop(false);
  }, []);

  const goBack = useCallback(() => {
    setStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
    setLastNavWasPop(true);
  }, []);

  const toast = useCallback((msg: string, emoji = '🌸') => {
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
  }, []);

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
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshPosts(); }
  };

  const toggleSave = async (id: string) => {
    if (!myProfile) return;
    const post = state.posts.find(p => p.id === id);
    if (!post) return;
    const nextSaved = !post.saved;
    setState(s => ({ ...s, posts: s.posts.map(p => p.id === id ? { ...p, saved: nextSaved } : p) }));
    const { error } = await setSaved(id, myProfile.id, nextSaved);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshPosts(); }
  };

  const addComment = async (postId: string, text: string) => {
    if (!myProfile) return;
    const { error } = await addPostComment(postId, myProfile.id, text);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
    refreshPosts();
  };

  const addPost = async (p: Omit<Post, 'id' | 'liked' | 'saved' | 'comments'>) => {
    if (!myProfile) return;
    const { error } = await createPost(myProfile.id, { images: p.images, caption: p.caption, location: p.location });
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
    await refreshPosts();
    // No manual success toast here — the realtime `notifications` subscription
    // above pops one for both accounts (including the poster) a moment later.
  };

  const editPost = async (id: string, data: { caption: string; location?: string }) => {
    setState(s => ({ ...s, posts: s.posts.map(p => p.id === id ? { ...p, caption: data.caption, location: data.location } : p) }));
    const { error } = await updatePostRow(id, data);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshPosts(); return; }
    toast('Đã cập nhật bài viết ✏️');
  };

  const deletePost = async (id: string) => {
    setState(s => ({ ...s, posts: s.posts.filter(p => p.id !== id) }));
    const { error } = await deletePostRow(id);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshPosts(); return; }
    toast('Đã xóa bài viết 🗑️');
  };

  // Memories — backed by Supabase
  const addMemory = async (m: Omit<Memory, 'id' | 'favorite'>) => {
    if (!myProfile || !partnerProfile) return;
    const occurredOn = new Date(m.date).toISOString().slice(0, 10);
    const { error } = await createMemory(myProfile.id, [myProfile.id, partnerProfile.id], {
      title: m.title, occurredOn, location: m.location, description: m.description, image: m.image,
    });
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
    await refreshMemories();
    // No manual toast — the realtime `notifications` subscription pops one for both accounts.
  };

  const toggleFavorite = async (id: string) => {
    const mem = state.memories.find(m => m.id === id);
    if (!mem) return;
    const nextFav = !mem.favorite;
    setState(s => ({ ...s, memories: s.memories.map(x => x.id === id ? { ...x, favorite: nextFav } : x) }));
    const { error } = await setMemoryFavorite(id, nextFav);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshMemories(); }
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
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
    await refreshMoney();
    toast('Expense saved.', '💰');
  };

  const updateExpense = async (id: string, e: Omit<Expense, 'id'>) => {
    const prev = state.expenses;
    setState(s => ({ ...s, expenses: s.expenses.map(x => x.id === id ? { ...x, ...e } : x) }));
    const { error } = await updateExpenseRow(id, resolveProfileId(e.paidBy), {
      title: e.title, category: e.category, categoryEmoji: e.categoryEmoji, amount: e.amount, date: e.date, note: e.note, type: e.type,
    });
    if (error) { toast('Có lỗi xảy ra', '⚠️'); setState(s => ({ ...s, expenses: prev })); return; }
    toast('Đã cập nhật giao dịch.', '✏️');
  };

  const deleteExpense = async (id: string) => {
    setState(s => ({ ...s, expenses: s.expenses.filter(e => e.id !== id) }));
    const { error } = await deleteExpenseRow(id);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshMoney(); return; }
    toast('Expense removed.', '🗑️');
  };

  // Savings — backed by Supabase
  const addSavingsGoal = async (g: Omit<SavingsGoal, 'id'>) => {
    const { error } = await createSavingsGoal(g);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
    await refreshMoney();
    toast('Savings goal added! 💰');
  };

  const updateSavingsGoal = async (id: string, g: Omit<SavingsGoal, 'id' | 'current'>) => {
    const prev = state.savingsGoals;
    setState(s => ({ ...s, savingsGoals: s.savingsGoals.map(x => x.id === id ? { ...x, ...g } : x) }));
    const { error } = await updateSavingsGoalRow(id, g);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); setState(s => ({ ...s, savingsGoals: prev })); return; }
    toast('Đã cập nhật quỹ.', '✏️');
  };

  const deleteSavingsGoal = async (id: string) => {
    setState(s => ({ ...s, savingsGoals: s.savingsGoals.filter(g => g.id !== id) }));
    const { error } = await deleteSavingsGoalRow(id);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshMoney(); return; }
    toast('Đã xóa quỹ.', '🗑️');
  };

  const addToGoal = async (id: string, amount: number) => {
    const goal = state.savingsGoals.find(g => g.id === id);
    if (!goal || amount <= 0) return;
    const nextCurrent = Math.min(goal.current + amount, goal.target);
    const delta = nextCurrent - goal.current;
    if (delta <= 0) return;
    setState(s => ({ ...s, savingsGoals: s.savingsGoals.map(g => g.id === id ? { ...g, current: nextCurrent } : g) }));
    const { error } = await updateSavingsGoalCurrent(id, nextCurrent);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshMoney(); return; }
    // Deposits move money out of everyday spending, so mirror it as an expense in Thu chi.
    await createExpense(resolveProfileId(currentUser), {
      title: `Nạp vào quỹ ${goal.title}`, category: 'Tiết kiệm', categoryEmoji: goal.emoji || '💰',
      amount: delta, date: new Date().toISOString().split('T')[0], note: `Nạp tiền vào quỹ "${goal.title}"`, type: 'expense',
    });
    await refreshMoney();
    toast('Đã nạp vào quỹ! 🎉');
  };

  const withdrawFromGoal = async (id: string, amount: number) => {
    const goal = state.savingsGoals.find(g => g.id === id);
    if (!goal || amount <= 0) return;
    const nextCurrent = Math.max(goal.current - amount, 0);
    const delta = goal.current - nextCurrent;
    if (delta <= 0) return;
    setState(s => ({ ...s, savingsGoals: s.savingsGoals.map(g => g.id === id ? { ...g, current: nextCurrent } : g) }));
    const { error } = await updateSavingsGoalCurrent(id, nextCurrent);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshMoney(); return; }
    // Withdrawals bring money back into everyday spending, so mirror it as income in Thu chi.
    await createExpense(resolveProfileId(currentUser), {
      title: `Rút từ quỹ ${goal.title}`, category: 'Tiết kiệm', categoryEmoji: goal.emoji || '💰',
      amount: delta, date: new Date().toISOString().split('T')[0], note: `Rút tiền từ quỹ "${goal.title}"`, type: 'income',
    });
    await refreshMoney();
    toast('Đã rút quỹ! 💸');
  };

  // Love notes / secret notes — backed by Supabase
  const addLoveNote = async (n: Omit<LoveNote, 'id' | 'read'>) => {
    const fromId = resolveProfileId(n.from);
    const toId = resolveProfileId(n.to);
    if (!fromId || !toId) return;
    const { error } = await createLoveNote(fromId, toId, n.message, n.mood);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
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
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
    await refreshLoveStuff();
    toast('Đã lưu ghi chú bí mật 🔐');
  };

  // Events — backed by Supabase
  const addEvent = async (e: Omit<CalendarEvent, 'id'>) => {
    const { error } = await createEvent(e);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
    await refreshEvents();
    toast('Event added to calendar 📅');
  };

  const deleteEvent = async (id: string) => {
    setState(s => ({ ...s, events: s.events.filter(e => e.id !== id) }));
    const { error } = await deleteEventRow(id);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshEvents(); }
  };

  // Goals
  const addGoal = async (g: Omit<Goal, 'id' | 'completed' | 'current'>) => {
    const ownerId = g.owner === 'both' ? null : resolveProfileId(g.owner);
    const { error } = await createGoal({ title: g.title, emoji: g.emoji, target: g.target, deadline: g.deadline, ownerId });
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
    await refreshGoals();
    toast('Goal added ✨');
  };

  const updateGoal = async (id: string, g: Omit<Goal, 'id' | 'completed' | 'current' | 'completedDate'>) => {
    const ownerId = g.owner === 'both' ? null : resolveProfileId(g.owner);
    setState(s => ({ ...s, goals: s.goals.map(x => x.id === id ? { ...x, title: g.title, emoji: g.emoji, owner: g.owner, target: g.target, deadline: g.deadline } : x) }));
    const { error } = await updateGoalRow(id, { title: g.title, emoji: g.emoji, target: g.target, deadline: g.deadline, ownerId });
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshGoals(); return; }
    toast('Đã cập nhật mục tiêu ✏️');
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
      toast('Đã góp vào mục tiêu 💪');
    }
    const { error } = await setGoalCurrent(id, nextCurrent);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshGoals(); return; }
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
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshGoals(); }
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
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
    await refreshMoods();
    toast(`Mood updated!`, mood.emoji);
  };

  // Favorites
  const updateFavorite = async (key: string, val: string) => {
    if (!myProfile?.coupleId) return;
    setState(s => ({ ...s, favorites: { ...s.favorites, [key]: val } }));
    const { error } = await updateFavoriteField(myProfile.coupleId, key, val);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
    toast('Updated!', '✨');
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
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
    await refreshMoney();
    toast('Hóa đơn đã thêm!', '🧾');
  };

  const updateBill = async (id: string, b: Omit<Bill, 'id' | 'seriesId' | 'billMonth' | 'paid' | 'paidDate'>) => {
    const prev = state.bills;
    setState(s => ({ ...s, bills: s.bills.map(x => x.id === id ? { ...x, ...b } : x) }));
    const { error } = await updateBillRow(id, b);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); setState(s => ({ ...s, bills: prev })); return; }
    toast('Đã cập nhật hóa đơn.', '✏️');
  };

  const toggleBillPaid = async (id: string) => {
    const bill = state.bills.find(b => b.id === id);
    if (!bill) return;
    const nextPaid = !bill.paid;
    const paidDate = nextPaid ? new Date().toISOString().slice(0, 10) : null;
    setState(s => ({ ...s, bills: s.bills.map(x => x.id === id ? { ...x, paid: nextPaid, paidDate: paidDate ?? undefined } : x) }));
    const { error } = await setBillPaid(id, nextPaid, paidDate);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshMoney(); return; }
    // Mirror the payment (or its reversal) into Thu chi, same as goal deposit/withdraw.
    // Tagged with billId so deleting the bill later also removes these (on delete cascade).
    const today = new Date().toISOString().slice(0, 10);
    await createExpense(resolveProfileId(currentUser), nextPaid ? {
      title: `Thanh toán hóa đơn ${bill.title}`, category: 'Hóa đơn', categoryEmoji: bill.emoji || '🧾',
      amount: bill.amount, date: today, note: `Thanh toán hóa đơn "${bill.title}"`, type: 'expense', billId: bill.id,
    } : {
      title: `Hủy thanh toán hóa đơn ${bill.title}`, category: 'Hóa đơn', categoryEmoji: bill.emoji || '🧾',
      amount: bill.amount, date: today, note: `Hủy thanh toán hóa đơn "${bill.title}"`, type: 'income', billId: bill.id,
    });
    await refreshMoney();
  };

  const deleteBill = async (id: string) => {
    setState(s => ({ ...s, bills: s.bills.filter(b => b.id !== id) }));
    const { error } = await deleteBillRow(id);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshMoney(); return; }
    // The bill's linked Thu chi transactions are removed by the DB's on-delete
    // cascade — refresh so the local expenses list reflects that too.
    await refreshMoney();
    toast('Đã xóa hóa đơn.', '🗑️');
  };

  // Trips — backed by Supabase
  const addTrip = async (t: Omit<Trip, 'id'>) => {
    const { error } = await createTripRow(t);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
    await refreshTrips();
    toast('Trip added! ✈️');
  };
  const updateTrip = async (t: Trip) => {
    setState(s => ({ ...s, trips: s.trips.map(x => x.id === t.id ? t : x) }));
    const { error } = await updateTripRow(t.id, t);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshTrips(); }
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
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
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
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshCapsules(); }
  };
  const deleteCapsule = async (id: string) => {
    setState(s => ({ ...s, capsules: s.capsules.filter(c => c.id !== id) }));
    const { error } = await deleteCapsuleRow(id);
    if (error) refreshCapsules();
  };

  // Countdowns — backed by Supabase
  const addCountdown = async (c: Omit<Countdown, 'id'>) => {
    const { error } = await createCountdown(c);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
    await refreshCountdowns();
    toast('Countdown added!', '⏳');
  };
  const deleteCountdown = async (id: string) => {
    setState(s => ({ ...s, countdowns: s.countdowns.filter(c => c.id !== id) }));
    const { error } = await deleteCountdownRow(id);
    if (error) refreshCountdowns();
  };

  // Playlist — backed by Supabase
  const addToPlaylist = async (p: Omit<PlaylistItem, 'id'>) => {
    if (!myProfile) return;
    const { error } = await createPlaylistItem(myProfile.id, { title: p.title, artist: p.artist, emoji: p.emoji, image: p.image, durationSeconds: p.durationSeconds, releaseDate: p.releaseDate, previewUrl: p.previewUrl, note: p.note });
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
    await refreshPlaylist();
    toast('Added to playlist! 🎵');
  };
  const updatePlaylist = async (id: string, p: { title: string; artist: string; emoji: string; image?: string; durationSeconds?: number; releaseDate?: string; previewUrl?: string; note?: string }) => {
    setState(s => ({ ...s, playlist: s.playlist.map(x => x.id === id ? { ...x, ...p } : x) }));
    const { error } = await updatePlaylistItemRow(id, p);
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
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
    await refreshWishes();
    toast('Ước nguyện đã vào hũ! 🫙', '✨');
  };
  const updateWish = async (id: string, w: { wish: string; price?: string; link?: string; linkImage?: string; linkTitle?: string; linkDescription?: string }) => {
    setState(s => ({ ...s, wishes: s.wishes.map(x => x.id === id ? { ...x, ...w } : x) }));
    const { error } = await updateWishRow(id, w);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshWishes(); }
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
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
    await refreshDateIdeas();
    toast('Đã thêm ý tưởng! ✨');
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
    if (error) { toast('Có lỗi xảy ra', '⚠️'); setState(s => ({ ...s, dateIdeas: prev })); return; }
    toast('Đã cập nhật ý tưởng.', '✏️');
  };
  // Presets — same shape as custom ideas, just their own table (see 0032).
  const updateDateIdeaPreset = async (id: string, i: { emoji: string; text: string }) => {
    const prev = state.dateIdeaPresets;
    setState(s => ({ ...s, dateIdeaPresets: s.dateIdeaPresets.map(x => x.id === id ? { ...x, ...i } : x) }));
    const { error } = await updateDateIdeaPresetRow(id, i);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); setState(s => ({ ...s, dateIdeaPresets: prev })); return; }
    toast('Đã cập nhật ý tưởng.', '✏️');
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
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
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
    const to = from === 'Alvin' ? 'Paoi' : 'Alvin';
    const fromId = resolveProfileId(from);
    if (!fromId) return;
    const { error } = await createHug(fromId, message, kind);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
    toast(kind === 'thinking' ? `${from} đang nghĩ đến ${to} 💭` : `${from} đã gửi ôm cho ${to} 🫂`, '🌸');
  };

  // Date requests — backed by Supabase (notify_new_date_request/notify_date_request_response
  // triggers push the shared notification, matching the original inline behaviour).
  const submitDateRequest = async (req: Omit<DateRequest, 'id' | 'status' | 'responseNote' | 'createdAt'>) => {
    const fromId = resolveProfileId(req.from);
    const toId = resolveProfileId(req.to);
    if (!fromId || !toId) return;
    const { error } = await createDateRequest(fromId, toId, req);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
    await refreshDateRequests();
    toast(`Đơn đã nộp! Chờ ${req.to} duyệt nhé 📋`, '✨');
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
    toast(status === 'approved' ? 'Đã duyệt đơn! 🎉' : 'Đã từ chối đơn', status === 'approved' ? '✅' : '❌');
  };

  // Only ever called from the "mine" tab on a still-pending request — once
  // approved/rejected, DatePermit hides the edit/delete controls entirely.
  const updateDateRequest = async (id: string, req: Pick<DateRequest, 'category' | 'categoryEmoji' | 'activity' | 'location' | 'date' | 'time' | 'reason'>) => {
    const prev = state.dateRequests;
    setState(s => ({ ...s, dateRequests: s.dateRequests.map(r => r.id === id ? { ...r, ...req } : r) }));
    const { error } = await updateDateRequestRow(id, req);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); setState(s => ({ ...s, dateRequests: prev })); return; }
    toast('Đã cập nhật đơn.', '✏️');
  };

  const deleteDateRequest = async (id: string) => {
    setState(s => ({ ...s, dateRequests: s.dateRequests.filter(r => r.id !== id) }));
    const { error } = await deleteDateRequestRow(id);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshDateRequests(); return; }
    toast('Đã xóa đơn.', '🗑️');
  };

  // Gratitude
  const addGratitude = async (entry: Omit<GratitudeEntry, 'id'>) => {
    const fromId = resolveProfileId(entry.from);
    if (!fromId) return;
    const { error } = await createGratitude(fromId, entry.text, entry.date);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
    await refreshGratitude();
    toast('Biết ơn đã ghi lại 🌸', '💕');
  };

  const updateGratitude = async (id: string, text: string) => {
    const prev = state.gratitude;
    setState(s => ({ ...s, gratitude: s.gratitude.map(g => g.id === id ? { ...g, text } : g) }));
    const { error } = await updateGratitudeRow(id, text);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); setState(s => ({ ...s, gratitude: prev })); return; }
    toast('Đã cập nhật.', '✏️');
  };

  const deleteGratitude = async (id: string) => {
    setState(s => ({ ...s, gratitude: s.gratitude.filter(g => g.id !== id) }));
    const { error } = await deleteGratitudeRow(id);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshGratitude(); return; }
    toast('Đã xóa.', '🗑️');
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
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshPosts(); }
  };

  // Fav places
  const addFavPlace = async (cat: FavCategory, place: Omit<FavPlace, 'id'>) => {
    const { error } = await createFavPlace(cat, place);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
    await refreshFavorites();
    toast('Đã thêm!', '✨');
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
    if (error || !data) { toast('Có lỗi xảy ra', '⚠️'); return; }
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
  const addPlace = async (p: { name: string; flag?: string; image: string }) => {
    const { error } = await createPlace(p);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); return; }
    await refreshPlaces();
    toast('Đã thêm địa điểm!', '📍');
  };
  const deletePlace = async (id: string) => {
    setState(s => ({ ...s, places: s.places.filter(p => p.id !== id) }));
    const { error } = await deletePlaceRow(id);
    if (error) refreshPlaces();
  };

  // Dark mode — persisted per couple so it survives reload/relogin
  const toggleDarkMode = async () => {
    const next = !state.darkMode;
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.removeAttribute('data-theme');
    }
    setState(s => ({ ...s, darkMode: next }));
    if (myProfile?.coupleId) {
      const { error } = await updateDarkMode(myProfile.coupleId, next);
      if (error) toast('Có lỗi xảy ra', '⚠️');
    }
  };

  // Anniversary date — either partner can set/edit it, persisted per couple.
  const setRelationshipStart = async (date: string) => {
    if (!myProfile?.coupleId) return;
    setState(s => ({ ...s, relationshipStart: date }));
    const { error } = await updateRelationshipStart(myProfile.coupleId, date);
    if (error) { toast('Có lỗi xảy ra', '⚠️'); refreshFavorites(); return; }
    toast('Đã cập nhật ngày kỷ niệm 📅', '💕');
  };

  const refreshProfiles = useCallback(async () => {
    const me = await getCurrentProfile();
    if (!me) {
      setMyProfile(null); setPartnerProfile(null); setProfilePhotos({}); setIsLinked(false);
      setProfileLoaded(true);
      return;
    }
    const partner = await getPartnerProfile();
    setMyProfile(me);
    setPartnerProfile(partner);
    setIsLinked(!!partner);
    const photos: Record<string, string> = {};
    if (me.photoUrl) photos[me.displayName] = me.photoUrl;
    if (partner?.photoUrl) photos[partner.displayName] = partner.photoUrl;
    setProfilePhotos(photos);
    if (me.displayName === 'Alvin' || me.displayName === 'Paoi') setCurrentUser(me.displayName);
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
      setAuthLoading(false);
      if (session) refreshProfiles(); else setProfileLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
      if (session) { setProfileLoaded(false); refreshProfiles(); }
      else { setMyProfile(null); setPartnerProfile(null); setProfilePhotos({}); setIsLinked(false); setProfileLoaded(true); }
    });
    return () => sub.subscription.unsubscribe();
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

  const refreshPosts = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    if (myProfile.displayName === 'Alvin' || myProfile.displayName === 'Paoi') names[myProfile.id] = myProfile.displayName;
    if (partnerProfile && (partnerProfile.displayName === 'Alvin' || partnerProfile.displayName === 'Paoi')) names[partnerProfile.id] = partnerProfile.displayName;
    const { posts, reactions } = await fetchPosts(myProfile.id, names);
    setState(s => ({ ...s, posts, postReactions: reactions }));
  }, [myProfile, partnerProfile]);

  useEffect(() => {
    if (isLinked && myProfile && partnerProfile) refreshPosts();
  }, [isLinked, myProfile, partnerProfile, refreshPosts]);

  const refreshMemories = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    if (myProfile.displayName === 'Alvin' || myProfile.displayName === 'Paoi') names[myProfile.id] = myProfile.displayName;
    if (partnerProfile && (partnerProfile.displayName === 'Alvin' || partnerProfile.displayName === 'Paoi')) names[partnerProfile.id] = partnerProfile.displayName;
    const memories = await fetchMemories(names);
    setState(s => ({ ...s, memories }));
  }, [myProfile, partnerProfile]);

  useEffect(() => {
    if (isLinked && myProfile && partnerProfile) refreshMemories();
  }, [isLinked, myProfile, partnerProfile, refreshMemories]);

  const refreshEvents = useCallback(async () => {
    const events = await fetchEvents();
    setState(s => ({ ...s, events }));
  }, []);

  useEffect(() => {
    if (isLinked) refreshEvents();
  }, [isLinked, refreshEvents]);

  const refreshMoney = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    if (myProfile.displayName === 'Alvin' || myProfile.displayName === 'Paoi') names[myProfile.id] = myProfile.displayName;
    if (partnerProfile && (partnerProfile.displayName === 'Alvin' || partnerProfile.displayName === 'Paoi')) names[partnerProfile.id] = partnerProfile.displayName;
    const [expenses, billsRaw, savingsGoals] = await Promise.all([fetchExpenses(names), fetchBills(), fetchSavingsGoals()]);
    const bills = await rollBillsForward(billsRaw, new Date().toISOString().slice(0, 7));
    setState(s => ({ ...s, expenses, bills, savingsGoals }));
  }, [myProfile, partnerProfile]);

  useEffect(() => {
    if (isLinked && myProfile && partnerProfile) refreshMoney();
  }, [isLinked, myProfile, partnerProfile, refreshMoney]);

  const refreshLoveStuff = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    if (myProfile.displayName === 'Alvin' || myProfile.displayName === 'Paoi') names[myProfile.id] = myProfile.displayName;
    if (partnerProfile && (partnerProfile.displayName === 'Alvin' || partnerProfile.displayName === 'Paoi')) names[partnerProfile.id] = partnerProfile.displayName;
    const [loveNotes, loveLetters, secretNotes] = await Promise.all([fetchLoveNotes(names), fetchLoveLetters(names), fetchSecretNotes(names)]);
    setState(s => ({ ...s, loveNotes, loveLetters, secretNotes }));
  }, [myProfile, partnerProfile]);

  useEffect(() => {
    if (isLinked && myProfile && partnerProfile) refreshLoveStuff();
  }, [isLinked, myProfile, partnerProfile, refreshLoveStuff]);

  const refreshGoals = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    if (myProfile.displayName === 'Alvin' || myProfile.displayName === 'Paoi') names[myProfile.id] = myProfile.displayName;
    if (partnerProfile && (partnerProfile.displayName === 'Alvin' || partnerProfile.displayName === 'Paoi')) names[partnerProfile.id] = partnerProfile.displayName;
    const goals = await fetchGoals(names);
    setState(s => ({ ...s, goals }));
  }, [myProfile, partnerProfile]);

  useEffect(() => {
    if (isLinked && myProfile) refreshGoals();
  }, [isLinked, myProfile, refreshGoals]);

  const refreshFavorites = useCallback(async () => {
    if (!myProfile?.coupleId) return;
    const [settings, favPlaces, favCategories] = await Promise.all([
      fetchCoupleSettings(myProfile.coupleId), fetchFavPlaces(), fetchFavCategories(),
    ]);
    if (settings?.darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.removeAttribute('data-theme');
    }
    setState(s => ({
      ...s,
      favorites: settings?.favorites ?? s.favorites,
      darkMode: settings?.darkMode ?? s.darkMode,
      relationshipStart: settings?.relationshipStart ?? s.relationshipStart,
      favPlaces,
      favCategories,
    }));
  }, [myProfile?.coupleId]);

  useEffect(() => {
    if (isLinked && myProfile) refreshFavorites();
  }, [isLinked, myProfile, refreshFavorites]);

  const refreshPlaces = useCallback(async () => {
    const places = await fetchPlaces();
    setState(s => ({ ...s, places }));
  }, []);

  useEffect(() => {
    if (isLinked) refreshPlaces();
  }, [isLinked, refreshPlaces]);

  const refreshPlaylist = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    if (myProfile.displayName === 'Alvin' || myProfile.displayName === 'Paoi') names[myProfile.id] = myProfile.displayName;
    if (partnerProfile && (partnerProfile.displayName === 'Alvin' || partnerProfile.displayName === 'Paoi')) names[partnerProfile.id] = partnerProfile.displayName;
    const playlist = await fetchPlaylist(names);
    setState(s => ({ ...s, playlist }));
  }, [myProfile, partnerProfile]);

  useEffect(() => {
    if (isLinked && myProfile && partnerProfile) refreshPlaylist();
  }, [isLinked, myProfile, partnerProfile, refreshPlaylist]);

  const refreshTrips = useCallback(async () => {
    const trips = await fetchTrips();
    setState(s => ({ ...s, trips }));
  }, []);

  useEffect(() => {
    if (isLinked) refreshTrips();
  }, [isLinked, refreshTrips]);

  const refreshCapsules = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    if (myProfile.displayName === 'Alvin' || myProfile.displayName === 'Paoi') names[myProfile.id] = myProfile.displayName;
    if (partnerProfile && (partnerProfile.displayName === 'Alvin' || partnerProfile.displayName === 'Paoi')) names[partnerProfile.id] = partnerProfile.displayName;
    const capsules = await fetchCapsules(names);
    setState(s => ({ ...s, capsules }));
  }, [myProfile, partnerProfile]);

  useEffect(() => {
    if (isLinked && myProfile && partnerProfile) refreshCapsules();
  }, [isLinked, myProfile, partnerProfile, refreshCapsules]);

  const refreshWishes = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    if (myProfile.displayName === 'Alvin' || myProfile.displayName === 'Paoi') names[myProfile.id] = myProfile.displayName;
    if (partnerProfile && (partnerProfile.displayName === 'Alvin' || partnerProfile.displayName === 'Paoi')) names[partnerProfile.id] = partnerProfile.displayName;
    const wishes = await fetchWishes(names);
    setState(s => ({ ...s, wishes }));
  }, [myProfile, partnerProfile]);

  useEffect(() => {
    if (isLinked && myProfile && partnerProfile) refreshWishes();
  }, [isLinked, myProfile, partnerProfile, refreshWishes]);

  const refreshDateIdeas = useCallback(async () => {
    const dateIdeas = await fetchDateIdeas();
    setState(s => ({ ...s, dateIdeas }));
  }, []);

  useEffect(() => {
    if (isLinked) refreshDateIdeas();
  }, [isLinked, refreshDateIdeas]);

  const refreshDateIdeaPresets = useCallback(async () => {
    const dateIdeaPresets = await fetchDateIdeaPresets();
    setState(s => ({ ...s, dateIdeaPresets }));
  }, []);

  useEffect(() => {
    if (isLinked) refreshDateIdeaPresets();
  }, [isLinked, refreshDateIdeaPresets]);

  const refreshDateIdeaHistory = useCallback(async () => {
    const dateIdeaHistory = await fetchDateIdeaHistory();
    setState(s => ({ ...s, dateIdeaHistory }));
  }, []);

  useEffect(() => {
    if (isLinked) refreshDateIdeaHistory();
  }, [isLinked, refreshDateIdeaHistory]);

  const refreshGratitude = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    if (myProfile.displayName === 'Alvin' || myProfile.displayName === 'Paoi') names[myProfile.id] = myProfile.displayName;
    if (partnerProfile && (partnerProfile.displayName === 'Alvin' || partnerProfile.displayName === 'Paoi')) names[partnerProfile.id] = partnerProfile.displayName;
    const gratitude = await fetchGratitude(names);
    setState(s => ({ ...s, gratitude }));
  }, [myProfile, partnerProfile]);

  useEffect(() => {
    if (isLinked && myProfile && partnerProfile) refreshGratitude();
  }, [isLinked, myProfile, partnerProfile, refreshGratitude]);

  const refreshDateRequests = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    if (myProfile.displayName === 'Alvin' || myProfile.displayName === 'Paoi') names[myProfile.id] = myProfile.displayName;
    if (partnerProfile && (partnerProfile.displayName === 'Alvin' || partnerProfile.displayName === 'Paoi')) names[partnerProfile.id] = partnerProfile.displayName;
    const dateRequests = await fetchDateRequests(names);
    setState(s => ({ ...s, dateRequests }));
  }, [myProfile, partnerProfile]);

  useEffect(() => {
    if (isLinked && myProfile && partnerProfile) refreshDateRequests();
  }, [isLinked, myProfile, partnerProfile, refreshDateRequests]);

  const refreshCountdowns = useCallback(async () => {
    const countdowns = await fetchCountdowns();
    setState(s => ({ ...s, countdowns }));
  }, []);

  useEffect(() => {
    if (isLinked) refreshCountdowns();
  }, [isLinked, refreshCountdowns]);

  const refreshMoods = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    if (myProfile.displayName === 'Alvin' || myProfile.displayName === 'Paoi') names[myProfile.id] = myProfile.displayName;
    if (partnerProfile && (partnerProfile.displayName === 'Alvin' || partnerProfile.displayName === 'Paoi')) names[partnerProfile.id] = partnerProfile.displayName;
    const moodHistory = await fetchMoodHistory(names);
    const today = new Date().toISOString().slice(0, 10);
    const todayEntry = moodHistory.find(e => e.date === today);
    setState(s => ({ ...s, moodHistory, moods: { Alvin: todayEntry?.Alvin ?? null, Paoi: todayEntry?.Paoi ?? null } }));
  }, [myProfile, partnerProfile]);

  useEffect(() => {
    if (isLinked && myProfile && partnerProfile) refreshMoods();
  }, [isLinked, myProfile, partnerProfile, refreshMoods]);

  const refreshStreak = useCallback(async () => {
    const streak = await bumpStreak();
    setState(s => ({ ...s, streak }));
  }, []);

  useEffect(() => {
    if (isLinked) refreshStreak();
  }, [isLinked, refreshStreak]);

  const refreshNotifications = useCallback(async () => {
    if (!myProfile) return;
    const names: Record<string, User> = {};
    if (myProfile.displayName === 'Alvin' || myProfile.displayName === 'Paoi') names[myProfile.id] = myProfile.displayName;
    if (partnerProfile && (partnerProfile.displayName === 'Alvin' || partnerProfile.displayName === 'Paoi')) names[partnerProfile.id] = partnerProfile.displayName;
    const notifications = await fetchNotifications(names, myProfile.id);
    setState(s => ({ ...s, notifications }));
  }, [myProfile, partnerProfile]);

  // Realtime: pop a toast + prepend the item the instant a notification row is
  // inserted for this couple, instead of waiting on a poll interval.
  useEffect(() => {
    if (!isLinked || !myProfile?.coupleId) return;
    refreshNotifications();
    const coupleId = myProfile.coupleId;
    const myId = myProfile.id;
    const names: Record<string, User> = {};
    if (myProfile.displayName === 'Alvin' || myProfile.displayName === 'Paoi') names[myProfile.id] = myProfile.displayName;
    if (partnerProfile && (partnerProfile.displayName === 'Alvin' || partnerProfile.displayName === 'Paoi')) names[partnerProfile.id] = partnerProfile.displayName;
    const channel = supabase
      .channel(`notifications-${coupleId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          const row = payload.new as { id: string; emoji: string | null; message: string; read: boolean; actor_profile_id: string | null; target_screen: string | null; target_id: string | null; preview_image_url: string | null; preview_text: string | null };
          // Skip your own actions — you already got a local toast for those
          // when you did them; this feed is only meant to tell the partner.
          if (row.actor_profile_id === myId) return;
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
          toast(row.message, row.emoji ?? '🔔');
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

  const updateNotifyPrefs = async (prefs: NotifyPrefs) => {
    const res = await authUpdateNotifyPrefs(prefs);
    if (!res.ok) { toast(res.error || 'Có lỗi xảy ra', '⚠️'); return; }
    await refreshProfiles();
    toast('Đã cập nhật', '✓');
  };

  const invitePartner = useCallback(async (username: string) => {
    const res = await apiSendInvite(username);
    if (res.ok) { toast('Đã gửi lời mời 💌'); refreshInvites(); }
    return res;
  }, [refreshInvites]);

  const acceptInvite = useCallback(async (id: string) => {
    const res = await apiRespondInvite(id, true);
    if (!res.ok) { toast(res.error || 'Có lỗi xảy ra', '⚠️'); return; }
    toast('Đã kết nối! 💕', '🎉');
    await refreshProfiles();
    refreshInvites();
  }, [refreshProfiles, refreshInvites]);

  const rejectInvite = useCallback(async (id: string) => {
    const res = await apiRespondInvite(id, false);
    if (!res.ok) { toast(res.error || 'Có lỗi xảy ra', '⚠️'); return; }
    toast('Đã từ chối lời mời');
    refreshInvites();
  }, [refreshInvites]);

  const cancelSentInvite = useCallback(async (id: string) => {
    await apiCancelInvite(id);
    refreshInvites();
  }, [refreshInvites]);

  const updateProfilePhoto = async (photoUrl: string) => {
    const res = await authUpdatePhoto(photoUrl);
    if (!res.ok) { toast(res.error || 'Có lỗi xảy ra', '⚠️'); return; }
    await refreshProfiles();
    toast('Ảnh đã được cập nhật! ✨');
  };

  const logout = useCallback(() => {
    authLogout();
  }, []);

  return (
    <Ctx.Provider value={{
      state, currentUser,
      authed, authLoading, profileLoaded, isLinked, myProfile, partnerProfile, refreshAuthProfile: refreshProfiles, logout,
      pendingInvite, sentInvite, invitePartner, acceptInvite, rejectInvite, cancelSentInvite,
      screen, selectedId, navigate, goBack, navSeq, lastNavWasPop,
      toasts, toast,
      createModal, createStep, openCreate, closeCreate, celebration,
      toggleLike, toggleSave, addComment, addPost, editPost, deletePost,
      addMemory, toggleFavorite,
      addExpense, updateExpense, deleteExpense,
      addSavingsGoal, updateSavingsGoal, deleteSavingsGoal, addToGoal, withdrawFromGoal,
      addLoveNote, markNoteRead, addSecretNote,
      addEvent, deleteEvent,
      addGoal, updateGoal, toggleGoal, deleteGoal, contributeToGoal,
      setMood,
      updateFavorite,
      markNotifRead, markAllRead, deleteNotification, updateNotifyPrefs,
      addBill, updateBill, toggleBillPaid, deleteBill,
      addTrip, updateTrip, deleteTrip, toggleTripCheck,
      addCapsule, openCapsule, updateCapsule, deleteCapsule,
      addCountdown, deleteCountdown,
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
      addPlace, deletePlace,
      toggleDarkMode,
      setRelationshipStart,
      profilePhotos, updateProfilePhoto,
    }}>
      {children}
    </Ctx.Provider>
  );
}
