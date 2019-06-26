import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Wrapper from '../components/Wrapper';
import { sendEmail } from '../util';

class BaseContainer extends React.Component {
  render() {
    const send = (params, reply) => {
      return sendEmail(params, reply);
    };

    const props = {
      user: { email: 'bfyhdgzj@gmail.com' , firstName: 'Harry' }, // current user
      type: 'reply',
      send,
      message: { // Reply
        to: 'munkhorgil@live.com',
        from: 'bfyhdgzj@gmail.com',
        subject: 'demo2',
        headerId: "<HK0PR03MB39709CE12589CF40B04D04DDA9E20@HK0PR03MB3970.apcprd03.prod.outlook.com>",
        threadId: "16b93a62a967fa39"
      }
    };

    return <Wrapper {...props} />;
  }
}

ReactDOM.render(<BaseContainer/>, document.getElementById("app"));