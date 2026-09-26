import { View } from 'react-native';
import TVText from '../tv/TVText';

export default function MealCard() {
  return (
    <View style={{  alignItems: 'center' }}>
      <TVText
        text='Dinner'
        typography='body'
        color='textPrimary'
        // marginBottom='xs'
      />
      <View style={{ alignItems: 'flex-start'}}>
        <TVText text='* Chicken Gnocci Soup' typography='caption' color='textPrimary' />
        <TVText
          text='* Chocolate Pudding'
          typography='caption'
          color='textPrimary'
        />
        <TVText text='* Salad' typography='caption' color='textPrimary' />
        <TVText style={{alignSelf: 'flex-end'}}text='Cook: Dad' typography='caption' color='textSecondary' />
      </View>
    </View>
  );
}
