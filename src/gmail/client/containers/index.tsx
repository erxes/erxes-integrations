import gql from 'graphql-tag';
import * as React from 'react';
import { graphql } from 'react-apollo';
import ShowMessage from '../components/ShowMessage';
import { queries } from '../data';

interface IWindow {
  conversationId: string;
  email: string;
}

declare const window: IWindow;

class BaseContainer extends React.Component<any> {
  render() {
    const { conversationMessagesQuery } = this.props;

    if (conversationMessagesQuery.loading) {
      return null;
    }

    const messages = conversationMessagesQuery.conversationMessages || [];

    return messages.map((message, index) => (
      <ShowMessage key={index} message={message} email={window.email} /> 
    ))
  }
}

export default graphql(gql(queries.messages), {
  name: 'conversationMessagesQuery',
  options: () => ({
    variables: { conversationId: window.conversationId }
  })
})(BaseContainer);