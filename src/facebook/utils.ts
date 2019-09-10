import * as graph from 'fbgraph';
import { debugFacebook } from '../debuggers';

export const graphRequest = {
  base(method: string, path?: any, accessToken?: any, ...otherParams) {
    // set access token
    graph.setAccessToken(accessToken);
    graph.setVersion('3.2');

    return new Promise((resolve, reject) => {
      graph[method](path, ...otherParams, (error, response) => {
        if (error) {
          return reject(error.message);
        }
        return resolve(response);
      });
    });
  },
  get(...args): any {
    return this.base('get', ...args);
  },

  post(...args): any {
    return this.base('post', ...args);
  },

  delete(...args): any {
    return this.base('del', ...args);
  },
};

export const getPageList = async (accessToken?: string) => {
  const response: any = await graphRequest.get('/me/accounts?limit=100', accessToken);

  return response.data.map(page => ({
    id: page.id,
    name: page.name,
  }));
};

export const getPageAccessToken = async (pageId: string, userAccessToken: string) => {
  const response = await graphRequest.get(`${pageId}/?fields=access_token`, userAccessToken);

  return response.access_token;
};

export const getPageAccessTokenFromMap = (pageId: string, pageTokens: { [key: string]: string }): string => {
  return (pageTokens || {})[pageId] || null;
};

export const subscribePage = async (pageId, pageToken): Promise<{ success: true } | any> => {
  return graphRequest.post(`${pageId}/subscribed_apps`, pageToken, {
    subscribed_fields: ['conversations', 'messages', 'feed'],
  });
};

export const unsubscribePage = async (pageId, pageToken): Promise<{ success: true } | any> => {
  return graphRequest
    .delete(`${pageId}/subscribed_apps`, pageToken)
    .then(res => res)
    .catch(e => debugFacebook(e));
};

export const getFacebookUser = async (pageId: string, fbUserId: string, userAccessToken: string) => {
  let pageAccessToken;

  try {
    pageAccessToken = await getPageAccessToken(pageId, userAccessToken);
  } catch (e) {
    debugFacebook(`Error ocurred while trying to get page access token with ${e.message}`);
  }

  const pageToken = pageAccessToken;

  return await graphRequest.get(`/${fbUserId}`, pageToken);
};
export const getFacebookUserProfilePic = async (fbId: string) => {
  try {
    const response: any = await graphRequest.get(`/${fbId}/picture?height=600`);
    return response.image ? response.location : '';
  } catch (e) {
    return null;
  }
};

export const restorePost = async (postId: string, pageId: string, userAccessToken: string) => {
  let pageAccessToken;

  try {
    pageAccessToken = await getPageAccessToken(pageId, userAccessToken);
  } catch (e) {
    debugFacebook(`Error ocurred while trying to get page access token with ${e.message}`);
  }

  const fields = `/${postId}?fields=caption,description,link,picture,source,message,from,created_time,comments.summary(true)`;
  return graphRequest.get(fields, pageAccessToken);
};
