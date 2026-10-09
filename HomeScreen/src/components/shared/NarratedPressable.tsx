import React, {forwardRef, isValidElement, useEffect, useRef, useState} from 'react';
import {Pressable as NativePressable} from 'react-native';
import type {PressableProps, View} from 'react-native';
import {useNarration} from '../../accessibility/NarrationContext';
import {selectionAnnouncement} from '../../accessibility/narration';

function childLabel(children: React.ReactNode): string {
  return React.Children.toArray(children).map((child) => {
    if (typeof child === 'string' || typeof child === 'number') return String(child);
    if (!isValidElement<{children?: React.ReactNode; accessibilityLabel?: string; accessibilityElementsHidden?: boolean; 'aria-hidden'?: boolean}>(child)) return '';
    if (child.props.accessibilityElementsHidden || child.props['aria-hidden']) return '';
    return child.props.accessibilityLabel || childLabel(child.props.children);
  }).filter(Boolean).join(' ').replace(/✓\s*/g, '').replace(/\s+/g, ' ').trim();
}

/** Keeps the native control, ref, styles and focus handlers intact. */
const NarratedPressable = forwardRef<View, PressableProps>(function NarratedPressable(props, ref) {
  const {announce, blur, stop, narrating} = useNarration();
  const owner = useRef({}).current;
  const [focused, setFocused] = useState(false);
  const renderedChildren = typeof props.children === 'function'
    ? props.children({pressed: false, focused}) : props.children;
  const label = props.accessibilityLabel || childLabel(renderedChildren).slice(0, 240);
  const announcement = selectionAnnouncement(label, {...props.accessibilityState,
    disabled: props.disabled || props.accessibilityState?.disabled}, props.accessibilityValue?.text);

  useEffect(() => {
    if (focused && label && narrating) announce(announcement, owner);
  }, [focused, label, announcement, announce, owner, narrating]);
  useEffect(() => () => blur(owner), [blur, owner]);

  return <NativePressable {...props} ref={ref}
    accessibilityRole={props.accessibilityRole || 'button'} accessibilityLabel={label || undefined}
    onFocus={(event) => {setFocused(true); props.onFocus?.(event);}}
    onBlur={(event) => {setFocused(false); blur(owner); props.onBlur?.(event);}}
    onPress={(event) => {stop(); props.onPress?.(event);}}
    onLongPress={props.onLongPress ? (event) => {stop(); props.onLongPress?.(event);} : undefined}
  />;
});
export default NarratedPressable;
