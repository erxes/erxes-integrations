import { getOrCreateCustomer, IUser } from './store';

export interface IUsers {
  [key: string]: IUser;
}

const receiveDms = async requestBody => {
  const { for_user_id } = requestBody;

  const users: IUsers = requestBody.users;

  const customer = await getOrCreateCustomer(for_user_id, users[for_user_id]);

  return customer;
};

export default receiveDms;
