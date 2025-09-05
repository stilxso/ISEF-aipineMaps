import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { NavigationContainer } from "@react-navigation/native"
import HomeScreen from "../screens/HomeScreen"
import TrailsScreen from "../screens/TrailsScreen"
import GOScreen from "../screens/GOScreen"
import AIScreen from "../screens/AIScreen"

const Tab = createBottomTabNavigator()

export default function TabNavigator(){
    return(
        <NavigationContainer>
            <Tab.Navigator
                screenOptions={({ route }) => ({
                    headerShown: false,
                    tabBarShowIcon: false,
                    tabBarShownLabelStyle: { fontSize: 13, fontWeight: '600' },
                    tabBarStyle: {
                        height: 62,
                        paddingBottom: 8,
                        paddingTop: 6,
                        backgroundColor: '#ffffff',
                        borderTopWidth: 0.5,
                        borderTopColor: '#e5e7eb',
                    }
                })}>
            
                <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }}/>
                <Tab.Screen name="Trails" component={TrailsScreen} options={{ title: 'Trails' }}/>
                <Tab.Screen name="GO" component={GOScreen} options={{ title: 'GO' }}/>
                <Tab.Screen name="AI" component={AIScreen} options={{ title: 'AI' }}/>

            </Tab.Navigator>
        </NavigationContainer>
    )
}
