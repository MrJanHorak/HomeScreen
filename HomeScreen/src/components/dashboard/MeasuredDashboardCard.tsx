import {useState} from 'react';
import {View} from 'react-native';
import type {CardId} from '../../theme/appearance';
import AdaptiveDashboardCard from './AdaptiveDashboardCard';

/** The inner content box already excludes the TVCard's padding and custom border. */
export default function MeasuredDashboardCard({id}: {id: CardId}) {
  const [size, setSize] = useState({width: 0, height: 0});
  return <View style={{flex: 1, minHeight: 0, minWidth: 0}} onLayout={({nativeEvent: {layout}}) =>
    setSize((current) => current.width === layout.width && current.height === layout.height ? current : {width: layout.width, height: layout.height})}>
    {size.width > 0 && size.height > 0 && <AdaptiveDashboardCard id={id} {...size} />}
  </View>;
}
