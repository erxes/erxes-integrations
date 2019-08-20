import { debugCallPro, debugRequest } from '../debuggers';

const loginMiddleware = (req, _res) => {
  debugRequest(debugCallPro, req);
};

export default loginMiddleware;
