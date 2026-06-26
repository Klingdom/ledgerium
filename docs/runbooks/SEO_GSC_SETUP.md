# Runbook — Google Search Console + SEO Page-Engine Launch

Owner: marketing / growth. Prereq for measuring the SEO/AEO page engine (`apps/web-app/src/content`).
Status: code wiring complete (iter 098). The steps below are external console actions only.

---

## 1. Verify the domain in Google Search Console

The app supports the GSC "HTML tag" verification method via an env var (no code change needed):

1. In GSC, add a property for `https://ledgerium.ai` (URL-prefix property).
2. Choose verification method **HTML tag**. Copy the `content` token from the
   `<meta name="google-site-verification" content="…">` snippet.
3. Set the deploy env var:
   ```
   NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=<token>
   ```
   The root layout (`apps/web-app/src/app/layout.tsx`) renders the meta tag only
   when this var is set (`metadata.verification.google`).
4. Redeploy, then click **Verify** in GSC.

> A DNS TXT-record property (domain property) is also fine and covers all
> subdomains; if you use that, the env var is not required.

## 2. Submit the sitemap

- Sitemap URL: `https://ledgerium.ai/sitemap.xml` (already advertised in
  `robots.txt` via `apps/web-app/src/app/robots.ts`).
- It MERGES the static marketing pages with engine-generated pages
  (`apps/web-app/src/lib/seo/sitemap.ts`), and includes **only `published`,
  non-reserved** pages.
- In GSC → Sitemaps, submit `sitemap.xml`. Confirm it reports the expected URL
  count (28 engine pages + 4 hubs + static pages at iter 098).

## 3. Request indexing for the Tranche-0 set

Use GSC URL Inspection → Request Indexing for the highest-priority pages first
(comparisons + top problems + top workflows). Do not mass-request; let the rest
index from the sitemap.

## 4. Health gate before scaling to Tranche 1

Do not expand past ~150–300 published pages until, after 4–6 weeks:

- ≥ 80% of submitted pages are indexed (GSC Coverage), AND
- < 30% of pages have zero impressions.

If those hold, scale the next tranche. If not, pause and review thin/low-impression
pages (set `published: false` in the content object to `noindex` + drop from sitemap).

## 5. Measurement wiring (already live)

Client events fire from the SEO pages (PostHog + Umami via `track()`):

| Event | When |
|---|---|
| `seo_page_viewed` | on mount, with `referrerClass` (organic / ai / direct / other) |
| `seo_scroll_depth` | at 25 / 50 / 75 / 90% scroll |
| `seo_faq_expanded` | on FAQ open, with `questionIndex` |
| `seo_related_page_clicked` | on related-card click, with `linkRank` |
| `cta_clicked` | on every CTA, with `location` + `destination` |

`referrerClass: 'ai'` captures ChatGPT / Perplexity / Claude / Copilot / Gemini
referrals — the only available signal for answer-engine traffic until GSC surfaces
AI-Overview attribution natively.

## 6. Coverage scorecard (track per category)

`target / authored / passed-gate / indexed / % indexed / zero-impression`.
Authored & passed-gate come from `pnpm --filter @ledgerium/web-app validate:seo`;
indexed & impressions come from GSC. Categories and targets are in
`docs/meta/SEO_AEO_SUPERPROMPT_V2.md §7`.

## 7. Holdout (recommended for causal attribution)

Hold ~10% of planned slugs as `published: false` and release them 90 days after
the main batch, on matched intent categories, to attribute organic signups to the
program rather than background growth.
