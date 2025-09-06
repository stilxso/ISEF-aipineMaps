import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import TrailsScreen from '../screens/TrailsScreen';
import COScreen from '../screens/COScreen';
import AIScreen from '../screens/AIScreen';
import { Text, StyleSheet } from 'react-native';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0f172a',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '600'
        }
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: ({ color }) => <Text style={[styles.tabLabel, { color }]}>Home</Text> }}
      />
      <Tab.Screen
        name="Trails"
        component={TrailsScreen}
        options={{ tabBarLabel: ({ color }) => <Text style={[styles.tabLabel, { color }]}>Trails</Text> }}
      />
      <Tab.Screen
        name="CO"
        component={COScreen}
        options={{ tabBarLabel: ({ color }) => <Text style={[styles.tabLabel, { color }]}>CO</Text> }}
      />
      <Tab.Screen
        name="AI"
        component={AIScreen}
        options={{ tabBarLabel: ({ color }) => <Text style={[styles.tabLabel, { color }]}>AI</Text> }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 13,
    fontWeight: '600'
  }
});