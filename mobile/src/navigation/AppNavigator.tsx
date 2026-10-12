import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../store/authStore';

import LoginScreen      from '../screens/LoginScreen';
import RegisterScreen   from '../screens/RegisterScreen';
import StartShiftScreen from '../screens/StartShiftScreen';
import ShiftScreen      from '../screens/ShiftScreen';
import MyDataScreen     from '../screens/MyDataScreen';
import EndShiftScreen   from '../screens/EndShiftScreen';

export type RootStackParamList = {
  Login:      undefined;
  Register:   undefined;
  StartShift: undefined;
  Shift:      undefined;
  MyData:     undefined;
  EndShift:   undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, isLoading, activeShift } = useAuth();

  // Show spinner while restoring session from SecureStore
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle:      { backgroundColor: '#ffffff', elevation: 1, shadowOpacity: 0.1 },
          headerTintColor:  '#111827',
          headerTitleStyle: { fontWeight: '600', fontSize: 16 },
          cardStyle:        { backgroundColor: '#f9fafb' },
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ title: 'Create Account', headerBackTitle: 'Back' }}
            />
          </>
        ) : activeShift === null ? (
          // Authenticated but no active shift → StartShift is root
          <>
            <Stack.Screen
              name="StartShift"
              component={StartShiftScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen
              name="MyData"
              component={MyDataScreen}
              options={{ title: 'My Data' }}
            />
          </>
        ) : (
          // Authenticated + active shift → Shift is root
          <>
            <Stack.Screen
              name="Shift"
              component={ShiftScreen}
              options={{ title: 'CashDesk', headerLeft: () => null, gestureEnabled: false }}
            />
            <Stack.Screen
              name="MyData"
              component={MyDataScreen}
              options={{ title: 'My Data' }}
            />
            <Stack.Screen
              name="EndShift"
              component={EndShiftScreen}
              options={{ title: 'End Shift' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
