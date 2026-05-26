import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import DashboardScreen from '../screens/DashboardScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import useAuthStore from '../store/authStore';

import TaskFormScreen from '../screens/TaskFormScreen';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

export type RootStackParamList = {
  Dashboard: undefined;
  TaskForm: { taskId?: string };
};

const AuthStack = createStackNavigator<AuthStackParamList>();
const MainStack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { user } = useAuthStore();

  return (
    <NavigationContainer>
      {user ? (
        <MainStack.Navigator screenOptions={{ headerShown: false }}>
          <MainStack.Screen name="Dashboard" component={DashboardScreen} />
          <MainStack.Screen name="TaskForm" component={TaskFormScreen} />
        </MainStack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Welcome">
          <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
