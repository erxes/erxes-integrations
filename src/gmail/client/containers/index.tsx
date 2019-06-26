import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Wrapper from '../components/Wrapper';
import { sendEmail } from '../util';

class BaseContainer extends React.Component {
  render() {
    const updatedProps = {
      user: { email: 'bfyhdgzj@gmail.com' , firstName: 'Harry' }, // current user
      type: 'reply',
      send: sendEmail,
      message: { // Reply
        to: 'munkhorgil@live.com',
        from: 'bfyhdgzj@gmail.com',
        subject: 'Re: soul',
        references: "<CAMnbcUs=YgndTg8asB3cOKCUV-LtROqTtva4Gz4b0FdCRxUi+w@mail.gmail.com>,<HK0PR03MB3970F4637417D23C3D49544BA9E20@HK0PR03MB3970.apcprd03.prod.outlook.com>",
        headerId: "<HK0PR03MB3970AADAF2523F3D38704454A9E20@HK0PR03MB3970.apcprd03.prod.outlook.com>",
        threadId: "16b94470c4355b15"
      }
    };

    return <Wrapper {...updatedProps} />;
  }
}

ReactDOM.render(<BaseContainer/>, document.getElementById("app"));