import { registerRootComponent } from 'expo';
import { Platform } from 'react-native'; 

import App from './App';

if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.type = 'text/css';
  style.innerText = `
    body, html, #root, #__next {
      height: 100%;
      margin: 0;
      padding: 0;
      overflow-x: hidden; 
    }
  `;
  document.head.appendChild(style);
}

registerRootComponent(App);
