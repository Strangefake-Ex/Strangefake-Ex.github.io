import { beforeEach, describe, expect, test } from 'vitest'

import { createLocalPostRepository } from './postRepository'

describe('createLocalPostRepository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('createPost persists and can be listed by room', async () => {
    const repo = createLocalPostRepository()

    const created = await repo.createPost('room-1', {
      authorId: 'u1',
      authorLabel: 'Anonymous Knight',
      content: 'I think the barrier is not ideas, but timing and confidence.',
    })

    expect(created.roomId).toBe('room-1')
    expect(created.likes).toBe(0)

    const posts = await repo.listPosts('room-1')
    expect(posts).toHaveLength(1)
    expect(posts[0]).toEqual(created)
  })

  test('likePost increases likes count', async () => {
    const repo = createLocalPostRepository()

    const created = await repo.createPost('room-2', {
      authorId: 'u1',
      authorLabel: 'u1',
      content: 'First post',
    })

    await repo.likePost(created.id)
    await repo.likePost(created.id)

    const posts = await repo.listPosts('room-2')
    expect(posts[0]?.likes).toBe(2)
  })
})

