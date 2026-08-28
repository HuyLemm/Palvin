// Force full-page reload when this module changes to avoid stale context refs.
if (import.meta.hot) {
  import.meta.hot.accept(() => { window.location.reload(); });
}

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { initialState } from './data';
import type { AppState, User, Post, Memory, Expense, SavingsGoal, LoveNote, CalendarEvent, Goal, Mood, Bill, Trip, Capsule, Countdown, PlaylistItem, WishItem, LoveLetter, GratitudeEntry, DateRequest, FavPlace, FavCategory } from './types';
import { supabase } from './lib/supabaseClient';
import {
  updatePhoto as authUpdatePhoto, getCurrentProfile, getPartnerProfile, logout as authLogout,
  sendInvite as apiSendInvite, respondInvite as apiRespondInvite, cancelInvite as apiCancelInvite, getMyInvites,
  type PendingInvite, type AuthProfile,
} from './auth';

interface ToastItem { id: string; message: string; emoji: string; }

interface AppContextType {
  state: AppState;
  currentUser: User;

  // Auth session
  authed: boolean;
  authLoading: boolean;
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

  // Toast
  toasts: ToastItem[];
  toast: (msg: string, emoji?: string) => void;

  // Create modal
  createModal: boolean;
  openCreate: () => void;
  closeCreate: () => void;
  celebration: boolean;

  // Posts
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  addComment: (postId: string, text: string) => void;
  addPost: (p: Omit<Post, 'id' | 'liked' | 'saved' | 'comments'>) => void;

  // Memories
  addMemory: (m: Omit<Memory, 'id' | 'favorite'>) => void;
  toggleFavorite: (id: string) => void;

