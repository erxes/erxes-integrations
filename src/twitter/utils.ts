import * as request from 'request-promise';
import { getEnv } from '../utils';

export const downloadImageFromApi = imageId => {
  return new Promise(async (resolve, reject) => {
    const MAIN_API_DOMAIN = getEnv({ name: 'MAIN_API_DOMAIN' });
    const url = `${MAIN_API_DOMAIN}/read-file?key=${imageId}`;

    const options = {
      url,
      encoding: null,
    };

    try {
      await request.get(options).then(res => {
        const buffer = Buffer.from(res, 'utf8');

        resolve(buffer.toString('base64'));
      });
    } catch (e) {
      reject(e);
    }
  });
};
