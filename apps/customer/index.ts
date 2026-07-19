import { registerRootComponent } from 'expo';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import App from './App';

function RootApp() {
  return React.createElement(SafeAreaProvider, null, React.createElement(App));
}

registerRootComponent(RootApp);
