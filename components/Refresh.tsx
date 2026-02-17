import { useTwitterHandleContext, useUserDataContext } from '@/lib/StorageContext';
import { LoaderIcon, RefreshCw } from 'lucide-react';
import React, { useEffect } from 'react';
import { Button } from './ui/button';

export const Refresh = () => {
  const userData = useUserDataContext();
  const [refreshing, setRefreshing] = React.useState(true);

  const { twitterHandle, forceRefresh } = useTwitterHandleContext();
  const [errorMessage, setErrorMessage] = React.useState('');
  const [progress, setProgress] = React.useState<any>(null);

  useEffect(() => {
    const handler = (changes: any, area: string) => {
      if (area === 'local' && changes.fetchProgress) {
        setProgress(changes.fetchProgress.newValue);
      }
    };
    chrome.storage.onChanged.addListener(handler);
    chrome.storage.local.get(['fetchProgress'], (r: any) => {
      if (r.fetchProgress && r.fetchProgress.phase !== 'done') setProgress(r.fetchProgress);
    });
    return () => chrome.storage.onChanged.removeListener(handler);
  }, []);

  useEffect(() => {
    if (!userData) {
      setRefreshing(true);
      chrome.tabs.query({ currentWindow: true }, function (tabs) {
        const allMatchingTabs = tabs.filter(
          (tab) => tab.url?.includes('twitter.com') || tab.url?.includes('x.com')
        );

        if (allMatchingTabs.length > 0) {
          try {
            const mostRecentTab = allMatchingTabs[allMatchingTabs.length - 1];

            chrome.tabs.sendMessage(mostRecentTab.id, { message: 'refresh' }, function (response) {
              if (response?.type === 'success') {
                setRefreshing(false);
              } else if (response?.type === 'error') {
                setErrorMessage(
                  'Something went wrong. The user account may be private or suspended.'
                );
              } else {
                chrome.tabs.create({ url: `https://x.com/`, active: false });
              }
            });
          } catch (error) {
            console.log(error);
            setErrorMessage('Something went wrong. Please try again.');
          }
        } else {
          chrome.tabs.create({ url: `https://x.com/`, active: false });
        }
      });
    } else {
      setRefreshing(false);
    }
  }, [twitterHandle, userData]);

  const handleForceRefresh = () => {
    setRefreshing(true);
    setErrorMessage('');
    forceRefresh();
  };

  if (errorMessage) {
    return (
      <div className='flex items-center justify-center flex-col gap-7'>
        <h1 className='text-2xl font-bold text-center text-gray-400'>{errorMessage}</h1>

        <div className='flex flex-col gap-4 items-center'>
          <Button onClick={handleForceRefresh} variant='outline' className='gap-2'>
            <RefreshCw className='h-4 w-4' />
            Try Again
          </Button>

          <h2 className='text-xl font-bold text-center text-gray-500'>
            Or head over to{' '}
            <a
              className='text-blue-500 hover:underline hover:text-blue-100 transition-colors ease-in-out'
              href='#config'
            >
              config
            </a>{' '}
            to change the username
          </h2>
        </div>
      </div>
    );
  }

  return refreshing ? (
    <div className='flex items-center justify-center flex-col gap-7'>
      <LoaderIcon className='w-16 h-16 text-gray-400 animate-spin' />

      <h1 className='text-2xl font-bold text-center text-gray-400'>
        Crunching the data for @{twitterHandle}, please wait
      </h1>

      {progress?.phase === 'starting' && (
        <p className='text-sm font-medium text-gray-500'>Resolving user...</p>
      )}
      {progress?.phase === 'fetching' && (
        <p className='text-sm font-medium text-gray-500'>
          {progress.friendsDone ? 'Following fetched' : 'Fetching following...'}
          {progress.listsTotal > 0 && ` · Lists: ${progress.listsDone}/${progress.listsTotal}`}
        </p>
      )}

      <h2 className='text-xl font-bold text-center text-gray-500'>
        The more people you follow, the longer this may take
      </h2>
      <div className='text-sm font-semibold text-red-500'>
        Please don&apos;t close the open twitter tab!
      </div>
    </div>
  ) : null;
};
