import { Document, Model, model, Schema } from 'mongoose';
import { field } from '../models/utils';

export interface ICustomer {
  // id on erxes-api
  erxesApiId?: string;
  userId: string;

  name: string;
  screenName: string;
  profilePic;
  string;
}

export interface ICustomerDocument extends ICustomer, Document {}

export const customerSchema = new Schema({
  _id: field({ pkey: true }),
  userId: { type: String, unique: true },
  erxesApiId: String,

  name: String,
  screenName: String,
  profilePic: String,
});

export interface ICustomerModel extends Model<ICustomerDocument> {}

// tslint:disable-next-line
export const Customers = model<ICustomerDocument, ICustomerModel>('customers_twitter', customerSchema);
