import React from 'react';
import { StatusBar } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';

export default function App() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />
      <LoginScreen />
    </>
  );
}
