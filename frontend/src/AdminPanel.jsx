import React, { Component } from 'react';

import restProvider from 'ra-data-simple-rest';
import { Admin, Resource, List, Datagrid, Edit, Create, SimpleForm, DateField, TextField, ArrayField, SingleFieldList, DisabledInput, TextInput, ArrayInput, SimpleFormIterator } from 'react-admin';

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

const AdminPanel = (props) => (
  <Admin dataProvider={restProvider('api')}>
    <Resource name="organizations"
      list={OrganizationList}
      create={OrganizationCreate}
      edit={OrganizationEdit} />
  </Admin>
);

export default AdminPanel;
