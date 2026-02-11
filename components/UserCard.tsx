import { User } from '@/components/LocationsWrapper';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { Badge } from '@/components/ui/badge';

type UserCardProps = {
  user: User;
  userListData: any[];
};

export const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const UserCard = ({ user, userListData }: UserCardProps) => {
  return (
    <div className='bg-gray-700 rounded-lg shadow-lg p-4 hover:bg-gray-600 transition-colors ease-in-out'>
      <a
        href={`https://x.com/${user.screen_name}`}
        target='_blank'
        rel='noopener noreferrer'
        className='flex flex-col space-y-3'
      >
        <div className='flex items-center space-x-3'>
          <Avatar className='h-12 w-12'>
            <AvatarImage loading='lazy' src={user.avatar} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className='flex items-center gap-2'>
              <span className='text-lg font-semibold text-gray-100'>{user.name}</span>
              <span className='text-sm text-gray-400'>{`@${user.screen_name}`}</span>
              {user.isFriend && (
                <Badge variant='green' className='text-xs'>
                  Following
                </Badge>
              )}
            </div>
            <div className='text-sm text-gray-400'>{user.location}</div>
          </div>
        </div>

        {user.bio && <div className='text-sm text-gray-300'>{user.bio}</div>}

        <div className='flex items-center gap-3 text-sm text-gray-400'>
          <span className='font-medium text-gray-200'>
            {formatNumber(user.followers)} followers
          </span>
        </div>

        {user.lists.length > 0 && (
          <div className='flex flex-wrap gap-2'>
            {user.lists.map((id) => {
              const list = userListData.find((list) => list.id === id);
              return (
                <div key={list.id} className='flex items-center bg-gray-600 rounded-full px-2 py-1'>
                  <Avatar className='h-4 w-4 mr-1'>
                    <AvatarImage src={list.avatar} />
                  </Avatar>
                  <span className='text-xs text-gray-200'>{list.name}</span>
                </div>
              );
            })}
          </div>
        )}
      </a>
    </div>
  );
};
