// тут импортируем реакт и навигацию
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
// здесь подключаем основной навигатор с табами
import TabNavigator from './app/navigation/TabNavigator';
// импортируем провайдеры для управления состоянием приложения
import { RoutesProvider } from './app/contexts/RoutesContext';
import { SettingsProvider } from './app/contexts/SettingsContext';
import { LocationProvider } from './app/contexts/LocationContext';
import { RecorderProvider } from './app/contexts/RecorderContext';
import { SosProvider } from './app/contexts/SosContext';
import { NotificationProvider } from './app/contexts/NotificationContext';

// главная функция приложения
export default function App() {
  // тут оборачиваем все в провайдеры для передачи состояния
  return (
    <SettingsProvider>
      <LocationProvider>
        <NotificationProvider>
          <SosProvider>
            <RoutesProvider>
              <RecorderProvider>
                <NavigationContainer>
                  <TabNavigator />
                </NavigationContainer>
              </RecorderProvider>
            </RoutesProvider>
          </SosProvider>
        </NotificationProvider>
      </LocationProvider>
    </SettingsProvider>
  );
}
