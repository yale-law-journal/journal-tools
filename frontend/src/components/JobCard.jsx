import moment from 'moment';
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
    let completed = this.props.job.completed || (this.props.progress && this.props.progress.progress == this.props.progress.total);
    let progress;
    if (completed) {
      progress = (
        <Button variant="success" href={this.props.job.resultUrl} download>
          Download
        </Button>
      );
    } else if (this.props.progress) {
      progress = <ProgressBar now={this.props.progress.progress / this.props.progress.total * 100} className="w-100 mt-2 mr-3 ml-3" />;
    } else {
      progress = <Button variant="secondary" disabled={true}>Working…</Button>;
    }
    return (
      <Col md={6} lg={4}>
        <Card className="mt-3" style={{ height: 'calc(100% - 1rem)' }}>
          <Card.Body>
            <Row className="justify-content-center">
              <Card.Title>{ JOB_TYPES[this.props.job.command] } { this.props.job.fileName }</Card.Title>
            </Row>
            <Row className="justify-content-center mb-2">
              <Card.Subtitle>{ moment(this.props.job.startTime).calendar() }</Card.Subtitle>
            </Row>
            <Row className="justify-content-center">
              { progress }
            </Row>
          </Card.Body>
        </Card>
      </Col>
    );
  }
}

export default JobCard;
