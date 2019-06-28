import styled from 'styled-components';
import styledTS from 'styled-components-ts';

// tslint:disable
const Base = styled.div`
  padding: 8px;
`;

const Card = styledTS<{ isCustomer: boolean }>(styled.div)`
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);
  width: 80%;
  font-family: Helvetica;
  font-size: 12px;
  margin-bottom: 10px;
  display: block;
  ${props => props.isCustomer ? 
    'margin-right: auto; margin-left: 0;' :
    'margin-left: auto; margin-right: 0;'
  }
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

const Avatar = styledTS<{ backgroundColor: string }>(styled.div)`
  width: 35px
  height: 35px;
  border-radius: 50%;
  font-size: 12px;
  color: #fff;
  line-height: 35px;
  text-align: center;
  background: ${props => props.backgroundColor || '#000'}
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

const Button = styled.button`
  background: #eee;
  padding: 4px;
  border-radius: 5px;
  height: 25px;
  font-weight: bold;
`;

export {
  Base,
  Card,
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
  Button
};
