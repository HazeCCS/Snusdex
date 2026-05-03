import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle } from 'react-native-svg';
import { useStore } from '@/store/store';
import { supabase } from '@/lib/supabase';
import { GITHUB_BASE, IOS, RARITY_COLORS } from '@/lib/constants';

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

function getScoreColor(score: string | number) {
  const v = parseFloat(String(score));
  if (v <= 3.9) return '#FF3B30';
  if (v <= 6.9) return '#FFCC00';
  if (v <= 8.9) return '#34C759';
  return '#32ADE6';
}

// ── Badges Strip ─────────────────────────────────────────────────
function BadgesStrip() {
  const { globalBadges, globalUserBadges, openBadgesGrid } = useStore();
  const unlocked = globalBadges.filter(b => globalUserBadges.has(b.id));

  return (
    <View style={styles.badgesSection}>
      <View style={styles.badgesHeader}>
        <Text style={styles.badgesLabel}>BADGES</Text>
        <TouchableOpacity
          style={styles.expandBtn}
          onPress={() => { triggerHaptic(); openBadgesGrid(); }}
          activeOpacity={0.75}
        >
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}>
            <Path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </Svg>
        </TouchableOpacity>
      </View>
      {unlocked.length === 0 ? (
        <Text style={styles.noBadgesText}>Noch keine Badges freigeschaltet.</Text>
      ) : (
        <FlatList
          horizontal
          data={unlocked}
          keyExtractor={b => String(b.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgesList}
          renderItem={({ item }) => {
            const imgUrl = item.image_url.startsWith('http') ? item.image_url : GITHUB_BASE + item.image_url;
            return (
              <View style={styles.badgeCircle}>
                <Image source={{ uri: imgUrl }} style={styles.badgeImg} contentFit="cover" />
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

// ── Social Card ──────────────────────────────────────────────────
type SocialCardData = {
  title: string;
  snus: any;
  ratings: Record<string, string | number>;
  overall: string | number;
  count: number;
  countLabel: string;
};

function SocialCard({ data }: { data: SocialCardData }) {
  const { openSnusDetail } = useStore();
  const { title, snus, ratings, overall, count, countLabel } = data;
  const rarity = (snus.rarity || 'common').toLowerCase();
  const rarityColor = RARITY_COLORS[rarity] || IOS.gray;

  const ratingLabels = ['Vis.', 'Smell', 'Taste', 'Bite', 'Drip', 'Str.'];
  const ratingKeys = ['visuals', 'smell', 'taste', 'bite', 'drip', 'strength'];

  return (
    <TouchableOpacity
      style={styles.socialCard}
      onPress={() => { triggerHaptic(); openSnusDetail(snus.id); }}
      activeOpacity={0.9}
    >
      <View style={styles.socialCardHeader}>
        <View style={styles.socialCardBadge}>
          <Text style={styles.socialCardBadgeText}>{title}</Text>
        </View>
        <Text style={styles.socialCardCount}>{count} {countLabel}</Text>
      </View>

      <View style={styles.socialCardBody}>
        <View style={styles.socialCardImgWrap}>
          <View style={[styles.socialCardGlow, { shadowColor: rarityColor }]} />
          <Image source={{ uri: GITHUB_BASE + snus.image }} style={styles.socialCardImg} contentFit="contain" />
        </View>
        <View style={styles.socialCardInfo}>
          <Text style={styles.socialCardName} numberOfLines={2}>{snus.name}</Text>
          <Text style={styles.socialCardSub}>
            {snus.nicotine} MG/G •{' '}
            <Text style={{ color: rarityColor }}>{snus.rarity || 'Common'}</Text>
          </Text>
          <View style={styles.overallRow}>
            <Text style={[styles.overallScore, { color: getScoreColor(overall) }]}>{overall}</Text>
            <Text style={styles.overallLabel}>/ 10 Overall</Text>
          </View>
        </View>
      </View>

      <View style={styles.ratingCircles}>
        {ratingKeys.map((key, i) => {
          const val = ratings[key] ?? 'N/A';
          const color = val === 'N/A' ? IOS.gray : getScoreColor(val);
          return (
            <View key={key} style={styles.ratingCircleCol}>
              <View style={[styles.ratingCircle, { borderColor: color + '66' }]}>
                <Text style={[styles.ratingCircleVal, { color }]}>{val}</Text>
              </View>
              <Text style={styles.ratingCircleLabel}>{ratingLabels[i]}</Text>
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

// ── Most Scanned List ────────────────────────────────────────────
function MostScannedList() {
  const { globalSnusData, openSnusDetail } = useStore();
  const [items, setItems] = useState<{ snus: any; count: number }[]>([]);

  useEffect(() => {
    loadData();
  }, [globalSnusData.length]);

  async function loadData() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data } = await supabase
      .from('user_collections')
      .select('snus_id, collected_at')
      .gte('collected_at', sevenDaysAgo.toISOString());

    if (!data) return;
    const counts: Record<string, number> = {};
    data.forEach((item: any) => {
      if (item.snus_id) counts[item.snus_id] = (counts[item.snus_id] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 7)
      .map(([id, count]) => ({ snus: globalSnusData.find(s => String(s.id) === String(id)), count: Number(count) }))
      .filter(i => i.snus != null);

    setItems(sorted as { snus: any; count: number }[]);
  }

  return (
    <View style={styles.mostScannedSection}>
      <Text style={[styles.badgesLabel, { marginBottom: 10 }]}>MOST SCANNED (7 TAGE)</Text>
      <View style={styles.mostScannedCard}>
        {Array.from({ length: 7 }).map((_, i) => {
          const item = items[i];
          const rank = i + 1;
          if (!item) {
            return (
              <View key={i}>
                {i > 0 && <View style={styles.listSeparator} />}
                <View style={[styles.listRow, { opacity: 0.3 }]}>
                  <Text style={styles.rankText}>{rank}</Text>
                  <View style={styles.listImgPlaceholder} />
                  <Text style={[styles.listName, { color: IOS.gray, fontStyle: 'italic' }]}>Noch keine Daten</Text>
                </View>
              </View>
            );
          }
          const scoreRaw = item.snus.overall_score ?? item.snus.avg_score ?? item.snus.score ?? null;
          const scoreDisplay = scoreRaw !== null ? parseFloat(scoreRaw).toFixed(1) : '—';
          return (
            <TouchableOpacity key={item.snus.id} onPress={() => { triggerHaptic(); openSnusDetail(item.snus.id); }} activeOpacity={0.8}>
              {i > 0 && <View style={styles.listSeparator} />}
              <View style={styles.listRow}>
                <Text style={styles.rankText}>{rank}</Text>
                <View style={styles.listImgWrap}>
                  <Image source={{ uri: GITHUB_BASE + item.snus.image }} style={styles.listImg} contentFit="contain" />
                </View>
                <View style={styles.listInfo}>
                  <Text style={styles.listName} numberOfLines={1}>{item.snus.name}</Text>
                  <Text style={styles.listSub}>{item.count} Scan{item.count > 1 ? 's' : ''} diese Woche</Text>
                </View>
                <View style={styles.listScore}>
                  <Text style={[styles.listScoreVal, { color: getScoreColor(scoreRaw ?? 0) }]}>{scoreDisplay}</Text>
                  <Text style={styles.listScoreLabel}>Score</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Main Social Tab ──────────────────────────────────────────────
export default function SocialTab({ navHeight }: { navHeight: number }) {
  const insets = useSafeAreaInsets();
  const { openConnections } = useStore();
  const [socialCards, setSocialCards] = useState<SocialCardData[]>([]);
  const { globalSnusData } = useStore();

  useEffect(() => {
    if (globalSnusData.length > 0) loadSocialStats();
  }, [globalSnusData.length]);

  async function loadSocialStats() {
    const { data, error } = await supabase.rpc('get_social_stats');
    if (error || !data) return;

    const cards: SocialCardData[] = [];

    if (data.top_rated?.snus_id) {
      const snusInfo = globalSnusData.find(s => s.id == data.top_rated.snus_id);
      if (snusInfo) {
        cards.push({
          title: 'Top Rated Snus 🏆',
          snus: snusInfo,
          ratings: {
            visuals: (data.top_rated.avg_ratings?.visuals || 0).toFixed(1),
            smell: (data.top_rated.avg_ratings?.smell || 0).toFixed(1),
            taste: (data.top_rated.avg_ratings?.taste || 0).toFixed(1),
            bite: (data.top_rated.avg_ratings?.bite || 0).toFixed(1),
            drip: (data.top_rated.avg_ratings?.drip || 0).toFixed(1),
            strength: (data.top_rated.avg_ratings?.strength || 0).toFixed(1),
          },
          overall: (data.top_rated.avg_score || 0).toFixed(1),
          count: data.top_rated.rating_count || 0,
          countLabel: 'Ratings',
        });
      }
    }

    if (data.most_popular_today?.snus_id) {
      const snusInfo = globalSnusData.find(s => s.id == data.most_popular_today.snus_id);
      if (snusInfo) {
        const hasRatings = data.most_popular_today.rating_count > 0;
        cards.push({
          title: 'Most Popular Today 🔍',
          snus: snusInfo,
          ratings: hasRatings ? {
            visuals: (data.most_popular_today.avg_ratings?.visuals || 0).toFixed(1),
            smell: (data.most_popular_today.avg_ratings?.smell || 0).toFixed(1),
            taste: (data.most_popular_today.avg_ratings?.taste || 0).toFixed(1),
            bite: (data.most_popular_today.avg_ratings?.bite || 0).toFixed(1),
            drip: (data.most_popular_today.avg_ratings?.drip || 0).toFixed(1),
            strength: (data.most_popular_today.avg_ratings?.strength || 0).toFixed(1),
          } : { visuals: 'N/A', smell: 'N/A', taste: 'N/A', bite: 'N/A', drip: 'N/A', strength: 'N/A' },
          overall: hasRatings ? (data.most_popular_today.avg_score || 0).toFixed(1) : 'N/A',
          count: data.most_popular_today.scan_count || 0,
          countLabel: 'Scans',
        });
      }
    }

    setSocialCards(cards);
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: navHeight + 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Social</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => { triggerHaptic(); openConnections(); }}
          activeOpacity={0.75}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
            <Path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </Svg>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <BadgesStrip />
        {socialCards.map(card => <SocialCard key={card.title} data={card} />)}
        <MostScannedList />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#000' },
  header: { paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16 },
  pageTitle: { fontSize: 34, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  iconBtn: { width: 40, height: 40, backgroundColor: IOS.card, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  content: { paddingHorizontal: 20 },

  badgesSection: { marginBottom: 24 },
  badgesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badgesLabel: { color: IOS.gray, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  expandBtn: { width: 28, height: 28, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  noBadgesText: { color: IOS.gray, fontSize: 13, paddingVertical: 8 },
  badgesList: { gap: 12, paddingBottom: 4 },
  badgeCircle: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: IOS.card2, overflow: 'hidden' },
  badgeImg: { width: '100%', height: '100%' },

  socialCard: { backgroundColor: IOS.card, borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  socialCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  socialCardBadge: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  socialCardBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  socialCardCount: { color: IOS.gray, fontSize: 11, fontWeight: '500', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  socialCardBody: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  socialCardImgWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  socialCardGlow: { position: 'absolute', width: '60%', aspectRatio: 1, borderRadius: 999, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 5 },
  socialCardImg: { width: '100%', height: '100%' },
  socialCardInfo: { flex: 1 },
  socialCardName: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: -0.3, lineHeight: 22, marginBottom: 4 },
  socialCardSub: { fontSize: 12, color: IOS.gray, marginBottom: 8 },
  overallRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  overallScore: { fontSize: 26, fontWeight: '700', lineHeight: 30 },
  overallLabel: { fontSize: 12, color: IOS.gray, marginBottom: 2 },
  ratingCircles: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 16 },
  ratingCircleCol: { alignItems: 'center', gap: 4 },
  ratingCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  ratingCircleVal: { fontSize: 13, fontWeight: '700' },
  ratingCircleLabel: { color: IOS.gray, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '500' },

  mostScannedSection: { marginBottom: 20 },
  mostScannedCard: { backgroundColor: IOS.card, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  listSeparator: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.05)' },
  rankText: { color: IOS.gray, fontSize: 13, fontWeight: '700', width: 20, textAlign: 'center' },
  listImgWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  listImg: { width: 40, height: 40 },
  listImgPlaceholder: { width: 40, height: 40, borderRadius: 8, backgroundColor: IOS.card2 },
  listInfo: { flex: 1 },
  listName: { color: '#fff', fontSize: 15, fontWeight: '600', letterSpacing: -0.3 },
  listSub: { color: IOS.gray, fontSize: 11, marginTop: 2 },
  listScore: { alignItems: 'center' },
  listScoreVal: { fontSize: 17, fontWeight: '700' },
  listScoreLabel: { color: IOS.gray, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '500' },
});
