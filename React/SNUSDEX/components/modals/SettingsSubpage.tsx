import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
  Switch, Dimensions, PanResponder, Animated, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useStore } from '@/store/store';
import { supabase } from '@/lib/supabase';
import { GITHUB_BASE, IOS } from '@/lib/constants';

const { width: SCREEN_W } = Dimensions.get('window');

type Props = {
  onRefreshDex: () => void;
};

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

function SettingRow({ label, desc, value, onToggle }: { label: string; desc?: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {desc ? <Text style={styles.rowDesc}>{desc}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={() => { triggerHaptic(); onToggle(); }}
        trackColor={{ false: IOS.gray3, true: '#fff' }}
        thumbColor={value ? '#000' : '#fff'}
        ios_backgroundColor={IOS.gray3}
      />
    </View>
  );
}

function FAQCard({ q, a }: { q: string; a: string }) {
  return (
    <View style={styles.faqCard}>
      <Text style={styles.faqQ}>{q}</Text>
      <Text style={styles.faqA}>{a}</Text>
    </View>
  );
}

function EditProfileContent() {
  const { userId, username, globalBadges, globalUserBadges, featuredBadgeId, setFeaturedBadgeId } = useStore();
  const [newUsername, setNewUsername] = useState('');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || '');
      const { data: profile } = await supabase.from('profiles')
        .select('username, username_changes, username_last_reset')
        .eq('id', user.id).single();
      const now = new Date();
      const lastReset = profile?.username_last_reset ? new Date(profile.username_last_reset) : null;
      const sameMonth = lastReset && lastReset.getMonth() === now.getMonth() && lastReset.getFullYear() === now.getFullYear();
      const changesThisMonth = sameMonth ? (profile?.username_changes || 0) : 0;
      setRemaining(Math.max(0, 3 - changesThisMonth));
      const correctUsername = user.user_metadata?.username || profile?.username || '';
      setNewUsername(correctUsername);
    })();
  }, []);

  const handleSave = async () => {
    triggerHaptic();
    const trimmed = newUsername.trim();
    const usernameRegex = /^[a-zA-Z0-9_]{2,30}$/;
    if (!usernameRegex.test(trimmed)) {
      setErrorMsg('Nur Buchstaben, Zahlen und _ erlaubt (2–30 Zeichen).');
      return;
    }
    setErrorMsg('');
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht eingeloggt.');
      const { data: profile } = await supabase.from('profiles')
        .select('username, username_changes, username_last_reset').eq('id', user.id).single();
      const now = new Date();
      const lastReset = profile?.username_last_reset ? new Date(profile.username_last_reset) : null;
      const sameMonth = lastReset && lastReset.getMonth() === now.getMonth() && lastReset.getFullYear() === now.getFullYear();
      const changesThisMonth = sameMonth ? (profile?.username_changes || 0) : 0;
      if (changesThisMonth >= 3) {
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const daysLeft = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        setErrorMsg(`Limit erreicht (3/3). Noch ${daysLeft} Tag(e) bis zur Freischaltung.`);
        setSaving(false);
        return;
      }
      await supabase.auth.updateUser({ data: { username: trimmed } });
      await supabase.from('profiles').update({
        username: trimmed,
        username_changes: changesThisMonth + 1,
        username_last_reset: sameMonth ? profile?.username_last_reset : now.toISOString(),
      }).eq('id', user.id);
      const newRemaining = Math.max(0, 3 - (changesThisMonth + 1));
      setRemaining(newRemaining);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
    } catch (e: any) {
      setErrorMsg(e.message || 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const selectBadge = async (badgeId: number | null) => {
    triggerHaptic();
    setFeaturedBadgeId(badgeId);
    if (userId) {
      await supabase.from('profiles').update({ featured_badge_id: badgeId }).eq('id', userId);
    }
  };

  const unlockedBadges = globalBadges.filter(b => globalUserBadges.has(b.id));

  const changesColor = remaining === 0 ? IOS.red : remaining === 1 ? IOS.orange : IOS.gray;

  return (
    <View>
      <View style={styles.badgeSectionLabel}>
        <Text style={styles.sectionLabel}>Featured Badge</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeScroll}>
        <TouchableOpacity
          style={[styles.badgeSelItem, featuredBadgeId === null && styles.badgeSelItemActive]}
          onPress={() => selectBadge(null)}
          activeOpacity={0.75}
        >
          <View style={[styles.badgeSelRing, featuredBadgeId === null && styles.badgeSelRingActive, { borderStyle: 'dashed' }]}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={IOS.gray} strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </Svg>
          </View>
          <Text style={styles.badgeSelLabel}>Keins</Text>
        </TouchableOpacity>
        {unlockedBadges.map(badge => {
          const imgUrl = badge.image_url.startsWith('http') ? badge.image_url : GITHUB_BASE + badge.image_url;
          const isSelected = featuredBadgeId === badge.id;
          const displayName = badge.name.replace(/collector/i, '').trim();
          return (
            <TouchableOpacity key={badge.id} style={styles.badgeSelItem} onPress={() => selectBadge(badge.id)} activeOpacity={0.75}>
              <View style={[styles.badgeSelRing, isSelected && styles.badgeSelRingActive]}>
                <Image source={{ uri: imgUrl }} style={styles.badgeSelImg} contentFit="contain" />
              </View>
              <Text style={styles.badgeSelLabel} numberOfLines={2}>{displayName}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.settingsCard}>
        <View style={styles.cardRow}>
          <View style={styles.rowHeaderLine}>
            <Text style={styles.rowSubLabel}>Username</Text>
            {remaining !== null && (
              <Text style={[styles.changesLeft, { color: changesColor }]}>{remaining}/3</Text>
            )}
          </View>
          <TextInput
            style={styles.input}
            value={newUsername}
            onChangeText={t => setNewUsername(t.replace(/[^a-zA-Z0-9_]/g, ''))}
            placeholder="Username"
            placeholderTextColor={IOS.gray}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          <Text style={styles.inputHint}>3 changes per month</Text>
        </View>
        <View style={styles.cardDivider} />
        <View style={styles.cardRow}>
          <Text style={styles.rowSubLabel}>Email</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={email}
            editable={false}
          />
        </View>
        <View style={styles.cardDivider} />
        <View style={styles.cardRow}>
          <TouchableOpacity
            style={[styles.saveBtn, savedOk && styles.saveBtnOk]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={[styles.saveBtnText, savedOk && styles.saveBtnTextOk]}>
              {savedOk ? '✓ Gespeichert' : saving ? 'Speichern...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function StatsContent() {
  const { globalSnusData, globalUserCollection } = useStore();

  const brandMap: Record<string, { total: number; unlocked: number; dominantRarity: string }> = {};
  globalSnusData.forEach(snus => {
    const brand = (snus as any).brand || 'Unbekannt';
    if (!brandMap[brand]) brandMap[brand] = { total: 0, unlocked: 0, dominantRarity: 'common' };
    brandMap[brand].total++;
    if (globalUserCollection[snus.id]) brandMap[brand].unlocked++;
    brandMap[brand].dominantRarity = (snus.rarity || 'common').toLowerCase();
  });

  const brands = Object.entries(brandMap).sort((a, b) => b[1].total - a[1].total);

  return (
    <View>
      <Text style={styles.statsIntro}>Verfolge deinen Sammler-Fortschritt sortiert nach Snus-Marken.</Text>
      <View style={styles.statsGrid}>
        {brands.map(([name, stat]) => {
          const pct = stat.total > 0 ? stat.unlocked / stat.total : 0;
          return (
            <View key={name} style={styles.statCard}>
              <Text style={styles.statCardName} numberOfLines={1}>{name}</Text>
              <Text style={styles.statCardCount}>{Math.round(pct * 100)}%</Text>
              <View style={styles.statBar}>
                <View style={[styles.statBarFill, { width: `${pct * 100}%` as any }]} />
              </View>
              <Text style={styles.statCardSub}>{stat.unlocked} / {stat.total}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function SettingsSubpage({ onRefreshDex }: Props) {
  const insets = useSafeAreaInsets();
  const { settingsSubpageTitle, closeSettingsSubpage, userId } = useStore();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [newDropsEnabled, setNewDropsEnabled] = useState(true);
  const [emailSummaryEnabled, setEmailSummaryEnabled] = useState(false);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [shareAnalytics, setShareAnalytics] = useState(true);
  const [individualTracking, setIndividualTracking] = useState(false);

  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dx > 10 && Math.abs(gs.dy) < Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => { if (gs.dx > 0) translateX.setValue(gs.dx); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > SCREEN_W / 3 || gs.dx > 100) {
          Animated.timing(translateX, { toValue: SCREEN_W, duration: 280, useNativeDriver: true }).start(() => closeSettingsSubpage());
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const handleBack = () => {
    triggerHaptic();
    Animated.timing(translateX, { toValue: SCREEN_W, duration: 280, useNativeDriver: true }).start(() => closeSettingsSubpage());
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Account löschen',
      'Dieser Vorgang ist endgültig und kann nicht rückgängig gemacht werden. Alle Dex-Daten und Statistiken gehen für immer verloren.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Ja, Account löschen',
          style: 'destructive',
          onPress: async () => {
            // Delete user data then sign out (server-side deletion requires admin key)
            if (userId) {
              try { await supabase.from('user_collections').delete().eq('user_id', userId); } catch {}
              try { await supabase.from('user_badges').delete().eq('user_id', userId); } catch {}
              try { await supabase.from('usage_logs').delete().eq('user_id', userId); } catch {}
            }
            await supabase.auth.signOut();
          },
        },
      ]
    );
  };

  let content: React.ReactNode = null;
  const type = settingsSubpageTitle;

  if (type === 'Edit Profile') {
    content = <EditProfileContent />;
  } else if (type === 'Stats') {
    content = <StatsContent />;
  } else if (type === 'Notifications') {
    content = (
      <View style={styles.settingsCard}>
        <SettingRow label="Push Notifications" value={pushEnabled} onToggle={() => setPushEnabled(v => !v)} />
        <View style={styles.cardDivider} />
        <SettingRow label="New Snus Drops (Dex)" value={newDropsEnabled} onToggle={() => setNewDropsEnabled(v => !v)} />
        <View style={styles.cardDivider} />
        <SettingRow label="Email Summaries" value={emailSummaryEnabled} onToggle={() => setEmailSummaryEnabled(v => !v)} />
      </View>
    );
  } else if (type === 'Privacy & Security') {
    content = (
      <View>
        <Text style={[styles.sectionLabel, { marginBottom: 8, marginLeft: 4 }]}>Profile Visibility</Text>
        <View style={styles.settingsCard}>
          <SettingRow label="Private Profile" value={privateProfile} onToggle={() => setPrivateProfile(v => !v)} />
        </View>
        <Text style={[styles.sectionLabel, { marginTop: 20, marginBottom: 8, marginLeft: 4 }]}>Data</Text>
        <View style={styles.settingsCard}>
          <SettingRow label="Share Analytics" value={shareAnalytics} onToggle={() => setShareAnalytics(v => !v)} />
        </View>
      </View>
    );
  } else if (type === 'Language') {
    content = (
      <View style={styles.settingsCard}>
        <TouchableOpacity style={styles.langRow} activeOpacity={0.75}>
          <Text style={styles.rowLabel}>English</Text>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
            <Path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </Svg>
        </TouchableOpacity>
        <View style={styles.cardDivider} />
        <TouchableOpacity style={styles.langRow} activeOpacity={0.75}>
          <Text style={styles.rowLabel}>Deutsch</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (type === 'Darstellung') {
    content = (
      <View style={styles.settingsCard}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Große Kacheln</Text>
            <Text style={styles.rowDesc}>Zeigt 2 statt 3 Spalten im Dex an</Text>
          </View>
          <Switch value={false} onValueChange={() => triggerHaptic()} trackColor={{ false: IOS.gray3, true: '#fff' }} thumbColor="#fff" ios_backgroundColor={IOS.gray3} />
        </View>
        <View style={styles.cardDivider} />
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Kachel Glow</Text>
            <Text style={styles.rowDesc}>Farbiger Hintergrund-Glow der Seltenheit</Text>
          </View>
          <Switch value={false} onValueChange={() => triggerHaptic()} trackColor={{ false: IOS.gray3, true: '#fff' }} thumbColor="#fff" ios_backgroundColor={IOS.gray3} />
        </View>
      </View>
    );
  } else if (type === 'Tracking') {
    content = (
      <View style={styles.settingsCard}>
        <SettingRow
          label="Individual Pouch Tracking"
          desc="Tracke jeden einzelnen Pouch anstatt nur die ganze Dose am Ende."
          value={individualTracking}
          onToggle={() => setIndividualTracking(v => !v)}
        />
      </View>
    );
  } else if (type === 'Help Center & FAQ') {
    content = (
      <View style={{ gap: 12 }}>
        <FAQCard q="How does the Dex work?" a="Every time you scan a new can, it gets added to your permanent Snusdex collection. You earn XP for rarities." />
        <FAQCard q="Can I manually add a Snus?" a="Currently, scanning the barcode is required to verify the product and maintain the integrity of the Dex." />
        <FAQCard q="How do I level up?" a="Your Collector Level increases as you gain XP. Rarer Snus (like Epic or Mythic) yield significantly more XP than Common ones." />
        <FAQCard q="How is my usage calculated?" a="When you mark a can as 'Active' and later 'Empty', we calculate your daily average pouches and nicotine intake based on the time it took to finish it." />
        <TouchableOpacity style={styles.contactBtn} activeOpacity={0.75}>
          <Text style={styles.contactText}>Contact Support</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (type === 'Delete Account') {
    content = (
      <View>
        <View style={styles.deleteWarning}>
          <View style={styles.deleteIcon}>
            <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={IOS.red} strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </Svg>
          </View>
          <Text style={styles.deleteTitle}>Delete Account?</Text>
          <Text style={styles.deleteDesc}>This action is permanent and cannot be undone. All your Dex collections and stats will be lost forever.</Text>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} activeOpacity={0.85}>
          <Text style={styles.deleteBtnText}>Yes, delete my account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleBack} activeOpacity={0.85}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (type === 'System Info') {
    content = (
      <View style={styles.settingsCard}>
        <View style={styles.cardRow}>
          <Text style={styles.rowSubLabel}>Version</Text>
          <Text style={styles.sysValue}>Alpha v1.7.5</Text>
        </View>
        <View style={styles.cardDivider} />
        <View style={styles.cardRow}>
          <Text style={styles.rowSubLabel}>Latest Commit</Text>
          <Text style={styles.sysValue}>–</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.root, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
      <View style={[styles.inner, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.75}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </Svg>
          </TouchableOpacity>
          <Text style={styles.title}>{settingsSubpageTitle}</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 92 },
  inner: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  placeholder: { width: 40 },
  scroll: { flex: 1 },

  sectionLabel: { fontSize: 13, color: IOS.gray, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },

  settingsCard: { backgroundColor: IOS.card, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cardRow: { padding: 20 },
  cardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 20 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  rowText: { flex: 1, paddingRight: 12 },
  rowLabel: { fontSize: 17, color: '#fff' },
  rowDesc: { fontSize: 13, color: IOS.gray, marginTop: 2 },

  rowHeaderLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rowSubLabel: { fontSize: 13, color: IOS.gray, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  changesLeft: { fontSize: 11, fontWeight: '600' },

  input: { backgroundColor: '#000', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: '#fff', fontSize: 17 },
  inputDisabled: { color: IOS.gray, backgroundColor: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.05)' },
  inputHint: { fontSize: 11, color: IOS.gray, marginTop: 6 },
  errorText: { fontSize: 13, color: IOS.red, marginTop: 6 },
  saveBtn: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnOk: { backgroundColor: IOS.green },
  saveBtnText: { fontSize: 17, fontWeight: '600', color: '#000' },
  saveBtnTextOk: { color: '#fff' },

  badgeSectionLabel: { marginBottom: 8 },
  badgeScroll: { marginBottom: 20 },
  badgeSelItem: { alignItems: 'center', marginRight: 12, width: 56 },
  badgeSelItemActive: {},
  badgeSelRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: IOS.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 4 },
  badgeSelRingActive: { borderColor: '#fff' },
  badgeSelImg: { width: '100%', height: '100%' },
  badgeSelLabel: { fontSize: 11, color: IOS.gray, textAlign: 'center', marginTop: 4, lineHeight: 14 },

  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },

  statsIntro: { fontSize: 15, color: IOS.gray, marginBottom: 20, lineHeight: 22 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { backgroundColor: IOS.card, borderRadius: 20, padding: 16, width: (SCREEN_W - 40 - 12) / 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statCardName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 8 },
  statCardCount: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  statBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  statBarFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  statCardSub: { fontSize: 12, color: IOS.gray },

  faqCard: { backgroundColor: IOS.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  faqQ: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 6 },
  faqA: { fontSize: 15, color: IOS.gray, lineHeight: 22 },
  contactBtn: { alignSelf: 'center', marginTop: 24 },
  contactText: { fontSize: 14, color: IOS.gray, textDecorationLine: 'underline' },

  deleteWarning: { alignItems: 'center', marginTop: 24, marginBottom: 32 },
  deleteIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,59,48,0.1)', borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  deleteTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 },
  deleteDesc: { fontSize: 15, color: IOS.gray, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
  deleteBtn: { backgroundColor: IOS.red, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  deleteBtnText: { fontSize: 17, fontWeight: '600', color: '#fff' },
  cancelBtn: { backgroundColor: IOS.card, borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cancelBtnText: { fontSize: 17, fontWeight: '500', color: '#fff' },

  sysValue: { fontSize: 15, color: '#fff', marginTop: 4 },
});
