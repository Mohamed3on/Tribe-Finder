/* eslint-disable react/display-name */
import { User, UsersMap } from '@/components/LocationsWrapper';
import { useEnableListsContext, useUserDataContext } from '@/lib/StorageContext';
import { processLocations } from '@/utils/locationProcessing';
import { getMappedLocations } from '@/utils/processLocations';
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
  cityToCountryMapping?: { [key: string]: string };
};

export const LocationsProvider: React.FC<{ children: React.ReactNode }> = React.memo(
  function LocationsProvider({ children }) {
    const [data, setData] = useState<LocationsContextProps>({
      locations: {},
      sortedLocations: [],
      userListData: [],
    });

    const [users, setUsers] = useState<UsersMap>({});

    const userData = useUserDataContext();

    const { enableLists, excludedLists } = useEnableListsContext();

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
      }
    }, [userData, enableLists, excludedLists]);

    const setDataWithProcessedLocations = useCallback(
      (
        locations: { [key: string]: UsersMap },
        locationToTypeMapping: { [key: string]: string },
        cityToCountryMapping: { [key: string]: string }
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
          cityToCountryMapping,
        });
      },
      [userData, users]
    );

    useEffect(() => {
      let isMounted = true;

      const fetchData = async () => {
        try {
          if (Object.keys(users).length > 0) {
            const processedLocations = processLocations(Object.values(users));

            const filtered: { [key: string]: UsersMap } = Object.fromEntries(
              Object.entries(processedLocations).filter(
                ([, items]) => Object.keys(items).length > 1
              )
            ) as { [key: string]: UsersMap };

            const {
              mappedLocations: newLocations,
              locationToTypeMapping,
              cityToCountryMapping,
            } = await getMappedLocations(filtered);
            if (newLocations && isMounted) {
              setDataWithProcessedLocations(
                newLocations,
                locationToTypeMapping,
                cityToCountryMapping
              );
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

    const contextValue = useMemo(() => ({ ...data }), [data]);

    return <LocationsContext.Provider value={contextValue}>{children}</LocationsContext.Provider>;
  }
);
