// Update queryIds if they stop working — grab new ones from x.com network tab
const config = {
  bearer:
    'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
  queryIds: {
    ListMembers: '7FPk01hdc1jyzL6Gj8vMZw',
    UserByScreenName: 'NimuplG1OB7Fd2btCLdBOw',
    Following: '0yD6Eiv23DKXRDU9VxlG2A',
    CombinedLists: 'nMnGz4LNdB660Pr6s3jyBQ',
  },
  features: {
    rweb_video_screen_enabled: false,
    profile_label_improvements_pcf_label_in_post_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    articles_preview_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    responsive_web_grok_analyze_post_followups_enabled: true,
    responsive_web_grok_share_attachment_enabled: true,
    responsive_web_grok_annotations_enabled: true,
    responsive_web_grok_image_annotation_enabled: true,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_enhance_cards_enabled: false,
    hidden_profile_likes_enabled: true,
    verified_phone_label_enabled: false,
    responsive_web_twitter_article_notes_tab_enabled: true,
    subscriptions_verification_info_verified_since_enabled: true,
    subscriptions_verification_info_is_identity_verified_enabled: true,
    highlights_tweets_tab_ui_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    hidden_profile_subscriptions_enabled: true,
    responsive_web_grok_analysis_button_from_backend: true,
    tweet_awards_web_tipping_enabled: false,
    responsive_web_grok_show_grok_translated_post: false,
    responsive_web_jetfuel_frame: true,
    rweb_tipjar_consumption_enabled: false,
    responsive_web_grok_community_note_auto_translation_is_enabled: false,
    premium_content_api_read_enabled: false,
    responsive_web_profile_redirect_enabled: false,
    responsive_web_grok_analyze_button_fetch_trends_enabled: false,
    post_ctas_fetch_enabled: true,
    responsive_web_grok_imagine_annotation_enabled: true,
    responsive_web_media_download_video_enabled: false,
    tweetypie_unmention_optimization_enabled: true,
    rweb_video_timestamps_enabled: true,
  },
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const reportProgress = (progress) => {
  chrome.storage.local.set({ fetchProgress: progress });
};

const getHeaders = () => {
  const ct0 = document.cookie.match(/ct0=([^;]+)/)?.[1];
  if (!ct0) throw new Error('No ct0 cookie found — are you logged in to X?');
  return {
    authorization: `Bearer ${config.bearer}`,
    'content-type': 'application/json',
    'x-csrf-token': ct0,
    'x-twitter-auth-type': 'OAuth2Session',
    'x-twitter-active-user': 'yes',
  };
};

const gqlGet = async (operation, variables, extraFeatures = {}) => {
  const origin = location.origin;
  const url = new URL(
    `${origin}/i/api/graphql/${config.queryIds[operation]}/${operation}`
  );
  const features = { ...config.features, ...extraFeatures };
  url.searchParams.set('variables', JSON.stringify(variables));
  url.searchParams.set('features', JSON.stringify(features));
  const res = await fetch(url.toString(), {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (res.status === 429) {
    const resetAt = res.headers.get('x-rate-limit-reset');
    const waitMs = resetAt ? (Number(resetAt) * 1000 - Date.now() + 1000) : 60000;
    console.warn(`${operation}: rate limited, waiting ${Math.ceil(waitMs / 1000)}s...`);
    await delay(waitMs);
    return gqlGet(operation, variables, extraFeatures);
  }
  if (!res.ok) {
    const text = await res.text();
    const match = text.match(/cannot be null: ([^"]+)/);
    if (match && !Object.keys(extraFeatures).length) {
      const missing = {};
      match[1].split(', ').forEach((f) => (missing[f.trim()] = true));
      console.warn(`${operation}: auto-adding missing features:`, Object.keys(missing));
      return gqlGet(operation, variables, missing);
    }
    throw new Error(`${operation} HTTP ${res.status}: ${text}`);
  }
  return res.json();
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
    return true;
  }
});

async function readLocalStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] || null);
    });
  });
}

const resolveUserId = async (screenName) => {
  const data = await gqlGet('UserByScreenName', { screen_name: screenName });
  return data.data.user.result.rest_id;
};

// Extract user entries from GraphQL timeline instructions
const extractUsersFromTimeline = (instructions) => {
  const users = [];
  let cursor = null;
  for (const inst of instructions) {
    if (inst.type !== 'TimelineAddEntries') continue;
    for (const entry of inst.entries) {
      if (entry.entryId.startsWith('user-')) {
        const r = entry.content?.itemContent?.user_results?.result;
        if (r && r.__typename === 'User') users.push(r);
      } else if (entry.entryId.includes('cursor-bottom')) {
        cursor = entry.content?.value;
      }
    }
  }
  return { users, cursor };
};

// Convert a GraphQL user result to our app's user format
const processUser = (u) => {
  const avatar = (u.avatar?.image_url || u.legacy?.profile_image_url_https || '').replace(
    '_normal',
    ''
  );
  return {
    id: u.rest_id,
    name: u.core?.name || u.legacy?.name,
    screen_name: u.core?.screen_name || u.legacy?.screen_name,
    avatar,
    followers: u.legacy?.followers_count ?? 0,
    location: u.location?.location || u.legacy?.location || '',
    bio: u.profile_bio?.description || u.legacy?.description || '',
  };
};

