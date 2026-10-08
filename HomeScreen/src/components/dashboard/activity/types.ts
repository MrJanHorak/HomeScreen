import type {Activity} from '../../../../../shared/src/types';
import type {CardDimensions} from '../shared/types';

export interface ActivitySummaryProps extends CardDimensions {
  health: Activity;
  scale: number;
  title?: string;
}
