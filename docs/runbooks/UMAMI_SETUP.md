# Umami Analytics Setup Runbook — Self-Hosted on Hostinger VPS

**Audience:** Ledgerium AI operator (you).
**Goal:** Get self-hosted Umami running on the Hostinger VPS, pointed at `analytics.ledgerium.ai`, and wired to the web app so real pageview events appear in the Umami dashboard.
**Scope:** Mode 3 debug fix — resolves RCA-1 (writable-cache EACCES) and RCA-5 (missing build-time NEXT_PUBLIC_UMAMI_* env vars).
**Time:** ~30 minutes operator time + 24-72h DNS propagation (parallel; deploy while DNS propagates).

---

## What is already built in code

- `apps/web-app/src/app/layout.tsx:24-29` — `<Script>` tag loading `NEXT_PUBLIC_UMAMI_SCRIPT_URL` with data-website-id `NEXT_PUBLIC_UMAMI_WEBSITE_ID`
- `compose.hostinger.yaml` — `umami` + `umami-db` services + `umami-db-data` volume (this PR)
- `Dockerfile` — `ARG/ENV NEXT_PUBLIC_UMAMI_*` declared before `next build` (this PR)
- `.github/workflows/deploy.yml` — `build-args` on Docker build step + `UMAMI_*` secrets on deploy step (this PR)
- `scripts/docker-start.sh` — `.next/cache` writability verification on startup (this PR)

---

## Step 1 — Add GitHub Actions Variables

Go to: **GitHub → ledgerium repo → Settings → Secrets and variables → Actions → Variables tab**

Add the following Variables (NOT Secrets — these are public build-time values embedded in the JS bundle):

| Variable name | Value |
|---|---|
| `NEXT_PUBLIC_UMAMI_SCRIPT_URL` | `https://analytics.ledgerium.ai/script.js` |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | _(leave blank for now — fill in after Step 6)_ |

> `NEXT_PUBLIC_UMAMI_WEBSITE_ID` must be updated after you complete Step 6 (create the website in the Umami dashboard and copy its UUID). A second deploy is required after that update.

---

## Step 2 — Add GitHub Actions Secrets

Go to: **GitHub → ledgerium repo → Settings → Secrets and variables → Actions → Secrets tab**

Generate secure values first:

```sh
# Run locally or on any machine with openssl
openssl rand -hex 32   # copy output → UMAMI_APP_SECRET
openssl rand -hex 32   # copy output → UMAMI_DB_PASSWORD
```

Add the following Secrets:

| Secret name | Value |
|---|---|
| `UMAMI_APP_SECRET` | output of first `openssl rand -hex 32` |
| `UMAMI_DB_PASSWORD` | output of second `openssl rand -hex 32` |

> Keep both values in a password manager. You will need `UMAMI_DB_PASSWORD` if you ever connect to the Umami Postgres instance directly.

---

## Step 3 — DNS configuration

Add an A record for the analytics subdomain pointing to your Hostinger VPS IP address.

In your DNS provider (wherever `ledgerium.ai` is managed):

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `analytics` | `<your-Hostinger-VPS-IP>` | 300 |

> Find your VPS IP in Hostinger hPanel → VPS → your instance → Overview.

DNS propagation typically takes 24-72 hours. You can proceed to Steps 4-5 while waiting — the deploy itself does not require DNS to be live.

---

## Step 4 — Reverse-proxy configuration

The `compose.hostinger.yaml` uses an external `proxy-net` Docker network, meaning a reverse proxy already running on the VPS manages TLS termination and subdomain routing. No reverse proxy config was found in the ledgerium repository, so the exact approach depends on what Hostinger provisions for your VPS.

### Determine which proxy is in use

SSH to your VPS and run:

```sh
docker ps --format '{{.Names}} {{.Image}}'
```

Look for a container whose image contains `traefik`, `caddy`, or `nginx`.

### Option A — Traefik (most common on Docker-based VPS setups)

If you see a Traefik container, uncomment the `labels:` block in `compose.hostinger.yaml` under the `umami` service:

```yaml
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.umami.rule=Host(`analytics.ledgerium.ai`)"
      - "traefik.http.routers.umami.tls=true"
      - "traefik.http.routers.umami.tls.certresolver=letsencrypt"
      - "traefik.http.services.umami.loadbalancer.server.port=3000"
```

Then redeploy. Traefik reads container labels at runtime and provisions a Let's Encrypt certificate automatically.

### Option B — Caddy

If you see a Caddy container, add a block to the Caddyfile on the VPS:

```
analytics.ledgerium.ai {
    reverse_proxy umami:3000
}
```

Caddy auto-provisions TLS via Let's Encrypt when the domain resolves. Reload Caddy after editing:

```sh
docker exec <caddy-container-name> caddy reload --config /etc/caddy/Caddyfile
```

### Option C — Hostinger proprietary reverse proxy / Nginx

If Hostinger manages the reverse proxy outside Docker (common on their shared/managed VPS plans):

1. Log into hPanel → VPS → your instance → Nginx proxy manager (or equivalent).
2. Add a proxy host:
   - Domain: `analytics.ledgerium.ai`
   - Scheme: `http`
   - Forward hostname: `localhost` (or your VPS LAN IP)
   - Forward port: `3001` (the host-side port mapped in compose.hostinger.yaml)
   - Enable SSL: Yes, with Let's Encrypt auto-cert
3. Save and wait for the certificate to provision (~30 seconds).

> If none of the above apply, file an issue and the Hostinger VPS admin panel documentation should clarify the correct approach.

