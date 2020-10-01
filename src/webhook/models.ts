import * as Random from 'meteor-random';
import { Document, Model, model, Schema } from 'mongoose';

export interface IWebhook {
  erxesApiId: string;
  type: string;
}

interface IWebhookDocument extends IWebhook, Document {
  _id: string;
  createdAt: Date;
}

const TYPE = {
  CUSTOMER: 'customer',
  CONVERSATION: 'conversation',
  ALL: ['customer', 'conversation'],
};

const webhookSchema = new Schema({
  erxesApiId: String,
  type: { type: String, enum: TYPE.ALL },
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
    static async generateToken(code?: string) {
      let generatedCode = code || Random.id().substr(0, 17);

      let prevWebhook = await Webhooks.findOne({ token: generatedCode });

      // search until not existing one found
      while (prevWebhook) {
        generatedCode = Random.id().substr(0, 17);

        prevWebhook = await Webhooks.findOne({ token: generatedCode });
      }

      return generatedCode;
    }

    public static async getWebhook(doc: IWebhook) {
      const webhook = Webhooks.findOne(doc);

      if (!webhook) {
        throw new Error('Webhook not found');
      }

      return webhook;
    }

    public static async createWebhook(doc: IWebhook) {
      const token = await this.generateToken();

      return Webhooks.create({ ...doc, token });
    }
  }

  webhookSchema.loadClass(Webhook);
};

loadWebhookClass();

// tslint:disable-next-line
export const Webhooks = model<IWebhookDocument, IWebhookModel>('webhooks', webhookSchema);
