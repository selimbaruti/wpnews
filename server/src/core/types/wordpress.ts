/**
 * WordPress Types - Interfaces for WordPress API interactions
 */

/**
 * WordPress category.
 */
export interface WpCategory {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly parent?: number;
  readonly count?: number;
}

/**
 * WordPress media item.
 */
export interface WpMedia {
  readonly id: number;
  readonly url: string;
  readonly title: string;
  readonly altText?: string;
}

/**
 * WordPress post data for creation.
 */
export interface WpPostData {
  readonly title: string;
  readonly content: string;
  readonly status: 'draft' | 'publish' | 'pending' | 'private';
  readonly categories: readonly number[];
  readonly featured_media?: number;
  readonly tags?: readonly number[];
  readonly excerpt?: string;
}

/**
 * WordPress API response for a post.
 */
export interface WpPostResponse {
  readonly id: number;
  readonly link: string;
  readonly status: string;
  readonly title: { readonly rendered: string };
}

/**
 * WordPress configuration.
 */
export interface WpConfig {
  readonly baseUrl: string;
  readonly username: string;
  readonly appPassword: string;
}

/**
 * App configuration sent to frontend.
 */
export interface AppConfig {
  readonly sources: readonly import('./source').SourceInfo[];
  readonly timezone: string;
  readonly wpConfigured: boolean;
}
