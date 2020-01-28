import { Document, Model, model, Schema } from 'mongoose';
import { field } from '../models/utils';

export interface ICallRecord {
  erxesApiMessageId: string;
  roomName: string;
  kind: string;
  privacy: string;
  status?: string;
  recordId?: string;
}

interface ICallRecordDocument extends ICallRecord, Document {
  _id: string;
}

const callRecordSchema = new Schema({
  _id: field({ pkey: true }),
  erxesApiMessageId: String,
  roomName: String,
  kind: String,
  privacy: String,
  status: {
    type: String,
    default: 'ongoing',
  },
  recordId: String,
  createdAt: Date,
});

interface ICallRecordModel extends Model<ICallRecordDocument> {
  getActiveCall(messageId: string): Promise<ICallRecordDocument> | null;
  createCallRecord(doc: ICallRecord): Promise<ICallRecordDocument>;
  endCallRecord(messageId: string): Promise<ICallRecordDocument>;
}

const loadCallRecordClass = () => {
  class CallRecord {
    public static async getActiveCall(messageId: string) {
      return CallRecords.findOne({ erxesApiMessageId: messageId });
    }

    public static async createCallRecord(doc: ICallRecord) {
      return CallRecords.create({ ...doc, createdAt: Date.now() });
    }

    public static async endCallRecord(messageId: string) {
      const activeCall = await CallRecords.findOne({ erxesMessageId: messageId });

      activeCall.status = 'end';
      activeCall.save();

      return activeCall;
    }
  }

  callRecordSchema.loadClass(CallRecord);

  return callRecordSchema;
};

loadCallRecordClass();

// tslint:disable-next-line
export const CallRecords = model<ICallRecordDocument, ICallRecordModel>('call_records', callRecordSchema);
