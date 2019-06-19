export interface IAccountCredentials {
  token: string;
  tokenSecret: string;
  expireDate: string;
  scope: string;
}

export interface ICredentials {
  access_token: string;
  refresh_token: string;
  expire_date: string;
  scope: string;
}
