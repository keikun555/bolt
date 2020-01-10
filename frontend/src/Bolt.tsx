/**
 ** Kei Imada
 ** 20200107
 ** Main Bolt Page
 ** Handles login
 */

import * as React from 'react';

import {Image, Menu, Modal} from 'semantic-ui-react';

import axios, {tokenManager} from './boltAxios';
import {AxiosResponse, AxiosError} from 'axios';

import BoltLogin from './BoltLogin';
import ScrewView from './ScrewView/ScrewView';
import User from './user';

import logo from './logo.png';

export interface BoltProps {}
export interface BoltState {
  user: null | User;
  activeItem: string;
}

class Bolt extends React.Component<BoltProps, BoltState> {
  constructor(props: BoltProps) {
    super(props);
    this.state = {
      // user: {id: 'keikun', email: 'kimada1@swarthmore.edu', name: 'Kei Imada'},
      user: null,
      activeItem: '',
    };
    this.setUser = this.setUser.bind(this);
    this.userMenu = this.userMenu.bind(this);
    this.handleItemClick = this.handleItemClick.bind(this);
  }
  setUser(user: User) {
    this.setState({user, activeItem: user.id});
  }
  handleItemClick(e: React.SyntheticEvent, data: object) {
    const {name} = data as {name: string}; // some typescript shenanigans
    this.setState({activeItem: name});
    if (name === 'logout') {
      axios
        .delete('auth/logout/1')
        .then((response: AxiosResponse) => {
          // token revoke successful
          axios
            .delete('auth/logout/2')
            .then((response: AxiosResponse) => {
              // refresh token revoke successful
              tokenManager.clearTokens();
              this.setState({user: null, activeItem: ''});
            })
            .catch((error: AxiosError) => console.log(error));
        })
        .catch((error: AxiosError) => console.log(error));
    }
  }
  userMenu(user: User) {
    const {activeItem} = this.state;
    return (
      <>
        <Menu>
          <Menu.Item>
            <Image src={logo} size="mini" />
          </Menu.Item>
          <Menu.Item
            name={user.id}
            active={activeItem === user.id}
            onClick={this.handleItemClick}
          />
          <Menu.Menu position="right">
            <Menu.Item
              name="logout"
              active={activeItem === 'logout'}
              onClick={this.handleItemClick}
            />
          </Menu.Menu>
        </Menu>
      </>
    );
  }
  render() {
    const {user, activeItem} = this.state;
    const {setUser, userMenu} = this;
    return (
      <>
        <Modal open={!user} size="tiny" dimmer="blurring">
          <Modal.Content>
            <BoltLogin setUser={setUser} />
          </Modal.Content>
        </Modal>
        {user ? userMenu(user) : null}
        {user && activeItem === user.id ? <ScrewView user={user} /> : null}
      </>
    );
  }
}

export default Bolt;
