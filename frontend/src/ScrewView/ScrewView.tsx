/**
 ** Kei Imada
 ** 20200110
 ** ScrewView Main Page
 */

import * as React from 'react';

import {Button, Container, Header, Image, Menu, Modal} from 'semantic-ui-react';

import axios from '../boltAxios';
import {AxiosResponse, AxiosError} from 'axios';

import User from '../user';

export interface ScrewViewProps {
  user: User;
}
export interface ScrewViewState {
  loaded: boolean;
  driver: User | null;
  matched: boolean;
  driverRequests: User[];
}

class ScrewView extends React.Component<ScrewViewProps, ScrewViewState> {
  constructor(props: ScrewViewProps) {
    super(props);
    this.state = {
      loaded: false,
      driver: null,
      matched: false,
      driverRequests: [],
    };
    axios
      .post(`user/${props.user.id}`)
      .then((response: AxiosResponse) => {})
      .catch((error: AxiosError) => console.log(error));
  }
  render() {
    const {user} = this.props;
    const {} = this;
    return <>{user.id}</>;
  }
}

export default ScrewView;
