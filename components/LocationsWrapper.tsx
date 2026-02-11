import { LocationList } from '@/components/LocationList';
import { Refresh } from '@/components/Refresh';
import { useLocationContext } from '@/lib/LocationContext';

export type UsersMap = {
  [key: string]: User;
};

export type User = {
  name: string;
  screen_name: string;
  location: string;
  lists: string[];
  isFriend: boolean;
  followers: number;
  avatar: string;
  bio?: string;
  id: string;
};

export const LocationsWrapper = () => {
  const { sortedLocations } = useLocationContext();

  return (
    <div>
      {sortedLocations.length > 0 ? (
        <div className='flex items-center justify-center'>
          <LocationList />
        </div>
      ) : (
        <Refresh></Refresh>
      )}
    </div>
  );
};
