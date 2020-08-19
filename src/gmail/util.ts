import { debugGmail } from '../debuggers';
import Accounts, { IAccount } from '../models/Accounts';
import { getCommonGoogleConfigs, getConfig, sendRequest } from '../utils';
import { BASE_URL } from './constant';
import { ICredentials, IGmailRequest } from './types';

export const getCredentialsByEmailAccountId = async ({
  email,
  accountId,
}: {
  email?: string;
  accountId?: string;
}): Promise<ICredentials> => {
  const selector: any = {};

  if (accountId) {
    selector._id = accountId;
  }

  if (email) {
    selector.uid = email;
  }

  const account = await Accounts.findOne(selector);

  if (!account) {
    debugGmail('Error Google: Account not found!');
    return;
  }

  return getCredentials(account);
};

/**
 * Get credential values from account and return formatted
 */
export const getCredentials = (credentials: IAccount): ICredentials => ({
  access_token: credentials.token,
  refresh_token: credentials.tokenSecret,
  expiry_date: parseInt(credentials.expireDate, 10),
  scope: credentials.scope,
});

export const getGoogleConfigs = async () => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_PROJECT_ID } = await getCommonGoogleConfigs();

  return {
    GOOGLE_PROJECT_ID,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_GMAIL_TOPIC: await getConfig('GOOGLE_GMAIL_TOPIC', 'gmail_topic'),
  };
};

export const gmailRequest = async ({ email, type, method, params, body }: IGmailRequest) => {
  try {
    const credential = await getCredentialsByEmailAccountId({ email });

    const response = await sendRequest({
      url: `${BASE_URL}/me/${type}/${params.id ? params.id : ''}`,
      body,
      method,
      params,
      headerParams: { Authorization: `Bearer ${credential.access_token}` },
    });

    return response;
  } catch (e) {
    debugGmail(`Failed: gmailRequest email: ${email} type: ${type} ${e.message}`);
    throw e;
  }
};
