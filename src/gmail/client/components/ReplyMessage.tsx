import * as React from 'react';
import { isEmail, ReactMultiEmail } from 'react-multi-email';
import { IMailParams } from '../../types';
import { Avatar, Button, Card, Container, Details, Header, InputWrapper, Label } from '../styles';
import { sendEmail } from '../util';
interface IProps {
  email: string;
  message?: IMailParams;
  send?: any;
};
interface IState {
  cc: string[];
  bcc: string[];
  subject: string;
  to: string;
  from: string;
  textPlain: string;
};
class ReplyMessage extends React.Component<IProps, IState> {
  constructor(props) {
    super(props);

    const { message, email } = this.props;

    this.state = {
      cc: message.cc ? message.cc.split(',') : [],
      bcc: message.bcc ? message.bcc.split(',') : [],
      subject: message.subject || '',
      to: message.from,
      from: email,
      textPlain: '',
    };
  }

  onSubmit = () => {
    const { email, message } = this.props;
    const { headerId, references, threadId } = message;

    const doc = { 
      email,
      ...this.state,
      headerId,
      references,
      threadId
    };

    return sendEmail(doc);
  };

  onEmailChange = <T extends keyof IState>(key: T, value: IState[T]) => {
    this.setState(({ [key]: value } as unknown) as Pick<IState, keyof IState>);
  };

  onInputChange = <T extends keyof IState>(key: T, e: any) => {
    this.setState(({ [key]: e.target.value } as unknown) as Pick<IState, keyof IState>);
  };

  validateEmail = (email: string) => {
    return isEmail(email);
  };

  renderLabel(label: string, value: string) {
    return (
      <InputWrapper>
        <Label>{label}: {value}</Label>
      </InputWrapper>
    );
  }

  renderEmailInput = (name: string, values: string[]) => {
    return (
      <ReactMultiEmail
        placeholder={`${name.toUpperCase()}:`}
        emails={values}
        onChange={this.onEmailChange.bind(this, name)}
        validateEmail={this.validateEmail}
        getLabel={this.renderEmailLabel}
      />
    );
  };

  renderEmailLabel = (email: string, indx: number, removeEmail: (indx: number) => void) => {
    // tslint:disable
    return (
      <div data-tag={true} key={indx}>
        {email}
        <span data-tag-handle={true} onClick={() => removeEmail(indx)}>×</span>
      </div>
    );
  };

  renderDetails() {
    const { cc, bcc, subject, from, to  } = this.state;

    return (
      <Details>
        {this.renderLabel('FROM', from)}
        {this.renderLabel('TO', to)}
        {this.renderEmailInput('cc', cc)}
        {this.renderEmailInput('bcc', bcc)}
        {this.renderLabel('subject', subject)}
      </Details>
    );
  }

  renderHeader() {
    const { email } = this.props;

    const letter = email ? email.charAt(0).toUpperCase() : 'No name';

    return (
      <Header>
        <Avatar>{letter}</Avatar>
        {this.renderDetails()}
      </Header>
    );
  }

  renderBody() {
    const { textPlain } = this.state;

    return (
      <Container>
        <textarea 
          value={textPlain} 
          onChange={this.onInputChange.bind(this, 'textPlain')} 
        />
      </Container>
    );
  }

  renderSend() {
    return <Button onClick={this.onSubmit}>Send</Button>;
  }

  render() {
    return (
      <Card>
        {this.renderHeader()}
        {this.renderBody()}
        {this.renderSend()}
      </Card>
    );
  }
}

export default ReplyMessage;