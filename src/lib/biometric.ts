import { getSetting, setSetting } from '../db';

/**
 * Fingerprint / Face unlock, over WebAuthn's platform authenticator.
 *
 * What this is honestly doing: there's no server, so there's nothing to verify
 * a signature against. We register a credential tied to this origin, and later
 * ask the platform to assert it. If the browser resolves that promise, the OS
 * checked the user's biometric. We trust the browser — the same trust the PIN
 * gate already runs on, so this adds convenience, not security.
 *
 * Because of that, the PIN is never replaced. It stays the way in when the
 * finger doesn't read, the credential is lost, or the phone changes hands.
 */

const KEY = 'lock.biometricId';

interface Stored {
  /** base64 rawId, needed to ask for this specific credential back. */
  id: string;
  createdAt: string;
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

/**
 * Is there a fingerprint reader / face unlock this origin can actually use?
 * Answers false on desktop browsers with no platform authenticator, and on
 * anything that isn't a secure context.
 */
export async function biometricAvailable(): Promise<boolean> {
  if (typeof PublicKeyCredential === 'undefined') return false;
  if (!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function biometricEnabled(): Promise<boolean> {
  return (await getSetting<Stored | null>(KEY, null)) !== null;
}

export async function disableBiometric(): Promise<void> {
  await setSetting(KEY, null);
}

/**
 * Register this device's biometric. Must be called from a user gesture; the
 * platform shows its own prompt. Returns false if the user backs out.
 */
export async function enableBiometric(displayName: string): Promise<boolean> {
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      // Bare hostname: on github.io the registrable domain is the full
      // subdomain, so this is the only value the browser will accept.
      rp: { name: 'Kaktus Cafe', id: location.hostname },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: displayName || 'kaktus-cafe',
        displayName: displayName || 'Kaktus Cafe',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        // Not a passkey — this never leaves the device and shouldn't be
        // offered up to a password manager to sync.
        residentKey: 'discouraged',
      },
      attestation: 'none',
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;

  if (!credential) return false;
  await setSetting(KEY, {
    id: toBase64(new Uint8Array(credential.rawId)),
    createdAt: new Date().toISOString(),
  } satisfies Stored);
  return true;
}

export type BiometricResult = 'ok' | 'cancelled' | 'unavailable';

/** Ask the platform to confirm it's her. Cancelling is not an error. */
export async function verifyBiometric(): Promise<BiometricResult> {
  const stored = await getSetting<Stored | null>(KEY, null);
  if (!stored) return 'unavailable';
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: 'public-key', id: fromBase64(stored.id) as BufferSource }],
        userVerification: 'required',
        rpId: location.hostname,
        timeout: 60_000,
      },
    });
    return assertion ? 'ok' : 'cancelled';
  } catch (e) {
    // A dismissed prompt and a broken credential both land here. Neither is
    // worth an error message — the keypad is right there either way.
    return e instanceof Error && e.name === 'NotAllowedError' ? 'cancelled' : 'unavailable';
  }
}
