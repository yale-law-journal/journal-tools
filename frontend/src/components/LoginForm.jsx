import React, { Component } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import queryString from 'query-string';

class LoginForm extends Component {
  componentWillMount() {
    var query = queryString.parse(window.location.search);
    if (query.token) {
      window.localStorage.setItem('jwt', query.token);
    }
  }

  render() {
    return (
      <Form inline>
        <Button type="submit" href="api/auth/google">Login with Google</Button>
      </Form>
    );
  }
}

export default LoginForm;
