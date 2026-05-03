import React, { useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, FlatList, Platform, Animated as RNAnimated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle } from 'react-native-svg';
import { useStore } from '@/store/store';
import { supabase } from '@/lib/supabase';
import { GITHUB_BASE, IOS } from '@/lib/constants';

const { width: SCREEN_W } = Dimensions.get('window');

type Props = {
  navHeight: number;
  onScanPress: () => void;
};

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

// ── Collector Metal Card ────────────────────────────────────────
function CollectorCard() {
  const { username, xpValue, levelValue } = useStore();
  const hour = new Date().getHours();
  let greeting = 'Gute Nacht';
  if (hour >= 5 && hour < 12) greeting = 'Guten Morgen';
  else if (hour >= 12 && hour < 18) greeting = 'Guten Tag';
  else if (hour >= 18 && hour < 22) greeting = 'Guten Abend';

  return (
    <View style={styles.metalCardContainer}>
      <View style={styles.metalCard}>
        <View style={styles.metalCardTop}>
          <Text style={styles.collectorIdLabel}>COLLECTOR ID</Text>
          <Text style={styles.levelLabel}>LVL {levelValue}</Text>
        </View>
        <View>
          <Text style={styles.greetingText}>{greeting}, <Text style={styles.greetingName}>{username || 'Collector'}</Text></Text>
          <Text style={styles.xpText}>{xpValue}<Text style={styles.xpUnit}> XP</Text></Text>
        </View>
      </View>
    </View>
  );
}

// ── Stats Grid ──────────────────────────────────────────────────
function StatsGrid() {
  const { statCount, statFlow, statAvgPouches, statAvgMg } = useStore();
  const stats = [
    { label: 'Collection', value: String(statCount), sub: 'Total Cans (Dex)' },
    { label: 'Lifetime Tracked', value: `${statFlow} MG`, sub: 'Total Nicotine' },
    { label: 'Usage', value: String(statAvgPouches), sub: 'Avg Pouches / Day' },
    { label: 'Intake', value: `${statAvgMg} MG`, sub: 'Avg Daily MG' },
  ];

  return (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        {stats.slice(0, 2).map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statSub}>{s.sub}</Text>
          </View>
        ))}
      </View>
      <View style={styles.statsRow}>
        {stats.slice(2).map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statSub}>{s.sub}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Suggestions Carousel ────────────────────────────────────────
