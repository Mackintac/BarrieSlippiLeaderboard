
export const getPlayerData = async (connectCode: string) => {
  const query = `
    fragment profileFields on NetplayProfile {
      id
      ratingOrdinal
      ratingUpdateCount
      wins
      losses
      dailyGlobalPlacement
      dailyRegionalPlacement
      continent
      characters {
        character
        gameCount
        __typename
      }
      __typename
    }

    fragment userProfilePage on User {
      fbUid
      displayName
      connectCode {
        code
        __typename
      }
      status
      activeSubscription {
        level
        hasGiftSub
        __typename
      }
      rankedNetplayProfile {
        ...profileFields
        __typename
      }
      rankedNetplayProfileHistory {
        ...profileFields
        season {
          id
          startedAt
          endedAt
          name
          status
          __typename
        }
        __typename
      }
      __typename
    }

    query UserProfilePageQuery($cc: String, $uid: String) {
      getUser(fbUid: $uid, connectCode: $cc) {
        ...userProfilePage
        __typename
      }
    }
  `;

  const req = await fetch('https://internal.slippi.gg/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      operationName: 'UserProfilePageQuery',
      query,
      variables: {
        cc: connectCode,
        uid: connectCode,
      },
    }),
  });
  return req.json();
};


export const getPlayerDataThrottled = async (connectCode: string) => {
  return getPlayerData(connectCode);
};
