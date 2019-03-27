import React, { Component } from 'react';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';

class FileInputCard extends Component {
  constructor(props) {
    super(props);
    this.fileInput = React.createRef();
    this.state = {
      dropping: false,
      files: null,
    };
  }

  dragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    this.setState({ dropping: true });
  };

  drop = (e) => {
    e.preventDefault();
    this.setState({ dropping: false });
    if (this.fileInput.current) {
      this.fileInput.current.files = e.dataTransfer.files;
      this.setState({
        files: e.dataTransfer.files
      });
    }
  };

  dragLeave = (e) => {
    this.setState({ dropping: false });
  };

  fileSelect = (e) => {
    e.preventDefault();
    if (this.fileInput.current) {
      this.fileInput.current.click();
    }
  };

  render() {
    return (
      <Col md={6} lg={4}>
        <Card bg={ this.state.dropping ? 'secondary' : 'light' } className="mb-3" onDrop={this.drop} onDragOver={this.dragOver} onDragLeave={this.dragLeave}>
          <Card.Body>
            <Row className="justify-content-center">
              <Card.Title>{ this.props.title }</Card.Title>
            </Row>
            <Row className="justify-content-center align-items-center" style={{ height: '6rem' }}>
              <Card.Subtitle>Drop file here</Card.Subtitle>
            </Row>
            <Form inline>
              <Col className="custom-file align-items-bottom">
                <Form.Control type="file" ref={this.fileInput} accept=".docx" />
                <Form.Label className="custom-file-label text-nowrap overflow-hidden" style={{ justifyContent: 'left', cursor: 'pointer' }} onClick={this.fileSelect}>
                  { this.state.files ? this.state.files[0].name : 'File...' }
                </Form.Label>
              </Col>
              <Col className="col-auto pr-0">
                <Button type="submit">Submit</Button>
              </Col>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    );
  }
}

export default FileInputCard;
