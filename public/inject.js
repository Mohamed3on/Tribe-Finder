// Update queryIds if they stop working — grab new ones from x.com network tab
const config = {
  bearer:
    'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
  queryIds: {
    ListMembers: '7FPk01hdc1jyzL6Gj8vMZw',
    UserByScreenName: 'NimuplG1OB7Fd2btCLdBOw',
    Following: '0yD6Eiv23DKXRDU9VxlG2A',
    CombinedLists: 'nMnGz4LNdB660Pr6s3jyBQ',
    UserTweets: '6r5OLCC_wFH4CpRyXKuAmQ',
    ListLatestTweetsTimeline: 'RgfF9JYDXXI1F-ZrDqjUfQ',
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
    rweb_cashtags_enabled: true,
    rweb_cashtags_composer_attachment_enabled: true,
    rweb_sports_post_context_enabled: true,
    content_disclosure_indicator_enabled: true,
    content_disclosure_ai_generated_indicator_enabled: true,
    responsive_web_nested_quote_preview_enabled: true,
  },
  // UserTweets needs a few extra flags on top of the base set. Passing a complete
  // set (verified working) skips gqlGet's per-call auto-add retries, which matter
  // here because enrichment fires one request per user against a tight rate limit.
  userTweetsFeatures: {
    rweb_video_screen_enabled: false,
    profile_label_improvements_pcf_label_in_post_enabled: true,
    rweb_tipjar_consumption_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    premium_content_api_read_enabled: false,
    communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    responsive_web_grok_analyze_button_fetch_trends_enabled: false,
    responsive_web_grok_analyze_post_followups_enabled: true,
    rweb_video_timestamps_enabled: true,
    responsive_web_grok_share_attachment_enabled: true,
    articles_preview_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    responsive_web_grok_show_grok_translated_post: false,
    responsive_web_grok_analysis_button_from_backend: true,
    creator_subscriptions_quote_tweet_preview_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_grok_image_annotation_enabled: true,
    responsive_web_enhance_cards_enabled: false,
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
  if (request.message === 'enrichTweets') {
    processEnrichQueue();
    sendResponse({ ok: true });
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
    tweet_count: u.legacy?.statuses_count,
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

// ---- Lazy "last tweet date" enrichment ---------------------------------------
// The app queues just the users in the view you open (pendingEnrich in storage), and
// we drain that queue here, writing results into a tweetDates map keyed by user id
// (shared across friends + every list, no duplication). List members are dated in
// bulk from their lists' feeds; only the rest cost a UserTweets call each, against a
// ~50-per-15-min bucket.
const TWEET_DATE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // weekly re-check when post counts are unknown
let enriching = false;

const reportEnrich = (progress) => {
  chrome.storage.local.set({ enrichProgress: progress });
};

// Run `worker` over items with bounded concurrency (429s are handled inside gqlGet).
async function pool(items, size, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length) await worker(queue.shift());
  });
  await Promise.all(runners);
}

// Newest created_at across the returned tweets (incl. pins/retweets = last activity).
const extractLatestTweetDate = (instructions) => {
  let latestMs = null;
  const consider = (entry) => {
    if (!entry?.entryId?.startsWith('tweet-')) return;
    const r = entry.content?.itemContent?.tweet_results?.result;
    const created = (r?.legacy || r?.tweet?.legacy)?.created_at;
    if (!created) return;
    const t = new Date(created).getTime();
    if (Number.isFinite(t) && (latestMs === null || t > latestMs)) latestMs = t;
  };
  for (const inst of instructions || []) {
    if (Array.isArray(inst.entries)) inst.entries.forEach(consider);
    if (inst.entry) consider(inst.entry); // TimelinePinEntry carries a single entry
  }
  return latestMs === null ? null : new Date(latestMs).toISOString();
};

const fetchLatestTweetDate = async (userId) => {
  const vars = {
    userId,
    count: 20,
    includePromotedContent: false,
    withQuickPromoteEligibilityTweetFields: false,
    withVoice: false,
  };
  const data = await gqlGet('UserTweets', vars, config.userTweetsFeatures);
  const instructions =
    data.data?.user?.result?.timeline?.timeline?.instructions ||
    data.data?.user?.result?.timeline_v2?.timeline?.instructions ||
    [];
  return extractLatestTweetDate(instructions);
};

// The member post a list-feed entry stands for. A conversation module is dated by its
// newest tweet (the member's reply): the rest is context, maybe weeks old, that would
// misdate its authors.
const newestPost = (entry) =>
  (entry.content?.items?.map((i) => i.item) || [entry.content])
    .map((c) => c?.itemContent?.tweet_results?.result)
    .map((r) => r?.legacy || r?.tweet?.legacy)
    .filter((t) => t?.created_at)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

const FEED_MAX_PAGES = 300; // ~90 posts each; ~4 min, inside the feed's 500-per-15-min bucket
const sweptAt = {}; // list id -> when its feed was last read as deep as it goes

