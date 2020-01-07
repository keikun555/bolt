/**
 ** Kei Imada
 ** 20200107
 ** Main Bolt Page
 */

import * as React from 'react';

import {Modal} from 'semantic-ui-react';

import BoltLogin from './BoltLogin';
import User from './user';

export interface BoltProps {}
export interface BoltState {
  user: null | User;
}

class Bolt extends React.Component<BoltProps, BoltState> {
  constructor(props: BoltProps) {
    super(props);
    this.state = {
      user: null,
    };
    this.setUser = this.setUser.bind(this);
  }
  setUser(user: User) {
    this.setState({user});
  }
  render() {
    const {user} = this.state;
    const {setUser} = this;
    console.log(user);
    return (
      <>
        <Modal open={user ? false : true} size='tiny' dimmer="blurring">
          <Modal.Content>
            <BoltLogin setUser={setUser} />
          </Modal.Content>
        </Modal>
        <p>logged in</p>
      </>
    );
  }
}

export default Bolt;
