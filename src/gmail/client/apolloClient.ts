import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';
import { split } from 'apollo-link';
import { createHttpLink } from 'apollo-link-http';
import { WebSocketLink } from 'apollo-link-ws';
import { getMainDefinition } from 'apollo-utilities';

// Create an http link:
const httpLink = createHttpLink({
  uri: 'http://localhost:3400/graphql',
});

// Subscription config
export const wsLink = new WebSocketLink({
  uri: 'ws://localhost:3300/subscriptions',
  options: {
    reconnect: true,
    timeout: 30000,
  },
});

interface IDefinintion {
  kind: string;
  operation?: string;
}

// Setting up subscription with link
const link = split(
  // split based on operation type
  ({ query }) => {
    const { kind, operation }: IDefinintion = getMainDefinition(query);
    return kind === 'OperationDefinition' && operation === 'subscription';
  },
  wsLink,
  httpLink,
);

// Creating Apollo-client
const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
});

export default client;
