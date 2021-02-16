import React, { Component } from 'react';

import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';

import LoginForm from './components/LoginForm';
import LoginModal from './components/LoginModal';

var qs = require('query-string');
var decoder = new TextDecoder('utf-8');

function locationSlash() {
  let href = window.location.href;
  return href.endsWith('/') ? href : href + '/';
}

class Bluebook extends Component {
  constructor(props) {
    super(props);
    console.log("Version: dev");
    this.state = {
      loginInfo: null,
      loading: true,
      organization: null,
      extJson: null,
    };
  }

  async getLoginStatus() {
    let response = await fetch('api/auth');
    if (response.ok) {
      let info = await response.json();
      this.setState({
        loginInfo: info,
        organization: localStorage.getItem('organization')
          || (info.organizations ? info.organizations[0].id : null),
      });
    }
    this.setState({ loading: false });
  }

  async componentDidMount() {
    let loginStatus = this.getLoginStatus();

    const params = qs.parse(
      this.props.location.search,
      {ignoreQueryPrefix: true}
    );

    await this.fetchExternalJson(decodeURI(params.url));
    await loginStatus;
  }

  setOrganization = (organization) => {
    localStorage.setItem('organization', organization);
    this.setState({ organization });
  }

  handleLogout = () => {
    this.setState({ loginInfo: false });
  }

  async fetchExternalJson(url) {
    const response = await fetch(url);
    const body = await response.text();
    this.setState({
      extJson: JSON.parse(body)
    });
  }

  renderJson(json) {
    const footnotes = json.footnotes;
    const body = json.body;
    const header = `
      <tr>
        <th>Location</th>
        <th>Error(s)</th>
        <th>Text</th>
      </tr>
    `;

    var footnotes_html = header;
    for (var i = 0; i < footnotes.length; i++) {
      footnotes_html += "<tr>";
      footnotes_html += "<td>n." + footnotes[i].location + "</td>";
      var errors_html = "<ul>";
      for (var j = 0; j < footnotes[i].errors.length; j++) {
        errors_html += "<li>" + footnotes[i].errors[j] + "</li>"
      }
      errors_html += "</ul>";
      footnotes_html += "<td>" + errors_html + "</td>";
      footnotes_html += "<td>" + footnotes[i].text + "</td>";
      footnotes_html += "</tr>";
    }

    var body_html = header;
    for (var i = 0; i < body.length; i++) {
      body_html += "<tr>";
      var location_label = "nn." + body[i].location.start + "-" + body[i].location.end
      if (body[i].location.start == "start") {
        location_label = "start to n." + body[i].location.end
      }
      if (body[i].location.end == "end") {
        location_label = "n." + body[i].location.start + " to end"
      }
      body_html += "<td>" + location_label + "</td>";
      var errors_html = "<ul>";
      for (var j = 0; j < body[i].errors.length; j++) {
        errors_html += "<li>" + body[i].errors[j] + "</li>"
      }
      errors_html += "</ul>";
      body_html += "<td>" + errors_html + "</td>";
      body_html += "<td>" + body[i].text + "</td>";
      body_html += "</tr>";
    }

    return (
      <div>
        <Row className="justify-content-center mt-3">
          <h3>{json.file == undefined ? "Placeholder" : json.file}</h3>
        </Row>
        <hr />
        <Row className="justify-content-left">
          <Tabs defaultActiveKey="footnotes">
            <Tab eventKey="footnotes" title="Footnotes">
              <Table striped dangerouslySetInnerHTML={{__html: footnotes_html}}></Table>
            </Tab>
            <Tab eventKey="body" title="Body">
              <Table striped dangerouslySetInnerHTML={{__html: body_html}}></Table>
            </Tab>
          </Tabs>
        </Row>
      </div>
    )
  }

  render() {
    let loginInfo = this.state.loginInfo ? `Signed in as ${this.state.loginInfo.name}` : 'Signed out';
    return <>
      <LoginModal show={!this.state.loading && !Boolean(this.state.loginInfo)} />
      <Navbar bg="dark" variant="dark" expand="sm">
        <Navbar.Brand>(DEV) Journal Tools</Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse className="justify-content-end">
          <LoginForm
            loginInfo={this.state.loginInfo}
            organization={this.state.organization}
            onOrgChange={this.setOrganization}
            onLogout={this.handleLogout} />
        </Navbar.Collapse>
      </Navbar>
      <Container className="pt-2 justify-content-center">
        { this.state.extJson == null ? "Loading..." :
          this.renderJson(this.state.extJson)
        }
      </Container>
    </>;
  }
}

export default Bluebook;
