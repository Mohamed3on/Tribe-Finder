import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { TweetDates } from '@/utils/tweetActivity';

// The stored keys the page shows, and what each reads as while nothing is stored there
const defaults = {
  twitterHandle: '',
  enableLists: false,
  excludedLists: [] as string[],
  userData: null as any,
  tweetDates: {} as TweetDates,
  fetchProgress: null as any,
};
type Stored = typeof defaults;

// One copy of those keys for the whole page: read once, then kept current by change events,
// so a view that mounts later starts from the current values. Undefined until that read lands.
let stored: Stored | undefined;
const listeners = new Set<() => void>();
let started = false;

const keep = (values: Partial<Stored>) => {
  stored = { ...stored, ...values } as Stored;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  if (!started) {
    started = true;
    chrome.storage.onChanged.addListener((changes, area) => {
      const ours = Object.keys(changes).filter((key) => key in defaults);
      // Changes that land before the first read are already in it
      if (area !== 'local' || !stored || !ours.length) return;
      keep(Object.fromEntries(ours.map((key) => [key, changes[key].newValue ?? defaults[key]])));
    });
    chrome.storage.local.get(Object.keys(defaults), (items) => keep({ ...defaults, ...items }));
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// One stored value, undefined until the page's first read lands. Home renders nothing until
// then, so the views below it always get a value.
export const useStorage = <K extends keyof Stored>(key: K): Stored[K] | undefined =>
  useSyncExternalStore(subscribe, () => stored?.[key], () => undefined);

// Writes only touch storage; views pick them up from its change events

const notify = (title: string, description: string) =>
  toast(title, { description, duration: 5000, dismissible: true });

export const setTwitterHandle = (handle: string) => {
  if (handle === stored.twitterHandle) return;
  notify(
    'Please wait while we fetch your data',
    'This might take a few seconds. Please do not close the open twitter tab in the meantime'
  );
  chrome.storage.local.set({
    twitterHandle: handle,
    lastAutoRefresh: {},
    userData: null,
    excludedLists: [],
  });
};

export const setEnableLists = (enableLists: boolean) => chrome.storage.local.set({ enableLists });

// One change at a time, each read from storage, so a quick second toggle (or another page's)
// isn't lost while the first is still on its way
let exclusions = Promise.resolve();
const updateExcludedLists = (update: (ids: string[]) => string[]) =>
  (exclusions = exclusions
    .then(() => chrome.storage.local.get('excludedLists'))
    .then(({ excludedLists }) => chrome.storage.local.set({ excludedLists: update(excludedLists || []) }))
    .catch(console.error));

export const excludeList = (listId: string) => updateExcludedLists((ids) => [...ids, listId]);

export const removeListExclusion = (listId: string) =>
  updateExcludedLists((ids) => ids.filter((id) => id !== listId));

// Message the last X tab in this window, or open X in the background when none is open
const messageXTab = (message: string) =>
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    const xTabs = tabs.filter((t) => t.url?.includes('twitter.com') || t.url?.includes('x.com'));
    if (xTabs.length > 0) {
      chrome.tabs.sendMessage(xTabs[xTabs.length - 1].id, { message });
    } else {
      chrome.tabs.create({ url: 'https://x.com/', active: false });
    }
  });

export const forceRefresh = () => {
  notify('Refreshing data...', 'Please do not close the open twitter tab in the meantime');
  chrome.storage.local.set({ lastAutoRefresh: {} });
  messageXTab('refresh');
};

// Queue users for lazy last-tweet enrichment, then nudge the content script on an
// open X tab to drain the queue (the script also drains it on load if none is open).
export const enrichUsers = (userIds: string[]) => {
  const ids = (userIds || []).filter(Boolean);
  if (!ids.length) return;
  chrome.storage.local.get(['pendingEnrich'], (r: { pendingEnrich?: string[] }) => {
    const merged = Array.from(new Set([...(r.pendingEnrich || []), ...ids]));
    chrome.storage.local.set({ pendingEnrich: merged }, () => messageXTab('enrichTweets'));
  });
};
