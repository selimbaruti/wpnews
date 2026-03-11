/**
 * WordPress Media Service
 *
 * Handles image uploads to WordPress media library.
 */

import axios from 'axios';
import { getWpClient } from './client';
import { WORDPRESS, HTTP } from '../../core/constants';
import { createLogger } from '../../utils/logger';

const log = createLogger('wordpress:media');

/**
 * Upload an image from URL to WordPress media library.
 *
 * @returns Media ID or null if upload failed
 */
export async function uploadImage(
  imageUrl: string,
  title: string
): Promise<number | null> {
  try {
    log.debug('Downloading image', { url: imageUrl });

    // Download image
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: WORDPRESS.MEDIA_TIMEOUT,
      headers: {
        'User-Agent': HTTP.USER_AGENT,
      },
    });

    const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
    const extension = getExtensionFromContentType(contentType);
    const slug = slugify(title) || 'image';
    const filename = `${slug}-${Date.now()}.${extension}`;

    log.debug('Uploading to WordPress', { filename, contentType });

    // Upload to WordPress
    const client = getWpClient();
    const uploadResponse = await client.post('/media', imageResponse.data, {
      timeout: WORDPRESS.MEDIA_TIMEOUT,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

    const mediaId = uploadResponse.data.id;

    // Update alt text (best effort)
    try {
      await client.post(`/media/${mediaId}`, {
        alt_text: title,
      });
    } catch {
      // Ignore alt text update errors
    }

    log.info('Image uploaded successfully', { mediaId, filename });
    return mediaId;
  } catch (err) {
    log.warn('Image upload failed', {
      url: imageUrl,
      error: (err as Error).message,
    });
    return null;
  }
}

/**
 * Get file extension from content type.
 */
function getExtensionFromContentType(contentType: string): string {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  if (contentType.includes('svg')) return 'svg';
  return 'jpg';
}

/**
 * Convert text to URL-friendly slug.
 */
function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .substring(0, 80); // Limit length
}
