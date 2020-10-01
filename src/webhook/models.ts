import { Document, Model, model, Schema } from 'mongoose';

export interface IWebhook {
  erxesApiId: string;
  type: string;
}

interface IWebhookDocument extends IWebhook, Document {
  _id: string;
  createdAt: Date;
}

const webhookSchema = new Schema({
  erxesApiId: String,
  type: String,
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  token: String,
});

interface IWebhookModel extends Model<IWebhookDocument> {
  createWebhook(doc: IWebhook): Promise<IWebhookDocument>;
  getWebhook(doc: IWebhook): Promise<IWebhookDocument>;
}

const loadWebhookClass = () => {
  class Webhook {
    public static async getWebhook(doc: IWebhook) {
      const webhook = Webhooks.findOne(doc);

      if (!webhook) {
        throw new Error('Webhook not found');
      }

      return webhook;
    }

    public static async createWebhook(doc: IWebhook) {
      const token = Math.random().toString();

      return Webhooks.create({ ...doc, token });
    }
  }

  webhookSchema.loadClass(Webhook);
};

loadWebhookClass();

// tslint:disable-next-line
export const Webhooks = model<IWebhookDocument, IWebhookModel>('webhooks', webhookSchema);
