import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import App from './App';
import Bluebook from './Bluebook';

ReactDOM.render(
    <BrowserRouter>
      <main>
          <Switch>
              <Route path="/" component={App} exact />
              <Route path="/bluebook" component={Bluebook} />
          </Switch>
      </main>
    </BrowserRouter>,
    document.getElementById('react-root')
)
