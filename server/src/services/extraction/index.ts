/**
 * Extraction Service Index
 *
 * Combines metadata and content extraction into a unified interface.
 */

export {
  extractMetadata,
  extractTitle,
  extractPublishedAt,
  extractCategories,
  extractFeaturedImage,
  parseDate,
  isToday,
} from './metadata';

export {
  extractContent,
  isValidContent,
} from './content';
