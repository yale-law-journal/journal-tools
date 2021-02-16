import React, { Component } from 'react';
import WSP from 'websocket-as-promised';

import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import FormControl from 'react-bootstrap/FormControl';
import Navbar from 'react-bootstrap/Navbar';
import Row from 'react-bootstrap/Row';

import FileInputCard from './components/FileInputCard';
import JobCard from './components/JobCard';
import LoginForm from './components/LoginForm';
import LoginModal from './components/LoginModal';

var decoder = new TextDecoder('utf-8');

function locationSlash() {
  let href = window.location.href;
  return href.endsWith('/') ? href : href + '/';
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      jobs: {},
      progress: {},
      loginInfo: null,
      loading: true,
      organization: null,
    };
    this.createJob = this.createJob.bind(this);
    this.socket = null;
  }

  async getLoginStatus() {
    let response = await fetch('api/auth');
    if (response.ok) {
      let info = await response.json();
      this.setState({
        loginInfo: info,
        organization: localStorage.getItem('organization')
          || (info.organizations ? info.organizations[0].id : null),
      });
    }
    this.setState({ loading: false });
  }

  initSocket() {
    this.socket = new WSP(this.socketUrl, {
        packMessage: data => JSON.stringify(data),
        unpackMessage: data => JSON.parse(data),
    });
    this.socket.open().catch(err => console.log(err));
    this.socket.onUnpackedMessage.addListener(message => {
      console.log('Message:', message);
      let ratio = o => o.progress / o.total;
      if (message.progress !== undefined) {
        this.update(message.id, job => job, prevProgress =>
          ratio(message) > ratio(prevProgress) ? message : prevProgress
        );
      } else if (message.completed !== undefined) {
        this.update(message.id,
          job => ({
            ...job,
            resultUrl: message.resultUrl,
            completed: true,
          }),
          progress => ({ progress: 1, total: 1 }),
        );
      }
    });
    this.socket.onError.addListener(err => {
      console.log(err);
    });
  }

  async componentDidMount() {
    let loginStatus = this.getLoginStatus();
    let socketUrl = fetch('api/socket').then(response => response.json()).then(result => result.socketUrl);

    let response = await fetch('api/jobs/user');
    if (!response.ok) {
      console.log('Failed to fetch job list.');
      return;
    }
    let result = await response.json();
    this.setState({
      jobs: result.results,
      progress: result.results.map(job => ({ progress: job.progress, total: job.total })),
    });

    this.socketUrl = await socketUrl;
    this.initSocket();

    await loginStatus;
  }

  update(id, jobF, progressF) {
    this.setState(prevState => ({
      ...prevState,
      jobs: Object.assign(prevState.jobs, {
        [id]: jobF(prevState.jobs[id] || {}),
      }),
      progress: Object.assign(prevState.progress, {
        [id]: progressF(prevState.progress[id] || {}),
      }),
    }));
  }

  async createJob(action, formData) {
    if (this.socket.isClosed || this.socket.isClosing) {
      this.initSocket();
    }

    formData.append('organization', this.state.organization);

    let buffer = '';
    let response = await fetch(new URL(action, locationSlash()).toString(), {
      method: 'POST',
      body: formData,
    });
    if (!response.status == 200) { return; }

    let body = await response.json();
    let job = body.job;
    console.log('Job:', job);
    this.update(job.id, () => job, () => ({ progress: 0, total: 1 }));
  }

  setOrganization = (organization) => {
    localStorage.setItem('organization', organization);
    this.setState({ organization });
  }

  handleLogout = () => {
    this.setState({ loginInfo: false });
  }

  render() {
    let compare = (a, b) => b.id - a.id;
    let jobs = Object.values(this.state.jobs);
    let orgJobs = jobs.filter(job => job.OrganizationId == this.state.organization);
    let jobCards = orgJobs.slice().sort(compare).map(job =>
      <JobCard job={job} progress={this.state.progress[job.id]} key={job.id} />
    );
    let brand = window.location.hostname.startsWith('dev.') ? '(DEV) Journal Tools' : 'Journal Tools';
    return <>
      <LoginModal show={!this.state.loading && !Boolean(this.state.loginInfo)} />
      <Navbar bg="dark" variant="dark" expand="sm">
        <Navbar.Brand>{brand}</Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse className="justify-content-end">
          <LoginForm
            loginInfo={this.state.loginInfo}
            organization={this.state.organization}
            onOrgChange={this.setOrganization}
            onLogout={this.handleLogout} />
        </Navbar.Collapse>
      </Navbar>
      <Container className="pt-2 justify-content-center">
        <Row className="justify-content-center">
          <FileInputCard title="Perma Links" action="api/jobs/perma" createJob={this.createJob} />
          <FileInputCard title="Bookpull Spreadsheet" action="api/jobs/pull" createJob={this.createJob}>
            <Form.Control name="pullers" as="textarea" placeholder="Pullers (one per line)" className="h-100 w-100" style={{ resize: 'none' }} />
          </FileInputCard>
          <FileInputCard title="Bluebook Errors" action="api/jobs/bluebook" createJob={this.createJob} />
        </Row>
        <Row>
          { jobCards }
        </Row>
      </Container>
    </>;
  }
}

export default App;
