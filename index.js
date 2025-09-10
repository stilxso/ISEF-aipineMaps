// тут импортируем компоненты реакт натива для регистрации приложения
import { AppRegistry } from 'react-native';
// здесь подключаем главный компонент App
import App from './App';
// импортируем имя приложения из конфига
import { name as appName } from './app.json';

// регистрируем приложение в системе
AppRegistry.registerComponent(appName, () => App);
