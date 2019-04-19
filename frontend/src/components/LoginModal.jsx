import React, { Component } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

class LoginModal extends Component {
  render() {
    return (
      <Modal show={this.props.show}>
        <Modal.Header>
          <Modal.Title>Log in to continue</Modal.Title>
        </Modal.Header>
        <Modal.Footer>
          <Button variant="primary" href="api/auth/google">Log in with Google</Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default LoginModal;
