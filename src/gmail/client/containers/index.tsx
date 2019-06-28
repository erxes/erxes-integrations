import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { IConversationMessage } from '../../model';
import ShowMessage from '../components/ShowMessage';
import { fetchConversationMessages } from '../util';

interface IWindow {
  conversationId: string;
  email: string;
  messageType: string;
}

declare const window: IWindow;

interface IState {
  messages: IConversationMessage[];
};

class BaseContainer extends React.Component<{}, IState> {
  constructor(props) {
    super(props);

    this.state = { messages: [] };
  }

  async componentDidMount() {
    const { conversationId } = window;

    const messages = await fetchConversationMessages({ conversationId });

    this.setState({ messages });
  }

  render() {
    const { messageType, email } = window;
    const { messages } = this.state;

    if (messages.length === 0) {
      return null;
    }

    const updatedProps = {
      email,
      messageType,
      messages,
    };

    return <ShowMessage {...updatedProps} />;
  }
}

ReactDOM.render(<BaseContainer/>, document.getElementById("app"));