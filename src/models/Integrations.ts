import { Document, Model, model, Schema } from 'mongoose';
import { field } from './utils';

export interface IIntegration {
  kind: string;
  accountId: string;
  erxesApiId: string;
  facebookPageIds?: string[];
  facebookPageTokensMap?: { [key: string]: string };
  email: string;
  phoneNumber: string;
  expiration?: string;
  gmailHistoryId?: string;
  chatfuelConfigs?: { [key: string]: string };
}

export interface IIntegrationDocument extends IIntegration, Document {}

// schema for integration document
export const integrationSchema = new Schema({
  _id: field({ pkey: true }),
  kind: String,
  accountId: String,
  erxesApiId: String,
  phoneNumber: String,
  facebookPageIds: [String],
  email: String,
  expiration: String,
  gmailHistoryId: String,
  facebookPageTokensMap: field({
    type: Object,
    default: {},
  }),
  chatfuelConfigs: field({
    type: Object,
    default: {},
  }),
});

export interface IIntegrationModel extends Model<IIntegrationDocument> {
  getIntegration(selector): Promise<IIntegrationDocument>;
}

export const loadClass = () => {
  class Integration {
    public static async getIntegration(selector) {
      const integration = await Integrations.findOne(selector);

      if (!integration) {
        throw new Error('Integration not found');
      }

      return integration;
    }
  }

  integrationSchema.loadClass(Integration);

  return integrationSchema;
};

loadClass();

// tslint:disable-next-line
const Integrations = model<IIntegrationDocument, IIntegrationModel>('integrations', integrationSchema);

export default Integrations;
