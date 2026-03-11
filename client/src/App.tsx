import React, { useEffect, useState, useCallback } from "react";
import type { SitemapItem, WpCategory, AppConfig, SourceInfo } from "./types";
import {
  getConfig,
  syncToday,
  getWpCategories,
  publishToWp,
} from "./services/api";
import PreviewModal from "./components/PreviewModal";

export default function App() {
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [items, setItems] = useState<SitemapItem[]>([]);
  const [categories, setCategories] = useState<WpCategory[]>([]);

  // Source selection
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [filterSource, setFilterSource] = useState<string>("all");

  // UI state
  const [syncing, setSyncing] = useState(false);
  const [loadingCats, setLoadingCats] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [publishedMap, setPublishedMap] = useState<Record<string, { status: string; wpUrl: string }>>({});
  const [error, setError] = useState("");

  // Init
  useEffect(() => {
    getConfig()
      .then((cfg) => {
        setAppConfig(cfg);
        // Select all sources by default
        setSelectedSources(new Set(cfg.sources.map((s) => s.id)));
      })
      .catch((e) => setError(e.message));

    loadCategories(false);
  }, []);

  const loadCategories = useCallback(async (refresh: boolean) => {
    setLoadingCats(true);
    try {
      const cats = await getWpCategories(refresh);
      setCategories(cats);
    } catch (e) {
      console.warn("Failed to load categories:", e);
    } finally {
      setLoadingCats(false);
    }
  }, []);

  const toggleSource = (id: string) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSync = async () => {
    if (selectedSources.size === 0) {
      setError("Zgjidh të paktën një burim.");
      return;
    }
    setSyncing(true);
    setError("");
    setItems([]);
    try {
      const results = await syncToday([...selectedSources]);
      setItems(results);
      if (results.length === 0) {
        setError("Nuk u gjetën artikuj për sot.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  const handlePublished = (status: string, wpUrl: string) => {
    if (previewUrl) {
      setPublishedMap((p) => ({ ...p, [previewUrl]: { status, wpUrl } }));
    }
    setPreviewUrl(null);
  };

  // Filter items by selected source tab
  const filteredItems =
    filterSource === "all"
      ? items
      : items.filter((i) => i.sourceId === filterSource);

  // Count per source
  const sourceCounts: Record<string, number> = {};
  for (const item of items) {
    sourceCounts[item.sourceId] = (sourceCounts[item.sourceId] || 0) + 1;
  }

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>📰 WP News Importer</h1>
        {appConfig && (
          <span style={styles.tz}>🕐 {appConfig.timezone}</span>
        )}
      </header>

      {/* Sources Panel */}
      <section style={styles.card}>
        <h3 style={styles.cardTitle}>Burimet e Lajmeve</h3>
        <div style={styles.sourcesGrid}>
          {appConfig?.sources.map((s) => (
            <label key={s.id} style={styles.sourceLabel}>
              <input
                type="checkbox"
                checked={selectedSources.has(s.id)}
                onChange={() => toggleSource(s.id)}
              />
              <span style={styles.sourceName}>{s.name}</span>
              <span style={styles.sourceUrl}>{s.sitemapUrl}</span>
              <span style={styles.sourceInfo}>
                (last {s.lastNSitemaps} sitemaps)
              </span>
            </label>
          ))}
        </div>

        <div style={styles.settingsRow}>
          <button
            onClick={handleSync}
            disabled={syncing || selectedSources.size === 0}
            style={{
              ...styles.btn,
              ...styles.btnPrimary,
              opacity: syncing ? 0.7 : 1,
            }}
          >
            {syncing ? "⏳ Po sinkronizoj…" : "🔄 Sinkronizo Sot"}
          </button>
          <button
            onClick={() => loadCategories(true)}
            disabled={loadingCats}
            style={{ ...styles.btn, ...styles.btnSecondary }}
          >
            {loadingCats ? "Po ngarkoj…" : "🔃 Rifresko Kategorite WP"}
          </button>
          {categories.length > 0 && (
            <span style={{ fontSize: 13, color: "#666" }}>
              {categories.length} kategori
            </span>
          )}
          {appConfig && !appConfig.wpConfigured && (
            <span style={{ fontSize: 13, color: "#c00" }}>
              ⚠ WP kredencialet nuk janë konfiguruar në .env
            </span>
          )}
        </div>
      </section>

      {/* Error */}
      {error && <div style={styles.error}>{error}</div>}

      {/* Results */}
      {items.length > 0 && (
        <section style={styles.card}>
          {/* Source filter tabs */}
          <div style={styles.tabRow}>
            <button
              onClick={() => setFilterSource("all")}
              style={{
                ...styles.tab,
                ...(filterSource === "all" ? styles.tabActive : {}),
              }}
            >
              Të gjitha ({items.length})
            </button>
            {appConfig?.sources
              .filter((s) => sourceCounts[s.id])
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => setFilterSource(s.id)}
                  style={{
                    ...styles.tab,
                    ...(filterSource === s.id ? styles.tabActive : {}),
                  }}
                >
                  {s.name} ({sourceCounts[s.id] || 0})
                </button>
              ))}
          </div>

          {/* Table */}
          <div style={styles.table}>
            <div style={{ ...styles.tableRow, ...styles.tableHeader }}>
              <div style={{ flex: 0.8 }}>Burimi</div>
              <div style={{ flex: 3 }}>Titulli</div>
              <div style={{ flex: 1 }}>Kategoria</div>
              <div style={{ flex: 1.2 }}>Publikuar</div>
              <div style={{ flex: 1.8, textAlign: "right" }}>Veprime</div>
            </div>
            {filteredItems.map((item) => {
              const pub = publishedMap[item.url];
              return (
                <div key={item.id} style={styles.tableRow}>
                  <div style={{ flex: 0.8 }}>
                    <span style={{
                      ...styles.sourceBadge,
                      background: item.sourceId === "balkanweb" ? "#fef3c7" :
                                  item.sourceId === "topchannel" ? "#dbeafe" : "#f3f4f6",
                      color: item.sourceId === "balkanweb" ? "#92400e" :
                             item.sourceId === "topchannel" ? "#1e40af" : "#374151",
                    }}>
                      {item.sourceName}
                    </span>
                  </div>
                  <div style={{ flex: 3, minWidth: 0 }}>
                    <div style={styles.itemTitle}>{item.title || "Pa titull"}</div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.itemUrl}
                    >
                      {item.url}
                    </a>
                  </div>
                  <div style={{ flex: 1 }}>
                    {item.externalCategories && item.externalCategories.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {item.externalCategories.map((cat, idx) => (
                          <span key={idx} style={styles.badge}>{cat}</span>
                        ))}
                      </div>
                    ) : (
                      <span style={styles.badge}>—</span>
                    )}
                  </div>
                  <div style={{ flex: 1.2, fontSize: 13, color: "#555" }}>
                    {formatDate(item.publishedAt)}
                  </div>
                  <div
                    style={{
                      flex: 1.8,
                      display: "flex",
                      gap: 6,
                      justifyContent: "flex-end",
                      flexWrap: "wrap",
                    }}
                  >
                    {pub ? (
                      <a
                        href={pub.wpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          ...styles.btnSmall,
                          background: pub.status === "publish" ? "#d1fae5" : "#dbeafe",
                          color: pub.status === "publish" ? "#065f46" : "#1e40af",
                          textDecoration: "none",
                        }}
                      >
                        ✓ {pub.status === "publish" ? "Publikuar" : "Draft"}
                      </a>
                    ) : (
                      <button
                        onClick={() => setPreviewUrl(item.url)}
                        style={{ ...styles.btnSmall, background: "#2563eb", color: "#fff" }}
                      >
                        👁 Hap & Publiko
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <PreviewModal
          url={previewUrl}
          categories={categories}
          onClose={() => setPreviewUrl(null)}
          onPublished={handlePublished}
        />
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "N/A";
  try {
    return new Date(iso).toLocaleString("sq-AL", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return iso;
  }
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    maxWidth: 1200,
    margin: "0 auto",
    padding: "20px",
    color: "#1a1a1a",
    background: "#f9fafb",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: "2px solid #e5e7eb",
  },
  title: { fontSize: 24, margin: 0 },
  tz: {
    fontSize: 13,
    color: "#666",
    background: "#f3f4f6",
    padding: "4px 10px",
    borderRadius: 4,
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  cardTitle: { margin: "0 0 16px 0", fontSize: 16, color: "#374151" },
  sourcesGrid: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    marginBottom: 16,
  },
  sourceLabel: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    background: "#f9fafb",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    cursor: "pointer",
    fontSize: 14,
  },
  sourceName: { fontWeight: 700, minWidth: 120 },
  sourceUrl: { color: "#6b7280", fontSize: 12, flex: 1, wordBreak: "break-all" as const },
  sourceInfo: { fontSize: 11, color: "#9ca3af" },
  settingsRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap" as const,
  },
  btn: {
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  btnPrimary: { background: "#2563eb", color: "#fff" },
  btnSecondary: { background: "#f3f4f6", color: "#374151" },
  btnSmall: {
    padding: "5px 12px",
    borderRadius: 5,
    border: "none",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  error: {
    background: "#fef2f2",
    color: "#991b1b",
    padding: "12px 16px",
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  tabRow: {
    display: "flex",
    gap: 4,
    marginBottom: 16,
    borderBottom: "2px solid #e5e7eb",
    paddingBottom: 0,
  },
  tab: {
    padding: "8px 16px",
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    marginBottom: -2,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    color: "#6b7280",
  },
  tabActive: {
    color: "#2563eb",
    borderBottomColor: "#2563eb",
  },
  table: { overflow: "auto" },
  tableRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 0",
    borderBottom: "1px solid #f3f4f6",
  },
  tableHeader: {
    fontWeight: 700,
    fontSize: 11,
    color: "#6b7280",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    borderBottom: "2px solid #e5e7eb",
    paddingBottom: 8,
  },
  sourceBadge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  itemTitle: { fontWeight: 600, fontSize: 14, marginBottom: 2 },
  itemUrl: { fontSize: 11, color: "#6b7280", wordBreak: "break-all" as const },
  badge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 4,
    background: "#f3f4f6",
    fontSize: 12,
    color: "#4b5563",
  },
};
