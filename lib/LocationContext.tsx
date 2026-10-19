/* eslint-disable react/display-name */
import { User, UsersMap } from '@/components/LocationsWrapper';
import { useStorage } from '@/lib/storage';
import { ResolveProgress, resolveUserLocations } from '@/utils/resolveLocations';
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

export const LocationsContext = createContext<LocationsContextProps | null>(null);

export const useLocationContext = () => {
  const context = useContext(LocationsContext);

  if (context === null) {
    throw new Error('useLocationContext must be used within a LocationsProvider');
  }

  return context;
};

export type LocationsContextProps = {
  locations: { [key: string]: UsersMap };
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

  numberOfFriends?: number;
  locationToTypeMapping?: { [key: string]: string };
  resolveProgress?: ResolveProgress | null;
};

export const LocationsProvider: React.FC<{ children: React.ReactNode }> = React.memo(
  function LocationsProvider({ children }) {
    const [data, setData] = useState<LocationsContextProps>({
      locations: {},
      sortedLocations: [],
      userListData: [],
    });

    const [users, setUsers] = useState<UsersMap>({});
    const [resolveProgress, setResolveProgress] = useState<ResolveProgress | null>(null);

    const userData = useStorage('userData');

    const enableLists = useStorage('enableLists');
    const excludedLists = useStorage('excludedLists');

    useEffect(() => {
      if (userData) {
        const usersMap: UsersMap = {};

        const friends = userData['friends'];
        const userListData = userData['userListData'];

        if (userListData && enableLists) {
          userListData.forEach((list) => {
            if (excludedLists.includes(list.id)) {
              return;
            }
            list.users.forEach((user) => {
              if (!usersMap[user.screen_name]) {
                usersMap[user.screen_name] = { ...user, lists: [list.id], isFriend: false };
              } else {
                usersMap[user.screen_name].lists.push(list.id);
              }
            });
          });
        }

        (friends || []).forEach((friend) => {
          if (!usersMap[friend.screen_name]) {
            usersMap[friend.screen_name] = { ...friend, lists: [], isFriend: true };
          } else {
            usersMap[friend.screen_name].isFriend = true;
          }
        });

        setUsers(usersMap);
      } else {
        // Cleared by a handle switch, maybe while this view was showing the old handle's people
        setUsers({});
      }
    }, [userData, enableLists, excludedLists]);

    const setDataWithProcessedLocations = useCallback(
      (
        locations: { [key: string]: UsersMap },
        locationToTypeMapping: { [key: string]: string }
      ) => {
        const sortedData = Object.entries(locations)
          .sort(([, a], [, b]) => Object.keys(b).length - Object.keys(a).length)
          .map(([location, items]) => ({
            location,
            users: items,
          }));
        setData({
          locations: locations,
          sortedLocations: sortedData,
          userListData: userData?.['userListData'] || [],
          numberOfFriends: Object.keys(users).length,
          locationToTypeMapping,
        });
      },
      [userData, users]
    );

    useEffect(() => {
      let isMounted = true;

      const fetchData = async () => {
        try {
          if (Object.keys(users).length > 0) {
            const { mappedLocations: newLocations, locationToTypeMapping } = await resolveUserLocations(
              Object.values(users),
              (progress) => isMounted && setResolveProgress(progress)
            ).finally(() => isMounted && setResolveProgress(null));
            if (newLocations && isMounted) {
              setDataWithProcessedLocations(newLocations, locationToTypeMapping);
            }
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

      return () => {
        isMounted = false;
      };
    }, [setDataWithProcessedLocations, users]);

    const contextValue = useMemo(() => ({ ...data, resolveProgress }), [data, resolveProgress]);

    return <LocationsContext.Provider value={contextValue}>{children}</LocationsContext.Provider>;
  }
);
