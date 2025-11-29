'use server';

import prisma from '@/lib/db';
import { GeneratedPost } from './generator';

export async function savePost(data: GeneratedPost) {
  try {
    // Validate basics
    if (!data.topic || !data.title || !data.sideA || !data.sideB) {
      return { success: false, message: 'Missing required fields' };
    }

    // Save to DB
    const post = await prisma.post.create({
      data: {
        topic: data.topic,
        title: data.title,
        description: data.description,
        sideA: data.sideA,
        sideB: data.sideB,
        voteCountA: data.voteCountA,
        voteCountB: data.voteCountB,
        // Stringify comments for SQLite compatibility as per schema decision
        comments: JSON.stringify(data.comments),
      },
    });

    return { success: true, postId: post.id };
  } catch (error) {
    console.error('Failed to save post:', error);
    return { success: false, message: 'Database error' };
  }
}
