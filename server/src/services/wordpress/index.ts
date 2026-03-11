/**
 * WordPress Service Index
 *
 * Exports all WordPress-related functionality.
 */

export { getWpClient, resetWpClient } from './client';
export { isWpConfigured } from './client';
export { getCategories, getCategoryById, suggestCategory, clearCategoryCache } from './categories';
export { uploadImage } from './media';
export { publishPost, updatePost, findPostByUrl } from './posts';
