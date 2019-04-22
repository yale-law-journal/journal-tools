import React, { Component } from 'react';

import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
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
      let currentOrg = this.props.loginInfo.organizations.find(org => org.id == this.props.organization);
      let isAdmin = currentOrg.admin;
      loginInfo = this.props.loginInfo.name;
      options = this.props.loginInfo.organizations.map(org =>
        <option value={org.id}>{ org.name }</option>
      );
      orgMenu = <>
        <InputGroup size="sm">
          <Form.Control as="select" className="custom-select" value={this.props.organization} onChange={this.onOrgChange}>
            <option disabled>Organization</option>
            { options }
          </Form.Control>
          <InputGroup.Append>
            { isAdmin ? <Button variant="secondary" href="admin.html">Admin</Button> : null }
          </InputGroup.Append>
        </InputGroup>
      </>;
    }
    return <>
      <Navbar.Text className="mr-sm-3">{ loginInfo }</Navbar.Text>
      <Form inline>
        { orgMenu }
      </Form>
      <Button size="sm" variant="light" className="ml-sm-3" onClick={this.handleLogout}>Logout</Button>
    </>;
  }
}

export default LoginForm;
