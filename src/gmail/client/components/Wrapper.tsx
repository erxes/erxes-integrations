import * as React from 'react';
import { isEmail, ReactMultiEmail } from 'react-multi-email';
import { IMailParams } from '../../types';
import { Avatar, Base, Container, Content, Details, Footer, Header, InputWrapper, Label, Title } from '../styles';

interface IProps {
  type: string;
  user?: {
    email: string;
    firstName: string;
  },
  message?: IMailParams;
  send?: any;
};

interface IState {
  to: string[];
  cc: string[];
  bcc: string[];
  from: string;
  subject: string;
  textPlain: string;
};

class Wrapper extends React.Component<IProps, IState> {
  constructor(props) {
    super(props);

    const { user, type, message } = props;
    const from = type === 'new' ? user.email : message.from;
    
    this.state = {
      from,
      to: type === 'new' ? [] : message.to ? message.to.split() : [],
      cc: type === 'new' ? [] : message.cc ? message.cc.split() : [],
      bcc: type === 'new' ? [] : message.bcc ? message.bcc.split() : [],
      subject: type === 'new' ? '' : message.subject,
      textPlain: type === 'new' ? '' : message.textPlain,
    };
  }

  onEmailChange = <T extends keyof IState>(name: T, values: string[]) => {
    if (name === 'cc') {
      this.setState({ cc: values });
    }

    if (name === 'bcc') {
      this.setState({ bcc: values });
    }

    if (name === 'to') {
      this.setState({ to: values });
    }
  };

  onChange = <T extends keyof IState>(key: T, event: any) => {
    this.setState(({ [key]: event.target.value }) as Pick<IState, keyof IState>);
  };

  validateEmail = (email: string) => {
    return isEmail(email);
  };

  renderMultiEmailInput(emails: string[], name: string) {
    return (
      <ReactMultiEmail
        emails={emails}
        onChange={this.onEmailChange.bind(this, name)}
        validateEmail={this.validateEmail}
        getLabel={this.renderEmailLabel}
      />
    );
  }

  renderEmailLabel = (email: string, index: number, removeEmail: (index: number) => void) => {
    // tslint:disable
    return (
      <div key={index}>
        {email}
        <span onClick={() => removeEmail(index)}>
          ×
        </span>
      </div>
    );
  };

  onSubmit = () => {
    const { message, send, user, type } = this.props;
    const { messageId, headerId, references, threadId } = message;
    const { to, from, cc, bcc, subject, textPlain } = this.state;

    const doc = { email: user.email } as any;
    const params = { to, from, cc, bcc, subject, textPlain } as any;

    if (type === 'new') {
      doc.mailParams = { ...params };
    } else {
      doc.mailParams = {
        ...params,
        messageId,
        headerId,
        references,
        threadId
      }
    }

    send(doc);
  };

  renderInput(label: string, email: boolean = true) {
    const name = label.toLocaleLowerCase();
    const value = this.state[name];

    return (
      <InputWrapper>
        <Label>{label}</Label>
        {email ? this.renderMultiEmailInput(value, name) : (
          <input 
            type="text" 
            value={value} 
            onChange={this.onChange.bind(this, name)} 
          />
        )}
      </InputWrapper>
    );
  }

  renderLabel(label: string, value: string) {
    return (
      <InputWrapper>
        <Label>{label}: {value}</Label>
      </InputWrapper>
    );
  }

  renderDetails() {
    const { type, user, message } = this.props;

    const commonInputs = <>
      {this.renderInput('Cc')}
      {this.renderInput('Bcc')}
    </>;

    if (type === 'new') {
      return (
        <Details>
          {this.renderLabel('From', user.email)}
          {this.renderInput('To')}
          {commonInputs}
          {this.renderInput('Subject', false)}
        </Details>
      );
    }

    if (type === 'show') {
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

    return (
      <Details>
        {this.renderLabel('From', message.from)}
        {this.renderLabel('To', message.to)}
        {commonInputs}
        {this.renderLabel('Subject', message.subject)}
      </Details>
    );
  }

  renderHeader() {
    const { user, type } = this.props;
    const { firstName } = user;

    const letter = firstName ? firstName.charAt(0).toUpperCase() : 'No name';

    return (
      <Header>
        <Title>{type} message</Title>
        <Avatar>{letter}</Avatar>
        {this.renderDetails()}
      </Header>
    );
  }

  renderBody() {
    const { textPlain } = this.state;

    if (this.props.type === 'show') {
      return (
        <Container>
          <Content>{textPlain}</Content>
        </Container>
      );
    }

    return (
      <Container>
        <textarea value={textPlain} onChange={this.onChange.bind(this, 'textPlain')} />
      </Container>
    );
  }

  renderFooter() {
    const { type } = this.props;

    const label = type === 'new' || type === 'reply' ? 'Send' : 'Reply';

    return (
      <Footer>
        <button onClick={this.onSubmit}>{label}</button>
      </Footer>
    );
  }

  render() {
    return (
      <Base>
        {this.renderHeader()}
        {this.renderBody()}
        {this.renderFooter()}
      </Base>
    );
  }
}

export default Wrapper;