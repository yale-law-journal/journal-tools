import React, { Component } from 'react';

import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import FormControl from 'react-bootstrap/FormControl';
import Navbar from 'react-bootstrap/Navbar';
import Row from 'react-bootstrap/Row';

import FileInputCard from './components/FileInputCard';

class App extends Component {
  render() {
    return <>
      <Navbar bg="dark" variant="dark" className="justify-content-between">
        <Navbar.Brand>Journal Tools</Navbar.Brand>
        <Form inline>
          <FormControl placeholder="Username" aria-label="Username" className="mr-sm-2" />
          <Button type="submit">Login</Button>
        </Form>
      </Navbar>
      <Container className="pt-5">
        <Row className="justify-content-center">
          <FileInputCard title="Perma Links" />
          <FileInputCard title="Bookpull Spreadsheet" />
        </Row>
      </Container>
    </>;
  }
}

export default App;
