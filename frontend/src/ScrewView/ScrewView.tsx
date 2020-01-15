/**
 ** Kei Imada
 ** 20200110
 ** ScrewView Main Page
 */

import * as React from 'react';

import {
  Button,
  Container,
  Grid,
  Header,
  Icon,
  Segment,
} from 'semantic-ui-react';

import {AgGridReact} from 'ag-grid-react';

import axios from '../boltAxios';
import {AxiosResponse, AxiosError} from 'axios';

import User from '../user';
import DriverRequest from '../driverRequest';

const boltUserGridOptions = {
  defaultColDef: {
    resizable: true,
    sortable: true,
    filter: 'agTextColumnFilter',
  },
  columnDefs: [
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
  onFirstDataRendered: (params: any) => params.api.sizeColumnsToFit(),
  onGridSizeChanged: (params: any) => params.api.sizeColumnsToFit(),
  pagination: true,
};

export interface ScrewViewProps {
  user: User;
}
export interface ScrewViewState {
  selectedUser: null | User;
  users: User[];
  driver: User | null;
  driverRequests: DriverRequest[];
  matched: boolean;
}

class ScrewView extends React.Component<ScrewViewProps, ScrewViewState> {
  constructor(props: ScrewViewProps) {
    super(props);
    this.state = {
      selectedUser: null,
      users: [],
      driver: null,
      matched: false,
      driverRequests: [],
    };
    this.getData = this.getData.bind(this);
    this.getUsers = this.getUsers.bind(this);
    this.makeDriverRequest = this.makeDriverRequest.bind(this);
    this.cancelDriverRequest = this.cancelDriverRequest.bind(this);
    this.approveDriverRequest = this.approveDriverRequest.bind(this);
    this.cancelDriver = this.cancelDriver.bind(this);
    this.getUsers();
    this.getData();
  }
  getUsers() {
    axios
      .post(`user`)
      .then((response: AxiosResponse) => {
        console.log(response.data);
        this.setState({users: response.data.users});
      })
      .catch((error: AxiosError) => console.log(error));
  }
  getData() {
    axios
      .post(`user/${this.props.user.id}`)
      .then((response: AxiosResponse) => {
        const data = response.data;
        this.setState({
          matched: data.matched,
          driverRequests: data.driver_requests,
        });
      })
      .catch((error: AxiosError) => console.log(error));
    axios
      .post(`user/${this.props.user.id}/driver`)
      .then((response: AxiosResponse) => {
        const data = response.data.driver;
        this.setState({driver: data});
      })
      .catch((error: AxiosError) => console.log(error));
  }
  makeDriverRequest(screw: User, driver: User) {
    const formData = new FormData();
    formData.append('screw', screw.id);
    formData.append('driver', driver.id);
    axios
      .post('driver_request/make', formData)
      .then((response: AxiosResponse) => {
        this.getData();
      })
      .catch((error: AxiosError) => console.log(error));
  }
  cancelDriverRequest(r: DriverRequest) {
    axios
      .post(`driver_request/${r.id}/cancel`)
      .then((response: AxiosResponse) => {
        this.getData();
      })
      .catch((error: AxiosError) => {
        if (error.response && error.response.status === 404) {
          // possible that this got updated
          this.getData();
        }
      });
  }
  approveDriverRequest(r: DriverRequest) {
    axios
      .post(`driver_request/${r.id}/approve`)
      .then((response: AxiosResponse) => {
        this.getData();
        this.getUsers();
      })
      .catch((error: AxiosError) => {
        if (error.response && error.response.status === 404) {
          // possible that this got updated
          this.getData();
          this.getUsers();
        }
      });
  }
  cancelDriver() {
    const {user} = this.props;
    axios
      .post(`user/${user.id}/driver/cancel`)
      .then((response: AxiosResponse) => {
        this.getData();
      })
      .catch((error: AxiosError) => console.log(error));
  }
  render() {
    const {user} = this.props;
    const {driver, matched, driverRequests, users, selectedUser} = this.state;
    const userRows = users.map((u: User) =>
      Object.assign({}, u, {driver: u.driver ? u.driver.id : 'None'}),
    );
    const requestElements = driverRequests.map(
      (r: DriverRequest, i: number) => {
        if (user.id === r.screw.id) {
          // user requested this driver
          return (
            <Segment clearing color="orange" key={i}>
              <Grid verticalAlign="middle" columns={1}>
                <Grid.Row>
                  <Grid.Column>
                    <Header as="h3">
                      You have requested {`${r.driver.name} (${r.driver.id})`}{' '}
                      to be your driver!
                      <Button
                        compact
                        floated="right"
                        onClick={() => this.cancelDriverRequest(r)}>
                        Cancel
                      </Button>
                    </Header>
                  </Grid.Column>
                </Grid.Row>
              </Grid>
            </Segment>
          );
        } else if (user.id === r.driver.id) {
          // user was requested to be a driver
          return (
            <Segment clearing color="orange" key={i}>
              <Grid verticalAlign="middle" columns={1}>
                <Grid.Row>
                  <Grid.Column>
                    <Header as="h3">
                      {`${r.driver.name} (${r.driver.id}) wants you to be their driver!`}
                      <Button.Group compact floated="right">
                        <Button onClick={() => this.approveDriverRequest(r)}>
                          Approve
                        </Button>
                        <Button.Or />
                        <Button onClick={() => this.cancelDriverRequest(r)}>
                          Deny
                        </Button>
                      </Button.Group>
                    </Header>
                  </Grid.Column>
                </Grid.Row>
              </Grid>
            </Segment>
          );
        } else {
          // bogus
          return null;
        }
      },
    );
    return (
      <Container>
        <Grid stackable divided="vertically">
          <Grid.Row columns={2}>
            <Grid.Column>
              <Header as="h1">
                {`${user.name.split(' ')[0]}'s Dashboard`}
              </Header>
            </Grid.Column>
            <Grid.Column>
              <Button floated="right" icon onClick={this.getData}>
                <Icon name="refresh" />
              </Button>
            </Grid.Column>
            <Grid.Column>
              <Segment color={matched ? 'blue' : 'pink'}>
                <Grid verticalAlign="middle" columns={1}>
                  <Grid.Row>
                    <Grid.Column>
                      <Header as="h2">
                        You are {matched ? 'matched!' : 'not matched'}
                        {matched ? (
                          <Button floated="right">Cancel</Button>
                        ) : null}
                      </Header>
                    </Grid.Column>
                  </Grid.Row>
                </Grid>
              </Segment>
            </Grid.Column>
            <Grid.Column>
              <Segment color={driver ? 'blue' : 'pink'}>
                <Grid verticalAlign="middle" columns={1}>
                  <Grid.Row>
                    <Grid.Column>
                      <Header as="h2">
                        {driver
                          ? `Your driver is ${driver.name} (${driver.id})`
                          : "You don't have a driver!"}
                        {driver ? (
                          <Button
                            floated="right"
                            onClick={() => this.cancelDriver()}>
                            Cancel
                          </Button>
                        ) : null}
                      </Header>
                      {driver ? null : null}
                    </Grid.Column>
                  </Grid.Row>
                </Grid>
              </Segment>
            </Grid.Column>
            <Grid.Column width={16}>
              {requestElements.length ? (
                requestElements
              ) : (
                <Segment color="blue">
                  <Header as="h2">You have no requests!</Header>
                </Segment>
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
              <Button
                disabled={
                  selectedUser && selectedUser.id !== user.id ? false : true
                }
                onClick={() =>
                  user && selectedUser
                    ? this.makeDriverRequest(user, selectedUser)
                    : null
                }
                attached="top">
                Request Driver
              </Button>
              <div
                className="ag-theme-balham"
                style={{height: '500px', width: '100%'}}>
                <AgGridReact
                  {...boltUserGridOptions}
                  rowData={userRows}
                  rowSelection="single"
                  onSelectionChanged={(params: any) => {
                    const selectedRows = params.api.getSelectedRows();
                    this.setState({
                      selectedUser:
                        selectedRows.length === 1 ? selectedRows[0] : null,
                    });
                  }}
                />
              </div>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </Container>
    );
  }
}

export default ScrewView;
