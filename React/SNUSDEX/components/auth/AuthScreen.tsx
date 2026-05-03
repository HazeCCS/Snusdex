import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { IOS } from '@/lib/constants';
import Svg, { Path, Circle, G, Rect } from 'react-native-svg';

type View_ = 'main' | 'verify' | 'username' | 'emailCheck';

type Props = {
  initialView?: View_;
  onAuthenticated?: () => void;
};

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export default function AuthScreen({ initialView = 'main', onAuthenticated }: Props) {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<View_>(initialView);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [setupUsername, setSetupUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  function toggleMode() {
    triggerHaptic();
    setIsLoginMode(m => !m);
    setError('');
  }

  async function handleMainBtn() {
    triggerHaptic();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');

    if (isLoginMode) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError('Incorrect email or password.');
        triggerHaptic();
      }
    } else {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        triggerHaptic();
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) {
        setError(error.message.includes('already registered') ? 'This email is already in use.' : error.message);
        triggerHaptic();
      } else {
        setRegisteredEmail(email);
        setView('emailCheck');
      }
    }
    setLoading(false);
  }

  async function saveSetupUsername() {
    triggerHaptic();
    if (!setupUsername) {
      setError('Please enter a username.');
      return;
    }
    if (!/^[a-zA-Z0-9_]{2,30}$/.test(setupUsername)) {
      setError('Only letters, numbers and _ allowed (2–30 chars).');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({ data: { username: setupUsername } });
      if (updateError) throw updateError;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ username: setupUsername }).eq('id', user.id);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function signInWithGoogle() {
    triggerHaptic();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { queryParams: { prompt: 'select_account', access_type: 'offline' } },
    });
    if (error) Alert.alert('Login error', error.message);
  }

  function goToSignInFromEmailCheck() {
    triggerHaptic();
    if (!isLoginMode) toggleMode();
    setView('main');
  }

  // ── VIEWS ────────────────────────────────────────────────

  if (view === 'emailCheck') {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
        <View style={styles.card}>
          <View style={styles.logoHeader}>
            <Text style={styles.logoText}>SNUSDEX®</Text>
          </View>
          <View style={styles.iconCircle}>
            <Svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </Svg>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.emailCheckTitle}>Check your email</Text>
            <Text style={styles.emailCheckDesc}>
              We sent a confirmation link to{' '}
              <Text style={styles.emailBold}>{registeredEmail}</Text>.{'\n'}
              Open the email and tap the link to activate your account.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={goToSignInFromEmailCheck} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Go to Sign In</Text>
            </TouchableOpacity>
            <Text style={styles.spamNote}>Didn't receive an email? Check your spam folder or try again.</Text>
          </View>
        </View>
      </View>
    );
  }

  if (view === 'username') {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
        <View style={styles.card}>
          <View style={styles.logoHeader}>
            <Text style={styles.logoText}>SNUSDEX®</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.subtitle}>Choose your Dex username.</Text>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={IOS.gray}
              value={setupUsername}
              onChangeText={setSetupUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!!error && <Text style={styles.errorText}>{error}</Text>}
            <TouchableOpacity style={styles.primaryBtn} onPress={saveSetupUsername} activeOpacity={0.85} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryBtnText}>Continue</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Main login/register view
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#000' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Logo */}
          <View style={styles.logoHeader}>
            <Text style={styles.logoText}>SNUSDEX®</Text>
            <Text style={styles.logoSubtitle}>{isLoginMode ? 'Welcome back' : 'Create your account'}</Text>
          </View>

          <View style={styles.cardBody}>
            {/* Social buttons */}
            <TouchableOpacity style={styles.googleBtn} onPress={signInWithGoogle} activeOpacity={0.88}>
              <GoogleIcon />
              <Text style={styles.googleBtnText}>{isLoginMode ? 'Sign in with Google' : 'Register with Google'}</Text>
            </TouchableOpacity>

            {/* Apple (disabled) */}
            <View style={styles.appleWrap}>
              <TouchableOpacity style={styles.appleBtn} disabled activeOpacity={1}>
                <AppleIcon />
                <Text style={styles.appleBtnText}>{isLoginMode ? 'Sign in with Apple' : 'Register with Apple'}</Text>
              </TouchableOpacity>
              <View style={styles.appleStrike} />
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.input, styles.inputFirst]}
                placeholder="Email"
                placeholderTextColor={IOS.gray}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.inputSeparator} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={IOS.gray}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              {!isLoginMode && (
                <>
                  <View style={styles.inputSeparator} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor={IOS.gray}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                </>
              )}
            </View>

            {!isLoginMode && (
              <View style={[styles.inputGroup, { marginTop: 10 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor={IOS.gray}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}

            {/* Main CTA */}
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 4 }]} onPress={handleMainBtn} activeOpacity={0.85} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryBtnText}>{isLoginMode ? 'Sign In' : 'Register'}</Text>
              )}
            </TouchableOpacity>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            {/* Toggle */}
            <TouchableOpacity style={styles.toggleBtn} onPress={toggleMode}>
              <Text style={styles.toggleText}>
                {isLoginMode ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.toggleLink}>{isLoginMode ? 'Register' : 'Sign In'}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </Svg>
  );
}

function AppleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)">
      <Path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.15 2.65.83 3.4 1.95-2.92 1.76-2.39 5.86.58 7.02-.75 1.75-1.6 3.14-2.63 4.04zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: IOS.card,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  logoHeader: {
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  logoText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
    fontWeight: '800',
    fontSize: 40,
    letterSpacing: -1.5,
    color: '#fff',
    lineHeight: 44,
  },
  logoSubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginTop: 8,
  },
  cardBody: {
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  googleBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  googleBtnText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 15,
  },
  appleWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  appleBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 14,
  },
  appleBtnText: {
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '600',
    fontSize: 15,
  },
  appleStrike: {
    position: 'absolute',
    top: '50%',
    left: 12,
    right: 12,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 12,
  },
  inputGroup: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#000',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 17,
    borderRadius: 0,
  },
  inputFirst: {},
  inputSeparator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  primaryBtnText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 17,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  toggleBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  toggleLink: {
    fontWeight: '600',
    color: '#fff',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(255,255,255,0.3)',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 24,
  },
  emailCheckTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emailCheckDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emailBold: {
    color: '#fff',
    fontWeight: '600',
  },
  spamNote: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
});
