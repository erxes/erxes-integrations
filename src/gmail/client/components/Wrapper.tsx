import * as React from 'react';
import { isEmail, ReactMultiEmail } from 'react-multi-email';
import { Avatar, Base, Container, Details, Footer, Header, InputWrapper, Label, Title } from '../styles';

interface IProps {
  type: string;
  user?: {
    email: string;
    firstName: string;
  },
  message?: any;
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

  validateEmail = (email: string) => {
    return isEmail(email);
  };

  renderMultiEmailInput(emails, name) {
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
    return (
      // tslint:disable
      <div data-tag key={index}>
        {email}
        <span data-tag-handle onClick={() => removeEmail(index)}>
          ×
        </span>
      </div>
    );
  };

  onSubmit = () => {
    const { message, send, user, type } = this.props;
    const { messageId, headerId, references, threadId } = message;
    const { to, from, cc, bcc, subject, textPlain } = this.state;

    const doc = {} as any;
    const params = { to, from, cc, bcc, subject, textPlain } as any;

    if (type === 'new') {
      doc.email = from;
      doc.mailParams = { ...params };
    } else {
      doc.email = user.email;
      doc.mailParams = {
        ...params,
        messageId: messageId,
        headerId: headerId,
        references: references,
        threadId: threadId
      }
    }

    send(doc);
  };

  onChange = <T extends keyof IState>(key: T, event: any) => {
    this.setState(({ [key]: event.target.value }) as Pick<IState, keyof IState>);
  };

  renderInput(label: string, name: string, email: boolean = true) {
    return (
      <InputWrapper>
        <Label>{label}</Label>
        {email ? this.renderMultiEmailInput(this.state[name], name) : (
          <input 
            type="text" 
            value={this.state[name]} 
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

    const commonInput = <>
      {this.renderInput('Cc', 'cc')}
      {this.renderInput('bcc', 'bcc')}
    </>;

    if (type === 'new') {
      return (
        <Details>
          {this.renderLabel('From', user.email)}
          {this.renderInput('To', 'to')}
          {commonInput}
          {this.renderInput('Subject', 'subject', false)}
        </Details>
      );
    }

    return (
      <Details>
        {this.renderLabel('From', message.from)}
        {this.renderLabel('To', user.email)}
        {commonInput}
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
        <Title>{type.toUpperCase()} message</Title>
        <Avatar>{letter}</Avatar>
        {this.renderDetails()}
      </Header>
    );
  }

  renderBody() {
    const { textPlain } = this.state;

    return (
      <Container>
        <textarea value={textPlain} onChange={this.onChange.bind(this, 'textPlain')} />
      </Container>
    );
  }

  renderFooter() {
    const label = this.props.type === 'new' ? 'Send' : 'Reply';

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