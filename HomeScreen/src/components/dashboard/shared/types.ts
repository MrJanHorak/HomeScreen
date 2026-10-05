import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';
import type { CardLine } from './cardContentLayout';

export type DashboardIcon = ComponentProps<
  typeof MaterialCommunityIcons
>['name'];

export interface CardDimensions {
  width: number;
  height: number;
}

export interface DashboardLine extends CardLine {
  icon?: DashboardIcon;
}
