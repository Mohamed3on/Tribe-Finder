import { User } from '@/components/LocationsWrapper';
import { useLocationContext } from '@/lib/LocationContext';
import { enrichUsers, useStorage } from '@/lib/storage';
import { daysSinceTweet } from '@/utils/tweetActivity';
import { Wrapper } from '@/components/LocationList';
import { useState, useMemo, useEffect } from 'react';
import { SortSelect } from './SortSelect';
import { UserCard } from './UserCard';
import { BackButton } from './BackButton';

const sortOptions = [
  {
    value: 'followers-desc',
    label: 'Followers (High to Low)',
    sortFn: (a: User, b: User) => b.followers - a.followers,
  },
  {
    value: 'followers-asc',
    label: 'Followers (Low to High)',
    sortFn: (a: User, b: User) => a.followers - b.followers,
  },
  { value: 'lasttweet-desc', label: 'Last tweet (Recent to Old)' },
  { value: 'lasttweet-asc', label: 'Last tweet (Old to Recent)' },
];

export const LocationDetails = ({ locationName }: { locationName?: string }) => {
  const { locations, userListData } = useLocationContext();
  const tweetDates = useStorage('tweetDates');
  const [sortBy, setSortBy] = useState<string>(sortOptions[0].value);

  const usersObject = locations[locationName];
  const users: User[] = useMemo(
    () => (usersObject ? (Object.values(usersObject) as User[]) : []),
    [usersObject]
  );

  // Lazily fetch last-tweet dates for just the people in this location.
  useEffect(() => {
    enrichUsers(users.map((u) => u.id));
  }, [users]);

  const sortedUsers = useMemo(() => {
    if (sortBy.startsWith('lasttweet')) {
      const dir = sortBy === 'lasttweet-asc' ? -1 : 1;
      // Recent-first by default; unknown/never (Infinity days) sink to the bottom.
      return [...users].sort(
        (a, b) =>
          dir *
          (daysSinceTweet(tweetDates[a.id]?.last_tweet) -
            daysSinceTweet(tweetDates[b.id]?.last_tweet))
      );
    }
    const selectedSort = sortOptions.find((option) => option.value === sortBy);
    return [...users].sort(selectedSort?.sortFn);
  }, [users, sortBy, tweetDates]);

  if (!usersObject) {
    return <div>No data available for this location.</div>;
  }

  return (
    <Wrapper>
      <div className='mb-6 space-y-4'>
        <BackButton />
      </div>

      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8'>
        <h1 className='text-3xl font-bold text-gray-100'>
          {sortedUsers.length} Friends in {locationName}
        </h1>
        <SortSelect options={sortOptions} value={sortBy} onChange={setSortBy} />
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
        {sortedUsers.map((user, index) => (
          <UserCard key={index} user={user} userListData={userListData} />
        ))}
      </div>
    </Wrapper>
  );
};
