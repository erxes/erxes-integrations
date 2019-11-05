import * as sinon from 'sinon';
import { accountFactory } from '../factories';
import { refreshAccessToken } from '../gmail/auth';
import * as watch from '../gmail/watch';
import { Accounts } from '../models';
import './setup.ts';

describe('Gmail test', () => {
  let accountId: string;

  beforeEach(async () => {
    const account = await accountFactory({
      kind: 'gmail',
      email: 'user@gmail.com',
    });

    accountId = account._id;
  });

  afterEach(async () => {
    await Accounts.remove({});
  });

  test('Watch push notification for gmail', async () => {
    const mock = sinon
      .stub(watch, 'watchPushNotification')
      .callsFake(() => Promise.resolve({ data: { historyId: 'historyId', expiration: 'akljsdaklsjd' } }));

    const credential = {
      access_token: 'klajdn',
      refresh_token: 'ajsdklasjdklajwe',
      expiry_date: 'akljsdaklsjd',
      historyId: 'historyId',
      scope: 'scope',
    };

    const { data } = await watch.watchPushNotification(accountId, credential);

    expect(data.expiration).toEqual(credential.expiry_date);
    expect(data.historyId).toEqual(credential.historyId);

    mock.restore();
  });

  test('Refresh access token', async () => {
    const credential = {
      access_token: 'alkdjaljdaklj',
      refresh_token: 'lksjkldjalksdjlkj',
      expiry_date: 'expiry_date',
      scope: 'scope',
    };

    await refreshAccessToken(accountId, credential);

    const account = await Accounts.findOne({ _id: accountId });

    expect(account.token).toEqual(credential.access_token);
    expect(account.tokenSecret).toEqual(credential.refresh_token);
    expect(account.expireDate).toEqual(credential.expiry_date);
  });
});
