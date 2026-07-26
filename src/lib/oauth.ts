import type { CalendarProvider } from '../types';

/**
 * OAuth 2.0 Authorization Code + PKCE for a public browser client — no backend,
 * no client secret (v5 §3–4). Google and Microsoft share this machinery; only
 * the endpoints and scopes differ.
 */

export interface ProviderConfig {
  provider: CalendarProvider;
  label: string;
  clientId: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string;
  /** Extra params the provider needs on the authorize call. */
  extraAuthParams: Record<string, string>;
}

export const GOOGLE: ProviderConfig = {
  provider: 'google',
  label: 'Google Calendar',
  clientId: '392933221143-qnv7g5kkf3kcb1cvn024124a8aego03d.apps.googleusercontent.com',
  authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scopes: 'https://www.googleapis.com/auth/calendar.readonly openid email profile',
  extraAuthParams: {
    // offline + consent are what actually yield a refresh token; without them
    // the connection silently dies after an hour.
    access_type: 'offline',
    prompt: 'consent select_account',
    include_granted_scopes: 'true',
  },
};

export const OUTLOOK: ProviderConfig = {
  provider: 'outlook',
  label: 'Outlook Calendar',
  clientId: 'fb81206a-469e-4818-a66e-de4a2414e299',
  // /common, not the tenant id — otherwise personal Microsoft accounts can't
  // sign in at all (v5 §4).
  authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  scopes: 'Calendars.Read offline_access openid email profile User.Read',
  extraAuthParams: { prompt: 'select_account' },
};

export const PROVIDERS: Record<CalendarProvider, ProviderConfig> = {
  google: GOOGLE,
  outlook: OUTLOOK,
};

/**
 * Where the provider sends us back. Must match the redirect URI registered with
 * each provider exactly, including the trailing slash.
 */
export function redirectUri(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`;
}

function randomString(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64Url(arr.buffer);
}

function base64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(digest);
}

const PENDING_KEY = 'kaktus.oauth.pending';

interface Pending {
  provider: CalendarProvider;
  verifier: string;
  state: string;
}

/** Kicks off the redirect. Returns only in the sense that the page navigates away. */
export async function beginAuth(config: ProviderConfig): Promise<void> {
  const verifier = randomString();
  const state = randomString(16);
  const pending: Pending = { provider: config.provider, verifier, state };
  // sessionStorage, not IndexedDB: this is a few seconds of throwaway state
  // scoped to this tab, and it must be readable synchronously on return.
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: config.scopes,
    state,
    code_challenge: await challengeFor(verifier),
    code_challenge_method: 'S256',
    ...config.extraAuthParams,
  });
  window.location.assign(`${config.authorizeUrl}?${params.toString()}`);
}

export interface TokenResult {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  idToken: string | null;
}

export class OAuthError extends Error {}

async function exchange(config: ProviderConfig, body: URLSearchParams): Promise<TokenResult> {
  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const code = String(json.error ?? res.status);
    const desc = String(json.error_description ?? '');
    // Google issues this when the OAuth client was registered as a "Web
    // application" rather than a public client. PKCE alone can't satisfy it, so
    // say precisely what to change instead of a generic failure.
    if (/client_secret|Missing required parameter: client_secret/i.test(`${code} ${desc}`)) {
      throw new OAuthError(
        'Google rejected the sign-in because this OAuth client expects a client secret. ' +
          'In Google Cloud Console create an OAuth client of type "Desktop app" (a public ' +
          'client, no secret) and use its Client ID here — a "Web application" client cannot ' +
          'complete PKCE from the browser.',
      );
    }
    if (/redirect_uri_mismatch/i.test(code)) {
      throw new OAuthError(
        `The provider doesn't recognise this redirect URI. Register exactly: ${redirectUri()}`,
      );
    }
    throw new OAuthError(desc || `Sign-in failed (${code}).`);
  }

  const expiresIn = Number(json.expires_in ?? 3600);
  return {
    accessToken: String(json.access_token),
    refreshToken: json.refresh_token ? String(json.refresh_token) : null,
    expiresAt: Date.now() + expiresIn * 1000,
    idToken: json.id_token ? String(json.id_token) : null,
  };
}

export interface CompletedAuth extends TokenResult {
  provider: CalendarProvider;
}

/**
 * Call once on app start. If we've just come back from a provider, completes the
 * exchange and cleans the URL. Returns null on an ordinary load.
 */
export async function completeAuthIfReturning(): Promise<CompletedAuth | null> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const clean = () => {
    sessionStorage.removeItem(PENDING_KEY);
    window.history.replaceState({}, '', `${url.origin}${url.pathname}`);
  };

  if (!code && !error) return null;

  const raw = sessionStorage.getItem(PENDING_KEY);
  const pending = raw ? (JSON.parse(raw) as Pending) : null;

  if (error) {
    clean();
    throw new OAuthError(
      url.searchParams.get('error_description') ||
        (error === 'access_denied' ? 'Sign-in was cancelled.' : `Sign-in failed (${error}).`),
    );
  }
  if (!pending) {
    clean();
    throw new OAuthError('Sign-in could not be matched to a request. Please try again.');
  }
  // CSRF guard: the state we get back must be the one we sent.
  if (state !== pending.state) {
    clean();
    throw new OAuthError('Sign-in failed a security check (state mismatch). Please try again.');
  }

  const config = PROVIDERS[pending.provider];
  try {
    const tokens = await exchange(
      config,
      new URLSearchParams({
        client_id: config.clientId,
        code: code!,
        code_verifier: pending.verifier,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri(),
      }),
    );
    return { ...tokens, provider: pending.provider };
  } finally {
    clean();
  }
}

export async function refresh(
  config: ProviderConfig,
  refreshToken: string,
): Promise<TokenResult> {
  return exchange(
    config,
    new URLSearchParams({
      client_id: config.clientId,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      ...(config.provider === 'outlook' ? { scope: config.scopes } : {}),
    }),
  );
}

/** Best-effort email from the id_token, to label the connected account. */
export function emailFromIdToken(idToken: string | null): string | null {
  if (!idToken) return null;
  try {
    const payload = idToken.split('.')[1];
    const json = JSON.parse(
      decodeURIComponent(
        atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
          .split('')
          .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
          .join(''),
      ),
    ) as { email?: string; preferred_username?: string };
    return json.email ?? json.preferred_username ?? null;
  } catch {
    return null;
  }
}
