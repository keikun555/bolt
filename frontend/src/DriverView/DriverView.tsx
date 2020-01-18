/**
 ** Kei Imada
 ** 20200118
 ** DriverView Main Page
 */

import * as React from 'react';

import {
  Button,
  Container,
  Grid,
  Header,
  Icon,
  Loader,
  Message,
  Segment,
} from 'semantic-ui-react';

import {AgGridReact} from 'ag-grid-react';

import axios from '../boltAxios';
import {AxiosResponse, AxiosError} from 'axios';

import User from '../user';

const savedGridOptions = {
  defaultColDef: {
    resizable: true,
    sortable: true,
    filter: 'agTextColumnFilter',
  },
  columnDefs: [
    {
      headerName: 'Saved Preferences',
      children: [
        {
          headerName: 'Name',
          field: 'name',
        },
        {
          headerName: 'Username',
          field: 'id',
        },
        {
          headerName: 'Email',
          field: 'email',
        },
        {
          headerName: 'Current Driver',
          field: 'driver',
        },
        {
          headerName: 'Matched',
          field: 'matched',
        },
      ],
    },
  ],
  onFirstDataRendered: (params: any) => params.api.sizeColumnsToFit(),
  onGridSizeChanged: (params: any) => params.api.sizeColumnsToFit(),
};
const boltUserGridOptions = {
  defaultColDef: {
    resizable: true,
    sortable: true,
    filter: 'agTextColumnFilter',
  },
  columnDefs: [
    {
      headerName: 'Bolt Users',
      children: [
        {
          headerName: 'Name',
          field: 'name',
        },
        {
          headerName: 'Username',
          field: 'id',
        },
        {
          headerName: 'Email',
          field: 'email',
        },
        {
          headerName: 'Current Driver',
          field: 'driver',
        },
        {
          headerName: 'Matched',
          field: 'matched',
        },
      ],
    },
  ],
  onFirstDataRendered: (params: any) => params.api.sizeColumnsToFit(),
  onGridSizeChanged: (params: any) => params.api.sizeColumnsToFit(),
};

export interface DriverViewProps {
  driver: User;
  screw_id: string;
  removeScrew: (screw_id: string) => void;
}
export interface DriverViewState {
  screw: User | null;
  users: User[];
  errors: {[key: string]: string};
}

class DriverView extends React.Component<DriverViewProps, DriverViewState> {
  constructor(props: DriverViewProps) {
    super(props);
    this.state = {
      screw: null,
      users: [],
      errors: {},
    };
    this.getUsers = this.getUsers.bind(this);
    this.getScrew = this.getScrew.bind(this);
    this.cancelDriver = this.cancelDriver.bind(this);
    this.getScrew();
    this.getUsers();
  }
  getUsers() {
    axios
      .post(`user`)
      .then((response: AxiosResponse) => {
        this.setState({users: response.data.users});
      })
      .catch((error: AxiosError) => console.log(error));
  }
  getScrew() {
    axios
      .post(`user/${this.props.driver.id}/screw/${this.props.screw_id}`)
      .then((response: AxiosResponse) => {
        if ('errors' in response.data) {
          this.setState(({errors}) => ({
            errors: Object.assign({}, errors, response.data.errors),
          }));
        }
        if ('screw' in response.data) {
          this.setState({screw: response.data.screw});
        }
      })
      .catch((error: AxiosError) => console.log(error));
  }
  cancelDriver() {
    const {screw_id, removeScrew} = this.props;
    axios
      .post(`user/${screw_id}/driver/cancel`)
      .then((response: AxiosResponse) => {
        removeScrew(screw_id);
      })
      .catch((error: AxiosError) => console.log(error));
  }
  render() {
    const {screw_id} = this.props;
    const {screw, users, errors} = this.state;
    const userRows = users.map((u: User) =>
      Object.assign({}, u, {driver: u.driver ? u.driver.id : 'None'}),
    );
    return (
      <Container>
        <Grid stackable divided="vertically">
          <Grid.Row columns={1}>
            <Grid.Column>
              <Header as="h1">
                {`${screw ? screw.name.split(' ')[0] : screw_id}'s Dashboard`}
              </Header>
            </Grid.Column>
            <Grid.Column>
              <Button floated="right" icon onClick={this.getScrew}>
                <Icon name="refresh" />
              </Button>
            </Grid.Column>
            <Grid.Column width={16}>
              {screw ? (
                <Segment color={screw.matched && screw.match ? 'blue' : 'pink'}>
                  <Grid verticalAlign="middle" columns={1}>
                    <Grid.Row>
                      <Grid.Column>
                        <Header as="h2">
                          {`${screw.name.split(' ')[0]} is `}{' '}
                          {screw.matched
                            ? `matched${
                                screw.match
                                  ? ` with ${screw.match.name} ${screw.match.id}`
                                  : null
                              }!`
                            : 'not matched'}
                          {screw.matched ? (
                            <Button floated="right">Cancel</Button>
                          ) : null}
                        </Header>
                      </Grid.Column>
                    </Grid.Row>
                  </Grid>
                </Segment>
              ) : (
                <Loader active inline="centered" />
              )}
            </Grid.Column>
          </Grid.Row>
          <Grid.Row columns={2}>
            <Grid.Column>
              <Header as="h1">Bolt Users</Header>
            </Grid.Column>
            <Grid.Column>
              <Button floated="right" icon onClick={this.getUsers}>
                <Icon name="refresh" />
              </Button>
            </Grid.Column>
            <Grid.Column width={16}>
              {errors.save_preferences ? (
                <Message error>{errors.save_preferences}</Message>
              ) : null}
              <Button color="blue" attached="top">
                Save preferences
              </Button>
              <div
                className="ag-theme-balham"
                style={{height: '200px', width: '100%'}}>
                <AgGridReact {...savedGridOptions} rowData={userRows} />
              </div>
              <div
                className="ag-theme-balham"
                style={{height: '500px', width: '100%'}}>
                <AgGridReact
                  {...boltUserGridOptions}
                  pagination
                  rowData={userRows}
                />
              </div>
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column width={16}>
              <Button
                color="red"
                fluid
                onClick={this.cancelDriver}>{`Stop being ${
                screw ? screw.name.split(' ')[0] : screw_id
              }'s driver`}</Button>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </Container>
    );
  }
}

export default DriverView;
