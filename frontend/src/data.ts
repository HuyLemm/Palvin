import type { AppState } from './types';

export function getDaysTogether(start: Date): number {
  const now = new Date();
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getDuration(start: Date): { years: number; months: number; days: number } {
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  if (days < 0) {
    months--;
    const prev = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prev.getDate();
  }
  if (months < 0) { years--; months += 12; }
  return { years, months, days };
}

export const initialState: AppState = {
  // Loaded from Supabase (see context.tsx's refreshPosts) once the couple is linked.
  posts: [],

  // Loaded from Supabase (see context.tsx's refreshMemories) once the couple is linked.
  memories: [],

  // Loaded from Supabase (see context.tsx's refreshMoney) once the couple is linked.
  expenses: [],
  savingsGoals: [],
  bills: [],

  // Loaded from Supabase (see context.tsx's refreshLoveStuff) once the couple is linked.
  loveNotes: [],
  secretNotes: [],

  // Loaded from Supabase (see context.tsx's refreshEvents) once the couple is linked.
  events: [],

  // Loaded from Supabase (see context.tsx's refreshGoals) once the couple is linked.
  goals: [],

  // Loaded from Supabase (see context.tsx's refreshNotifications) once the couple is linked.
  notifications: [],

  // Loaded from Supabase (see context.tsx's refreshMoods) once the couple is linked.
  moods: { Alvin: null, Paoi: null },

  // Loaded from Supabase (see context.tsx's refreshFavorites) once the couple is linked.
  favorites: { song: '', food: '', movie: '', cafe: '', place: '' },

  // Loaded from Supabase (see context.tsx's refreshPlaces) once the couple is linked.
  places: [],

  // Loaded from Supabase (see context.tsx's refreshTrips) once the couple is linked.
  trips: [],

  // Loaded from Supabase (see context.tsx's refreshCapsules) once the couple is linked.
  capsules: [],

  // Loaded from Supabase (see context.tsx's refreshCountdowns) once the couple is linked.
  countdowns: [],

  // Loaded from Supabase (see context.tsx's refreshPlaylist) once the couple is linked.
  playlist: [],

  moodHistory: [],

  // Loaded from Supabase (see context.tsx's refreshWishes) once the couple is linked.
  wishes: [],

  // Loaded from Supabase (see context.tsx's refreshDateIdeas) once the couple is linked.
  dateIdeas: [],
  // Loaded from Supabase (see context.tsx's refreshDateIdeaPresets) once the couple is linked —
  // seeded with the default catalog on that couple's first-ever fetch.
  dateIdeaPresets: [],
  // Loaded from Supabase (see context.tsx's refreshDateIdeaHistory) once the couple is linked.
  dateIdeaHistory: [],

  // Loaded from Supabase (see context.tsx's refreshLoveStuff) once the couple is linked.
  loveLetters: [],

  // Loaded from Supabase (see context.tsx's refreshDateRequests) once the couple is linked.
  dateRequests: [],
  // Loaded from Supabase (see context.tsx's refreshGratitude) once the couple is linked.
  gratitude: [],
  postReactions: {},
  // Loaded from Supabase (see context.tsx's refreshFavorites) once the couple is linked.
  darkMode: false,
  favPlaces: { food: [], cafe: [], bida: [], gaming: [] },

  // Loaded from Supabase (see context.tsx's refreshFavorites) once the couple is linked.
  relationshipStart: null,
  // Loaded from Supabase (see context.tsx's refreshStreak) once the couple is linked.
  streak: 0,
};