function SuggestionsCarousel() {
  const { globalSnusData, globalUserCollection, openSnusDetail } = useStore();

  // Show a mix of unlocked + random snus for suggestions
  const suggestions = React.useMemo(() => {
    if (globalSnusData.length === 0) return [];
    const shuffled = [...globalSnusData].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
  }, [globalSnusData.length]);

  if (suggestions.length === 0) {
    return (
      <View style={styles.suggestionsSection}>
        <Text style={styles.sectionTitle}>Explore Brands</Text>
        <FlatList
          horizontal
          data={[1, 2, 3, 4, 5]}
          keyExtractor={i => String(i)}
          contentContainerStyle={styles.carouselContent}
          showsHorizontalScrollIndicator={false}
          renderItem={() => <View style={styles.skeletonCard} />}
        />
      </View>
    );
  }

  return (
    <View style={styles.suggestionsSection}>
      <Text style={styles.sectionTitle}>Explore Brands</Text>
      <FlatList
        horizontal
        data={suggestions}
        keyExtractor={s => String(s.id)}
        contentContainerStyle={styles.carouselContent}
        showsHorizontalScrollIndicator={false}
        snapToInterval={SCREEN_W * 0.3}
        decelerationRate="fast"
        renderItem={({ item }) => {
          const isUnlocked = !!globalUserCollection[item.id];
          const rarity = (item.rarity || 'common').toLowerCase();
          const rarityColor = RARITY_COLORS[rarity] || '#8E8E93';
          return (
            <TouchableOpacity
              style={styles.suggestionCard}
              onPress={() => { triggerHaptic(); openSnusDetail(item.id); }}
              activeOpacity={0.85}
            >
              <View style={styles.suggestionCardInner}>
                <View style={styles.suggestionTop}>
                  <Text style={styles.suggestionId}>#{String(item.id).padStart(3, '0')}</Text>
                  <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
                </View>
                <View style={styles.suggestionImgContainer}>
                  <Image
                    source={{ uri: GITHUB_BASE + item.image }}
                    style={[styles.suggestionImg, !isUnlocked && styles.grayscale]}
                    contentFit="contain"
                  />
                </View>
                <Text style={[styles.suggestionName, !isUnlocked && { color: IOS.gray }]} numberOfLines={2}>
                  {item.name}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

// ── Active Cans ─────────────────────────────────────────────────
function ActiveCans({ onScanPress }: { onScanPress: () => void }) {
  const { globalActiveLogs, userId, setUsageLogs, globalAllLogs } = useStore();

  async function finishCan(logId: string) {
    triggerHaptic();
    await supabase.from('usage_logs')
      .update({ is_active: false, finished_at: new Date().toISOString() })
      .eq('id', logId);
    // Refresh
    const { data } = await supabase
      .from('usage_logs')
      .select('*, snus_products(*)')
      .eq('user_id', userId!)
      .order('opened_at', { ascending: false });
    const all = data || [];
    setUsageLogs(all, all.filter(l => l.is_active), all.filter(l => !l.is_active));
  }

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Active Cans</Text>
      {globalActiveLogs.length === 0 ? (
        <View style={styles.emptyRow}>
          <Text style={styles.emptyText}>Keine aktiven Dosen.</Text>
          <TouchableOpacity style={styles.openNextBtn} onPress={onScanPress} activeOpacity={0.85}>
            <Text style={styles.openNextText}>Öffne die nächste</Text>
            <ChevronIcon />
          </TouchableOpacity>
        </View>
      ) : (
        globalActiveLogs.map(can => {
          const snusName = can.snus_products?.name || 'Unknown';
          const snusImg = can.snus_products?.image || '';
          return (
            <View key={can.id} style={styles.activeCanRow}>
              <View style={styles.activeCanLeft}>
                <View style={styles.activeCanImgWrap}>
                  {snusImg ? (
                    <Image source={{ uri: GITHUB_BASE + snusImg }} style={styles.activeCanImg} contentFit="contain" />
                  ) : null}
                </View>
                <View style={styles.activeCanInfo}>
                  <Text style={styles.activeCanName} numberOfLines={1}>{snusName}</Text>
                  <Text style={styles.activeCanDate}>Open since {new Date(can.opened_at).toLocaleDateString()}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => finishCan(can.id)} activeOpacity={0.85}>
                <Text style={styles.emptyBtnText}>Empty</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </View>
  );
}

// ── Closed Cans ─────────────────────────────────────────────────
function ClosedCans() {
  const { globalInactiveLogs, globalSnusData, openAllScans } = useStore();
  const recentLogs = globalInactiveLogs.slice(0, 5);

  if (recentLogs.length === 0) {
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Closed cans</Text>
        </View>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyCardText}>Noch keine Scans vorhanden.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Closed cans</Text>
        <TouchableOpacity style={styles.showMoreBtn} onPress={() => { triggerHaptic(); openAllScans(); }} activeOpacity={0.75}>
          <Text style={styles.showMoreText}>Alle zeigen</Text>
          <ChevronIcon size={14} />
        </TouchableOpacity>
      </View>
      <View style={styles.scanListCard}>
        {recentLogs.map((log, idx) => {
          const snus = globalSnusData.find(s => s.id === log.snus_id);
          const name = snus?.name || 'Unknown';
          const img = snus?.image || '';
          const date = new Date(log.finished_at || log.opened_at).toLocaleDateString('de-DE');
          return (
            <View key={log.id}>
              {idx > 0 && <View style={styles.scanSeparator} />}
              <View style={styles.scanRow}>
                <View style={styles.scanImgWrap}>
                  {img ? <Image source={{ uri: GITHUB_BASE + img }} style={styles.scanImg} contentFit="contain" /> : null}
                </View>
                <View style={styles.scanInfo}>
                  <Text style={styles.scanName} numberOfLines={1}>{name}</Text>
                  <Text style={styles.scanDate}>{date}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ChevronIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={IOS.gray} strokeWidth={2.5}>
      <Path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </Svg>
  );
}

const RARITY_COLORS: Record<string, string> = {
  common: '#8E8E93', uncommon: '#34C759', rare: '#0A84FF',
  epic: '#BF5AF2', legendary: '#FF9F0A', exotic: '#FF375F', mythic: '#64D2FF',
};

// ── Main HomeTab ─────────────────────────────────────────────────
export default function HomeTab({ navHeight, onScanPress }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: navHeight + 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Home</Text>
      </View>

      <CollectorCard />
      <StatsGrid />
      <SuggestionsCarousel />
      <ActiveCans onScanPress={onScanPress} />
      <ClosedCans />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#000' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  pageTitle: { fontSize: 34, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },

  // Metal card
  metalCardContainer: { paddingHorizontal: 20, marginBottom: 8 },
  metalCard: {
    width: '100%', height: 192, borderRadius: 24,
    backgroundColor: '#2C2C2E',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    padding: 24, justifyContent: 'space-between',
  },
  metalCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  collectorIdLabel: { color: 'rgba(255,255,255,0.7)', fontWeight: '500', fontSize: 13, textTransform: 'uppercase', letterSpacing: 2 },
  levelLabel: { color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontSize: 14 },
  greetingText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  greetingName: { color: '#fff', fontWeight: '600' },
  xpText: { color: 'rgba(255,255,255,0.85)', fontSize: 38, fontWeight: '700', letterSpacing: -1, lineHeight: 44 },
  xpUnit: { fontSize: 20, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },

  // Stats
  statsContainer: { paddingHorizontal: 20, marginBottom: 24, gap: 12 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: IOS.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statLabel: { fontSize: 13, color: IOS.gray, fontWeight: '500', marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '600', color: '#fff' },
  statSub: { fontSize: 12, color: IOS.gray, marginTop: 4 },

  // Suggestions
  suggestionsSection: { marginBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#fff', letterSpacing: -0.3, paddingHorizontal: 20, marginBottom: 4 },
  carouselContent: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  suggestionCard: { width: SCREEN_W * 0.28, flexShrink: 0 },
  suggestionCardInner: {
    backgroundColor: '#2A2A2E', borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  suggestionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingTop: 10 },
  suggestionId: { fontSize: 10, color: IOS.gray, fontWeight: '500' },
  rarityDot: { width: 10, height: 10, borderRadius: 5 },
  suggestionImgContainer: { aspectRatio: 1, width: '100%', marginTop: 4, alignItems: 'center', justifyContent: 'center' },
  suggestionImg: { width: '80%', height: '80%' },
  grayscale: { opacity: 0.4 },
  suggestionName: { fontSize: 12, fontWeight: '600', color: '#fff', textAlign: 'center', paddingHorizontal: 8, paddingTop: 4, paddingBottom: 12, lineHeight: 16 },
  skeletonCard: { width: SCREEN_W * 0.28, aspectRatio: 1, backgroundColor: '#2A2A2E', borderRadius: 20 },

  // Active Cans
  sectionContainer: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  emptyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  emptyText: { fontSize: 13, color: '#71717A' },
  openNextBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, gap: 4 },
  openNextText: { fontSize: 13, fontWeight: '500', color: '#fff' },
  activeCanRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: IOS.card, borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  activeCanLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  activeCanImgWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  activeCanImg: { width: 40, height: 40 },
  activeCanInfo: { flex: 1 },
  activeCanName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  activeCanDate: { color: IOS.gray, fontSize: 11, letterSpacing: 0.5 },
  emptyBtn: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  emptyBtnText: { color: '#000', fontSize: 11, fontWeight: '700' },

  // Closed cans
  showMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  showMoreText: { color: IOS.gray, fontSize: 13, fontWeight: '500' },
  emptyCard: { backgroundColor: IOS.card, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  emptyCardText: { color: IOS.gray, fontSize: 14 },
  scanListCard: { backgroundColor: IOS.card, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  scanRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  scanSeparator: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.08)', marginLeft: 56 },
  scanImgWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scanImg: { width: 40, height: 40 },
  scanInfo: { flex: 1 },
  scanName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  scanDate: { color: IOS.gray, fontSize: 11, marginTop: 2 },
});
