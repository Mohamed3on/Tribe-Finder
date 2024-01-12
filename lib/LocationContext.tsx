import React, { createContext, useState, useEffect } from 'react';
import { User, UsersMap } from '@/components/LocationsWrapper';
import { processLocations } from '@/utils/data';
import { useStorageContext } from '@/lib/StorageContext';

export const LocationsContext = createContext(null);

export const useLocationContext = () => {
  const context: LocationsContextProps = React.useContext(LocationsContext);

  if (context === undefined) {
    throw new Error('useLocationContext must be used within a LocationsProvider');
  }

  return context;
};

export type LocationsContextProps = {
  locations: UsersMap;
  sortedLocations: {
    location: string;
    users: UsersMap;
  }[];
  userListData: {
    name: string;
    users: User[];
    avatar: string;
    id: string;
  }[];
};

export const LocationsProvider = ({ children }) => {
  const [data, setData] = useState<LocationsContextProps>({
    locations: {},
    sortedLocations: [],
    userListData: [],
  });
  const {
    storageData: { userData, enableLists },
  } = useStorageContext();

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (userData) {
          const userListData: {
            name: string;
            users: User[];
            avatar: string;
            id: string;
          }[] = userData?.['userListData'];
          const friends = userData?.['friends'];

          // Initialize an empty object to store user data
          let usersMap = {};

          if (userListData && enableLists) {
            userListData.forEach((list) =>
              list.users.forEach((user) => {
                if (!usersMap[user.screen_name]) {
                  usersMap[user.screen_name] = { ...user, lists: [list.id], isFriend: false };
                } else {
                  usersMap[user.screen_name].lists.push(list.id);
                }
              })
            );
          }

          // Process friends
          friends.forEach((friend) => {
            if (!usersMap[friend.screen_name]) {
              usersMap[friend.screen_name] = { ...friend, lists: [], isFriend: true };
            } else {
              usersMap[friend.screen_name].isFriend = true;
            }
          });

          const processedLocations = processLocations(Object.values(usersMap));

          const sortedData = Object.entries(processedLocations)
            .filter(([, items]: [string, UsersMap]) => {
              return Object.keys(items).length > 1;
            })

            .sort(
              ([, a]: [string, UsersMap], [, b]: [string, UsersMap]) =>
                Object.keys(b).length - Object.keys(a).length
            )
            .map(([location, items]: [string, UsersMap]) => ({
              location,
              users: items,
            }));

          setData({
            locations: processedLocations,
            sortedLocations: sortedData,
            userListData: userListData || [],
          });

          return;
        } else {
          setData({
            locations: {},
            sortedLocations: [],
            userListData: [],
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [enableLists, userData]);

  return <LocationsContext.Provider value={{ ...data }}>{children}</LocationsContext.Provider>;
};
