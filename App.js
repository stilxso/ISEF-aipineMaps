import { StatusBar } from "react-native"
import TabNavigator from "./app/navigation/TabNavigator"
import "./global.css"

export default function App(){
    return(
        <>
            <StatusBar barStyle="dark-content" />
            <TabNavigator />
        </>
    )
}