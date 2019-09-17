export interface IFilter {
  [key: string]: string;
}

export interface IProviderSettings {
  microsoft_client_id?: string;
  microsoft_client_secret?: string;
  microsoft_refresh_token?: string;
  redirect_uri?: string;
  google_refresh_token?: string;
  google_client_id?: string;
  google_client_secret?: string;
  email?: string;
  password?: string;
}
