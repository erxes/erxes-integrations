import { Document, Model, model, Schema } from 'mongoose';
import { field } from '../models/utils';

export interface ICallRecord {
  conversationId: string;
  roomName: string;
  kind: string;
  status?: string;
  recordId?: string;
}

interface ICallRecordDocument extends ICallRecord, Document {
  _id: string;
}

const callRecordSchema = new Schema({
  _id: field({ pkey: true }),
  conversationId: String,
  roomName: String,
  kind: String,
  status: {
    type: String,
    default: 'ongoing',
  },
  recordId: String,
  createdAt: Date,
});

interface ICallRecordModel extends Model<ICallRecordDocument> {
  getActiveCall(conversationId: string): Promise<ICallRecordDocument> | null;
  createCallRecord(doc: ICallRecord): Promise<ICallRecordDocument>;
  endCallRecord(conversationId: string): Promise<ICallRecordDocument>;
}

const loadCallRecordClass = () => {
  class CallRecord {
    public static async getActiveCall(conversationId: string) {
      return CallRecords.findOne({ conversationId, status: 'ongoing' });
    }

    public static async createCallRecord(doc: ICallRecord) {
      return CallRecords.create({ ...doc, createdAt: Date.now() });
    }

    public static async endCallRecord(conversationId: string) {
      const activeCall = await CallRecords.findOne({ conversationId, status: 'ongoing' });

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
