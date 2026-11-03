// "Open the comment box as soon as this post's detail screen is showing."
// The feed's comment button sets it just before navigating; PostDetail
// consumes it once, so later plain visits to the same post don't pop the keyboard.
let pendingPostId: string | null = null;

export function requestCommentFocus(postId: string) { pendingPostId = postId; }

export function hasPendingCommentFocus(postId: string): boolean { return pendingPostId === postId; }

export function consumeCommentFocus(postId: string): boolean {
  if (pendingPostId !== postId) return false;
  pendingPostId = null;
  return true;
}
