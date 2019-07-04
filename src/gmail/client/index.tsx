import * as React from 'react';
import { ApolloProvider } from 'react-apollo';
import { render } from 'react-dom';
import apolloClient from './apolloClient';
import Root from './containers/index';

const target = document.getElementById("app");

render(
  <ApolloProvider client={apolloClient}>
    <Root/>
  </ApolloProvider>,
  target
);