import React, { Component } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

class LoginModal extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  componentWillMount() {
    console.log(window.location.hash);
    if (window.location.hash.startsWith('#error=')) {
      let error = decodeURI(window.location.hash.replace('#error=', ''));
      console.log('Error:', error);
      this.setState({ error: error });
    }
    window.history.replaceState('', document.title, window.location.pathname);
  }

  render() {
    let maybeAlert = this.state.error ? <Alert variant="warning">{ this.state.error }</Alert> : null;
    return (
      <Modal show={this.props.show}>
        <Modal.Header>
          <Modal.Title>Log in to continue</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          { maybeAlert }
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" href="api/auth/google">Log in with Google</Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default LoginModal;
