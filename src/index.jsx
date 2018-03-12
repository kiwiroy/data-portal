import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import injectTapEventPlugin from 'react-tap-event-plugin';
import 'react-select/dist/react-select.css';
import querystring from 'querystring';

import { fetchUser, fetchDictionary, fetchSchema, fetchVersionInfo } from './actions';
import ReduxLogin, { fetchLogin } from './Login/ReduxLogin';
import ProtectedContent from './Login/ProtectedContent';
import AmbiHomepage from './Homepage/AmbiHomepage';
import ExplorerPage from './Explorer/ExplorerPage';
import DataDictionary from './DataDictionary/ReduxDataDictionary';
import DataDictionaryNode from './DataDictionary/ReduxDataDictionaryNode';
import ProjectSubmission from './Submission/ReduxProjectSubmission';
import UserProfile, { fetchAccess } from './UserProfile/ReduxUserProfile';
import CertificateQuiz from './Certificate/ReduxQuiz';
import GraphQLQuery from './GraphQLEditor/ReduxGqlEditor';
import { basename } from './localconf';
import { OuterWrapper, Box, Margin, theme } from './theme';
import { asyncSetInterval } from './utils';
import getReduxStore from './reduxStore';
import Nav from './Nav/ReduxNavBar';
import Footer from './components/Footer';
import ReduxQueryNode, { submitSearchForm } from './QueryNode/ReduxQueryNode';


// Needed for onTouchTap
// http://stackoverflow.com/a/34015469/988941
injectTapEventPlugin();


// render the app after the store is configured
async function init() {
  const store = await getReduxStore();

  asyncSetInterval(() => store.dispatch(fetchUser), 60000);

  await Promise.all(
    [
      store.dispatch(fetchSchema),
      store.dispatch(fetchDictionary),
      fetchVersionInfo().then(({ status, data }) => {
        if (status === 200) {
          Object.assign(Footer.defaultProps,
            { dictionaryVersion: data.dictionary.version,
              apiVersion: data.version },
          );
        }
      }),
    ],
  );
  const background = null; // for now

  render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MuiThemeProvider>
          <BrowserRouter basename={basename}>
            <OuterWrapper>
              <Box background={background}>
                <Nav />
                <Switch>
                  <Route
                    path="/login"
                    component={
                      (
                        props => (
                          <ProtectedContent
                            public
                            filter={() => store.dispatch(fetchLogin())}
                            component={ReduxLogin}
                            {...props}
                          />
                        )
                      )
                    }
                  />
                  <Route
                    exact
                    path="/"
                    component={
                      props => <ProtectedContent component={AmbiHomepage} {...props} />
                    }
                  />
                  <Route
                    path="/query"
                    component={
                      props => <ProtectedContent component={GraphQLQuery} {...props} />
                    }
                  />
                  <Route
                    path="/identity"
                    component={
                      props => (<ProtectedContent
                        filter={() => store.dispatch(fetchAccess())}
                        component={UserProfile}
                        {...props}
                      />)
                    }
                  />
                  <Route
                    path="/quiz"
                    component={props => <ProtectedContent component={CertificateQuiz} {...props} />}
                  />
                  <Route
                    path="/dd/:node"
                    component={
                      props => <ProtectedContent public component={DataDictionaryNode} {...props} />
                    }
                  />
                  <Route
                    path="/dd"
                    component={
                      props => <ProtectedContent public component={DataDictionary} {...props} />
                    }
                  />
                  <Route
                    path="/files"
                    component={
                      props => <ProtectedContent background={'#ecebeb'} component={ExplorerPage} {...props} />
                    }
                  />
                  <Route
                    path="/:project/search"
                    component={
                      (props) => {
                        const queryFilter = () => {
                          const location = props.location;
                          const queryParams = querystring.parse(location.search ? location.search.replace(/^\?+/, '') : '');
                          if (Object.keys(queryParams).length > 0) {
                            // Linking directly to a search result,
                            // so kick-off search here (rather than on button click)
                            return store.dispatch(
                              submitSearchForm({
                                project: props.match.params.project, ...queryParams,
                              }),
                            );
                          }
                          return Promise.resolve('ok');
                        };
                        return (
                          <ProtectedContent
                            filter={queryFilter}
                            component={ReduxQueryNode}
                            {...props}
                          />);
                      }
                    }
                  />
                  <Route
                    path="/:project"
                    component={
                      props => <ProtectedContent component={ProjectSubmission} {...props} />
                    }
                  />
                </Switch>
                <Margin background={background} />
              </Box>
              <Footer />
            </OuterWrapper>
          </BrowserRouter>
        </MuiThemeProvider>
      </ThemeProvider>
    </Provider>,
    document.getElementById('root'),
  );
}

init();