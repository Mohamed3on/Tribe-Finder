import React, { createContext, useReducer, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { readLocalStorage } from '@/utils/localStorage';
import { TweetDates } from '@/utils/tweetActivity';

export const TwitterHandleContext = createContext({
  twitterHandle: '',
  setTwitterHandle: (twitterHandle: string) => {},
  forceRefresh: () => {},
});
export const EnableListsContext = createContext({
  enableLists: false,
  excludedLists: [],
  setEnableLists: (enableLists: boolean) => {},
  excludeList: (listId: string) => {},
  removeListExclusion: (listId: string) => {},
});
export const UserDataContext = createContext(null);
export const TweetDatesContext = createContext<{
  tweetDates: TweetDates;
  enrichUsers: (userIds: string[]) => void;
}>({ tweetDates: {}, enrichUsers: () => {} });

export const useTwitterHandleContext = () => React.useContext(TwitterHandleContext);
export const useEnableListsContext = () => React.useContext(EnableListsContext);
export const useUserDataContext = () => React.useContext(UserDataContext);
export const useTweetDatesContext = () => React.useContext(TweetDatesContext);

// Reducer for managing all related state
function storageReducer(state, action) {
  switch (action.type) {
    case 'SET_TWITTER_HANDLE':
      return { ...state, twitterHandle: action.payload };
    case 'SET_ENABLE_LISTS':
      return { ...state, enableLists: action.payload };
    case 'SET_USER_DATA':
      return { ...state, userData: action.payload };
    case 'SET_TWEET_DATES':
      return { ...state, tweetDates: action.payload };
    case 'UPDATE_EXCLUDED_LISTS':
      return { ...state, excludedLists: action.payload };
    default:
      return state;
  }
}

export const StorageProvider = ({ children }) => {
  const [state, dispatch] = useReducer(storageReducer, {
    twitterHandle: '',
    enableLists: false,
    excludedLists: [],
    userData: null,
    tweetDates: {},
  });

  // Effect for initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const result: {
          twitterHandle?: string;
          enableLists?: boolean;
          userData?: any;
          excludedLists?: string[];
          tweetDates?: TweetDates;
        } = await readLocalStorage([
          'twitterHandle',
          'enableLists',
          'userData',
          'excludedLists',
          'tweetDates',
        ]);
        dispatch({ type: 'SET_TWITTER_HANDLE', payload: result.twitterHandle || '' });
        dispatch({ type: 'SET_ENABLE_LISTS', payload: result.enableLists || false });
        dispatch({ type: 'SET_USER_DATA', payload: result.userData || null });
        dispatch({ type: 'UPDATE_EXCLUDED_LISTS', payload: result.excludedLists || [] });
        dispatch({ type: 'SET_TWEET_DATES', payload: result.tweetDates || {} });
      } catch (error) {
        console.log('no user data was found yet');
      }
    };
    fetchInitialData();
  }, []);

  // Handler for storage changes
  useEffect(() => {
    const handleStorageChange = (changes, areaName) => {
      if (areaName === 'local') {
        if (changes.userData) {
          dispatch({ type: 'SET_USER_DATA', payload: changes.userData.newValue || null });
        }
        if (changes.tweetDates) {
          dispatch({ type: 'SET_TWEET_DATES', payload: changes.tweetDates.newValue || {} });
        }
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const updateLocalStorage = useCallback((data) => {
    try {
      chrome.storage.local.set(data);
    } catch (error) {
      console.error('Error setting data in storage:', error);
    }
  }, []);

  // Queue users for lazy last-tweet enrichment, then nudge the content script on an
  // open X tab to drain the queue (the script also drains it on load if none is open).
  const enrichUsers = useCallback((userIds: string[]) => {
    const ids = (userIds || []).filter(Boolean);
    if (!ids.length) return;
    chrome.storage.local.get(['pendingEnrich'], (r: { pendingEnrich?: string[] }) => {
      const merged = Array.from(new Set([...(r.pendingEnrich || []), ...ids]));
      chrome.storage.local.set({ pendingEnrich: merged }, () => {
        chrome.tabs.query({ currentWindow: true }, (tabs: any[]) => {
          const xTabs = tabs.filter(
            (t) => t.url?.includes('twitter.com') || t.url?.includes('x.com')
          );
          if (xTabs.length > 0) {
            chrome.tabs.sendMessage(xTabs[xTabs.length - 1].id, { message: 'enrichTweets' });
          } else {
            chrome.tabs.create({ url: 'https://x.com/', active: false });
          }
        });
      });
    });
  }, []);

  return (
    <TwitterHandleContext.Provider
      value={{
        twitterHandle: state.twitterHandle,
        setTwitterHandle: (handle) => {
          if (handle !== state.twitterHandle) {
            toast('Please wait while we fetch your data', {
              description:
                'This might take a few seconds. Please do not close the open twitter tab in the meantime',
              duration: 5000,
              dismissible: true,
            });
            updateLocalStorage({
              twitterHandle: handle,
              lastAutoRefresh: {},
              userData: null,
              excludedLists: [],
            });

            dispatch({ type: 'SET_TWITTER_HANDLE', payload: handle });
            dispatch({ type: 'SET_USER_DATA', payload: null });
            dispatch({ type: 'UPDATE_EXCLUDED_LISTS', payload: [] });
          }
        },
        forceRefresh: () => {
          toast('Refreshing data...', {
            description: 'Please do not close the open twitter tab in the meantime',
            duration: 5000,
            dismissible: true,
          });
          updateLocalStorage({
            lastAutoRefresh: {},
            userData: null,
          });
          dispatch({ type: 'SET_USER_DATA', payload: null });

          // Force a refresh by creating a new Twitter tab
          chrome.tabs.query({ currentWindow: true }, function (tabs) {
            const allMatchingTabs = tabs.filter(
              (tab) => tab.url?.includes('twitter.com') || tab.url?.includes('x.com')
            );

            if (allMatchingTabs.length > 0) {
              const mostRecentTab = allMatchingTabs[allMatchingTabs.length - 1];
              chrome.tabs.sendMessage(mostRecentTab.id, { message: 'refresh' });
            } else {
              chrome.tabs.create({ url: `https://x.com/`, active: false });
            }
          });
        },
      }}
    >
      <EnableListsContext.Provider
        value={{
          enableLists: state.enableLists,
          setEnableLists: (enable) => {
            updateLocalStorage({ enableLists: enable });
            dispatch({ type: 'SET_ENABLE_LISTS', payload: enable });
          },
          excludedLists: state.excludedLists,
          excludeList: (listId) => {
            const updatedLists = [...state.excludedLists, listId];
            updateLocalStorage({ excludedLists: updatedLists });
            dispatch({ type: 'UPDATE_EXCLUDED_LISTS', payload: updatedLists });
          },
          removeListExclusion: (listId) => {
            const updatedLists = state.excludedLists.filter((id) => id !== listId);
            updateLocalStorage({ excludedLists: updatedLists });
            dispatch({ type: 'UPDATE_EXCLUDED_LISTS', payload: updatedLists });
          },
        }}
      >
        <UserDataContext.Provider value={state.userData}>
          <TweetDatesContext.Provider value={{ tweetDates: state.tweetDates, enrichUsers }}>
            {children}
          </TweetDatesContext.Provider>
        </UserDataContext.Provider>
      </EnableListsContext.Provider>
    </TwitterHandleContext.Provider>
  );
};
