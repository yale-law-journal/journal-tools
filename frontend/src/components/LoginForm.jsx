import React, { Component } from 'react';

import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Navbar from 'react-bootstrap/Navbar';

class LoginForm extends Component {
  onOrgChange = (e) => this.props.onOrgChange(parseInt(e.target.value))
  handleLogout = async (e) => {
    e.preventDefault();
    let response = await fetch('api/auth/logout');
    if (response.ok) {
      this.props.onLogout();
    } else {
      console.error(response.text());
    }
  }

  render() {
    let loginInfo = 'Signed out', options = null, orgMenu = null;
    if (this.props.loginInfo) {
      loginInfo = this.props.loginInfo.name;
      options = this.props.loginInfo.organizations.map(org =>
        <option value={org.id}>{ org.name }</option>
      );
      orgMenu = (
        <Form.Control as="select" size="sm" className="mr-sm-3" value={this.props.organization} onChange={this.onOrgChange}>
          <option disabled>Organization</option>
          { options }
        </Form.Control>
      );
    }
    return <>
      <Navbar.Text className="mr-sm-2">{ loginInfo }</Navbar.Text>
      <Form inline>
        { orgMenu }
        <Button size="sm" variant="light" onClick={this.handleLogout}>Logout</Button>
      </Form>
    </>;
  }
}

export default LoginForm;