const fetchUserLists = async (userId) => {
  const data = await gqlGet('CombinedLists', { userId, count: 100 });

  // CombinedLists returns lists in timeline instructions
  const lists = [];
  const instructions =
    data.data?.viewer?.list_management_timeline?.timeline?.instructions ||
    data.data?.user?.result?.timeline?.timeline?.instructions ||
    [];

  for (const inst of instructions) {
    if (inst.type !== 'TimelineAddEntries') continue;
    for (const entry of inst.entries) {
      const list =
        entry.content?.itemContent?.list ||
        entry.content?.itemContent?.list_results?.result;
      if (!list) continue;

      const creator = list.user_results?.result || list.creator_results?.result;
      lists.push({
        id_str: list.id_str || list.rest_id,
        name: list.name,
        subscriber_count: list.subscriber_count ?? list.follower_count ?? 0,
        member_count: list.member_count ?? 0,
        creator_screen_name: creator?.core?.screen_name || creator?.legacy?.screen_name || '',
        creator_avatar: (
          creator?.avatar?.image_url ||
          creator?.legacy?.profile_image_url_https ||
          ''
        ).replace('_normal', ''),
      });
    }
  }

  if (!lists.length) {
    console.warn('CombinedLists returned no lists — response:', JSON.stringify(data, null, 2));
  }

  return lists;
};

const fetchListMembers = async (listId) => {
  const all = [];
  let cursor = null;
  do {
    const vars = { listId, count: 100 };
    if (cursor) vars.cursor = cursor;
    const data = await gqlGet('ListMembers', vars);
    const { users, cursor: next } = extractUsersFromTimeline(
      data.data.list.members_timeline.timeline.instructions
    );
    all.push(...users);
    console.log(`List ${listId} members: +${users.length} (total ${all.length})`);
    cursor = next;
    if (!cursor || users.length === 0) break;
  } while (true);
  return all;
};

const fetchFollowingList = async (userId) => {
  const all = [];
  let cursor = null;
  do {
    const vars = { userId, count: 100, includePromotedContent: false };
    if (cursor) vars.cursor = cursor;
    const data = await gqlGet('Following', vars);
    const { users, cursor: next } = extractUsersFromTimeline(
      data.data.user.result.timeline.timeline.instructions
    );
    all.push(...users);
    console.log(`Following: +${users.length} (total ${all.length})`);
    cursor = next;
    if (!cursor || users.length === 0) break;
  } while (true);
  return all;
};


const run = async () => {
  try {
    reportProgress({ phase: 'starting' });
    const screen_name = await readLocalStorage('twitterHandle');
    const userId = await resolveUserId(screen_name);

    let userData = {};
    let friendsDone = false;
    let listsDone = 0;
    let listsTotal = 0;

    const updateProgress = () => {
      reportProgress({ phase: 'fetching', friendsDone, listsDone, listsTotal });
    };

    console.log('fetching following list, user lists, and list members all in parallel...');
    updateProgress();

    // Kick off following fetch (runs independently)
    const friendsPromise = fetchFollowingList(userId).then((raw) => {
      userData.friends = raw.map(processUser);
      chrome.storage.local.set({ userData });
      friendsDone = true;
      updateProgress();
      console.log(`Friend data saved (${userData.friends.length} users).`);
    });

    // Kick off list discovery → fan out member fetches with concurrency pool
    const listsPromise = fetchUserLists(userId).then((userLists) => {
      if (!userLists.length) {
        console.log('No user lists found.');
        return [];
      }
      listsTotal = userLists.length;
      updateProgress();

      return Promise.allSettled(
        userLists.map(async (list) => {
          const rawMembers = await fetchListMembers(list.id_str);
          const members = rawMembers.map(processUser);

          if (!userData.userListData) userData.userListData = [];
          userData.userListData.push({
            name: list.name,
            id: list.id_str,
            follower_count: list.subscriber_count,
            member_count: list.member_count,
            creator: list.creator_screen_name,
            avatar: list.creator_avatar,
            url: `https://x.com/i/lists/${list.id_str}`,
            users: members,
          });

          chrome.storage.local.set({ userData });
          listsDone++;
          updateProgress();
          console.log(`List "${list.name}" saved (${members.length} members).`);
        })
      );
    });

    // Wait for everything
    const [, listResults] = await Promise.all([friendsPromise, listsPromise]);

    console.log(`fetched ${userData.userListData?.length ?? 0} lists`);
    chrome.storage.local.set({ userData });
    reportProgress({ phase: 'done' });

    return !listResults?.length || listResults.every((r) => r.status === 'fulfilled');
  } catch (error) {
    console.log('Error fetching data:', error);
    reportProgress({ phase: 'error', message: error.message });
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

    if (hourDiff < 1) {
      console.log(`Last auto refresh for ${screen_name} was less than 1 hour ago, aborting...`);
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
