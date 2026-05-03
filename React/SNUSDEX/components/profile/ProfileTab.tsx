import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle } from 'react-native-svg';
import { useStore } from '@/store/store';
import { supabase } from '@/lib/supabase';
import { GITHUB_BASE, IOS } from '@/lib/constants';

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

type SettingsRowProps = {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  rightLabel?: string;
};

function SettingsRow({ icon, label, onPress, destructive, rightLabel }: SettingsRowProps) {
  return (
    <TouchableOpacity style={styles.settingsRow} onPress={() => { triggerHaptic(); onPress(); }} activeOpacity={0.7}>
      <View style={[styles.settingsIcon, destructive && styles.settingsIconRed]}>{icon}</View>
      <Text style={[styles.settingsLabel, destructive && styles.settingsLabelRed]}>{label}</Text>
      <View style={styles.settingsRight}>
        {rightLabel ? <Text style={styles.settingsRightLabel}>{rightLabel}</Text> : null}
        <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={destructive ? IOS.red : IOS.gray} strokeWidth={2.5}>
          <Path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </Svg>
      </View>
    </TouchableOpacity>
  );
}

type Props = { navHeight: number };

export default function ProfileTab({ navHeight }: Props) {
  const insets = useSafeAreaInsets();
  const {
    username, userEmail, xpValue, levelValue, statCount,
    globalBadges, featuredBadgeId,
    openSettingsSubpage,
  } = useStore();

  const initials = username ? username[0].toUpperCase() : '?';

  const featuredBadge = featuredBadgeId
    ? globalBadges.find(b => b.id === featuredBadgeId)
    : null;
  const featuredBadgeUrl = featuredBadge
    ? (featuredBadge.image_url.startsWith('http') ? featuredBadge.image_url : GITHUB_BASE + featuredBadge.image_url)
    : null;

  const handleLogout = () => {
    Alert.alert('Abmelden', 'Möchtest du dich wirklich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Abmelden',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const SETTINGS_GROUPS = [
    {
      label: 'Konto',
      items: [
        {
          icon: (
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </Svg>
          ),
          label: 'Edit Profile',
          onPress: () => openSettingsSubpage('Edit Profile'),
        },
        {
          icon: (
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </Svg>
          ),
          label: 'Stats',
          onPress: () => openSettingsSubpage('Stats'),
        },
      ],
    },
    {
      label: 'App-Einstellungen',
      items: [
        {
          icon: (
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </Svg>
          ),
          label: 'Notifications',
          onPress: () => openSettingsSubpage('Notifications'),
        },
        {
          icon: (
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </Svg>
          ),
          label: 'Privacy & Security',
          onPress: () => openSettingsSubpage('Privacy & Security'),
        },
        {
          icon: (
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </Svg>
          ),
          label: 'Language',
          onPress: () => openSettingsSubpage('Language'),
        },
        {
          icon: (
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
            </Svg>
          ),
          label: 'Darstellung',
          onPress: () => openSettingsSubpage('Darstellung'),
        },
        {
          icon: (
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </Svg>
          ),
          label: 'Tracking',
          onPress: () => openSettingsSubpage('Tracking'),
        },
      ],
    },
    {
      label: 'Support',
      items: [
        {
          icon: (
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </Svg>
          ),
          label: 'Help Center & FAQ',
          onPress: () => openSettingsSubpage('Help Center & FAQ'),
        },
        {
          icon: (
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </Svg>
          ),
          label: 'System Info',
          onPress: () => openSettingsSubpage('System Info'),
        },
      ],
    },
    {
      label: '',
      items: [
        {
          icon: (
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={IOS.red} strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </Svg>
          ),
          label: 'Sign Out',
          onPress: handleLogout,
          destructive: true,
        },
        {
          icon: (
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={IOS.red} strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </Svg>
          ),
          label: 'Delete Account',
          onPress: () => openSettingsSubpage('Delete Account'),
          destructive: true,
        },
      ],
    },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: navHeight + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.initials}>{initials}</Text>
              </View>
              {featuredBadgeUrl && (
                <View style={styles.badgeOverlay}>
                  <Image source={{ uri: featuredBadgeUrl }} style={styles.badgeImg} contentFit="contain" />
                </View>
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.username}>{username || '–'}</Text>
              <Text style={styles.userEmail}>{userEmail || ''}</Text>
              <View style={styles.levelRow}>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>Lvl {levelValue}</Text>
                </View>
                <Text style={styles.xpText}>{xpValue} XP</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{statCount}</Text>
              <Text style={styles.statLabel}>Collected</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{levelValue}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{xpValue}</Text>
              <Text style={styles.statLabel}>XP</Text>
            </View>
          </View>
        </View>

        {/* Settings Groups */}
        {SETTINGS_GROUPS.map((group, gIdx) => (
          <View key={gIdx} style={styles.settingsGroup}>
            {group.label ? <Text style={styles.groupLabel}>{group.label}</Text> : null}
            <View style={styles.settingsCard}>
              {group.items.map((item, iIdx) => (
                <View key={item.label}>
                  <SettingsRow
                    icon={item.icon}
                    label={item.label}
                    onPress={item.onPress}
                    destructive={'destructive' in item ? item.destructive : undefined}
                  />
                  {iIdx < group.items.length - 1 && <View style={styles.cardDivider} />}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  profileCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: IOS.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 16 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: IOS.card2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  initials: { fontSize: 28, fontWeight: '700', color: '#fff' },
  badgeOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    backgroundColor: IOS.card,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  badgeImg: { width: '100%', height: '100%' },
  userInfo: { flex: 1 },
  username: { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  userEmail: { fontSize: 13, color: IOS.gray, marginTop: 2 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  levelBadge: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  levelText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  xpText: { fontSize: 12, fontWeight: '600', color: IOS.gray },

  statsRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 12, color: IOS.gray, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)' },

  settingsGroup: { marginHorizontal: 20, marginBottom: 16 },
  groupLabel: { fontSize: 13, color: IOS.gray, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  settingsCard: { backgroundColor: IOS.card, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },

  settingsRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  settingsIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: IOS.card2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIconRed: { backgroundColor: 'rgba(255,59,48,0.12)' },
  settingsLabel: { flex: 1, fontSize: 17, color: '#fff' },
  settingsLabelRed: { color: IOS.red },
  settingsRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  settingsRightLabel: { fontSize: 13, color: IOS.gray },

  cardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: 64 },
});
