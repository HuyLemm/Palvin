import type { AppState } from './types';

export const RELATIONSHIP_START = new Date('2023-08-21');

export function getDaysTogether(): number {
  const now = new Date();
  const diff = now.getTime() - RELATIONSHIP_START.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getDuration(): { years: number; months: number; days: number } {
  const now = new Date();
  const start = RELATIONSHIP_START;
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

  expenses: [
    { id: 'e1', title: 'Dinner at Restaurant', category: 'Food', categoryEmoji: '🍜', amount: 25.50, paidBy: 'Alvin', date: '2026-08-27', note: 'Our favorite pasta place' },
    { id: 'e2', title: 'Morning Coffee', category: 'Coffee', categoryEmoji: '☕', amount: 7.20, paidBy: 'Paoi', date: '2026-08-27', note: '' },
    { id: 'e3', title: 'Movie Tickets', category: 'Entertainment', categoryEmoji: '🎬', amount: 32.00, paidBy: 'Both', date: '2026-08-26', note: 'Romantic film night' },
    { id: 'e4', title: 'Groceries', category: 'Home', categoryEmoji: '🏠', amount: 45.80, paidBy: 'Paoi', date: '2026-08-25', note: 'Weekly groceries' },
    { id: 'e5', title: 'Grab Ride', category: 'Transportation', categoryEmoji: '🚗', amount: 12.00, paidBy: 'Alvin', date: '2026-08-24', note: '' },
    { id: 'e6', title: 'Birthday Gift', category: 'Gifts', categoryEmoji: '🎁', amount: 58.00, paidBy: 'Alvin', date: '2026-08-22', note: 'Surprise gift 💕' }
  ],

  savingsGoals: [
    { id: 'sg1', title: 'Japan Trip 🇯🇵', emoji: '🇯🇵', current: 1240, target: 3000, deadline: 'December 2026' },
    { id: 'sg2', title: 'Anniversary Trip ✈️', emoji: '✈️', current: 800, target: 2000, deadline: 'August 2027' },
    { id: 'sg3', title: 'New Camera 📷', emoji: '📷', current: 520, target: 800, deadline: 'November 2026' },
    { id: 'sg4', title: 'Emergency Fund 💰', emoji: '💰', current: 500, target: 1000, deadline: 'December 2026' }
  ],

  bills: [
    { id: 'b1', title: 'Tiền nhà', emoji: '🏠', category: 'rent', amount: 6500000, dueDay: 5, paid: true, paidDate: '2026-08-04', reminder: true, note: 'Chuyển khoản Vietcombank' },
    { id: 'b2', title: 'Điện', emoji: '⚡', category: 'utilities', amount: 380000, dueDay: 15, paid: false, reminder: true, note: '' },
    { id: 'b3', title: 'Nước', emoji: '💧', category: 'utilities', amount: 120000, dueDay: 15, paid: false, reminder: false, note: '' },
    { id: 'b4', title: 'Internet FPT', emoji: '📡', category: 'internet', amount: 220000, dueDay: 10, paid: true, paidDate: '2026-08-09', reminder: true, note: 'Gói 200Mbps' },
    { id: 'b5', title: 'Netflix', emoji: '🎬', category: 'subscription', amount: 130000, dueDay: 18, paid: false, reminder: true, note: 'Gói Premium' },
    { id: 'b6', title: 'Spotify', emoji: '🎵', category: 'subscription', amount: 59000, dueDay: 22, paid: false, reminder: false, note: 'Duo plan' },
    { id: 'b7', title: 'Bảo hiểm xe', emoji: '🚗', category: 'other', amount: 450000, dueDay: 30, paid: false, reminder: true, note: '' }
  ],

  loveNotes: [
    { id: 'n1', from: 'Paoi', to: 'Alvin', message: "Don't forget to eat today.\nI love you ❤️", date: 'August 27, 2026', mood: '🥰', read: false },
    { id: 'n2', from: 'Alvin', to: 'Paoi', message: "I know you're tired today.\nI'm proud of you. Rest well, my love.", date: 'August 26, 2026', mood: '💕', read: true },
    { id: 'n3', from: 'Paoi', to: 'Alvin', message: "Missing you already 🥺\nCan't wait to see you later.", date: 'August 24, 2026', mood: '🥺', read: true },
    { id: 'n4', from: 'Alvin', to: 'Paoi', message: "You make everything better.\nJust by being you. Thank you for existing. 🌸", date: 'August 22, 2026', mood: '🌸', read: true }
  ],

  secretNotes: [
    { id: 'sn1', from: 'Alvin', message: "Open on Christmas 🎁\nYou mean the world to me, Paoi. Every single day with you is a gift.", unlockDate: '2026-12-25' },
    { id: 'sn2', from: 'Paoi', message: "Happy 3rd Anniversary, my love! ❤️\nHere's to forever. I choose you every day.", unlockDate: '2026-08-21' }
  ],

  // Loaded from Supabase (see context.tsx's refreshEvents) once the couple is linked.
  events: [],

  goals: [
    { id: 'g1', title: 'Visit Japan 🇯🇵', emoji: '🇯🇵', completed: false },
    { id: 'g2', title: 'Watch sunrise together 🌅', emoji: '🌅', completed: true, completedDate: 'March 2025' },
    { id: 'g3', title: 'Cook dinner together 🍳', emoji: '🍳', completed: true, completedDate: 'October 2023' },
    { id: 'g4', title: 'Anniversary trip ✈️', emoji: '✈️', completed: false },
    { id: 'g5', title: 'Save $3,000 💰', emoji: '💰', completed: false },
    { id: 'g6', title: 'Take spring photos 🌸', emoji: '🌸', completed: false },
    { id: 'g7', title: 'Adopt a plant together 🌱', emoji: '🌱', completed: true, completedDate: 'January 2025' }
  ],

  // Loaded from Supabase (see context.tsx's refreshNotifications) once the couple is linked.
  notifications: [],

  moods: {
    Alvin: { emoji: '🥰', label: 'Feeling loved' },
    Paoi: { emoji: '😊', label: 'Happy today' }
  },

  favorites: {
    song: 'Die With A Smile — Lady Gaga & Bruno Mars',
    food: 'Bún bò Huế 🍜',
    movie: 'Your Name (Kimi no Na wa) 🎬',
    cafe: 'The Workshop Coffee ☕',
    place: 'Da Lat, Vietnam 🌸'
  },

  places: [
    { id: 'pl1', name: 'Vietnam 🇻🇳', flag: '🇻🇳', image: 'https://images.unsplash.com/photo-1569144651110-3d3b0f28c474?w=600&h=400&fit=crop&auto=format', memoryIds: ['m1', 'm2', 'm3', 'm6'] },
    { id: 'pl2', name: 'Japan 🇯🇵', flag: '🇯🇵', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&h=400&fit=crop&auto=format', memoryIds: ['m5'] },
    { id: 'pl3', name: 'Beach 🏖️', flag: '🏖️', image: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&h=400&fit=crop&auto=format', memoryIds: ['m3'] }
  ],

  trips: [
    {
      id: 't1', title: 'Japan Winter Trip', emoji: '🇯🇵', destination: 'Tokyo, Japan',
      startDate: '2026-12-15', endDate: '2026-12-22', budget: 3000, spent: 1240,
      status: 'upcoming',
      notes: 'Dream trip! Cherry blossom season was booked out — going winter instead.',
      checklist: [
        { id: 'tc1', text: 'Book flights', done: true },
        { id: 'tc2', text: 'Book hotel in Shinjuku', done: true },
        { id: 'tc3', text: 'Get travel insurance', done: false },
        { id: 'tc4', text: 'Buy JR Pass', done: false },
        { id: 'tc5', text: 'Pack warm clothes', done: false },
        { id: 'tc6', text: 'Exchange VND → JPY', done: false },
      ]
    }
  ],

  capsules: [
    { id: 'cap1', from: 'Alvin', to: 'Paoi', message: "Hey Paoi 🌸\n\nBy the time you read this, we will have been together for 3 years. I hope we are still laughing at stupid things and holding hands while walking.\n\nI love you more than words. Always.\n\n— Alvin", unlockDate: '2026-08-21', opened: true, createdDate: '2026-06-01' },
    { id: 'cap2', from: 'Paoi', to: 'both', message: "To us, on Christmas 🎁\n\nHope this year has been full of adventures, good food, and so much love. Here's to the next one.\n\n— Paoi", unlockDate: '2026-12-25', opened: false, createdDate: '2026-08-01' }
  ],

  countdowns: [
    { id: 'cd1', title: 'Japan Trip ✈️', emoji: '🇯🇵', date: '2026-12-15', color: '#E67F9A' },
    { id: 'cd2', title: "Paoi's Birthday 🎂", emoji: '🎂', date: '2026-09-03', color: '#8B6FD4' },
    { id: 'cd3', title: 'New Year 🎆', emoji: '🎆', date: '2027-01-01', color: '#4A8AE8' },
  ],

  playlist: [
    { id: 'pl1', title: 'Die With A Smile', artist: 'Lady Gaga & Bruno Mars', emoji: '🎵', note: 'Our song 💕', addedBy: 'Alvin' },
    { id: 'pl2', title: 'Perfect', artist: 'Ed Sheeran', emoji: '✨', note: 'First slow dance', addedBy: 'Paoi' },
    { id: 'pl3', title: 'Can\'t Help Falling In Love', artist: 'Elvis Presley', emoji: '🌹', note: 'Classic', addedBy: 'Alvin' },
    { id: 'pl4', title: 'A Thousand Years', artist: 'Christina Perri', emoji: '🕊️', note: 'Every day with you', addedBy: 'Paoi' },
  ],

  moodHistory: [
    { date: '2026-08-21', Alvin: { emoji: '🥰', label: 'Feeling loved' }, Paoi: { emoji: '😍', label: 'In love' } },
    { date: '2026-08-22', Alvin: { emoji: '😊', label: 'Happy today' }, Paoi: { emoji: '🥰', label: 'Feeling loved' } },
    { date: '2026-08-23', Alvin: { emoji: '😴', label: 'Tired' }, Paoi: { emoji: '😊', label: 'Happy today' } },
    { date: '2026-08-24', Alvin: { emoji: '🥰', label: 'Feeling loved' }, Paoi: { emoji: '🥺', label: 'Missing you' } },
    { date: '2026-08-25', Alvin: { emoji: '😍', label: 'In love' }, Paoi: { emoji: '😊', label: 'Happy today' } },
    { date: '2026-08-26', Alvin: { emoji: '😊', label: 'Happy today' }, Paoi: { emoji: '🥰', label: 'Feeling loved' } },
    { date: '2026-08-27', Alvin: { emoji: '🥰', label: 'Feeling loved' }, Paoi: { emoji: '😊', label: 'Happy today' } },
  ],

  wishes: [
    { id: 'w1', from: 'Paoi', wish: 'Được đi du lịch cùng nhau và không bao giờ muốn dừng lại 🌍', date: 'Aug 2026', drawn: false },
    { id: 'w2', from: 'Alvin', wish: 'Mỗi buổi sáng thức dậy đều có cà phê và em bên cạnh ☕', date: 'Aug 2026', drawn: false },
    { id: 'w3', from: 'Paoi', wish: 'Có một ngôi nhà nhỏ thật ấm cúng của riêng mình 🏡', date: 'Aug 2026', drawn: false },
  ],

  loveLetters: [
    {
      id: 'll1', from: 'Alvin', to: 'Paoi',
      title: 'Gửi em, người tôi yêu nhất',
      body: 'Paoi ơi,\n\nCó những ngày tôi không biết nói gì, không biết diễn đạt thế nào. Nhưng tôi biết một điều chắc chắn — rằng em là điều tốt nhất từng xảy đến với tôi.\n\nMỗi khi nhìn em cười, tôi lại nhớ về ngày đầu tiên gặp nhau. Cái cảm giác đó không bao giờ mất đi.\n\nCảm ơn em vì đã ở đây.\n\nYêu em mãi,\nAlvin 💙',
      date: 'August 21, 2026', stationery: 'rose', font: 'serif',
    }
  ],

  hugs: [],
  dateRequests: [],
  gratitude: [
    { id: 'g1', from: 'Alvin', text: 'Em luôn biết cách làm anh cười dù anh đang buồn.', date: '2026-08-25' },
    { id: 'g2', from: 'Paoi', text: 'Anh luôn ở đó mỗi khi em cần, dù là 2 giờ sáng.', date: '2026-08-24' },
    { id: 'g3', from: 'Alvin', text: 'Cảm ơn em đã kiên nhẫn với anh khi anh khó tính.', date: '2026-08-22' },
  ],
  postReactions: {},
  darkMode: false,
  favPlaces: {
    food: [
      { id: 'fp1', name: 'Bún chả Hương Liên', note: 'Quán quen, ngon mãi không chán' },
      { id: 'fp2', name: 'Phở Thìn', note: 'Phở bò đặc biệt' },
      { id: 'fp3', name: 'Pizza 4Ps', note: 'Date đặc biệt thì đây' },
      { id: 'fp4', name: 'Bún bò Huế gần nhà', note: 'Sáng sớm ngon nhất' },
    ],
    cafe: [
      { id: 'fc1', name: 'The Workshop Coffee', note: 'View đẹp, yên tĩnh học bài' },
      { id: 'fc2', name: 'Felice Café', note: 'Quán đầu tiên hẹn hò 🥰' },
      { id: 'fc3', name: 'Cộng Cà Phê', note: 'Không gian retro' },
      { id: 'fc4', name: 'Koi Thé', note: 'Trà sữa hàng ngày' },
    ],
    bida: [
      { id: 'fb1', name: 'Billiards Club Q1', note: 'Bàn đẹp, máy lạnh mát' },
      { id: 'fb2', name: 'Star Billiard', note: 'Gần nhà' },
    ],
    gaming: [
      { id: 'fg1', name: 'Game Thủ Café', note: 'PC game, nhiều máy' },
      { id: 'fg2', name: 'Nintendo Switch tại nhà', note: 'Mario Kart battle 🏎️' },
      { id: 'fg3', name: 'PlayStation tại nhà', note: 'FIFA, It Takes Two' },
    ],
  },
};
