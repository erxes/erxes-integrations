import styled from 'styled-components';
import { getRandomColor } from './util';

// tslint:disable
const Base = styled.div`
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);
  width: 50%;
  height: 50%;
  font-family: Helvetica;
`;

const Container = styled.div`
  padding: 1em;
`;

const Header = styled.div`
  display: flex;
  flex-direction: row;
  padding: 1em;
  border-bottom: 1px solid rgba(0,0,0,0.2);
`;

const Avatar = styled.div`
  width: 35px
  height: 35px;
  border-radius: 50%;
  font-size: 12px;
  color: #fff;
  line-height: 35px;
  text-align: center;
  background: ${getRandomColor()}
`;

const Details = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const Name = styled.p`
  font-weight: bold;
`;

const Text = styled.p`
  color: #eee;
  font-size: 14px;
`;

const Content = styled.p`
`;

const Title = styled.p`
  text-align: center;
`;

const Label = styled.p`
`;

const InputWrapper = styled.div`

`;

const Footer = styled.div`

`;

export {
  Base,
  Container,
  Header,
  Details,
  Name,
  Text,
  Content,
  Avatar,
  Title,
  Label,
  InputWrapper,
  Footer
};
