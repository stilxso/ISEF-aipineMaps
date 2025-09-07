import { StatusBar } from "react-native"
import { NavigationContainer } from '@react-navigation/native'
import TabNavigator from "./app/navigation/TabNavigator"
import { RoutesProvider } from "./app/contexts/RoutesContext"
import { SettingsProvider } from "./app/contexts/SettingsContext"
import { LocationProvider } from "./app/contexts/LocationContext"
import { WeatherProvider } from "./app/contexts/WeatherContext"
import { RecorderProvider } from "./app/contexts/RecorderContext"

export default function App(){
    return(
        <NavigationContainer>
            <RoutesProvider>
                <SettingsProvider>
                    <LocationProvider>
                        <RecorderProvider>
                            <WeatherProvider>
                                <>
                                    <StatusBar barStyle="dark-content" />
                                    <TabNavigator />
                                </>
                            </WeatherProvider>
                        </RecorderProvider>
                    </LocationProvider>
                </SettingsProvider>
            </RoutesProvider>
        </NavigationContainer>
    )
}