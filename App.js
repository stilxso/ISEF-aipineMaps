import { StatusBar } from "react-native"
import TabNavigator from "./app/navigation/TabNavigator"
import { RoutesProvider } from "./app/contexts/RoutesContext"
import { SettingsProvider } from "./app/contexts/SettingsContext"
import { LocationProvider } from "./app/contexts/LocationContext"
import { WeatherProvider } from "./app/contexts/WeatherContext"

export default function App(){
    return(
        <RoutesProvider>
            <SettingsProvider>
                <LocationProvider>
                    <WeatherProvider>
                        <>
                            <StatusBar barStyle="dark-content" />
                            <TabNavigator />
                        </>
                    </WeatherProvider>
                </LocationProvider>
            </SettingsProvider>
        </RoutesProvider>
    )
}