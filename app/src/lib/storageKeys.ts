export const AUTH_SESSION_KEY = 'rt:auth:session:v1'
export const AUTH_USERS_KEY = 'rt:auth:users:v1'
export const ROOMS_KEY = 'rt:rooms'
export const SEEDED_ROOMS_KEY = 'rt:seeded:v1'
export const SEEDED_ACTIVITY_KEY = 'rt:seeded:activity:v1'
export const POSTS_INDEX_KEY = 'rt:posts:index'

export function facRulesKey(roomId: string) {
  return `rt:fac:rules:${roomId}`
}

export function facControlKey(roomId: string) {
  return `rt:fac:control:${roomId}`
}

export function facPollVotesKey(roomId: string, pollId: string) {
  return `rt:fac:pollVotes:${roomId}:${pollId}`
}

export function facEventsKey(roomId: string) {
  return `rt:fac:events:${roomId}`
}

export function draftsKey(roomId: string) {
  return `rt:drafts:${roomId}`
}

export function seatsKey(roomId: string) {
  return `rt:seat:${roomId}`
}

export function sessionKey(roomId: string) {
  return `rt:session:${roomId}`
}

export function postsKey(roomId: string) {
  return `rt:posts:${roomId}`
}
