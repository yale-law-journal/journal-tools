import React, { Component } from 'react';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Row from 'react-bootstrap/Row';

var JOB_TYPES = {
  'perma': 'Perma',
  'pull': 'Pull',
};

class JobCard extends Component {
  render() {
    let progress = this.props.progress ? (<ProgressBar now={this.props.progress.progress / this.props.progress.total * 100} />) : null;
    let completed = this.props.completed || (this.props.progress && this.props.progress.progress == this.props.progress.total);
    return (
      <Col md={6} lg={4}>
        <Card className="mt-3" style={{ height: 'calc(100% - 1rem)' }}>
          <Card.Body>
            <Row className="justify-content-center">
              <Card.Title>{ JOB_TYPES[this.props.command] } {this.props.fileName}</Card.Title>
            </Row>
            <Row className="justify-content-center mb-3">
              <Button variant={completed ? 'success' : 'secondary'} href={this.props.resultUrl} disabled={!completed} download>
                {completed ? 'Download' : 'Working…'}
              </Button>
            </Row>
            {progress}
          </Card.Body>
        </Card>
      </Col>
    );
  }
}

export default JobCard;
