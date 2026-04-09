# Security Concept

Last updated: 2026-04-09

## Overview

The Morning Briefings app is a restricted-access internal tool for the UN Political Unit. Security is layered across infrastructure (Vercel edge), framework (Next.js / NextAuth), and application code.

## Authentication

### NextAuth.js (Credentials Provider, JWT Strategy)

- **Domain restriction**: Only `@un.org` email addresses are accepted at login and registration.
- **Whitelist gating**: Every email must be present in the `user_whitelist` table before login or registration succeeds. An admin adds emails via the whitelist management UI.
- **Email verification**: Accounts require email verification before login is permitted. A cryptographically random 256-bit token (valid 24h) is sent to the user's email.
- **Password hashing**: bcrypt with 12 rounds for all password storage.
- **Live whitelist re-check**: On every JWT token refresh, the `jwt` callback re-queries the whitelist. If a user is removed, `token.whitelisted` is set to `false` and the proxy middleware blocks further access.
- **24-hour sessions**: JWT `maxAge` is 24 hours (reduced from the NextAuth default of 30 days).

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

- **HTML content**: `src/lib/sanitize.ts` uses `isomorphic-dompurify` with an explicit allowlist of tags and attributes. No `<script>`, `<iframe>`, `<form>`, or `<object>` tags are permitted. `ALLOW_DATA_ATTR: false`.
- **SQL**: All database queries use parameterized placeholders (`$1`, `$2`, ...) via the `pg` library. No string interpolation of user input into SQL.
- **File uploads**: Image uploads are restricted to `image/jpeg`, `image/png`, `image/gif`, `image/webp` with a 10MB size limit. Filenames are sanitized to alphanumeric characters only.

## Database Security

- **Connection**: SSL with `rejectUnauthorized: true` in production.
- **Schema isolation**: All tables are in the `pu_morning_briefings` schema; the `search_path` is set per query.
- **Connection pooling**: Max 20 connections, 30s idle timeout, pool reuse across hot reloads in development.
- **Credentials**: Connection string from `DATABASE_URL` environment variable, never hardcoded.

## Image Storage Security

- **Azure Blob Storage**: Private container (no public access). Accessed via `StorageSharedKeyCredential`.
- **Local fallback**: Path traversal prevention via `path.resolve()` + `startsWith(resolvedBase)` check before serving or deleting files.
- **Serving**: Images are served through authenticated API routes (`/api/images/[id]`), not directly from storage.

## Infrastructure (Vercel)

- **TLS**: TLSv1.3 only, Let's Encrypt certificate.
- **HSTS**: `max-age=63072000` (2 years) applied at the edge.
- **DDoS protection**: Vercel's built-in DDoS mitigation.
- **WAF**: Custom rate limiting rules (see above). Managed rulesets available for additional protection.
- **No source maps in production**.
- **Minimal server disclosure**: `Server: Vercel` only, no version info.

## Known Limitations

- **No role-based access control**: All authenticated users have equal privileges. The `role` field exists in the session but is not enforced in API routes. Whitelist management is accessible to any authenticated user.
- **CSP `unsafe-inline`/`unsafe-eval`**: Required by the framework and editor, weakening CSP's XSS protection.
- **SMTP STARTTLS**: Port 587 connections do not enforce `requireTLS: true`, allowing potential plaintext downgrade if the mail server permits it.
- **Verification tokens stored as plaintext**: Unlike password reset tokens (which are bcrypt-hashed), email verification tokens are stored in plaintext. Lower risk due to short lifespan and one-time use.

## Changes (2026-04-09)

Fixes from external penetration test:

1. **User enumeration eliminated**: Login no longer returns different error codes for whitelisted vs. non-whitelisted domains. All failures return a generic `CredentialsSignin` error.
2. **Rate limiting added**: Vercel WAF rules for login, registration, and forgot-password endpoints.
3. **CSP header added**: `Content-Security-Policy` with restrictive defaults, allowing only required sources.
4. **Google Analytics placeholder removed**: The `<GoogleAnalytics gaId="G-XYZ" />` component was loading unnecessary JavaScript with a non-functional tracking ID.
