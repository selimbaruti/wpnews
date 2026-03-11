/**
 * WordPress Posts Service
 *
 * Handles post creation and publishing.
 */

import type { PublishRequest, PublishResponse, WpPostData } from '../../core/types';
import { getWpClient } from './client';
import { uploadImage } from './media';
import { createLogger } from '../../utils/logger';

const log = createLogger('wordpress:posts');

/**
 * Create or publish a post to WordPress.
 */
export async function publishPost(request: PublishRequest): Promise<PublishResponse> {
  log.info('Publishing post', {
    title: request.title,
    status: request.status,
    categoryId: request.wpCategoryId,
  });

  const postData: WpPostData = {
    title: request.title,
    content: request.contentHtmlClean,
    status: request.status,
    categories: [request.wpCategoryId],
  };

  // Upload featured image if provided
  let featuredMediaId: number | undefined;
  if (request.featuredImageUrl) {
    const mediaId = await uploadImage(request.featuredImageUrl, request.title);
    if (mediaId) {
      featuredMediaId = mediaId;
    }
  }

  // Create post
  const client = getWpClient();
  const response = await client.post('/posts', {
    ...postData,
    ...(featuredMediaId && { featured_media: featuredMediaId }),
  });

  const result: PublishResponse = {
    wpPostId: response.data.id,
    wpPostUrl: response.data.link,
    status: response.data.status,
  };

  log.info('Post published successfully', {
    postId: result.wpPostId,
    url: result.wpPostUrl,
    status: result.status,
  });

  return result;
}

/**
 * Update an existing post.
 */
export async function updatePost(
  postId: number,
  data: Partial<WpPostData>
): Promise<void> {
  log.info('Updating post', { postId, fields: Object.keys(data) });

  const client = getWpClient();
  await client.put(`/posts/${postId}`, data);

  log.info('Post updated successfully', { postId });
}

/**
 * Check if a post exists by URL.
 */
export async function findPostByUrl(url: string): Promise<number | null> {
  try {
    const client = getWpClient();
    const response = await client.get('/posts', {
      params: {
        search: url,
        per_page: 1,
      },
    });

    if (response.data.length > 0) {
      return response.data[0].id;
    }

    return null;
  } catch {
    return null;
  }
}
