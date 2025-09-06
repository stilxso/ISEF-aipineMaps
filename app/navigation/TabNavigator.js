import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import TrailsScreen from '../screens/TrailsScreen';
import GOScreen from '../screens/GOScreen';
import AIScreen from '../screens/AIScreen';
import { Text, StyleSheet } from 'react-native';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#1E1E1E',
          borderTopWidth: 0,
          height: 80,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600'
        },
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
        name="GO"
        component={GOScreen}
        options={{ tabBarLabel: ({ color }) => <Text style={[styles.tabLabel, { color }]}>GO</Text> }}
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