import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useAuth } from '../store/authStore';
import { getApiErrorMessage } from '../services/api';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [status,   setStatus]   = useState('');

  async function handleLogin() {
    if (!username.trim() || !password) {
      Alert.alert('Required', 'Please enter your username and password.');
      return;
    }
    setLoading(true);
    try {
      setStatus('Signing in…');
      await login(username.trim(), password);
    } catch (err) {
      Alert.alert('Login Failed', getApiErrorMessage(err));
      setStatus('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">

          {/* Brand */}
          <View style={s.brand}>
            <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
            <Text style={s.appName}>CashDesk</Text>
            <Text style={s.tagline}>Sign in to start your shift</Text>
          </View>

          {/* Form */}
          <View style={s.card}>
            <Text style={s.label}>Username</Text>
            <TextInput
              style={s.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Enter your username"
              placeholderTextColor="#9ca3af"
              editable={!loading}
              returnKeyType="next"
            />

            <Text style={[s.label, { marginTop: 16 }]}>Password</Text>
            <View style={s.pwdRow}>
              <TextInput
                style={[s.input, s.pwdInput]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPwd}
                placeholder="Enter your password"
                placeholderTextColor="#9ca3af"
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPwd(!showPwd)}
                style={s.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.signInBtn, loading && s.btnOff]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <><ActivityIndicator color="#fff" size="small" /><Text style={[s.signInText, { marginLeft: 8 }]}>{status}</Text></>
                : <Text style={s.signInText}>Sign In</Text>
              }
            </TouchableOpacity>
          </View>

          <Text style={s.hint}>Contact your manager if you have trouble signing in.</Text>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={s.registerLink}>
            <Text style={s.registerLinkText}>New cashier? <Text style={s.registerLinkBold}>Create an account</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#f9fafb' },
  flex:        { flex: 1 },
  inner:       { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  brand:       { alignItems: 'center', marginBottom: 32 },
  logo:        { width: 80, height: 80, marginBottom: 14 },
  appName:     { fontSize: 24, fontWeight: '800', color: '#111827' },
  tagline:     { fontSize: 14, color: '#6b7280', marginTop: 4 },
  card:        { width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  label:       { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input:       { borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: '#111827', backgroundColor: '#f9fafb', minHeight: 52 },
  pwdRow:      { position: 'relative', justifyContent: 'center' },
  pwdInput:    { paddingRight: 48 },
  eyeBtn:      { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  signInBtn:   { marginTop: 24, backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnOff:      { opacity: 0.55 },
  signInText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint:        { marginTop: 24, fontSize: 12, color: '#9ca3af', textAlign: 'center' },
  registerLink:     { marginTop: 12 },
  registerLinkText: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  registerLinkBold: { color: '#2563eb', fontWeight: '700' },
});
