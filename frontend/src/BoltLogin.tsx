/**
 ** Kei Imada
 ** 20200107
 ** Bolt Login Page
 */

import * as React from 'react';

import {Container, Form, Header, Message} from 'semantic-ui-react';

import axios from './boltAxios';
import {AxiosResponse, AxiosError} from 'axios';

import User from './user';

export interface BoltLoginProps {
  setUser: (user: User) => void;
}
export interface BoltLoginState {
  username: string;
  password: string;
  rememberMe: boolean;
  errors: {[key: string]: string};
}

class BoltLogin extends React.Component<BoltLoginProps, BoltLoginState> {
  constructor(props: BoltLoginProps) {
    super(props);
    this.state = {
      username: '',
      password: '',
      rememberMe: false,
      errors: {},
    };
    this.handleLogin = this.handleLogin.bind(this);
  }
  handleLogin() {
    const {errors, ...params} = this.state;
    axios
      .get('login', {
        params: params,
      })
      .then((response: AxiosResponse) => {
        const data = response.data;
        if ('user' in data) {
          // got token!
          this.props.setUser(data['user']);
        } else {
          // got some errors
          this.setState({errors: data['errors']});
        }
      })
      .catch((error: AxiosError) => console.log(error));
  }
  render() {
    const {username, password, rememberMe, errors} = this.state;
    const {handleLogin} = this;
    return (
      <Container>
        <Header as="h1">
          Login with your{' '}
          <a
            href="https://www.sccs.swarthmore.edu/"
            target="_blank"
            rel="noopener noreferrer">
            SCCS
          </a>{' '}
          account!
        </Header>
        {errors['login'] ? (
          <Message
            error
            header="Invalid username or password"
            content="Please try again or click the Forgot user name / Forgot password links below"
          />
        ) : null}
        <Form onSubmit={handleLogin}>
          <Form.Input
            error={errors['username']}
            fluid
            label="Username"
            placeholder="Username"
            value={username}
            onChange={(e: any) => this.setState({username: e.target.value})}
          />
          <Form.Input
            error={errors['password']}
            fluid
            label="Password"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e: any) => this.setState({password: e.target.value})}
          />
          <Form.Checkbox
            label="Remember me"
            checked={rememberMe}
            onChange={() =>
              this.setState((state: BoltLoginState) => ({
                rememberMe: !state.rememberMe,
              }))
            }
          />
          <Form.Button fluid primary>
            Login
          </Form.Button>
          <div style={{float: 'right'}}>
            Forgot your{' '}
            <a
              href="https://guts.sccs.swarthmore.edu/user/password/login-forgotten/"
              target="_blank"
              rel="noopener noreferrer">
              username
            </a>{' '}
            or your{' '}
            <a
              href="https://guts.sccs.swarthmore.edu/user/password/reset/"
              target="_blank"
              rel="noopener noreferrer">
              password
            </a>
            ?
          </div>
          <div>
            <a
              href="https://guts.sccs.swarthmore.edu/user/create/"
              target="_blank"
              rel="noopener noreferrer">
              Register
            </a>
          </div>
        </Form>
      </Container>
    );
  }
}

export default BoltLogin;
