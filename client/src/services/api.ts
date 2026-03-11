import type {
  SitemapItem,
  PreviewResult,
  WpCategory,
  PublishResponse,
  AppConfig,
} from "../types";

const BASE = "/api";

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data as T;
}

export async function getConfig(): Promise<AppConfig> {
  return request<AppConfig>("/config");
}

export async function syncToday(sourceIds?: string[]): Promise<SitemapItem[]> {
  const data = await request<{ items: SitemapItem[] }>("/sync-today", {
    method: "POST",
    body: JSON.stringify({ sourceIds }),
  });
  return data.items;
}

export async function previewArticle(url: string): Promise<PreviewResult> {
  return request<PreviewResult>("/preview", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function getWpCategories(refresh = false): Promise<WpCategory[]> {
  const data = await request<{ categories: WpCategory[] }>(
    `/wp/categories${refresh ? "?refresh=true" : ""}`
  );
  return data.categories;
}

export async function publishToWp(payload: {
  url: string;
  title: string;
  contentHtmlClean: string;
  wpCategoryId: number;
  status: "draft" | "publish";
  featuredImageUrl?: string;
}): Promise<PublishResponse> {
  return request<PublishResponse>("/wp/publish", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
