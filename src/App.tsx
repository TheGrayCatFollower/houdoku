import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import log from 'electron-log';
import { ipcRenderer } from 'electron';
import { ExtensionMetadata } from 'houdoku-extension-lib';
import { useSetRecoilState } from 'recoil';
import { configuredStore } from './store';
import persistantStore from './util/persistantStore';
import routes from './constants/routes.json';
import DashboardPage from './components/general/DashboardPage';
import ReaderPage from './components/reader/ReaderPage';
import ipcChannels from './constants/ipcChannels.json';
import storeKeys from './constants/storeKeys.json';
import { TrackerMetadata } from './models/types';
import { loadSeriesList, migrateSeriesTags } from './features/library/utils';
import { linkDownloaderClientFunctions } from './features/downloader/reducers';
import AppLoading from './components/general/AppLoading';
import { seriesListState } from './state/libraryStates';
import { statusTextState } from './state/statusBarStates';

const store = configuredStore();

const loadStoredExtensionSettings = () => {
  log.info('Loading stored extension settings...');
  return (
    ipcRenderer
      .invoke(ipcChannels.EXTENSION_MANAGER.GET_ALL)
      // eslint-disable-next-line promise/always-return
      .then((metadataList: ExtensionMetadata[]) => {
        metadataList.forEach((metadata: ExtensionMetadata) => {
          const extSettings: string | null = persistantStore.read(
            `${storeKeys.EXTENSION_SETTINGS_PREFIX}${metadata.id}`
          );
          if (extSettings !== null) {
            log.debug(`Found stored settings for extension ${metadata.id}`);
            ipcRenderer.invoke(
              ipcChannels.EXTENSION.SET_SETTINGS,
              metadata.id,
              JSON.parse(extSettings)
            );
          }
        });
      })
      .catch((e: Error) => log.error(e))
  );
};

const loadStoredTrackerTokens = () => {
  log.info('Loading stored tracker tokens...');
  return (
    ipcRenderer
      .invoke(ipcChannels.TRACKER_MANAGER.GET_ALL)
      // eslint-disable-next-line promise/always-return
      .then((metadataList: TrackerMetadata[]) => {
        metadataList.forEach((metadata: TrackerMetadata) => {
          const token: string | null = persistantStore.read(
            `${storeKeys.TRACKER_ACCESS_TOKEN_PREFIX}${metadata.id}`
          );
          if (token !== null) {
            log.debug(`Found stored token for tracker ${metadata.id}`);
            ipcRenderer.invoke(
              ipcChannels.TRACKER.SET_ACCESS_TOKEN,
              metadata.id,
              token
            );
          }
        });
      })
      .catch((e: Error) => log.error(e))
  );
};

loadStoredExtensionSettings();
loadStoredTrackerTokens();

log.debug('Adding app-wide renderer IPC handlers');
ipcRenderer.on(ipcChannels.APP.LOAD_STORED_EXTENSION_SETTINGS, () => {
  loadStoredExtensionSettings();
});
ipcRenderer.on(ipcChannels.WINDOW.SET_FULLSCREEN, (_event, fullscreen) => {
  if (fullscreen) {
    document.getElementById('titlebar')?.classList.add('hidden');
  } else {
    document.getElementById('titlebar')?.classList.remove('hidden');
  }
});

if (store.getState().settings.autoCheckForUpdates) {
  ipcRenderer.invoke(ipcChannels.APP.CHECK_FOR_UPDATES);
} else {
  log.debug('Skipping update check, autoCheckForUpdates is disabled');
}

if (store.getState().settings.autoCheckForExtensionUpdates) {
  ipcRenderer
    .invoke(ipcChannels.EXTENSION_MANAGER.CHECK_FOR_UPDATESS)
    .then(
      (updates: {
        [key: string]: { metadata: ExtensionMetadata; newVersion: string };
      }) => {
        // eslint-disable-next-line promise/always-return
        if (Object.values(updates).length > 0) {
          ipcRenderer.invoke(
            ipcChannels.APP.SHOW_EXTENSION_UPDATE_DIALOG,
            updates
          );
        }
      }
    )
    .catch((err: Error) => log.error(err));
} else {
  log.debug(
    'Skipping extension update check, autoCheckForExtensionUpdates is disabled'
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const setSeriesList = useSetRecoilState(seriesListState);
  const setStatusText = useSetRecoilState(statusTextState);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (loading) {
      log.debug('Performing initial app load steps');

      /**
       * Add any additional preload steps here (e.g. data migration, verifications, etc)
       */

      // Allow the main thread to set status messages
      ipcRenderer.on(ipcChannels.APP.SET_STATUS, (_event, text) => {
        setStatusText(text);
      });

      // The downloader requires access to some other actions/parts of the
      // state, so they are manually linked here
      linkDownloaderClientFunctions(store, setStatusText);

      // Previously the series object had separate tag fields (themes, formats, genres,
      // demographic, content warnings). These have now been consolidated into the
      // field 'tags'.
      migrateSeriesTags();

      loadSeriesList(setSeriesList);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  if (loading) {
    return <AppLoading />;
  }

  return (
    <Provider store={store}>
      <Router>
        <Switch>
          <Route
            path={`${routes.READER}/:series_id/:chapter_id`}
            exact
            component={ReaderPage}
          />
          <Route path={routes.SERIES} component={DashboardPage} />
          <Route path={routes.SEARCH} component={DashboardPage} />
          <Route path={routes.SETTINGS} component={DashboardPage} />
          <Route path={routes.LIBRARY} component={DashboardPage} />
        </Switch>
      </Router>
    </Provider>
  );
}
