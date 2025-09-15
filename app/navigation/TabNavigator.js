import { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import GoScreen from '../screens/GoScreen';
import AIScreen from '../screens/AIScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');
const isLargeScreen = width > 400;
const tabGap = isLargeScreen ? 24 : 16;
const tabFontSize = isLargeScreen ? 18 : 16;

const TAB_BG = '#28263C';
const ACTIVE_UNDERLINE = '#ffffff';
const INACTIVE = '#bfc7d6';
const GO_BG = '#0f0d15';
const GO_ACCENT = '#ffffff';
const TAB_HEIGHT = 80;
const SAFE_BOTTOM = Platform.OS === 'ios' ? 24 : 12;

const GO_WIDTH = 70;
const GO_HEIGHT = 50;
const GO_BORDER_RADIUS = 14;

function CustomTabBar({ state, navigation }) {
  const routes = state.routes;
  

    const underlineAnimsRef = useRef([]);

  useEffect(() => {
    const current = underlineAnimsRef.current;
    if (current.length !== routes.length) {
      const newArr = routes.map((_, i) => {
        if (current[i]) return current[i];
        return new Animated.Value(state.index === i ? 1 : 0);
      });
      underlineAnimsRef.current = newArr;
    }
        underlineAnimsRef.current.forEach((anim, i) => {
      anim.setValue(state.index === i ? 1 : 0);
    });
      }, [routes.length]);

  useEffect(() => {
    const animations = underlineAnimsRef.current.map((anim, i) =>
      Animated.timing(anim, {
        toValue: state.index === i ? 1 : 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      })
    );
    Animated.parallel(animations).start();
  }, [state.index]);

  const isFocused = (index) => state.index === index;

  const onTabPress = (routeName, index) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routes[index].key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) navigation.navigate(routeName);
  };


    const renderTab = (routeName, label, index) => {
    const focused = isFocused(index);
    const anim = underlineAnimsRef.current[index] || new Animated.Value(0);

    const maxWidth = 36;
    const underlineWidth = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, maxWidth],
    });
    const underlineOpacity = anim.interpolate({
      inputRange: [0, 0.6, 1],
      outputRange: [0, 0.45, 1],
    });

    return (
      <Pressable
        key={routeName}
        onPress={() => onTabPress(routeName, index)}
        style={styles.tabButton}
        accessibilityRole="button"
      >
        <View style={styles.labelWrap}>
          <Text
            style={[
              styles.tabLabel,
              { color: focused ? '#fff' : INACTIVE, fontFamily: 'Montserrat' },
            ]}
          >
            {label}
          </Text>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.underline,
              {
                width: underlineWidth,
                opacity: underlineOpacity,
              },
            ]}
          />
        </View>
      </Pressable>
    );
  };

  const idxMap = {};
  routes.forEach((r, i) => (idxMap[r.name] = i));
  const homeIndex = idxMap['Home'] ?? 0;
  const mapIndex = idxMap['Map'] ?? 1;
  const aiIndex = idxMap['AI'] ?? 3;
  const profileIndex = idxMap['Profile'] ?? 4;

    const goBottom = SAFE_BOTTOM + Math.max(0, (TAB_HEIGHT - GO_HEIGHT) / 2) - 10;

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <View style={styles.tabBar}>
        <View style={styles.side}>
          {renderTab('Home', 'Home', homeIndex)}
          {renderTab('Map', 'Trails', mapIndex)}
        </View>

        <View style={styles.sideRight}>
          {renderTab('AI', 'AI', aiIndex)}
          {renderTab('Profile', 'Profile', profileIndex)}
        </View>
      </View>

      <View
        style={[
          styles.goWrapper,
          { left: (width - GO_WIDTH) / 2, bottom: goBottom, width: GO_WIDTH, height: GO_HEIGHT },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => navigation.navigate('GoScreen')}
          style={({ pressed }) => [
            styles.goBackground,
            { transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}
          accessibilityRole="button"
        >
          <View style={styles.goInnerShadow} pointerEvents="none" />
          <Text style={[styles.goText, { fontFamily: 'Montserrat' }]}>GO</Text>
        </Pressable>
      </View>
    </View>
  );
}


export default function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="GoScreen" component={GoScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="AI" component={AIScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  tabBar: {
    height: TAB_HEIGHT,
    backgroundColor: TAB_BG,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    alignItems: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 12,
  },
  side: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  sideRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tabGap / 2,
    minWidth: 64,
    height: TAB_HEIGHT,
  },
  labelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingBottom: 6,
  },
  tabLabel: {
    fontSize: tabFontSize,
    fontWeight: '700',
  },
  underline: {
    position: 'absolute',
    bottom: -2,
    height: 3,
    backgroundColor: ACTIVE_UNDERLINE,
    borderRadius: 2,
  },
  goWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
  goBackground: {
    width: GO_WIDTH,
    height: GO_HEIGHT,
    borderRadius: GO_BORDER_RADIUS,
    backgroundColor: GO_BG,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 16,
    overflow: 'hidden',
  },
  goInnerShadow: {
    position: 'absolute',
    left: -8,
    right: -8,
    top: -8,
    bottom: -8,
    borderRadius: GO_BORDER_RADIUS,
    backgroundColor: 'rgba(91,110,255,0.03)',
  },
  goText: {
    color: GO_ACCENT,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
