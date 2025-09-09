import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import TabNavigator from './app/navigation/TabNavigator';
import { RoutesProvider } from './app/contexts/RoutesContext';
import { SettingsProvider } from './app/contexts/SettingsContext';
import { LocationProvider } from './app/contexts/LocationContext';
import { RecorderProvider } from './app/contexts/RecorderContext';

export default function App() {
  return (
    <SettingsProvider>
      <LocationProvider>
        <RoutesProvider>
          <RecorderProvider>
            <NavigationContainer>
              <TabNavigator />
            </NavigationContainer>
          </RecorderProvider>
        </RoutesProvider>
      </LocationProvider>
    </SettingsProvider>
  );
}