---

## Step 5 — Trigger deploy

Once Steps 1-2 are done (DNS can still be propagating), push the fix branch to `main` (or trigger a manual dispatch):

```sh
git push origin main
```

The GitHub Actions workflow will:
1. Run quality gate (typecheck + tests)
2. Build Docker image with `NEXT_PUBLIC_UMAMI_*` baked in
3. Push image to GHCR
4. Deploy to Hostinger with `UMAMI_APP_SECRET` + `UMAMI_DB_PASSWORD` injected

Monitor the deploy in GitHub Actions → Actions tab.

---

## Step 6 — Umami initial admin setup

After the deploy completes and DNS has propagated:

1. SSH to your VPS and confirm the containers are running:
   ```sh
   docker ps | grep umami
   docker logs umami --tail 20
   ```
   You should see `Listening on http://0.0.0.0:3000`. If not, check `docker logs umami-db` for Postgres startup errors.

2. Visit `https://analytics.ledgerium.ai` in your browser.

3. Log in with the default credentials:
   - Username: `admin`
   - Password: `umami`

4. **IMMEDIATELY** change the admin password: top-right → Profile → Change password.

5. Create a website:
   - Settings → Websites → Add website
   - Name: `Ledgerium AI`
   - Domain: `ledgerium.ai`
   - Save → the website UUID appears (e.g., `a1b2c3d4-...`)

6. Copy the UUID.

---

## Step 7 — Update NEXT_PUBLIC_UMAMI_WEBSITE_ID and redeploy

1. Go back to: **GitHub → Settings → Secrets and variables → Actions → Variables tab**
2. Edit `NEXT_PUBLIC_UMAMI_WEBSITE_ID` and paste the UUID from Step 6.
3. Trigger another deploy (push a trivial commit or use workflow dispatch).
4. The new image will have the correct website ID baked into the bundle.

---

## Step 8 — Verification

After the final deploy:

**Container logs:**
```sh
docker logs ledgerium-ai | grep "cache writable"
# Expected: [ledgerium] .next/cache writable: OK

docker logs ledgerium-ai | grep -i eacces
# Expected: 0 matches (EACCES errors eliminated by RCA-1 fix)
```

**Browser:**
1. Open `https://ledgerium.ai` in Chrome.
2. Open DevTools → Network → filter `analytics.ledgerium.ai`.
3. Hard-reload the page. You should see a request to `https://analytics.ledgerium.ai/script.js` returning HTTP 200.
4. Navigate between pages — each navigation fires a pageview POST to `https://analytics.ledgerium.ai/api/send`.

**Umami dashboard:**
1. Visit `https://analytics.ledgerium.ai`.
2. Select your `Ledgerium AI` website.
3. Within 30 seconds of your browser visit, a pageview event should appear.

---

## CEO action checklist (sequential)

- [ ] **Step 1** — Add GitHub Actions Variable `NEXT_PUBLIC_UMAMI_SCRIPT_URL` = `https://analytics.ledgerium.ai/script.js`
- [ ] **Step 1** — Add GitHub Actions Variable `NEXT_PUBLIC_UMAMI_WEBSITE_ID` = _(blank for now)_
- [ ] **Step 2** — Generate secrets (`openssl rand -hex 32` × 2) and add `UMAMI_APP_SECRET` + `UMAMI_DB_PASSWORD` as GitHub Actions Secrets
- [ ] **Step 3** — Add DNS A record: `analytics` → Hostinger VPS IP (24-72h propagation)
- [ ] **Step 4** — Determine which reverse proxy is in use on the VPS and configure subdomain routing
- [ ] **Step 5** — Trigger deploy (push to `main` or manual dispatch)
- [ ] **Step 6** — SSH to VPS, confirm `umami` container started, visit Umami UI, change admin password, create website, copy UUID
- [ ] **Step 7** — Update `NEXT_PUBLIC_UMAMI_WEBSITE_ID` Variable with the UUID, trigger second deploy
- [ ] **Step 8** — Verify: browser network tab shows `script.js` 200, Umami dashboard shows pageview within 30s, container logs show `.next/cache writable: OK`

---

## Troubleshooting

**`umami` container exits immediately**
- Run `docker logs umami` — likely `DATABASE_URL` misconfiguration or `umami-db` not yet ready.
- Confirm `UMAMI_DB_PASSWORD` secret is set and was passed to the deploy step.
- `docker-compose -f compose.hostinger.yaml logs umami-db` — check Postgres startup.

**`analytics.ledgerium.ai` returns connection refused or 502**
- DNS may not have propagated yet — check with `nslookup analytics.ledgerium.ai`.
- Reverse proxy may not be routing to port 3001 yet — see Step 4.
- Confirm `docker ps` shows the `umami` container running.

**Pageviews not appearing in Umami dashboard**
- Website ID mismatch — verify `NEXT_PUBLIC_UMAMI_WEBSITE_ID` in GitHub Variables matches the UUID in Umami Settings → Websites.
- Check browser DevTools → Network for the `/api/send` POST response (should be HTTP 200 or 204).
- Ad-blockers may suppress the analytics request — test in a private/incognito window without extensions.

**`.next/cache writable: WARNING` in container logs**
- The RCA-1 Dockerfile `chown` fix did not make it into the deployed image.
- Confirm the current deploy used the updated Dockerfile (check CI build step timestamp).
- As a temporary workaround: `docker exec ledgerium-ai chown -R nextjs:nodejs /app/apps/web-app/.next` (resets on next container restart; the Dockerfile fix is the permanent solution).
