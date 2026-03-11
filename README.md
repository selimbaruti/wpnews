# WP News Importer

Importo lajmet e sotme nga shumë burime (sitemap) në WordPress. Artikujt renditen nga më i riu, me preview, draft, dhe publish.

## Arkitektura e Re (v2)

Kodi është ristrukturuar me një arkitekturë profesionale dhe të zgjerueshme:

```
server/src/
├── config/              # Konfigurimi i aplikacionit
├── core/
│   ├── types/           # Tipet TypeScript (centralizuar)
│   ├── errors/          # Error classes të personalizuara
│   └── constants.ts     # Konstantet e aplikacionit
├── sources/
│   ├── definitions/     # ⭐ SHTO BURIME TË REJA KËTU!
│   │   ├── balkanweb.ts
│   │   ├── topchannel.ts
│   │   ├── _template.ts # Template për burime të reja
│   │   └── index.ts
│   ├── registry.ts      # Regjistrimi i burimeve
│   └── index.ts
├── services/
│   ├── extraction/      # Ekstraktimi i përmbajtjes & metadata
│   ├── sitemap/         # Parsing i sitemaps
│   ├── preview/         # Preview artikulli
│   └── wordpress/       # Integrimi me WordPress API
├── utils/               # Funksione ndihmëse
├── routes/              # API routes
└── index.ts             # Entry point
```

## Burimet e Para-konfiguruara

| Burimi | Sitemap | lastNSitemaps |
|--------|---------|---------------|
| **Balkanweb** | `https://www.balkanweb.com/wp-sitemap.xml` | 1 |
| **Top Channel** | `https://top-channel.tv/sitemap.xml` | 1 |

## Quick Start

### 1. Konfiguro

```bash
cd server
cp .env.example .env
# Plotëso: WP_BASE_URL, WP_USERNAME, WP_APP_PASSWORD
```

### 2. WordPress Application Password

WP Admin → Users → Profile → Application Passwords → "Add New" → kopjo në `.env`.

### 3. Nis

```bash
# Terminal 1
cd server && npm install && npm run dev

# Terminal 2
cd client && npm install && npm run dev
```

Hap `http://localhost:5173`.

### 4. Përdor

1. Zgjidh burimet (checkbox) — Balkanweb, Top Channel, ose të dyja
2. Kliko **Sinkronizo Sot**
3. Filtro sipas burimit me tab-et
4. Kliko **Hap & Publiko** → shiko content-in e pastër, zgjidh kategorinë WP, publiko ose ruaj si draft

---

## 🚀 Si të Shtosh një Burim të Ri

### Hapi 1: Krijo skedarin e konfigurimit

Kopjo template-in dhe personalizoje:

```bash
cp server/src/sources/definitions/_template.ts server/src/sources/definitions/gazeta-express.ts
```

Edito skedarin:

```typescript
import type { SourceConfig } from '../../core/types';

export const gazetaExpressSource: SourceConfig = {
  id: 'gazeta-express',
  name: 'Gazeta Express',
  sitemapUrl: 'https://www.gazetaexpress.com/sitemap.xml',
  allowedDomains: ['gazetaexpress.com', 'www.gazetaexpress.com'],
  lastNSitemaps: 1,
  reverseUrlOrder: true,
  selectors: {
    content: 'article .entry-content, .post-content',
    title: 'h1.entry-title, article h1',
    category: '.category a, .breadcrumb a',
  },
};
```

### Hapi 2: Regjistroje burimin

Shto në `server/src/sources/definitions/index.ts`:

```typescript
import { gazetaExpressSource } from './gazeta-express';

export const sourceDefinitions: readonly SourceConfig[] = [
  balkanwebSource,
  topChannelSource,
  gazetaExpressSource,  // ← Shto këtu
];
```

**Kaq!** Burimi do të shfaqet automatikisht në UI.

---

## Si të Gjesh CSS Selectors

Përdor DevTools të browser-it:

1. Hap një artikull nga burimi i ri
2. Kliko djathtas mbi elementin që do (titulli, përmbajtja, kategoria)
3. Kliko "Inspect"
4. Gjej një CSS selector unik për atë element

**Tips:**
- **Content:** Kërko `article`, `.post-content`, `.entry-content`
- **Title:** Zakonisht `h1` ose `.article-title`
- **Category:** Shiko breadcrumbs ose tag links

---

## Si Funksionon Optimizimi i Sitemaps

**Problemi:** Top Channel ka ~600 child sitemaps, Balkanweb ~300. Lajmet e sotme janë në **sitemap-in e fundit**.

**Zgjidhja:** `lastNSitemaps` — fetch-on vetëm N sitemap-et e fundit:

```
top-channel.tv/sitemap.xml (index me 600 fëmijë)
  ├── post-sitemap.xml        ← SKIP
  ├── post-sitemap2.xml       ← SKIP
  ├── ...                     ← SKIP (598 të tjera)
  └── post-sitemap600.xml     ← FETCH (lajmet e sotme)
```

Brenda çdo child sitemap, URL-të renditen vjetra → e reja. `reverseUrlOrder: true` i kthen.

---

## Konfigurime

| Env Variable | Default | Përshkrim |
|---|---|---|
| `PORT` | `3001` | Porti i serverit |
| `TIMEZONE` | `Europe/Tirane` | Timezone për "sot" |
| `WP_BASE_URL` | — | URL e WordPress |
| `WP_USERNAME` | — | Username WP |
| `WP_APP_PASSWORD` | — | Application password WP |
| `CATEGORY_CACHE_TTL_MIN` | `10` | Minuta cache për kategorite WP |
| `CONCURRENCY_LIMIT` | `5` | Max request-e paralele |
| `LOG_LEVEL` | `info` | Niveli i logging (`debug`, `info`, `warn`, `error`) |

---

## API Endpoints

| Method | Endpoint | Përshkrim |
|--------|----------|-----------|
| POST | `/api/sync-today` | Sinkronizo artikujt nga burimet |
| POST | `/api/preview` | Preview përmbajtjen e artikullit |
| GET | `/api/wp/categories` | Merr kategorite WP |
| POST | `/api/wp/publish` | Publiko në WordPress |
| GET | `/api/config` | Merr konfigurimin |
| GET | `/health` | Health check |

---

## Siguria

- **SSRF Protection:** Vetëm domain-et e deklaruara lejohen
- **Private IP Blocking:** Bllokon localhost dhe IP private
- **Rate Limiting:** 60 request/min per IP
- **Retries:** Exponential backoff (1s, 2s, 4s)
- **HTML Sanitization:** DOMPurify me allowlist të rreptë

---

## Tech Stack

- **Backend:** Node.js, Express, TypeScript
- **Frontend:** React, Vite, TypeScript
- **Content Extraction:** Mozilla Readability, JSDOM
- **HTML Sanitization:** DOMPurify
- **Date Handling:** Luxon
- **XML Parsing:** fast-xml-parser
# wpnews
