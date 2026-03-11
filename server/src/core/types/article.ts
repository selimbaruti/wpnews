/**
 * Article Types - Interfaces for article content extraction
 */

/**
 * Extracted metadata from an article page.
 */
export interface ArticleMetadata {
  /** Article title */
  readonly title: string;
  /** Publication date (ISO string) */
  readonly publishedAt: string;
  /** Author name(s) */
  readonly authors?: readonly string[];
  /** Categories from the source */
  readonly categories: readonly string[];
  /** Featured image URL */
  readonly featuredImageUrl?: string;
  /** Article excerpt/description */
  readonly excerpt?: string;
}

/**
 * Full preview result for an article.
 * Includes both metadata and sanitized content.
 */
export interface PreviewResult {
  /** Original article URL */
  readonly url: string;
  /** Article title */
  readonly title: string;
  /** Publication date (ISO string) */
  readonly publishedAt: string;
  /** Categories from the source */
  readonly externalCategories?: readonly string[];
  /** Single external category (first one, for backwards compatibility) */
  readonly externalCategory?: string;
  /** Sanitized HTML content */
  readonly contentHtmlClean: string;
  /** Featured image URL */
  readonly featuredImageUrl?: string;
  /** Suggested WordPress category ID (if matched) */
  readonly suggestedWpCategoryId?: number;
}

/**
 * Request to publish an article to WordPress.
 */
export interface PublishRequest {
  /** Original article URL (for reference) */
  readonly url: string;
  /** Article title */
  readonly title: string;
  /** Sanitized HTML content */
  readonly contentHtmlClean: string;
  /** WordPress category ID */
  readonly wpCategoryId: number;
  /** Post status */
  readonly status: 'draft' | 'publish';
  /** Featured image URL to upload */
  readonly featuredImageUrl?: string;
}

/**
 * Response after publishing to WordPress.
 */
export interface PublishResponse {
  /** WordPress post ID */
  readonly wpPostId: number;
  /** URL to the published post */
  readonly wpPostUrl: string;
  /** Final post status */
  readonly status: string;
}