  // Expenses
  addExpense: (e: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;

  // Savings
  addSavingsGoal: (g: Omit<SavingsGoal, 'id'>) => void;
  addToGoal: (id: string, amount: number) => void;

  // Love notes
  addLoveNote: (n: Omit<LoveNote, 'id' | 'read'>) => void;
  markNoteRead: (id: string) => void;

  // Events
  addEvent: (e: Omit<CalendarEvent, 'id'>) => void;
  deleteEvent: (id: string) => void;

  // Goals
  addGoal: (g: Omit<Goal, 'id' | 'completed'>) => void;
  toggleGoal: (id: string) => void;
  deleteGoal: (id: string) => void;

  // Mood
  setMood: (user: User, mood: Mood) => void;

  // Favorites
  updateFavorite: (key: string, val: string) => void;

  // Notifications
  markNotifRead: (id: string) => void;
  markAllRead: () => void;

  // Bills
  addBill: (b: Omit<Bill, 'id'>) => void;
  toggleBillPaid: (id: string) => void;
  deleteBill: (id: string) => void;
  toggleBillReminder: (id: string) => void;

  // Trips
  addTrip: (t: Omit<Trip, 'id'>) => void;
  updateTrip: (t: Trip) => void;
  deleteTrip: (id: string) => void;
  toggleTripCheck: (tripId: string, itemId: string) => void;

  // Capsules
  addCapsule: (c: Omit<Capsule, 'id'>) => void;
  openCapsule: (id: string) => void;

  // Countdowns
  addCountdown: (c: Omit<Countdown, 'id'>) => void;
  deleteCountdown: (id: string) => void;

  // Playlist
  addToPlaylist: (p: Omit<PlaylistItem, 'id'>) => void;
  removeFromPlaylist: (id: string) => void;

  // Wishes
  addWish: (w: Omit<WishItem, 'id' | 'drawn'>) => void;
  drawWish: (id: string) => void;
  removeWish: (id: string) => void;

  // Love letters
  addLoveLetter: (l: Omit<LoveLetter, 'id'>) => void;
  deleteLoveLetter: (id: string) => void;

  // Hugs
  sendHug: (from: User, message: string) => void;

  // Date requests
  submitDateRequest: (req: Omit<DateRequest, 'id' | 'status' | 'responseNote' | 'createdAt'>) => void;
  respondToRequest: (id: string, status: 'approved' | 'rejected', note: string) => void;

  // Gratitude
  addGratitude: (entry: Omit<GratitudeEntry, 'id'>) => void;

  // Reactions
  addReaction: (postId: string, emoji: string) => void;

  // Fav places
  addFavPlace: (cat: FavCategory, place: Omit<FavPlace, 'id'>) => void;
  removeFavPlace: (cat: FavCategory, id: string) => void;

  // Dark mode
  toggleDarkMode: () => void;

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
  const [isLinked, setIsLinked] = useState(false);
  const [myProfile, setMyProfile] = useState<AuthProfile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<AuthProfile | null>(null);
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
  const [sentInvite, setSentInvite] = useState<PendingInvite | null>(null);
  const [profilePhotos, setProfilePhotos] = useState<Record<string, string>>({});
  const [stack, setStack] = useState<{ screen: string; id?: string }[]>([{ screen: 'home' }]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [createModal, setCreateModal] = useState(false);
  const [celebration, setCelebration] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const current = stack[stack.length - 1];
  const screen = current.screen;
  const selectedId = current.id ?? null;

  const navigate = useCallback((s: string, id?: string) => {
    setStack(prev => [...prev, { screen: s, id }]);
  }, []);

  const goBack = useCallback(() => {
    setStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
  }, []);

  const toast = useCallback((msg: string, emoji = '🌸') => {
    const id = uid();
    setToasts(prev => [...prev, { id, message: msg, emoji }]);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const openCreate = () => setCreateModal(true);
  const closeCreate = () => setCreateModal(false);

  // Posts
  const toggleLike = (id: string) => {
    setState(s => ({
      ...s,
      posts: s.posts.map(p =>
        p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
      )
    }));
  };

  const toggleSave = (id: string) => {
    setState(s => ({ ...s, posts: s.posts.map(p => p.id === id ? { ...p, saved: !p.saved } : p) }));
  };

  const addComment = (postId: string, text: string) => {
    setState(s => ({
      ...s,
      posts: s.posts.map(p =>
        p.id === postId
          ? { ...p, comments: [...p.comments, { id: uid(), author: currentUser, text, date: 'Just now' }] }
          : p
      )
    }));
  };

  const addPost = (p: Omit<Post, 'id' | 'liked' | 'saved' | 'comments'>) => {
    const newPost: Post = { ...p, id: uid(), liked: false, saved: false, comments: [] };
    setState(s => ({ ...s, posts: [newPost, ...s.posts] }));
    setState(s => ({
      ...s,
      notifications: [
        { id: uid(), emoji: '📸', message: `${p.author} published a new post.`, date: 'Just now', read: false },
        ...s.notifications
      ]
    }));
    toast('Post published.', '📸');
  };

  // Memories
  const addMemory = (m: Omit<Memory, 'id' | 'favorite'>) => {
    const mem: Memory = { ...m, id: uid(), favorite: false };
    setState(s => ({
      ...s,
      memories: [mem, ...s.memories],
      notifications: [
        { id: uid(), emoji: '🌸', message: `${currentUser} added a new memory: ${m.title}`, date: 'Just now', read: false },
        ...s.notifications
      ]
    }));
    toast('Memory added 🌸');
  };

  const toggleFavorite = (id: string) => {
    setState(s => ({ ...s, memories: s.memories.map(m => m.id === id ? { ...m, favorite: !m.favorite } : m) }));
  };

  // Expenses
  const addExpense = (e: Omit<Expense, 'id'>) => {
    setState(s => ({ ...s, expenses: [{ ...e, id: uid() }, ...s.expenses] }));
    toast('Expense saved.', '💰');
  };

  const deleteExpense = (id: string) => {
    setState(s => ({ ...s, expenses: s.expenses.filter(e => e.id !== id) }));
    toast('Expense removed.', '🗑️');
  };

  // Savings
  const addSavingsGoal = (g: Omit<SavingsGoal, 'id'>) => {
    setState(s => ({ ...s, savingsGoals: [...s.savingsGoals, { ...g, id: uid() }] }));
    toast('Savings goal added! 💰');
  };

  const addToGoal = (id: string, amount: number) => {
    setState(s => ({
      ...s,
      savingsGoals: s.savingsGoals.map(g =>
        g.id === id ? { ...g, current: Math.min(g.current + amount, g.target) } : g
      )
    }));
    toast('Added to savings! 🎉');
  };

  // Love notes
  const addLoveNote = (n: Omit<LoveNote, 'id' | 'read'>) => {
    const note: LoveNote = { ...n, id: uid(), read: false };
    setState(s => ({
      ...s,
      loveNotes: [note, ...s.loveNotes],
      notifications: [
        { id: uid(), emoji: '💌', message: `${n.from} sent you a love note.`, date: 'Just now', read: false },
        ...s.notifications
      ]
    }));
    toast('Love note sent 💌');
  };

  const markNoteRead = (id: string) => {
    setState(s => ({ ...s, loveNotes: s.loveNotes.map(n => n.id === id ? { ...n, read: true } : n) }));
  };

  // Events
  const addEvent = (e: Omit<CalendarEvent, 'id'>) => {
    setState(s => ({ ...s, events: [...s.events, { ...e, id: uid() }] }));
    toast('Event added to calendar 📅');
  };

  const deleteEvent = (id: string) => {
    setState(s => ({ ...s, events: s.events.filter(e => e.id !== id) }));
  };

  // Goals
  const addGoal = (g: Omit<Goal, 'id' | 'completed'>) => {
    setState(s => ({ ...s, goals: [...s.goals, { ...g, id: uid(), completed: false }] }));
    toast('Goal added ✨');
  };

  const toggleGoal = (id: string) => {
    setState(s => {
      const goals = s.goals.map(g =>
        g.id === id
          ? { ...g, completed: !g.completed, completedDate: !g.completed ? new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : undefined }
          : g
      );
      const wasCompleted = s.goals.find(g => g.id === id)?.completed;
      if (!wasCompleted) {
        setCelebration(true);
        setTimeout(() => setCelebration(false), 2000);
        toast('Goal completed! ❤️', '🎉');
      }
      return { ...s, goals };
    });
  };

  const deleteGoal = (id: string) => {
    setState(s => ({ ...s, goals: s.goals.filter(g => g.id !== id) }));
  };

  // Mood
  const setMood = (user: User, mood: Mood) => {
    const today = new Date().toISOString().slice(0, 10);
    setState(s => {
      const existing = s.moodHistory.find(e => e.date === today);
      const moodHistory = existing
        ? s.moodHistory.map(e => e.date === today ? { ...e, [user]: mood } : e)
        : [...s.moodHistory, { date: today, [user]: mood }];
      return { ...s, moods: { ...s.moods, [user]: mood }, moodHistory };
    });
    toast(`Mood updated!`, mood.emoji);
  };

  // Favorites
  const updateFavorite = (key: string, val: string) => {
    setState(s => ({ ...s, favorites: { ...s.favorites, [key]: val } }));
    toast('Updated!', '✨');
  };

  // Notifications
  const markNotifRead = (id: string) => {
    setState(s => ({ ...s, notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) }));
  };

  const markAllRead = () => {
    setState(s => ({ ...s, notifications: s.notifications.map(n => ({ ...n, read: true })) }));
  };

  // Bills
  const addBill = (b: Omit<Bill, 'id'>) => {
    setState(s => ({ ...s, bills: [...s.bills, { ...b, id: uid() }] }));
    toast('Hóa đơn đã thêm!', '🧾');
  };

  const toggleBillPaid = (id: string) => {
    setState(s => ({
      ...s,
      bills: s.bills.map(b =>
        b.id === id
          ? { ...b, paid: !b.paid, paidDate: !b.paid ? new Date().toISOString().slice(0, 10) : undefined }
          : b
      )
    }));
  };

  const deleteBill = (id: string) => {
    setState(s => ({ ...s, bills: s.bills.filter(b => b.id !== id) }));
    toast('Đã xóa hóa đơn.', '🗑️');
  };

  const toggleBillReminder = (id: string) => {
    setState(s => ({
      ...s,
      bills: s.bills.map(b => b.id === id ? { ...b, reminder: !b.reminder } : b)
    }));
  };

  // Trips
  const addTrip = (t: Omit<Trip, 'id'>) => {
    setState(s => ({ ...s, trips: [...s.trips, { ...t, id: uid() }] }));
    toast('Trip added! ✈️');
  };
  const updateTrip = (t: Trip) => {
    setState(s => ({ ...s, trips: s.trips.map(x => x.id === t.id ? t : x) }));
  };
  const deleteTrip = (id: string) => {
    setState(s => ({ ...s, trips: s.trips.filter(t => t.id !== id) }));
    toast('Trip removed.', '🗑️');
  };
  const toggleTripCheck = (tripId: string, itemId: string) => {
    setState(s => ({
      ...s,
      trips: s.trips.map(t => t.id === tripId
        ? { ...t, checklist: t.checklist.map(c => c.id === itemId ? { ...c, done: !c.done } : c) }
        : t
      )
    }));
  };

  // Capsules
  const addCapsule = (c: Omit<Capsule, 'id'>) => {
    setState(s => ({ ...s, capsules: [...s.capsules, { ...c, id: uid() }] }));
    toast('Capsule sealed! 💌');
  };
  const openCapsule = (id: string) => {
    setState(s => ({ ...s, capsules: s.capsules.map(c => c.id === id ? { ...c, opened: true } : c) }));
  };

  // Countdowns
  const addCountdown = (c: Omit<Countdown, 'id'>) => {
    setState(s => ({ ...s, countdowns: [...s.countdowns, { ...c, id: uid() }] }));
    toast('Countdown added!', '⏳');
  };
  const deleteCountdown = (id: string) => {
    setState(s => ({ ...s, countdowns: s.countdowns.filter(c => c.id !== id) }));
  };

  // Playlist
  const addToPlaylist = (p: Omit<PlaylistItem, 'id'>) => {
    setState(s => ({ ...s, playlist: [...s.playlist, { ...p, id: uid() }] }));
    toast('Added to playlist! 🎵');
  };
  const removeFromPlaylist = (id: string) => {
    setState(s => ({ ...s, playlist: s.playlist.filter(p => p.id !== id) }));
  };

  // Wishes
  const addWish = (w: Omit<WishItem, 'id' | 'drawn'>) => {
    setState(s => ({ ...s, wishes: [...s.wishes, { ...w, id: uid(), drawn: false }] }));
    toast('Ước nguyện đã vào hũ! 🫙', '✨');
  };
  const drawWish = (id: string) => {
    setState(s => ({ ...s, wishes: s.wishes.map(w => w.id === id ? { ...w, drawn: true } : w) }));
  };
  const removeWish = (id: string) => {
    setState(s => ({ ...s, wishes: s.wishes.filter(w => w.id !== id) }));
  };

  // Love letters
  const addLoveLetter = (l: Omit<LoveLetter, 'id'>) => {
    setState(s => ({
      ...s,
      loveLetters: [{ ...l, id: uid() }, ...s.loveLetters],
      notifications: [
        { id: uid(), emoji: '💌', message: `${l.from} wrote you a love letter.`, date: 'Just now', read: false },
        ...s.notifications,
      ],
    }));
    toast('Thư tình đã gửi 💌', '🌹');
  };
  const deleteLoveLetter = (id: string) => {
    setState(s => ({ ...s, loveLetters: s.loveLetters.filter(l => l.id !== id) }));
  };

  // Hugs
  const sendHug = (from: User, message: string) => {
    const to = from === 'Alvin' ? 'Paoi' : 'Alvin';
    setState(s => ({
      ...s,
      hugs: [{ id: uid(), from, date: new Date().toISOString(), message }, ...s.hugs],
      notifications: [
        { id: uid(), emoji: '🫂', message: `${from} gửi ${to} một cái ôm thật chặt! ${message}`, date: 'Just now', read: false },
        ...s.notifications,
      ],
    }));
    toast(`${from} đã gửi ôm cho ${to} 🫂`, '🌸');
  };

  // Date requests
  const submitDateRequest = (req: Omit<DateRequest, 'id' | 'status' | 'responseNote' | 'createdAt'>) => {
    const newReq: DateRequest = { ...req, id: uid(), status: 'pending', responseNote: '', createdAt: new Date().toISOString() };
    setState(s => ({
      ...s,
      dateRequests: [newReq, ...s.dateRequests],
      notifications: [
        { id: uid(), emoji: req.categoryEmoji, message: `${req.from} đã nộp đơn xin phép: ${req.activity}`, date: 'Vừa xong', read: false },
        ...s.notifications,
      ],
    }));
    toast(`Đơn đã nộp! Chờ ${req.to} duyệt nhé 📋`, '✨');
  };

  const respondToRequest = (id: string, status: 'approved' | 'rejected', note: string) => {
    setState(s => {
      const req = s.dateRequests.find(r => r.id === id);
      return {
        ...s,
        dateRequests: s.dateRequests.map(r =>
          r.id === id ? { ...r, status, responseNote: note, respondedAt: new Date().toISOString() } : r
        ),
        notifications: [
          { id: uid(), emoji: status === 'approved' ? '✅' : '❌', message: `${req?.to} đã ${status === 'approved' ? 'DUYỆT' : 'TỪ CHỐI'} đơn xin phép của ${req?.from}${note ? `: "${note}"` : ''}`, date: 'Vừa xong', read: false },
          ...s.notifications,
        ],
      };
    });
    toast(status === 'approved' ? 'Đã duyệt đơn! 🎉' : 'Đã từ chối đơn', status === 'approved' ? '✅' : '❌');
  };

  // Gratitude
  const addGratitude = (entry: Omit<GratitudeEntry, 'id'>) => {
    setState(s => ({ ...s, gratitude: [{ ...entry, id: uid() }, ...s.gratitude] }));
    toast('Biết ơn đã ghi lại 🌸', '💕');
  };

  // Reactions
  const addReaction = (postId: string, emoji: string) => {
    setState(s => {
      const existing = s.postReactions[postId]?.[emoji];
      const reacted = existing?.reacted ?? false;
      return {
        ...s,
        postReactions: {
          ...s.postReactions,
          [postId]: {
            ...s.postReactions[postId],
            [emoji]: { count: reacted ? (existing.count - 1) : ((existing?.count ?? 0) + 1), reacted: !reacted },
          },
        },
      };
    });
  };

  // Fav places
  const addFavPlace = (cat: FavCategory, place: Omit<FavPlace, 'id'>) => {
    setState(s => ({ ...s, favPlaces: { ...s.favPlaces, [cat]: [...s.favPlaces[cat], { ...place, id: uid() }] } }));
    toast('Đã thêm!', '✨');
  };
  const removeFavPlace = (cat: FavCategory, id: string) => {
    setState(s => ({ ...s, favPlaces: { ...s.favPlaces, [cat]: s.favPlaces[cat].filter(p => p.id !== id) } }));
  };

  // Dark mode
  const toggleDarkMode = () => {
    setState(s => {
      const next = !s.darkMode;
      if (next) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
        document.body.removeAttribute('data-theme');
      }
      return { ...s, darkMode: next };
    });
  };

  const refreshProfiles = useCallback(async () => {
    const me = await getCurrentProfile();
    if (!me) {
      setMyProfile(null); setPartnerProfile(null); setProfilePhotos({}); setIsLinked(false);
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
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
      setAuthLoading(false);
      if (session) refreshProfiles();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
      if (session) refreshProfiles();
      else { setMyProfile(null); setPartnerProfile(null); setProfilePhotos({}); setIsLinked(false); }
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
      authed, authLoading, isLinked, myProfile, partnerProfile, refreshAuthProfile: refreshProfiles, logout,
      pendingInvite, sentInvite, invitePartner, acceptInvite, rejectInvite, cancelSentInvite,
      screen, selectedId, navigate, goBack,
      toasts, toast,
      createModal, openCreate, closeCreate, celebration,
      toggleLike, toggleSave, addComment, addPost,
      addMemory, toggleFavorite,
      addExpense, deleteExpense,
      addSavingsGoal, addToGoal,
      addLoveNote, markNoteRead,
      addEvent, deleteEvent,
      addGoal, toggleGoal, deleteGoal,
      setMood,
      updateFavorite,
      markNotifRead, markAllRead,
      addBill, toggleBillPaid, deleteBill, toggleBillReminder,
      addTrip, updateTrip, deleteTrip, toggleTripCheck,
      addCapsule, openCapsule,
      addCountdown, deleteCountdown,
      addToPlaylist, removeFromPlaylist,
      addWish, drawWish, removeWish,
      addLoveLetter, deleteLoveLetter,
      sendHug,
      submitDateRequest,
      respondToRequest,
      addGratitude,
      addReaction,
      addFavPlace, removeFavPlace,
      toggleDarkMode,
      profilePhotos, updateProfilePhoto,
    }}>
      {children}
    </Ctx.Provider>
  );
}
