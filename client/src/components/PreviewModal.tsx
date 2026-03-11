import React, { useEffect, useState } from "react";
import type { PreviewResult, WpCategory } from "../types";
import { previewArticle, publishToWp } from "../services/api";

interface Props {
  url: string;
  categories: WpCategory[];
  suggestedCategoryId?: number;
  onClose: () => void;
  onPublished: (status: string, wpUrl: string) => void;
}

export default function PreviewModal({
  url,
  categories,
  suggestedCategoryId,
  onClose,
  onPublished,
}: Props) {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<number>(suggestedCategoryId || 0);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    previewArticle(url)
      .then((res) => {
        if (cancelled) return;
        setPreview(res);
        if (res.suggestedWpCategoryId && !suggestedCategoryId) {
          setSelectedCatId(res.suggestedWpCategoryId);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [url]);

  const handlePublish = async (status: "draft" | "publish") => {
    if (!preview) return;
    if (!selectedCatId) {
      alert("Please select a WordPress category.");
      return;
    }
    setPublishing(true);
    try {
      const result = await publishToWp({
        url: preview.url,
        title: preview.title,
        contentHtmlClean: preview.contentHtmlClean,
        wpCategoryId: selectedCatId,
        status,
        featuredImageUrl: preview.featuredImageUrl,
      });
      onPublished(result.status, result.wpPostUrl);
    } catch (err) {
      alert(`Publish failed: ${(err as Error).message}`);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Article Preview</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {loading && <div style={styles.center}>Loading preview…</div>}
        {error && <div style={{ ...styles.center, color: "#c00" }}>Error: {error}</div>}

        {preview && !loading && (
          <>
            <div style={styles.meta}>
              <div><strong>Title:</strong> {preview.title}</div>
              <div><strong>Published:</strong> {formatDate(preview.publishedAt)}</div>
              {preview.externalCategories && preview.externalCategories.length > 0 && (
                <div><strong>Kategoritë (burimi):</strong> {preview.externalCategories.join(", ")}</div>
              )}
              <div><strong>URL:</strong>{" "}
                <a href={preview.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>
                  {preview.url}
                </a>
              </div>
              {preview.featuredImageUrl && (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={preview.featuredImageUrl}
                    alt="Featured"
                    style={{ maxWidth: 200, maxHeight: 120, borderRadius: 4, objectFit: "cover" }}
                  />
                </div>
              )}
            </div>

            <div style={styles.catRow}>
              <label><strong>WP Category:</strong></label>
              <select
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(Number(e.target.value))}
                style={styles.select}
              >
                <option value={0}>— Select category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div
              style={styles.content}
              dangerouslySetInnerHTML={{ __html: preview.contentHtmlClean }}
            />

            <div style={styles.actions}>
              <button
                onClick={() => handlePublish("draft")}
                disabled={publishing}
                style={{ ...styles.btn, ...styles.btnDraft }}
              >
                {publishing ? "Saving…" : "Save Draft"}
              </button>
              <button
                onClick={() => handlePublish("publish")}
                disabled={publishing}
                style={{ ...styles.btn, ...styles.btnPublish }}
              >
                {publishing ? "Publishing…" : "Publish"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "N/A";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: 20,
  },
  modal: {
    background: "#fff", borderRadius: 10,
    width: "100%", maxWidth: 800, maxHeight: "90vh",
    overflow: "auto", boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
    display: "flex", flexDirection: "column",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 20px", borderBottom: "1px solid #eee", position: "sticky",
    top: 0, background: "#fff", zIndex: 1,
  },
  closeBtn: {
    background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#666",
  },
  meta: {
    padding: "16px 20px", fontSize: 14, lineHeight: 1.6,
    borderBottom: "1px solid #f0f0f0", background: "#fafafa",
  },
  catRow: {
    padding: "12px 20px", display: "flex", alignItems: "center", gap: 12,
    borderBottom: "1px solid #f0f0f0",
  },
  select: {
    flex: 1, padding: "6px 10px", borderRadius: 4, border: "1px solid #ccc", fontSize: 14,
  },
  content: {
    padding: "20px", fontSize: 15, lineHeight: 1.7, flex: 1, overflow: "auto",
  },
  actions: {
    display: "flex", gap: 12, padding: "16px 20px",
    borderTop: "1px solid #eee", justifyContent: "flex-end",
    position: "sticky", bottom: 0, background: "#fff",
  },
  btn: {
    padding: "8px 20px", borderRadius: 6, border: "none",
    fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  btnDraft: { background: "#e0e7ff", color: "#3730a3" },
  btnPublish: { background: "#059669", color: "#fff" },
  center: { padding: 40, textAlign: "center" as const },
};
