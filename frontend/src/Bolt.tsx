/**
 ** Kei Imada
 ** 20200107
 ** Main Bolt Page
 ** Handles login
 */

import * as React from 'react';

import {Image, Menu, Modal} from 'semantic-ui-react';

import axios, {tokenManager, createAxiosResponseInterceptor} from './boltAxios';
import {AxiosResponse, AxiosError} from 'axios';

import BoltLogin from './BoltLogin';
import ScrewView from './ScrewView/ScrewView';
import DriverView from './DriverView/DriverView';
import User from './user';

import logo from './logo.png';

export interface BoltProps {}
export interface BoltState {
  errors: {[key: string]: string};
  user: null | User;
  screws: User[];
  activeItem: string;
}

class Bolt extends React.Component<BoltProps, BoltState> {
  constructor(props: BoltProps) {
    super(props);
    this.state = {
      // user: {id: 'keikun', email: 'kimada1@swarthmore.edu', name: 'Kei Imada'},
      errors: {},
      screws: [],
      user: null,
      activeItem: '',
    };
    this.logout = this.logout.bind(this);
    this.setUser = this.setUser.bind(this);
    this.getScrews = this.getScrews.bind(this);
    this.addScrew = this.addScrew.bind(this);
    this.removeScrew = this.removeScrew.bind(this);
    this.userMenu = this.userMenu.bind(this);
    this.handleItemClick = this.handleItemClick.bind(this);
    createAxiosResponseInterceptor(this.logout);
  }
  logout() {
    this.setState({user: null});
  }
  setUser(user: User) {
    this.setState({user, activeItem: user.id});
    this.getScrews(user);
  }
  addScrew(screw: User) {
    this.setState(({screws}) => ({screws: screws.concat(screw)}));
  }
  removeScrew(screw_id: string) {
    this.setState(({screws}) => ({
      screws: screws.filter((s: User) => s.id !== screw_id),
    }));
  }
  getScrews(user: User) {
    axios.post(`user/${user.id}/screw`).then((response: AxiosResponse) => {
      if ('errors' in response.data) {
        this.setState(({errors}) => ({
          errors: Object.assign({}, errors, response.data.errors),
        }));
      }
      if ('screws' in response.data) {
        this.setState({screws: response.data.screws});
      }
    });
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
    const {activeItem, screws} = this.state;
    const screwMenuItems = screws.map((screw: User, i: number) => (
      <Menu.Item
        key={i}
        name={screw.id}
        active={activeItem === screw.id}
        onClick={this.handleItemClick}
      />
    ));
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
          {screwMenuItems}
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
    const {user, screws, activeItem} = this.state;
    const {setUser, userMenu, addScrew, removeScrew} = this;
    return (
      <>
        <Modal open={!user} size="tiny" dimmer="blurring">
          <Modal.Content>
            <BoltLogin setUser={setUser} />
          </Modal.Content>
        </Modal>
        {user ? userMenu(user) : null}
        {user
          ? (() => {
              const screw = screws
                .filter((screw: User) => activeItem === screw.id)
                .pop();
              return screw ? (
                <DriverView driver={user} screw_id={screw.id} removeScrew={removeScrew}/>
              ) : (
                <ScrewView user={user} addScrew={addScrew} />
              );
            })()
          : null}
      </>
    );
  }
}

export default Bolt;
