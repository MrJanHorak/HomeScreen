import { View } from 'react-native'
import TVText from '../tv/TVText'


export default function ToDo(){


  return (

    <View>
      <TVText text={'To Do'} typography='body' style={{alignSelf: 'center'}}/>
      <TVText text={'[ ] Laundry'} typography='caption' />
      <TVText text={'[ ] Walk the dog'} typography='caption'/>
      <TVText text={'[ ] Oil change on Element'} typography='caption'/>
      <TVText text={'[ ] Oil change on Pumpkin'} typography='caption'/>
    </View>
  )
  
}