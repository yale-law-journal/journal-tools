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
  }

  async componentDidMount() {
    let response = await fetch('api/jobs');
    if (!response.ok) {
      console.log('Failed to fetch job list.');
    }
    let jobs = await response.json();
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

  progressRatio(progress) {
    return progress.progress / progress.total;
  }

  async trackJob(job) {
    let socket = new WSP(`wss://${window.location.host}${window.location.pathname}`);
    try {
      await socket.open();
      console.log('Connected to socket.');
      socket.sendPacked({ action: 'selectJob', job: job.id });
    } catch (e) {
      console.log(e);
      return;
    }

    socket.onError.addListener(err => {
      console.log(err);
    });

    socket.onUnpackedMessage.addListener(message => {
      console.log('Message:', message);
      if (message.result !== undefined) {
        job = objects[0].result;
        update(job.id, () => job, () => ({ progress: 0, total: 1 }));
      } else if (message.progress !== undefined) {
        update(message.id, job => job, prevProgress =>
          progressRatio(message.progress) > progressRatio(prevProgress) ? message.progress : prevProgress
        );
      } else if (message.completed !== undefined) {
        update(message.id,
          job => Object.assign(job, { resultUrl: message.resultUrl }),
          progress => ({ progress: 1, total: 1 }),
        );
      }
    });
  }

  async createJob(action, formData) {
    let buffer = '';
    let response = await fetch(new URL(action, locationSlash()).toString(), {
      method: 'POST',
      body: formData,
    });
    if (!response.status == 200) { return; }

    let job = await response.json();
    console.log(job);
    await trackJob(job);
  }

  render() {
    let compare = (a, b) => b.id - a.id;
    let jobCards = Object.values(this.state.jobs).slice().sort(compare).map(job =>
      <JobCard {...job} progress={this.state.progress[job.id]} key={job.id} />
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
