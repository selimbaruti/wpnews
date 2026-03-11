export interface SourceInfo {
  id: string;
  name: string;
  sitemapUrl: string;
  lastNSitemaps: number;
}

export interface SitemapItem {
  id: string;
  url: string;
  sourceId: string;
  sourceName: string;
  sitemapLastmod?: string;
  publishedAt: string;
  title?: string;
  externalCategories?: string[];
}

export interface PreviewResult {
  url: string;
  title: string;
  publishedAt: string;
  externalCategories?: string[];
  contentHtmlClean: string;
  featuredImageUrl?: string;
  suggestedWpCategoryId?: number;
}

export interface WpCategory {
  id: number;
  name: string;
  slug: string;
}

export interface PublishResponse {
  wpPostId: number;
  wpPostUrl: string;
  status: string;
}

export interface AppConfig {
  sources: SourceInfo[];
  timezone: string;
  wpConfigured: boolean;
}
