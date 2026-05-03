import { getJson, setJson } from '@/lib/localStore'
import { POSTS_INDEX_KEY, ROOMS_KEY, SEEDED_ACTIVITY_KEY, postsKey } from '@/lib/storageKeys'

export type PostId = string
export type RoomId = string

export type Post = {
  id: PostId
  roomId: RoomId
  authorId: string
  authorLabel: string
  content: string
  createdAt: number
  likes: number
  replyToPostId?: string
}

export type CreatePostInput = {
  authorId: string
  authorLabel: string
  content: string
  replyToPostId?: string
}

export type PostRepository = {
  listPosts: (roomId: RoomId) => Promise<Post[]>
  createPost: (roomId: RoomId, input: CreatePostInput) => Promise<Post>
  likePost: (postId: PostId) => Promise<void>
}

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function createId(): string {
  const maybeCrypto = globalThis.crypto as undefined | { randomUUID?: () => string }
  if (maybeCrypto?.randomUUID) return maybeCrypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function ensureSeedDemoActivity(storage: Storage) {
  const seeded = storage.getItem(SEEDED_ACTIVITY_KEY) === '1'
  const hasIndex = !!storage.getItem(POSTS_INDEX_KEY)
  if (seeded || hasIndex) return

  const hasRooms = !!storage.getItem(ROOMS_KEY)
  if (!hasRooms) return

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const minute = 60 * 1000

  const demo: Array<{
    roomId: RoomId
    authorLabel: string
    authorId: string
    content: string
    likes: number
    createdAt: number
  }> = [
    { roomId: '1', authorLabel: 'Sir Rowan', authorId: 'rowan', content: 'An idea feels safe when critique targets claims, not people.', likes: 3, createdAt: now - 1 * day - 22 * minute },
    { roomId: '1', authorLabel: 'Lady Nyx', authorId: 'nyx', content: 'I share sooner when the room rewards partial thoughts and questions.', likes: 2, createdAt: now - 3 * day - 14 * minute },
    { roomId: '2', authorLabel: 'Anonymous Knight', authorId: 'anon', content: 'Assistance becomes replacement when the student can no longer explain the work.', likes: 4, createdAt: now - 2 * day - 41 * minute },
    { roomId: '2', authorLabel: 'Sir Aldric', authorId: 'aldric', content: 'We need disclosure norms: what was assisted, and how.', likes: 1, createdAt: now - 9 * day - 5 * minute },
    { roomId: '3', authorLabel: 'Mara', authorId: 'mara', content: 'Echo chambers shrink when we model charitable reading before rebuttal.', likes: 2, createdAt: now - 6 * day - 31 * minute },
    { roomId: '4', authorLabel: 'Jun', authorId: 'jun', content: 'Scaffolds: sentence starters, wait-time, and low-stakes rehearsal in pairs.', likes: 5, createdAt: now - 4 * day - 9 * minute },
    { roomId: '4', authorLabel: 'Elliot', authorId: 'elliot', content: 'Posting drafts privately first lowers the fear of public error.', likes: 2, createdAt: now - 12 * day - 50 * minute },
    { roomId: '6', authorLabel: 'Sir Rowan', authorId: 'rowan', content: 'Disagreement lands better with shared definitions and a stated steelman.', likes: 3, createdAt: now - 16 * day - 20 * minute },
    { roomId: '6', authorLabel: 'Lady Nyx', authorId: 'nyx', content: 'A single well-aimed question can invite nuance without escalating tone.', likes: 1, createdAt: now - 24 * day - 12 * minute },
  ]

  const index: Record<string, RoomId> = {}
  const byRoom = new Map<RoomId, Post[]>()
  for (let i = 0; i < demo.length; i++) {
    const x = demo[i]!
    const id = `demo-${x.roomId}-${i}`
    const post: Post = {
      id,
      roomId: x.roomId,
      authorId: x.authorId,
      authorLabel: x.authorLabel,
      content: x.content,
      createdAt: x.createdAt,
      likes: x.likes,
    }
    index[id] = x.roomId
    byRoom.set(x.roomId, [...(byRoom.get(x.roomId) ?? []), post])
  }

  for (const [roomId, posts] of byRoom.entries()) {
    if (storage === localStorage) setJson(postsKey(roomId), posts)
    else storage.setItem(postsKey(roomId), JSON.stringify(posts))
  }
  if (storage === localStorage) setJson(POSTS_INDEX_KEY, index)
  else storage.setItem(POSTS_INDEX_KEY, JSON.stringify(index))
  storage.setItem(SEEDED_ACTIVITY_KEY, '1')
}

export function createLocalPostRepository(storage: Storage = localStorage, options?: { seedDemo?: boolean }): PostRepository {
  const seedDemo = options?.seedDemo ?? false
  if (seedDemo) ensureSeedDemoActivity(storage)
  return {
    async listPosts(roomId) {
      const posts =
        storage === localStorage ? getJson<Post[]>(postsKey(roomId)) ?? [] : safeParseJson<Post[]>(storage.getItem(postsKey(roomId))) ?? []
      return [...posts].sort((a, b) => b.createdAt - a.createdAt)
    },
    async createPost(roomId, input) {
      const existing =
        storage === localStorage ? getJson<Post[]>(postsKey(roomId)) ?? [] : safeParseJson<Post[]>(storage.getItem(postsKey(roomId))) ?? []
      const post: Post = {
        id: createId(),
        roomId,
        authorId: input.authorId,
        authorLabel: input.authorLabel,
        content: input.content,
        replyToPostId: input.replyToPostId,
        createdAt: Date.now(),
        likes: 0,
      }

      const next = [post, ...existing]
      if (storage === localStorage) setJson(postsKey(roomId), next)
      else storage.setItem(postsKey(roomId), JSON.stringify(next))

      const index =
        storage === localStorage ? getJson<Record<string, RoomId>>(POSTS_INDEX_KEY) ?? {} : safeParseJson<Record<string, RoomId>>(storage.getItem(POSTS_INDEX_KEY)) ?? {}
      index[post.id] = roomId
      if (storage === localStorage) setJson(POSTS_INDEX_KEY, index)
      else storage.setItem(POSTS_INDEX_KEY, JSON.stringify(index))

      return post
    },
    async likePost(postId) {
      const index =
        storage === localStorage ? getJson<Record<string, RoomId>>(POSTS_INDEX_KEY) ?? {} : safeParseJson<Record<string, RoomId>>(storage.getItem(POSTS_INDEX_KEY)) ?? {}
      const roomId = index[postId]
      if (!roomId) return

      const key = postsKey(roomId)
      const posts = storage === localStorage ? getJson<Post[]>(key) ?? [] : safeParseJson<Post[]>(storage.getItem(key)) ?? []
      const nextPosts = posts.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p))
      if (storage === localStorage) setJson(key, nextPosts)
      else storage.setItem(key, JSON.stringify(nextPosts))
    },
  }
}
