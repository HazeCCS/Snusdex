import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useStore } from '@/store/store';
import { GITHUB_BASE, IOS } from '@/lib/constants';

const { width: SCREEN_W } = Dimensions.get('window');

export default function BadgeUnlockModal() {
  const { badgeUnlockBadge, badgeUnlockXp, closeBadgeUnlock } = useStore();

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  if (!badgeUnlockBadge) return null;

  const imgUrl = badgeUnlockBadge.image_url.startsWith('http')
    ? badgeUnlockBadge.image_url
    : GITHUB_BASE + badgeUnlockBadge.image_url;

  return (
    <TouchableOpacity
      style={styles.overlay}
      activeOpacity={1}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); closeBadgeUnlock(); }}
    >
      <View style={styles.card}>
        <Text style={styles.label}>Badge Freigeschaltet!</Text>

        <View style={styles.imgWrap}>
          <Image source={{ uri: imgUrl }} style={styles.img} contentFit="contain" />
        </View>

        <Text style={styles.name}>{badgeUnlockBadge.name}</Text>

        {badgeUnlockXp > 0 && (
          <View style={styles.xpBadge}>
            <Text style={styles.xpText}>+{badgeUnlockXp} XP</Text>
          </View>
        )}

        <Text style={styles.hint}>Tippen zum Schließen</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  label: {
    color: IOS.gray,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  imgWrap: {
    width: 160,
    height: 160,
    marginBottom: 24,
  },
  img: {
    width: '100%',
    height: '100%',
  },
  name: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  xpBadge: {
    backgroundColor: 'rgba(52,199,89,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 40,
  },
  xpText: {
    color: IOS.green,
    fontSize: 17,
    fontWeight: '700',
  },
  hint: {
    color: IOS.gray,
    fontSize: 13,
  },
});
