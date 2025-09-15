
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import TabNavigator from './app/navigation/TabNavigator';
import AuthScreen from './app/screens/AuthScreen';

import { AuthProvider, useAuth } from './app/contexts/AuthContext';
import { RoutesProvider } from './app/contexts/RoutesContext';
import { SettingsProvider } from './app/contexts/SettingsContext';
import { LocationProvider } from './app/contexts/LocationContext';
import { RecorderProvider } from './app/contexts/RecorderContext';
import { SosProvider } from './app/contexts/SosContext';
import { NotificationProvider } from './app/contexts/NotificationContext';
import { PeaksProvider } from './app/contexts/PeaksContext';


function MainApp() {
  return (
    <SettingsProvider>
      <LocationProvider>
        <NotificationProvider>
          <SosProvider>
            <RoutesProvider>
              <RecorderProvider>
                <PeaksProvider>
                  <NavigationContainer>
                    <TabNavigator />
                  </NavigationContainer>
                </PeaksProvider>
              </RecorderProvider>
            </RoutesProvider>
          </SosProvider>
        </NotificationProvider>
      </LocationProvider>
    </SettingsProvider>
  );
}


function AuthNavigator() {
  const { login } = useAuth();

  const handleAuthentication = () => {
    
    
  };

  return <AuthScreen onAuthentication={handleAuthentication} />;
}


function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5b6eff" />
      </View>
    );
  }

  return isAuthenticated ? <MainApp /> : <AuthNavigator />;
}


export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0d2a',
  },
});
