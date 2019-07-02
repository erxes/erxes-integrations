import * as React from 'react';
import { Modal } from 'react-bootstrap';
import { IMailParams } from '../../types';
import { Avatar, Base, Button, Card, Container, Content, Details, Header, InputWrapper, Label } from '../styles';
import { getRandomColor } from '../util';
import ReplayMessage from './ReplyMessage';

interface IProps {
  messageType: string;
  email: string;
  message?: IMailParams;
};

interface IState {
  message: IMailParams;
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
      message: {},
      showModal: false,
      selectedMessage: {} as IMailParams
    };
  }

  componentDidMount() {
    const { message } = this.props;

    this.setState({ message });
  }

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
        <Avatar backgroundColor={getRandomColor()}>{getLetter(name)}</Avatar>
        {this.renderDetails(message)}
        {from !== email && this.renderReply(message)}
      </Header>
    );
  }

  renderBody(message: IMailParams) {
    return (
      <Container>
        <Content>
          {message.textHtml}
        </Content>
      </Container>
    );
  }

  renderReply(message: IMailParams) {
    return <Button onClick={this.openModal.bind(this, message)}>Reply</Button>;
  }

  renderCard(message: IMailParams, currentUser: string) {
    return (
      <Card isCustomer={message.from !== currentUser}>
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
      <Modal show={showModal} onHide={this.onHide} size="sm">
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
    const { message, email } = this.props;

    return (
      <Base>
        {this.renderModal()}
        {this.renderCard(message, email)}
      </Base>
    );
  }
}

export default ShoMessage;