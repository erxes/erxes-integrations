import { debugNylas } from '../debuggers';
import { Accounts } from '../models';

/**
 * Create account with nylas accessToken
 * @param {String} email
 * @param {String} kind
 * @param {String} accessToken
 */
const createAccount = async (kind: string, email: string, accessToken: string) => {
  debugNylas('Creating account for kind: ' + kind);

  if (!email || !accessToken) {
    return debugNylas('Missing email or accesToken');
  }

  const account = await Accounts.findOne({ email });

  if (account) {
    await Accounts.updateOne({ email }, { $set: { token: accessToken } });
  } else {
    await Accounts.create({
      kind,
      name: email,
      email,
    });
  }
};

export { createAccount };
