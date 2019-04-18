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

var decoder = new TextDecoder('utf-8');

function locationSlash() {
  let href = window.location.href;
  return href.endsWith('/') ? href : href + '/';
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = { jobs: {}, progress: {} };
    this.createJob = this.createJob.bind(this);
    this.socket = null;
  }

  async componentDidMount() {
    let response = await fetch('api/jobs');
    if (!response.ok) {
      console.log('Failed to fetch job list.');
    }
    let result = await response.json();
    this.setState({ jobs: result.results });

    let socketUrl = result.websocket_api;
    this.socket = new WSP(socketUrl, {
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
          job => Object.assign(job, { resultUrl: message.resultUrl }),
          progress => ({ progress: 1, total: 1 }),
        );
      }
    });
    this.socket.onError.addListener(err => {
      console.log(err);
    });
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

  render() {
    let compare = (a, b) => b.id - a.id;
    let jobCards = Object.values(this.state.jobs).slice().sort(compare).map(job =>
      <JobCard job={job} progress={this.state.progress[job.id]} key={job.id} />
    );
    return <>
      <Navbar bg="dark" variant="dark" className="justify-content-between">
        <Navbar.Brand>Journal Tools</Navbar.Brand>
        <Form inline>
          <FormControl placeholder="Username" aria-label="Username" className="mr-sm-2" />
          <Button type="submit">Login</Button>
        </Form>
      </Navbar>
      <Container className="pt-2 justify-content-center">
        <Row className="justify-content-center">
          <FileInputCard title="Perma Links" action="api/jobs/perma" createJob={this.createJob} />
          <FileInputCard title="Bookpull Spreadsheet" action="api/jobs/pull" createJob={this.createJob} />
        </Row>
        <Row>
          { jobCards }
        </Row>
      </Container>
    </>;
  }
}

export default App;
