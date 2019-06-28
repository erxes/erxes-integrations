import * as React from 'react';
import { Modal } from 'react-bootstrap';
import { IMailParams } from '../../types';
import { Avatar, Base, Button, Card, Container, Content, Details, Header, InputWrapper, Label } from '../styles';
import ReplayMessage from './ReplyMessage';

interface IProps {
  messageType: string;
  email: string;
  messages?: IMailParams[];
};

interface IState {
  messages: IMailParams[];
  showModal: boolean;
  selectedMessage: IMailParams;
};

const getLetter = (value: string): string => {
  return value.charAt(0).toUpperCase();
};

class ShoMessage extends React.Component<IProps, IState> {
  constructor(props) {
    super(props);

    this.state = { 
      messages: [],
      showModal: false,
      selectedMessage: {} as IMailParams
    };
  }

  componentDidMount() {
    const { messages } = this.props;

    this.setState({ messages });
  }

  // onSubmit = () => {
  //   const { message, send, user, messageType } = this.props;
  //   const { messageId, headerId, references, threadId } = message;
  //   const { to, from, cc, bcc, subject, textPlain } = this.state;

  //   const doc = { email: user.email } as any;
  //   const params = { to, from, cc, bcc, subject, textPlain } as any;

  //   if (messageType === 'new') {
  //     doc.mailParams = { ...params };
  //   } else {
  //     doc.mailParams = {
  //       ...params,
  //       messageId,
  //       headerId,
  //       references,
  //       threadId
  //     }
  //   }

  //   send(doc);
  // };

  openModal = (message: IMailParams) => {
    this.setState(s => ({
      showModal: !s.showModal,
      selectedMessage: message
    }));
  };

  onHide = () => {
    this.setState({ showModal: false });
  };

  renderLabel(label: string, value: string) {
    return (
      <InputWrapper>
        <Label>{label}: {value}</Label>
      </InputWrapper>
    );
  }

  renderDetails(message: IMailParams) {
    return (
      <Details>
        {this.renderLabel('From', message.from)}
        {this.renderLabel('To', message.to)}
        {this.renderLabel('Cc', message.cc)}
        {this.renderLabel('Bcc', message.bcc)}
        {this.renderLabel('Subject', message.subject)}
      </Details>
    );
  }

  renderHeader(message: IMailParams) {
    const { email } = this.props;
    const { from } = message;

    const name = from ? from : email;

    return (
      <Header>
        <Avatar>{getLetter(name)}</Avatar>
        {this.renderDetails(message)}
        {this.renderReply(message)}
      </Header>
    );
  }

  renderBody(message: IMailParams) {
    return (
      <Container>
        <Content>{message.textPlain}</Content>
      </Container>
    );
  }

  renderReply(message: IMailParams) {
    return <Button onClick={this.openModal.bind(this, message)}>Reply</Button>;
  }

  renderCard(index: number, message: IMailParams) {
    return (
      <Card key={index}>
        {this.renderHeader(message)}
        {this.renderBody(message)}
      </Card>
    );
  }

  renderModal() {
    const { showModal, selectedMessage } = this.state;
    const { email } = this.props;

    if (!showModal) {
      return null;
    }

    return (
      <Modal show={showModal} onHide={this.onHide}>
        <Modal.Header closeButton={true}>
          <Modal.Title>Replay message</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ReplayMessage email={email} message={selectedMessage} />
        </Modal.Body>
      </Modal>
    );
  }

  render() {
    const { messages } = this.props;

    const cards = messages.map((msg, indx) => this.renderCard(indx, msg));

    return (
      <Base>
        {this.renderModal()}
        {cards}
      </Base>
    );
  }
}

export default ShoMessage;