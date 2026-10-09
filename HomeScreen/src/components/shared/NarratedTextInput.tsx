import {forwardRef, useEffect, useRef, useState} from 'react';
import {TextInput as NativeTextInput} from 'react-native';
import type {TextInputProps} from 'react-native';
import {useNarration} from '../../accessibility/NarrationContext';

type NarratedTextInput = NativeTextInput;

const NarratedTextInput = forwardRef<NativeTextInput, TextInputProps>(function NarratedTextInput(props, ref) {
  const {announce, blur, narrating} = useNarration();
  const owner = useRef({}).current;
  const [focused, setFocused] = useState(false);
  const label = props.accessibilityLabel || props.placeholder || 'Text field';
  useEffect(() => {if (focused && narrating) announce(`${label}. Edit text`, owner);}, [focused, narrating, label, announce, owner]);
  useEffect(() => () => blur(owner), [blur, owner]);
  // Speak only the field name, never the typed value or passwords.
  return <NativeTextInput {...props} ref={ref}
    onFocus={(event) => {setFocused(true); props.onFocus?.(event);}}
    onBlur={(event) => {setFocused(false); blur(owner); props.onBlur?.(event);}}
  />;
});
export default NarratedTextInput;
