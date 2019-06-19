import { Document, Model, model, Schema } from 'mongoose';
import { field } from '../models/utils';

export interface ICustomer {
  userId: string;
  primaryEmail: string;
  firstName?: string;
  lastName?: string;
  emails?: string[];
  erxesApiId?: string;
}

export interface ICustomerDocument extends ICustomer, Document {}

export const customerSchema = new Schema({
  _id: field({ pkey: true }),
  userId: String,
  erxesApiId: String,
  firstName: String,
  lastName: String,
  emails: [String],
  primaryEmail: String,
});

export interface ICustomerModel extends Model<ICustomerDocument> {}
