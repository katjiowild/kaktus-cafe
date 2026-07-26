/**
 * Google sign-in via Google Identity Services (GIS).
 *
 * Google's "Web application" OAuth clients require a client_secret at the token
 * endpoint, which a browser app cannot hold — so the Authorization Code + PKCE
 * flow we use for Outlook cannot complete against one. (A "Desktop app" client
 * is not an alternative: those only accept loopback redirect URIs and can never
 * return to the hosted app.)
 *
 * GIS is Google's supported browser-only path: it hands back an access token
 * directly, no secret involved. The trade-off is that there is no refresh
 * token — tokens last about an hour. In practice that's invisible, because
 * `prompt: ''` re-issues silently while the Google session cookie is alive, and
 * sync only ever runs from a button press.
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly openid email profile';

export const GOOGLE_CLIENT_ID =
  '392933221143-qnv7g5kkf3kcb1cvn024124a8aego03d.apps.googleusercontent.com';

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}

interface GoogleGlobal {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        prompt?: string;
        callback: (r: TokenResponse) => void;
        error_callback?: (e: { type?: string; message?: string }) => void;
      }) => TokenClient;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleGlobal;
  }
}

export class GoogleAuthError extends Error {}

let scriptPromise: Promise<void> | null = null;

/** Loaded lazily — the app must still open and work offline without Google. */
function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = GIS_SRC;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      scriptPromise = null;
      reject(new GoogleAuthError("Couldn't reach Google — check your connection and try again."));
    };
    document.head.appendChild(el);
  });
  return scriptPromise;
}

export interface GoogleToken {
  accessToken: string;
  expiresAt: number;
}

/**
 * Ask Google for an access token.
 *
 * `interactive` opens the account chooser (first connect). Otherwise we ask for
 * a silent re-issue, which succeeds whenever the Google session is still alive —
 * that's what stands in for a refresh token.
 */
export function requestGoogleToken(interactive: boolean): Promise<GoogleToken> {
  return loadGis().then(
    () =>
      new Promise<GoogleToken>((resolve, reject) => {
        const oauth2 = window.google?.accounts?.oauth2;
        if (!oauth2) {
          reject(new GoogleAuthError('Google sign-in failed to load.'));
          return;
        }

        let settled = false;
        const client = oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: (r) => {
            if (settled) return;
            settled = true;
            if (r.error || !r.access_token) {
              reject(
                new GoogleAuthError(
                  r.error_description ||
                    (r.error === 'access_denied'
                      ? 'Sign-in was cancelled.'
                      : 'Google sign-in failed.'),
                ),
              );
              return;
            }
            resolve({
              accessToken: r.access_token,
              expiresAt: Date.now() + Number(r.expires_in ?? 3600) * 1000,
            });
          },
          error_callback: (e) => {
            if (settled) return;
            settled = true;
            // Popup blocked, closed, or a silent request that needs consent.
            reject(
              new GoogleAuthError(
                e.type === 'popup_closed'
                  ? 'Sign-in was cancelled.'
                  : e.type === 'popup_failed_to_open'
                    ? 'Your browser blocked the Google sign-in window — allow popups for this site.'
                    : 'Reconnect your Google account to keep syncing.',
              ),
            );
          },
        });

        // '' asks Google to reissue without prompting; 'select_account' lets her
        // choose which account (and add a second one later).
        client.requestAccessToken({ prompt: interactive ? 'select_account' : '' });
      }),
  );
}

/** Which account the token belongs to — used to label and de-duplicate it. */
export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { email?: string };
    return json.email ?? null;
  } catch {
    return null;
  }
}
