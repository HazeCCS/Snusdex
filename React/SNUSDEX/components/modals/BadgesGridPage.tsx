import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { useStore } from '@/store/store';
import { GITHUB_BASE, IOS } from '@/lib/constants';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 40 - 12) / 2;

type BadgeCardProps = {
  badge: any;
  isUnlocked: boolean;
  progress: number;
};

function BadgeCard({ badge, isUnlocked, progress }: BadgeCardProps) {
  const imgUrl = badge.image_url.startsWith('http') ? badge.image_url : GITHUB_BASE + badge.image_url;
  const progressPct = badge.category === 'collector' ? Math.min(100, Math.floor(progress)) : 0;

  if (isUnlocked) {
    return (
      <View style={[styles.card, { width: CARD_W }]}>
        <View style={styles.cardGradient} />
        <Image source={{ uri: imgUrl }} style={styles.cardImg} contentFit="contain" />
        <Text style={styles.cardName} numberOfLines={2}>{badge.name}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{badge.description}</Text>
        <View style={styles.unlockedBadge}>
          <Text style={styles.unlockedText}>Freigeschaltet</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.cardLocked, { width: CARD_W }]}>
      <View style={styles.cardImgWrapLocked}>
        <Image source={{ uri: imgUrl }} style={styles.cardImg} contentFit="contain" />
      </View>
      <Text style={styles.cardNameLocked} numberOfLines={2}>{badge.name}</Text>
      <Text style={styles.cardDescLocked} numberOfLines={2}>{badge.description}</Text>
      <View style={styles.progressWrap}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Fortschritt</Text>
          <Text style={styles.progressPct}>{progressPct}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      </View>
    </View>
  );
}

export default function BadgesGridPage() {
  const insets = useSafeAreaInsets();
  const { globalBadges, globalUserBadges, globalBadgeProgress, closeBadgesGrid } = useStore();

  const renderItem = ({ item }: { item: any }) => (
    <BadgeCard
      badge={item}
      isUnlocked={globalUserBadges.has(item.id)}
      progress={item.category === 'collector' && item.required_count > 0
        ? (globalBadgeProgress / item.required_count) * 100
        : 0}
    />
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); closeBadgesGrid(); }}
          activeOpacity={0.75}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}>
            <Path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.title}>Badges</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={globalBadges}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Noch keine Badges verfügbar.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 90 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  placeholder: { width: 40 },

  row: { gap: 12, marginBottom: 12 },

  card: {
    backgroundColor: IOS.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    position: 'relative',
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.03)',
    pointerEvents: 'none',
  },
  cardLocked: {
    backgroundColor: 'rgba(28,28,30,0.5)',
    borderColor: 'rgba(255,255,255,0.05)',
    opacity: 0.7,
  },
  cardImg: { width: 112, height: 112, marginBottom: 12 },
  cardImgWrapLocked: { opacity: 0.5, marginBottom: 12 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#fff', textAlign: 'center', lineHeight: 20, marginBottom: 4 },
  cardNameLocked: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20, marginBottom: 4 },
  cardDesc: { fontSize: 11, color: IOS.gray, textAlign: 'center', lineHeight: 15, marginBottom: 12 },
  cardDescLocked: { fontSize: 11, color: 'rgba(142,142,147,0.7)', textAlign: 'center', lineHeight: 15, marginBottom: 12 },
  unlockedBadge: {
    width: '100%',
    backgroundColor: 'rgba(52,199,89,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.25)',
    borderRadius: 20,
    paddingVertical: 4,
    alignItems: 'center',
    marginTop: 'auto',
  },
  unlockedText: { color: IOS.green, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  progressWrap: { width: '100%', marginTop: 'auto' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
  progressLabel: { fontSize: 9, color: IOS.gray, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  progressPct: { fontSize: 11, fontWeight: '700', color: '#fff' },
  progressBar: { height: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3 },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: IOS.gray, fontSize: 15 },
});
