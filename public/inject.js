const config = {
  bearerToken:
    'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
  alternativeBearerToken:
    'AAAAAAAAAAAAAAAAAAAAAFQODgEAAAAAVHTp76lzh3rFzcHbmHVvQxYYpTw%3DckAlMINMjmCwxUcaXbAN4XqJVdgMJaHqNOFgPMK0zN1qLqLQCF',
  apiBaseURL: 'https://api.twitter.com/1.1',
};

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.message === 'refresh') {
    try {
      await run();
      sendResponse({ message: 'Data refreshed', type: 'success' });
    } catch (error) {
      console.error('Error updating data:', error);
      sendResponse({ message: 'Failed to update data', error: error.message, type: 'error' });
    }
    return true; // Indicate async response
  }
});

async function readLocalStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] || null);
    });
  });
}

const fetchFromAPI = async (endpoint, params = '', useAlternativeToken = false) => {
  const token = useAlternativeToken ? config.alternativeBearerToken : config.bearerToken;
  const url = `${config.apiBaseURL}/${endpoint}?${params}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 429 && !useAlternativeToken) {
      console.log('Rate limit exceeded, trying alternative token...');
      return fetchFromAPI(endpoint, params, true);
    }
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  return response.json();
};

const fetchUserLists = async (screen_name) => {
  try {
    const lists = await fetchFromAPI(`lists/list.json`, `screen_name=${screen_name}`, false);
    return lists;
  } catch (error) {
    return [];
  }
};

const fetchListMembers = async (listID) => {
  return fetchFromAPI(`lists/members.json`, `list_id=${listID}&count=5000`, false);
};

const fetchFollowingList = async (screen_name) => {
  let allFriends = [];
  let cursor = -1;

  do {
    try {
      const data = await fetchFromAPI(
        `friends/list.json`,
        `screen_name=${screen_name}&count=200&cursor=${cursor}`,
        false
      );
      allFriends = allFriends.concat(data.users);
      cursor = data.next_cursor;
    } catch (error) {
      console.error('Failed to fetch friends list:', error);
      throw error; // Stop further pagination and rethrow error to be handled higher up
    }
  } while (cursor !== 0);

  return allFriends;
};

const processUser = (user) => {
  return {
    id: user.id_str,
    name: user.name,
    screen_name: user.screen_name,
    avatar: user.profile_image_url_https.replace('_normal', ''),
    followers: user.followers_count,
    location: user.location,
    bio: user.description,
    last_tweet_time: user.status ? user.status.created_at : null,
  };
};

const run = async () => {
  try {
    const screen_name = await readLocalStorage('twitterHandle');
    const getPopularFriendsLocations = async () => {
      let userData = {};

      console.log('fetching following list and user lists...');

      let [friendsList, userLists] = await Promise.all([
        fetchFollowingList(screen_name),
        fetchUserLists(screen_name),
      ]);

      userData.friends = friendsList.map(processUser);

      chrome.storage.local.set(
        {
          userData,
        },
        function () {
          console.log('Friend data is saved in local storage.');
        }
      );

      if (!userLists.length) {
        console.log('No user lists found.');
        return true; // Consider this a successful run if there are no lists
      }

      const listResults = await Promise.allSettled(
        userLists.map(async (list) => {
          try {
            const listMembers = await fetchListMembers(list.id_str);

            const userDataObject = {
              name: list.name,
              id: list.id_str,
              follower_count: list.subscriber_count,
              member_count: list.member_count,
              creator: list.user.screen_name,
              avatar: list.user.profile_image_url_https.replace('_normal', ''),
              url: `https://twitter.com/i/lists/${list.id_str}`,
              users: listMembers.users.map(processUser),
            };

            if (!userData.userListData) {
              userData.userListData = [];
            }
            userData.userListData.push(userDataObject);

            chrome.storage.local.set({ userData }, function () {
              console.log(`List data for list ${list.name} saved in local storage.`);
            });
          } catch (error) {
            console.log(`Error fetching list ${list.name}:`, error);
            throw error;
          }
        })
      );

      console.log(`fetched ${userData.userListData.length} lists`);

      // Check if all lists were processed successfully
      return listResults.every((result) => result.status === 'fulfilled');
    };

    const allListsProcessed = await getPopularFriendsLocations();
    return allListsProcessed; // Return the success status
  } catch (error) {
    console.log('Error fetching data:', error);
    throw error;
  }
};

(async () => {
  const screen_name = await readLocalStorage('twitterHandle');
  if (!screen_name) {
    console.log('No twitter handle was provided, aborting...');
    return;
  }

  const lastAutoRefreshObj = (await readLocalStorage('lastAutoRefresh')) || {};
  const lastAutoRefresh = lastAutoRefreshObj[screen_name];

  if (lastAutoRefresh) {
    const lastAutoRefreshDate = new Date(lastAutoRefresh);
    const today = new Date();
    const hourDiff = Math.abs(today - lastAutoRefreshDate) / 36e5;

    if (hourDiff < 24) {
      console.log(`Last auto refresh for ${screen_name} was less than 24 hours ago, aborting...`);
      return;
    }
  }

  try {
    const allListsProcessed = await run();
    if (allListsProcessed) {
      lastAutoRefreshObj[screen_name] = new Date().toISOString();
      chrome.storage.local.set(
        {
          lastAutoRefresh: lastAutoRefreshObj,
        },
        function () {
          console.log(`Auto-refresh time updated for ${screen_name} in local storage.`);
        }
      );
    } else {
      console.log('Not all lists were processed successfully. Will retry later.');
    }
  } catch (error) {
    console.log('error, user probably private or does not exist', error);
  }
})();
