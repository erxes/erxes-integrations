import { Document, Model, model, Schema } from 'mongoose';
import { SMS_DIRECTIONS } from './constants';

interface ISmsStatus {
  date: Date;
  status: string;
}

export interface ISmsRequest {
  from?: string;
  to?: string;
  status?: string;
  requestData?: string;
  responseData?: string;
  telnyxId?: string;
  statusUpdates?: ISmsStatus[];
  errorMessages?: string[];
  erxesApiId?: string;
  conversationId: string;
  integrationId: string;
  direction?: string;
}

interface ISmsRequestUpdate {
  status?: string;
  statusUpdates?: ISmsStatus[];
  responseData?: string;
  errorMessages?: string[];
  telnyxId?: string;
}

export interface ISmsRequestDocument extends ISmsRequest, Document {}

export interface ISmsRequestModel extends Model<ISmsRequestDocument> {
  createRequest(doc: ISmsRequest): Promise<ISmsRequestDocument>;
  updateRequest(_id: string, doc: ISmsRequestUpdate): Promise<ISmsRequestDocument>;
}

const statusSchema = new Schema(
  {
    date: { type: Date, label: 'Status update date' },
    status: { type: String, label: 'Sms delivery status' },
  },
  { _id: false },
);

const schema = new Schema({
  createdAt: { type: Date, default: new Date(), label: 'Created at' },
  from: { type: String, label: 'Sender phone number' },
  to: { type: String, label: 'Receiver phone number' },
  requestData: { type: String, label: 'Stringified request JSON' },
  // erxes-api data
  erxesApiId: { type: String, label: 'Conversation message id' },
  conversationId: { type: String, label: 'Conversation id' },
  integrationId: { type: String, label: 'Linked integration id' },
  // telnyx data
  direction: { type: String, label: 'Sms direction', enum: SMS_DIRECTIONS.ALL },
  status: { type: String, label: 'Sms delivery status' },
  responseData: { type: String, label: 'Stringified response JSON' },
  telnyxId: { type: String, label: 'Telnyx message record id' },
  statusUpdates: { type: [statusSchema], label: 'Sms status updates' },
  errorMessages: { type: [String], label: 'Error messages' },
});

export const loadLogClass = () => {
  class SmsRequest {
    public static async createRequest(doc: ISmsRequest) {
      const { erxesApiId, to } = doc;

      const exists = await SmsRequests.findOne({ erxesApiId, to });

      if (exists) {
        throw new Error(`Sms request to "${to}" from conversation message id "${erxesApiId}" already exists.`);
      }

      return SmsRequests.create(doc);
    }

    public static async updateRequest(_id: string, doc: ISmsRequestUpdate) {
      await SmsRequests.updateOne({ _id }, { $set: doc });

      return SmsRequests.findOne({ _id });
    }
  }

  schema.loadClass(SmsRequest);

  return schema;
};

loadLogClass();

// tslint:disable-next-line
export const SmsRequests = model<ISmsRequestDocument, ISmsRequestModel>('sms_requests', schema);