// Batched pass: a list's feed holds its members' posts newest-first, so the first post we
// see from a member is their latest. Each read dates every member it sees, not just the
// ids asked for, so one deep read covers later views too, and a list read to the end or
// the cap isn't re-read for an hour. Reports each page's dates to onDates; returns the
// asked-for ids that never showed up, which still need UserTweets.
const sweepListFeeds = async (ids, onDates) => {
  const undated = new Set(ids);
  const dated = new Set();
  const lists = (await readLocalStorage('userData'))?.userListData || [];
  for (const list of lists) {
    const members = new Set(list.users.map((u) => u.id));
    const wanted = () => [...undated].some((id) => members.has(id));
    if (!wanted() || Date.now() - (sweptAt[list.id] || 0) < 60 * 60 * 1000) continue;
    let cursor = null;
    let page = 0;
    try {
      while (wanted()) {
        const vars = { listId: list.id, count: 100 };
        if (cursor) vars.cursor = cursor;
        const data = await gqlGet('ListLatestTweetsTimeline', vars);
        const entries = (data.data?.list?.tweets_timeline?.timeline?.instructions || [])
          .flatMap((inst) => inst.entries || [inst.entry])
          .filter(Boolean);
        cursor = entries.find((e) => e.entryId.includes('cursor-bottom'))?.content?.value;
        const posts = entries
          .filter((e) => e.entryId.startsWith('tweet-') || e.entryId.includes('-conversation-'))
          .map(newestPost)
          .filter(Boolean);
        const dates = {};
        for (const post of posts) {
          const id = post.user_id_str;
          if (!members.has(id) || dated.has(id)) continue;
          dated.add(id);
          undated.delete(id);
          dates[id] = new Date(post.created_at).toISOString();
        }
        if (Object.keys(dates).length) onDates(dates);
        if (!cursor || !posts.length || ++page === FEED_MAX_PAGES) {
          sweptAt[list.id] = Date.now();
          break;
        }
      }
    } catch (e) {
      console.warn(`list feed "${list.name}" failed:`, e.message);
    }
  }
  return undated;
};

const processEnrichQueue = async () => {
  if (enriching) return;
  enriching = true;
  try {
    while (true) {
      const pending = (await readLocalStorage('pendingEnrich')) || [];
      if (!pending.length) break;
      // Claim this batch; anything queued while we work re-triggers the loop.
      chrome.storage.local.set({ pendingEnrich: [] });

      const tweetDates = (await readLocalStorage('tweetDates')) || {};
      // Post counts from the last refresh: a date stays valid until the count moves.
      const userData = (await readLocalStorage('userData')) || {};
      const counts = {};
      for (const u of [
        ...(userData.friends || []),
        ...(userData.userListData || []).flatMap((l) => l.users),
      ])
        counts[u.id] = u.tweet_count;
      const now = Date.now();
      const todo = [...new Set(pending)].filter((id) => {
        const e = tweetDates[id];
        if (!e) return true;
        if (e.tweet_count != null && counts[id] != null) return e.tweet_count !== counts[id];
        return now - new Date(e.fetchedAt).getTime() > TWEET_DATE_TTL_MS;
      });
      if (!todo.length) continue;

      let done = 0;
      const asked = new Set(todo);
      reportEnrich({ done, total: todo.length, running: true });
      const save = (dates) => {
        const fetchedAt = new Date().toISOString();
        for (const [id, last_tweet] of Object.entries(dates)) {
          tweetDates[id] = { last_tweet, fetchedAt, tweet_count: counts[id] };
          if (asked.has(id)) done++;
        }
        chrome.storage.local.set({ tweetDates }); // stream results to the UI live
        reportEnrich({ done, total: todo.length, running: true });
      };
      const undated = await sweepListFeeds(todo, save);
      await pool(undated, 4, async (id) => {
        try {
          save({ [id]: await fetchLatestTweetDate(id) });
        } catch (e) {
          // Left unsaved so it's retried, instead of showing as inactive for a week
          console.warn(`enrich ${id} failed:`, e.message);
        }
      });
      reportEnrich({ done, total: todo.length, running: false });
      console.log(
        `enriched ${done}/${todo.length} users, ${todo.length - undated.size} via list feeds`
      );
    }
  } finally {
    enriching = false;
  }
};


const run = async () => {
  try {
    reportProgress({ phase: 'starting' });
    const screen_name = await readLocalStorage('twitterHandle');

    // Stamp before fetching, not after: runs take minutes (pagination + 429 waits),
    // so a stamp-on-success means any interrupted run restarts on every new x.com tab
    const lastAutoRefreshObj = (await readLocalStorage('lastAutoRefresh')) || {};
    lastAutoRefreshObj[screen_name] = new Date().toISOString();
    chrome.storage.local.set({ lastAutoRefresh: lastAutoRefreshObj });

    const userId = await resolveUserId(screen_name);

    // Seed from existing data so partial writes freshen the view instead of blanking it
    let userData = (await readLocalStorage('userData')) || {};
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

          const freshList = {
            name: list.name,
            id: list.id_str,
            follower_count: list.subscriber_count,
            member_count: list.member_count,
            creator: list.creator_screen_name,
            avatar: list.creator_avatar,
            url: `https://x.com/i/lists/${list.id_str}`,
            users: members,
          };
          if (!userData.userListData) userData.userListData = [];
          const i = userData.userListData.findIndex((l) => l.id === list.id_str);
          if (i === -1) userData.userListData.push(freshList);
          else userData.userListData[i] = freshList;

          chrome.storage.local.set({ userData });
          listsDone++;
          updateProgress();
          console.log(`List "${list.name}" saved (${members.length} members).`);
        })
      ).then((results) => {
        // Drop lists the user no longer has; keep stale data for lists whose fetch failed
        const known = new Set(userLists.map((l) => l.id_str));
        userData.userListData = (userData.userListData || []).filter((l) => known.has(l.id));
        return results;
      });
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

  // Drain any enrichment queued before this tab existed (independent of the refresh throttle).
  processEnrichQueue();

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
    await run();
  } catch (error) {
    console.log('error, user probably private or does not exist', error);
  }
})();
