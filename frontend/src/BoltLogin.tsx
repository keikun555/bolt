/**
 ** Kei Imada
 ** 20200107
 ** Bolt Login Page
 */

import * as React from 'react';

import {Container, Form, Header, Image, Message} from 'semantic-ui-react';

import axios, {tokenManager} from './boltAxios';
import {AxiosResponse, AxiosError} from 'axios';

import User from './user';

import logo from './logo.png';

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
      rememberMe: true,
      errors: {},
    };
    this.handleLogin = this.handleLogin.bind(this);
    if (tokenManager.getToken() || tokenManager.getRefreshToken()) {
      // try logging in if we have tokens
      // for remember me function
      console.log('got tokens');
      axios
        .post('auth/login')
        .then((response: AxiosResponse) => {
          if(!response) {
            console.log('clearing local tokens');
            tokenManager.clearTokens();
            return;
          }
          const data = response.data;
          if ('user' in data) {
            // got user!
            this.props.setUser(data['user']);
          }
        })
        .catch((error: AxiosError) => console.log(error));
    }
  }
  handleLogin() {
    const {errors, rememberMe, ...form} = this.state;
    // set remember me
    tokenManager.setRememberMe(rememberMe);
    // what to send in the login request
    const formData = new FormData();
    for (const [key, value] of Object.entries(form)) {
      formData.append(key, value);
    }
    // create request
    axios
      .post('auth/login', formData)
      .then((response: AxiosResponse) => {
        const data = response.data;
        if ('user' in data) {
          // got user!
          this.props.setUser(data['user']);
        } else {
          // got some errors
          this.setState({errors: data['errors']});
          tokenManager.clearTokens();
        }
      })
      .catch((error: AxiosError) => console.log(error));
  }
  render() {
    const {username, password, rememberMe, errors} = this.state;
    const {handleLogin} = this;
    return (
      <Container>
        <Image src={logo} size="tiny" centered />
        <Header as="h1" textAlign="center">
          Bolt
        </Header>
        <Header as="h3" textAlign="center">
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
