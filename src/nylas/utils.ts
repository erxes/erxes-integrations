import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as Nylas from 'nylas';
import { debugNylas } from '../debuggers';

// load config
dotenv.config();

const { NYLAS_CLIENT_SECRET } = process.env;

/**
 * Verify request by nylas signature
 * @param {Request} req
 * @returns {Boolean} verified request state
 */
const verifyNylasSignature = req => {
  const hmac = crypto.createHmac('sha256', NYLAS_CLIENT_SECRET);
  const digest = hmac.update(req.rawBody).digest('hex');

  return digest === req.get('x-nylas-signature');
};

/**
 * Check nylas credentials
 * @returns void
 */
const checkCredentials = () => {
  return Nylas.clientCredentials();
};

/**
 * Request to Nylas SDK
 * @param {String} - accessToken
 * @param {String} - parent
 * @param {String} - child
 * @param {String} - filter
 * @returns {Promise} - nylas response
 */
const nylasRequest = args => {
  const {
    parent,
    child,
    accessToken,
    filter,
  }: {
    parent: string;
    child: string;
    accessToken: string;
    filter?: any;
  } = args;

  if (!checkCredentials()) {
    return debugNylas('Nylas is not configured');
  }

  if (!accessToken) {
    return debugNylas('Access token not found');
  }

  const nylas = Nylas.with(accessToken);

  return nylas[parent][child](filter)
    .then(response => debugNylas(response))
    .catch(e => debugNylas(e.message));
};

export { nylasRequest, checkCredentials, verifyNylasSignature };
