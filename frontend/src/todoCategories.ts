// Shared between screens/Us.tsx's TodoScreen and components/forms/AddTodoForm.tsx
// (the bottom navbar's quick-add). Kept in its own tiny module rather than
// exported from Us.tsx — Us.tsx is lazy-loaded as its own chunk (see
// App.tsx), and a static import from the (eagerly-loaded) quick-add form
// would have pulled the whole screen into the main bundle.
export const TODO_CATEGORIES = [
  { key: 'work', emoji: '💼', label: 'Work' },
  { key: 'gym', emoji: '🏋️', label: 'Gym' },
  { key: 'home', emoji: '🏠', label: 'Home' },
  { key: 'errands', emoji: '🛒', label: 'Errands' },
  { key: 'health', emoji: '💊', label: 'Health' },
  { key: 'other', emoji: '📌', label: 'Other' },
];

export function categoryMeta(key: string) {
  return TODO_CATEGORIES.find(c => c.key === key) ?? TODO_CATEGORIES[TODO_CATEGORIES.length - 1];
}
