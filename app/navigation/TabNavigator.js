import React from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import TrailsScreen from '../screens/TrailsScreen';
import GOScreen from '../screens/GOScreen';
import AIScreen from '../screens/AIScreen';
import ThreeDMapScreen from '../screens/ThreeDMapScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AuthScreen from '../screens/AuthScreen';

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

const NAV_BG = '#0b0d2a';
const NAV_INACTIVE = '#93a4c8';
const NAV_ACTIVE = '#ffffff';
const NAV_ACTIVE_BG = '#1a2145'; // Светлый фон для активной вкладки
const GO_BG = '#5b6eff';
const GO_SIZE = 80; // Огромная кнопка СТАРТ


const TabLabel = React.memo(({ label, focused }) => (
  <View style={[
    styles.tabLabelContainer,
    focused && styles.activeTabLabel
  ]}>
    <Text
      style={[
        styles.tabLabel,
        { color: focused ? NAV_ACTIVE : NAV_INACTIVE }
      ]}
    >
      {label}
    </Text>
    {focused && <View style={styles.activeIndicator} />}
  </View>
));

const GoTabButton = React.memo(({ onPress }) => (
  <View style={styles.goButtonContainer}>
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.goButton,
        { transform: [{ scale: pressed ? 0.95 : 1 }] }
      ]}
    >
      <View style={styles.goButtonInner}>
        <Text style={styles.goButtonText}>СТАРТ</Text>
        <View style={styles.goButtonGlow} />
      </View>
    </Pressable>
  </View>
));

// Helper functions to avoid inline component definitions
const createTabLabel = (label) => ({ focused }) => <TabLabel label={label} focused={focused} />;
const createGoButton = (onPress) => <GoTabButton onPress={onPress} />;

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: NAV_ACTIVE,
        tabBarInactiveTintColor: NAV_INACTIVE,
        tabBarStyle: {
          backgroundColor: NAV_BG,
          borderTopWidth: 0,
          height: 90,
          paddingBottom: 10,
          paddingTop: 10,
          paddingHorizontal: 10,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
          marginHorizontal: 2,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700'
        },
      }}
    >
      <Tab.Screen
        name="Карта"
        component={HomeScreen}
        options={{
          tabBarLabel: createTabLabel("Карта"),
        }}
      />
      <Tab.Screen
        name="Маршруты"
        component={TrailsScreen}
        options={{
          tabBarLabel: createTabLabel("Маршруты"),
        }}
      />
      <Tab.Screen
        name="СТАРТ"
        component={GOScreen}
        options={{
          tabBarLabel: '',
          tabBarButton: createGoButton,
        }}
      />
      <Tab.Screen
        name="ИИ"
        component={AIScreen}
        options={{
          tabBarLabel: createTabLabel("ИИ"),
        }}
      />
      <Tab.Screen
        name="3D"
        component={ThreeDMapScreen}
        options={{
          tabBarLabel: createTabLabel("3D"),
        }}
      />
      <Tab.Screen
        name="Больше"
        component={SettingsScreen}
        options={{
          tabBarLabel: createTabLabel("Больше"),
        }}
      />
      <Tab.Screen
        name="Профиль"
        component={AuthScreen}
        options={{
          tabBarLabel: createTabLabel("Профиль"),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabLabelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    minWidth: 60,
  },
  activeTabLabel: {
    backgroundColor: NAV_ACTIVE_BG,
    shadowColor: NAV_ACTIVE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -2,
    left: '50%',
    marginLeft: -10,
    width: 20,
    height: 3,
    backgroundColor: NAV_ACTIVE,
    borderRadius: 2,
  },
  goButtonContainer: {
    position: 'absolute',
    top: -GO_SIZE / 2,
    left: width / 2 - GO_SIZE / 2,
    width: GO_SIZE,
    height: GO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goButton: {
    width: GO_SIZE,
    height: GO_SIZE,
    borderRadius: GO_SIZE / 2,
    backgroundColor: GO_BG,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GO_BG,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },
  goButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  goButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  goButtonGlow: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: (GO_SIZE + 10) / 2,
    backgroundColor: 'rgba(91, 110, 255, 0.3)',
    shadowColor: GO_BG,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
});