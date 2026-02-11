import { User } from '@/components/LocationsWrapper';
import { useLocationContext } from '@/lib/LocationContext';
import { Wrapper } from '@/components/LocationList';
import Sunshine from '@/components/ui/Sunshine';
import { useState, useMemo } from 'react';
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
];

export const LocationDetails = ({ locationName }: { locationName?: string }) => {
  const { locations, userListData } = useLocationContext();
  const [sortBy, setSortBy] = useState<string>(sortOptions[0].value);

  const usersObject = locations[locationName];
  const users: User[] = useMemo(
    () => (usersObject ? (Object.values(usersObject) as User[]) : []),
    [usersObject]
  );

  const sortedUsers = useMemo(() => {
    const selectedSort = sortOptions.find((option) => option.value === sortBy);
    return [...users].sort(selectedSort?.sortFn);
  }, [users, sortBy]);

  if (!usersObject) {
    return <div>No data available for this location.</div>;
  }

  return (
    <Wrapper>
      <div className='mb-6 space-y-4'>
        <BackButton />
        <Sunshine locationName={locationName} />
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
