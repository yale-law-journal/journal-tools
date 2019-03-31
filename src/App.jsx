import React, { Component } from 'react';
import request from 'request';
import rp from 'request-promise';

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

class App extends Component {
  constructor(props) {
    super(props);
    this.state = { jobs: {}, progress: {} };
    this.createJob = this.createJob.bind(this);
  }

  componentDidMount() {
    rp({
      uri: new URL('api/jobs', window.location).toString(),
      json: true
    }).then(jobs => {
      this.setState(prevState => ({
        ...prevState,
        jobs: Object.fromEntries(jobs.results.map(j => [j.id, j]))
      }));
    });
  }

  async createJob(action, formData) {
    let buffer = '';
    let response = await fetch(new URL(action, window.location).toString(), {
      method: 'POST',
      body: formData,
    })
    if (!response.status == 200) { return; }

    let job = null;
    let reader = response.body.getReader();
    let chunk = null;
    while (!chunk || !chunk.done) {
      try {
        chunk = await reader.read();
      } catch (e) {
        console.log(e);
        break;
      }
      buffer += decoder.decode(chunk.value);

      let lastNewline = buffer.lastIndexOf('\n');
      if (lastNewline > -1) {
        let lines = buffer.slice(0, lastNewline).split('\n');
        let objects = lines.map(l => JSON.parse(l));
        for (let i = 0; i < objects.length; i++) {
          let message = objects[i];
          console.log(message);
          if (message.result !== undefined) {
            job = objects[0].result;
            this.setState(prevState => ({
              ...prevState,
              jobs: Object.assign(prevState.jobs, { [job.id]: job })
            }));
          } else if (message.progress !== undefined) {
            this.setState(prevState => {
              let prevProgressObj = prevState.progress[message.id] || {};
              let prevProgress = prevProgressObj.progress || 0;
              return {
                ...prevState,
                progress: Object.assign(prevState.progress, {
                  [message.id]: {
                    progress: Math.max(message.progress, prevProgress),
                    total: message.total,
                  }
                })
              };
            });
          } else if (message.completed !== undefined) {
            this.setState(prevState => ({
              ...prevState,
              jobs: Object.assign(prevState.jobs, {
                [message.id]: Object.assign(prevState.jobs[message.id] || {}, {
                  resultUrl: message.resultUrl
                })
              }),
              progress: Object.assign(prevState.progress, {
                [message.id]: { progress: 1, total: 1 }
              }),
            }));
            break;
          }
        }
        buffer = buffer.slice(lastNewline + 1);
      }
    }
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
