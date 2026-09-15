import { Text, View } from "react-native"
import TVText from "./tv/TVText";

interface HeaderBarProps {
  name: string;
  time: string;
  date: string;
  onPress?: () => void;
  style?: ViewStyle;
}

function HeaderBar() {

  const greeting = () =>{
    
  }
  return (
    <View>

      <TVText text={greeting}/>
    </View>
  )
}
export default HeaderBar