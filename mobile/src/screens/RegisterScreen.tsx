import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { registerUser, getApiErrorMessage } from '../services/api';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [name,        setName]        = useState('');
  const [username,    setUsername]    = useState('');
  const [password,    setPassword]    = useState('');
  const [confirmPwd,  setConfirmPwd]  = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);

  async function handleRegister() {
    if (!name.trim() || !username.trim() || !password || !confirmPwd) {
      Alert.alert('Required', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPwd) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Too short', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await registerUser(name.trim(), username.trim(), password);
      Alert.alert(
        'Account Created',
        'Your account has been created. You can now log in.',
        [{ text: 'Log In', onPress: () => navigation.replace('Login') }]
      );
    } catch (err) {
      Alert.alert('Registration Failed', getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">

          {/* Brand */}
          <View style={s.brand}>
            <View style={s.logoBox}>
              <Ionicons name="cash-outline" size={32} color="#fff" />
            </View>
            <Text style={s.appName}>CashDesk</Text>
            <Text style={s.tagline}>Create your cashier account</Text>
          </View>

          {/* Form */}
          <View style={s.card}>

            <Text style={s.label}>Full Name</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
              autoCorrect={false}
              editable={!loading}
              returnKeyType="next"
            />

            <Text style={[s.label, { marginTop: 16 }]}>Username</Text>
            <TextInput
              style={s.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Choose a username"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
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
                placeholder="At least 6 characters"
                placeholderTextColor="#9ca3af"
                editable={!loading}
                returnKeyType="next"
              />
              <TouchableOpacity
                onPress={() => setShowPwd(!showPwd)}
                style={s.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={[s.label, { marginTop: 16 }]}>Confirm Password</Text>
            <View style={s.pwdRow}>
              <TextInput
                style={[s.input, s.pwdInput, confirmPwd.length > 0 && password !== confirmPwd && s.inputError]}
                value={confirmPwd}
                onChangeText={setConfirmPwd}
                secureTextEntry={!showConfirm}
                placeholder="Re-enter your password"
                placeholderTextColor="#9ca3af"
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm(!showConfirm)}
                style={s.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {confirmPwd.length > 0 && password !== confirmPwd && (
              <Text style={s.errorText}>Passwords do not match</Text>
            )}

            <TouchableOpacity
              style={[s.submitBtn, loading && s.btnOff]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.submitText}>Create Account</Text>
              }
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.goBack()} style={s.loginLink}>
            <Text style={s.loginLinkText}>Already have an account? <Text style={s.loginLinkBold}>Sign In</Text></Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#f9fafb' },
  flex:       { flex: 1 },
  inner:      { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  brand:      { alignItems: 'center', marginBottom: 32 },
  logoBox:    { width: 64, height: 64, borderRadius: 18, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  appName:    { fontSize: 24, fontWeight: '800', color: '#111827' },
  tagline:    { fontSize: 14, color: '#6b7280', marginTop: 4 },
  card:       { width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  label:      { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input:      { borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: '#111827', backgroundColor: '#f9fafb', minHeight: 52 },
  inputError: { borderColor: '#ef4444' },
  pwdRow:     { position: 'relative', justifyContent: 'center' },
  pwdInput:   { paddingRight: 48 },
  eyeBtn:     { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  errorText:  { fontSize: 12, color: '#ef4444', marginTop: 4 },
  submitBtn:  { marginTop: 24, backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnOff:     { opacity: 0.55 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginLink:  { marginTop: 24 },
  loginLinkText: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  loginLinkBold: { color: '#2563eb', fontWeight: '700' },
});
