import React, { Component } from 'react';

import restProvider from 'ra-data-simple-rest';
import { Admin, Resource, List, Datagrid, DateField, TextField, UrlField, ReferenceField, BooleanField, ArrayField, SingleFieldList,
  Edit, Create, SimpleForm, DisabledInput, TextInput, ArrayInput, SimpleFormIterator } from 'react-admin';

const OrganizationList = (props) => (
  <List {...props}>
    <Datagrid rowClick="edit">
      <TextField source="name" />
      <TextField source="permaApiKey" />
      <TextField source="permaFolder" />
      <ArrayField source="users">
        <SingleFieldList>
          <TextField source="email" />
        </SingleFieldList>
      </ArrayField>
      <ArrayField source="admins">
        <SingleFieldList>
          <TextField source="email" />
        </SingleFieldList>
      </ArrayField>
    </Datagrid>
  </List>
);

const OrganizationCreate = (props) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="name" />
      <TextInput source="permaApiKey" />
      <TextInput source="permaFolder" />
      <ArrayInput source="users">
        <SimpleFormIterator>
          <TextInput source="email" />
        </SimpleFormIterator>
      </ArrayInput>
      <ArrayInput source="admins">
        <SimpleFormIterator>
          <TextInput source="email" />
        </SimpleFormIterator>
      </ArrayInput>
    </SimpleForm>
  </Create>
);

const OrganizationEdit = (props) => (
  <Edit {...props}>
    <SimpleForm>
      <DisabledInput source="id" />
      <TextInput source="name" />
      <TextInput source="permaApiKey" />
      <TextInput source="permaFolder" />
      <ArrayInput source="users">
        <SimpleFormIterator>
          <TextInput source="email" />
        </SimpleFormIterator>
      </ArrayInput>
      <ArrayInput source="admins">
        <SimpleFormIterator>
          <TextInput source="email" />
        </SimpleFormIterator>
      </ArrayInput>
    </SimpleForm>
  </Edit>
);

const JobList = (props) => (
  <List {...props}>
    <Datagrid>
      <TextField source="UserEmail" />
      <ReferenceField source="OrganizationId" reference="organizations">
        <TextField source="name" />
      </ReferenceField>
      <TextField source="command" />
      <TextField source="fileName" />
      <BooleanField source="completed" />
      <UrlField source="resultUrl" />
    </Datagrid>
  </List>
);

class AdminPanel extends Component {
  constructor(props) {
    super(props);
    this.state = { siteAdmin: false };
  }

  async componentWillMount() {
    let authResponse = await fetch('api/auth');
    let auth = await authResponse.json();
    if (auth.siteAdmin) {
      this.setState({ siteAdmin: true });
    }
  }

  render() {
    let resources = [(
      <Resource key={0} name="organizations"
        list={OrganizationList}
        create={this.state.siteAdmin ? OrganizationCreate : undefined}
        edit={OrganizationEdit} />
    )];
    if (this.state.siteAdmin) {
      resources.push(<Resource key={1} name="jobs/all" options={{ label: 'Jobs' }} list={JobList} />);
    }
    return (
      <Admin dataProvider={restProvider('api')}>
        { resources }
      </Admin>
    );
  }
}

export default AdminPanel;
