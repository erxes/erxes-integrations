import { google } from 'googleapis';
import { debugGmail } from '../debuggers';
import { getAuth } from './auth';
const gmail: any = google.gmail('v1');

/**
 * Gets the current user's Gmail profile
 */
export const getProfile = async (credentials: any) => {
  const auth = getAuth(credentials);

  debugGmail(`Gmail get user profile`);

  let userProfile;

  try {
    userProfile = await gmail.users.getProfile({ auth, userId: 'me' });
  } catch (e) {
    debugGmail(`Gmail failed to get user profile ${e}`);
  }

  return userProfile;
};
