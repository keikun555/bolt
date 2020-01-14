/**
 ** Kei Imada
 ** 20200110
 ** ScrewView Main Page
 */

import * as React from 'react';

import {Button, Container, Grid, Header, Segment} from 'semantic-ui-react';

import axios from '../boltAxios';
import {AxiosResponse, AxiosError} from 'axios';

import User from '../user';
import DriverRequest from '../driverRequest';

export interface ScrewViewProps {
  user: User;
}
export interface ScrewViewState {
  loaded: boolean;
  driver: User | null;
  driverRequests: DriverRequest[];
  matched: boolean;
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
    this.getData = this.getData.bind(this);
    this.cancelDriverRequest = this.cancelDriverRequest.bind(this);
    this.approveDriverRequest = this.approveDriverRequest.bind(this);
    this.cancelDriver = this.cancelDriver.bind(this);
    this.getData();
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
  cancelDriverRequest(r: DriverRequest) {
    axios
      .post(`driver_request/${r.id}/cancel`)
      .then((response: AxiosResponse) => {
        this.getData();
      })
      .catch((error: AxiosError) => {
        if(error.response && error.response.status === 404) {
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
      })
      .catch((error: AxiosError) => {
        if(error.response && error.response.status === 404) {
          // possible that this got updated
          this.getData();
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
    const {driver, matched, driverRequests} = this.state;
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
                      <Button compact floated="right" onClick={() => this.cancelDriverRequest(r)}>
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
                        <Button onClick={() => this.approveDriverRequest(r)}>Approve</Button>
                        <Button.Or />
                        <Button onClick={() => this.cancelDriverRequest(r)}>Deny</Button>
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
        <Header as="h1">{`${user.name.split(' ')[0]}'s Dashboard`}</Header>
        <Grid stackable>
          <Grid.Row>
            <Grid.Column>{requestElements}</Grid.Column>
          </Grid.Row>
          <Grid.Row columns={2}>
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
                          <Button floated="right" onClick={() => this.cancelDriver()}>Cancel</Button>
                        ) : null}
                      </Header>
                      {driver ? null : null}
                    </Grid.Column>
                  </Grid.Row>
                </Grid>
              </Segment>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </Container>
    );
  }
}

export default ScrewView;
