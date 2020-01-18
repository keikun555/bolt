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
import {GridApi} from 'ag-grid-community';

import axios from '../boltAxios';
import {AxiosResponse, AxiosError} from 'axios';

import User from '../user';

const savedGridOptions = {
  defaultColDef: {
    resizable: true,
    sortable: true,
    suppressMovable: true,
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
        {
          headerName: 'Preference',
          field: 'preference',
          editable: true,
          sort: 'asc',
          headerTooltip: 'The greater the more preferred, must be >0',
          filter: 'agNumberColumnFilter',
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
        {
          headerName: 'Preference',
          field: 'preference',
          editable: true,
          headerTooltip: 'The greater the more preferred, must be >0',
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
  preferences: User[];
  errors: {[key: string]: string};
}

class DriverView extends React.Component<DriverViewProps, DriverViewState> {
  private savedGrid: GridApi | null = null;
  private userGrid: GridApi | null = null;
  constructor(props: DriverViewProps) {
    super(props);
    this.state = {
      screw: null,
      users: [],
      preferences: [],
      errors: {},
    };
    this.getData = this.getData.bind(this);
    this.getUsers = this.getUsers.bind(this);
    this.getScrew = this.getScrew.bind(this);
    this.getPreferences = this.getPreferences.bind(this);
    this.savePreferences = this.savePreferences.bind(this);
    this.cancelDriver = this.cancelDriver.bind(this);
    this.getScrew();
    this.getData();
  }
  getData() {
    this.getUsers();
    this.getPreferences();
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
  getPreferences() {
    axios
      .post(
        `user/${this.props.driver.id}/screw/${this.props.screw_id}/preference`,
      )
      .then((response: AxiosResponse) => {
        if ('errors' in response.data) {
          this.setState(({errors}) => ({
            errors: Object.assign({}, errors, response.data.errors),
          }));
        }
        if ('preferences' in response.data) {
          this.setState({preferences: response.data.preferences});
        }
      })
      .catch((error: AxiosError) => console.log(error));
  }
  savePreferences() {
    const formData = new FormData();
    const candidates: {[key: string]: number} = {};
    const {savedGrid, userGrid} = this;
    if (userGrid) {
      userGrid.forEachNode(node => {
        const {id, preference} = node.data;
        if (preference && Number(preference) > 0) {
          candidates[id] = preference;
        }
      });
    }
    if (savedGrid) {
      savedGrid.forEachNode(node => {
        const {id, preference} = node.data;
        if (preference && Number(preference) > 0) {
          candidates[id] = Number(preference);
        }
      });
    }
    for (const [key, value] of Object.entries(candidates)) {
      let temp = {
        candidate: key,
        preference: value,
      };
      console.log(JSON.stringify(temp));
      formData.append('preference', JSON.stringify(temp));
    }
    axios
      .post(
        `user/${this.props.driver.id}/screw/${this.props.screw_id}/preference/save`,
        formData,
      )
      .then((response: AxiosResponse) => {
        if ('errors' in response.data) {
          console.log(response.data.errors);
          this.setState(({errors}) => ({
            errors: Object.assign({}, errors, response.data.errors),
          }));
        }
        if ('preferences' in response.data) {
          this.setState({preferences: response.data.preferences});
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
    const {screw, users, errors, preferences} = this.state;
    const savedRows = preferences.map((u: User) =>
      Object.assign({}, u, {
        driver: u.driver ? u.driver.id : 'None',
        matched: u.matched ? 'Yes &hearts;' : 'Nope',
      }),
    );
    const savedUsers = preferences.map((u: User) => u.id);
    const userRows = users
      .filter(u => !savedUsers.includes(u.id))
      .map(u =>
        Object.assign({}, u, {
          driver: u.driver ? u.driver.id : 'None',
          matched: u.matched ? 'Yes &hearts;' : 'Nope',
        }),
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
                                  ? ` with ${screw.match.name} (${screw.match.id})`
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
              <Header as="h1">
                {`${screw ? screw.name.split(' ')[0] : screw_id}'s Preferences`}
              </Header>
            </Grid.Column>
            <Grid.Column>
              <Button floated="right" icon onClick={this.getData}>
                <Icon name="refresh" />
              </Button>
            </Grid.Column>
            <Grid.Column width={16}>
              {errors.save_preferences ? (
                <Message error>{errors.save_preferences}</Message>
              ) : null}
              <Button
                color="blue"
                attached="top"
                onClick={this.savePreferences}>
                Save Preferences
              </Button>
              <div
                className="ag-theme-balham"
                style={{height: '200px', width: '100%'}}>
                <AgGridReact
                  {...savedGridOptions}
                  rowData={savedRows}
                  onGridReady={params => {
                    this.savedGrid = params.api;
                  }}
                />
              </div>
              <div
                className="ag-theme-balham"
                style={{height: '500px', width: '100%'}}>
                <AgGridReact
                  {...boltUserGridOptions}
                  pagination
                  rowData={userRows}
                  onGridReady={params => {
                    this.userGrid = params.api;
                  }}
                />
              </div>
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column width={16}>
              <Button
                color="red"
                fluid
                onClick={this.cancelDriver}>{`Stop Being ${
                screw ? screw.name.split(' ')[0] : screw_id
              }'s Driver`}</Button>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </Container>
    );
  }
}

export default DriverView;
