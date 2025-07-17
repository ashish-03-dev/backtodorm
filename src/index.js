import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fontsource/questrial';
import { FirebaseProvider } from './context/FirebaseContext';
import { AddressProvider } from './context/AddressContext';
import { SearchProvider } from './context/SearchContext';
import { OptionalProvider } from './context/OptionalContext';
import { NewArrivalsProvider } from './context/NewArrivalsContext';
import { CollectionsProvider } from './context/CollectionsContext';
import { AllPostersProvider } from './components/Collections/AllPosters';
import { CollectionsPacksPageProvider } from './components/Collections/CollectionsPacksPage';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <FirebaseProvider>
      <AddressProvider>
        <SearchProvider>
          <OptionalProvider>
            <NewArrivalsProvider>
              <CollectionsProvider>
                <AllPostersProvider>
                  <CollectionsPacksPageProvider>
                    <App />
                  </CollectionsPacksPageProvider>
                </AllPostersProvider>
              </CollectionsProvider>
            </NewArrivalsProvider>
          </OptionalProvider>
        </SearchProvider>
      </AddressProvider>
    </FirebaseProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
