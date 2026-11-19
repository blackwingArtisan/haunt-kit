import { hashAnswer, type LatLng, type Tour } from '@haunt-kit/template/core';

/** A stop as the host edits it. Answers are plain text here and never leave the host's device. */
export interface DraftStop {
  key: string;
  name: string;
  clue: string;
  position: LatLng;
  radius: number;
  question: string;
  /** Accepted answers, comma-separated as typed. */
  answers: string;
  hint: string;
}

export interface HuntDraft {
  title: string;
  host: string;
  ordering: 'sequential' | 'free';
  stops: DraftStop[];
  /** Where the editor map is centered before any stop exists. */
  center: LatLng;
}

/** A stop as it travels in a share link: answers are salted digests. */
export interface SharedStop {
  name: string;
  clue: string;
  lat: number;
  lng: number;
  radius: number;
  question?: string;
  /** base64url digests of each accepted answer, salted with SharedHunt.salt. */
  answerDigests?: string[];
  hint?: string;
}

export interface SharedHunt {
  title: string;
  host?: string;
  ordering: 'sequential' | 'free';
  salt: string;
  stops: SharedStop[];
}

export const RADIUS_CHOICES = [15, 25, 40, 60, 100] as const;
export const MAX_STOPS = 20;

export function splitAnswers(raw: string): string[] {
  return raw
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);
}

export interface DraftIssue {
  stopKey?: string;
  message: string;
}

/** Everything that would stop a host from sharing this hunt, in plain words. */
export function draftIssues(draft: HuntDraft): DraftIssue[] {
  const issues: DraftIssue[] = [];
  if (!draft.title.trim()) issues.push({ message: 'Give the hunt a title.' });
  if (draft.stops.length === 0) issues.push({ message: 'Add at least one stop: tap the map or record your current spot.' });
  if (draft.stops.length > MAX_STOPS) issues.push({ message: `A hunt can have at most ${MAX_STOPS} stops.` });
  draft.stops.forEach((s, i) => {
    const label = `Stop ${i + 1}`;
    if (!s.name.trim()) issues.push({ stopKey: s.key, message: `${label} needs a name (players see it once they find the spot).` });
    if (!s.clue.trim()) issues.push({ stopKey: s.key, message: `${label} needs a clue so players know where to look.` });
    if (s.question.trim() && splitAnswers(s.answers).length === 0) {
      issues.push({ stopKey: s.key, message: `${label} asks a question but has no accepted answer.` });
    }
  });
  return issues;
}

export function randomSalt(length = 6): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

/** Turns the host's draft into the shareable form, hashing every answer. */
export async function shareableHunt(draft: HuntDraft, salt = randomSalt()): Promise<SharedHunt> {
  const stops = await Promise.all(
    draft.stops.map(async (s): Promise<SharedStop> => {
      const answers = splitAnswers(s.answers);
      const question = s.question.trim();
      const digests = question
        ? await Promise.all(answers.map(async (a) => (await hashAnswer(a, salt)).split(':')[2]!))
        : undefined;
      return {
        name: s.name.trim(),
        clue: s.clue.trim(),
        lat: s.position.lat,
        lng: s.position.lng,
        radius: s.radius,
        ...(question ? { question, answerDigests: digests } : {}),
        ...(question && s.hint.trim() ? { hint: s.hint.trim() } : {}),
      };
    }),
  );
  return { title: draft.title.trim(), host: draft.host.trim() || undefined, ordering: draft.ordering, salt, stops };
}

/** Builds the engine's tour from a shared hunt. `id` should be unique per hunt link. */
export function huntToTour(hunt: SharedHunt, id: string): Tour {
  return {
    id,
    title: hunt.title,
    subtitle: hunt.host ? `Hosted by ${hunt.host}` : undefined,
    ordering: hunt.ordering,
    mapFeatures: [],
    stops: hunt.stops.map((s, i) => ({
      id: `stop-${i + 1}`,
      name: s.name,
      position: { lat: s.lat, lng: s.lng },
      radius: s.radius,
      story: [s.name],
      clue: s.clue,
      kind: 'clue',
      sources: [],
      requires: [],
      finale: false,
      challenge:
        s.question && s.answerDigests?.length
          ? { question: s.question, answers: s.answerDigests.map((d) => `sha256:${hunt.salt}:${d}`), hint: s.hint }
          : undefined,
    })),
  };
}

/** A tour for the editor's map preview (no validation, works with zero stops). */
export function draftToPreviewTour(draft: HuntDraft): Tour {
  return {
    id: 'draft',
    title: draft.title || 'Untitled hunt',
    ordering: draft.ordering,
    mapFeatures: [],
    stops: draft.stops.map((s, i) => ({
      id: `stop-${i + 1}`,
      name: s.name || `Stop ${i + 1}`,
      position: s.position,
      radius: s.radius,
      story: [s.name || `Stop ${i + 1}`],
      kind: 'clue',
      sources: [],
      requires: [],
      finale: false,
    })),
  };
}

let keyCounter = 0;
export function newStopKey(): string {
  keyCounter += 1;
  return `s${Date.now().toString(36)}${keyCounter}`;
}

export function blankStop(position: LatLng, index: number): DraftStop {
  return { key: newStopKey(), name: `Stop ${index + 1}`, clue: '', position, radius: 25, question: '', answers: '', hint: '' };
}

/** A public park and three invented hiding spots, for trying the app in one tap. */
export const DEMO_CENTER: LatLng = { lat: 41.5719, lng: -93.6441 };

export function demoDraft(): HuntDraft {
  const at = (dLat: number, dLng: number): LatLng => ({ lat: DEMO_CENTER.lat + dLat, lng: DEMO_CENTER.lng + dLng });
  return {
    title: 'The Pumpkin Patrol',
    host: 'The Hollow Lane Halloween Committee',
    ordering: 'sequential',
    center: DEMO_CENTER,
    stops: [
      {
        key: newStopKey(),
        name: 'The Crooked Bench',
        clue: 'Start where tired witches rest their brooms, facing the water.',
        position: at(0, 0),
        radius: 25,
        question: 'What color is the ribbon tied under the bench?',
        answers: 'orange',
        hint: 'Same color as a pumpkin.',
      },
      {
        key: newStopKey(),
        name: 'The Whispering Tree',
        clue: 'Head north to the tallest tree. It knows a secret.',
        position: at(0.0011, 0.0004),
        radius: 25,
        question: 'Which animal is on the card pinned to the trunk?',
        answers: 'bat, a bat',
        hint: 'It sleeps upside down.',
      },
      {
        key: newStopKey(),
        name: 'The Lantern Gate',
        clue: 'Finish where the path meets the gate. Look for the glow.',
        position: at(0.0005, 0.0016),
        radius: 25,
        question: '',
        answers: '',
        hint: '',
      },
    ],
  };
}

export function emptyDraft(center: LatLng = DEMO_CENTER): HuntDraft {
  return { title: '', host: '', ordering: 'sequential', stops: [], center };
}
