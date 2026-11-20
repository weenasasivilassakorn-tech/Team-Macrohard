import { getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  type User,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import type { AppLanguage } from '../types/cropshield';
import {
  type GoogleCalendarEventInsertPayload,
  type GoogleCalendarEventItem,
  normalizeGoogleCalendarEvents,
} from './forecastCalendar';

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of GOOGLE_CALENDAR_SCOPES) {
  provider.addScope(scope);
}

// Memory-only OAuth access token cache (never persisted to localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export function initGoogleCalendarAuth(
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess?.(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthFailure?.();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure?.();
    }
  });
}

export async function signInWithGoogleCalendar(): Promise<{
  user: User;
  accessToken: string;
} | null> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Missing Google Calendar access token');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
}

export function getGoogleCalendarAccessToken(): string | null {
  return cachedAccessToken;
}

export async function signOutGoogleCalendar(): Promise<void> {
  cachedAccessToken = null;
  await auth.signOut();
}

export async function fetchSevenDayGoogleCalendarEvents(
  accessToken: string,
  startIsoDate: string,
  endIsoDate: string,
  lang: AppLanguage
): Promise<GoogleCalendarEventItem[]> {
  const timeMin = new Date(`${startIsoDate}T00:00:00`).toISOString();
  const timeMax = new Date(`${endIsoDate}T23:59:59`).toISOString();
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Google Calendar API error (${res.status})`);
  }

  const data = (await res.json()) as { items?: unknown[] };
  return normalizeGoogleCalendarEvents(
    Array.isArray(data.items) ? (data.items as never[]) : [],
    lang
  );
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  payload: GoogleCalendarEventInsertPayload,
  lang: AppLanguage
): Promise<GoogleCalendarEventItem | null> {
  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to create calendar event (${res.status})`);
  }

  const created = await res.json();
  const normalized = normalizeGoogleCalendarEvents([created], lang);
  return normalized[0] ?? null;
}
