import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Rect } from 'react-native-svg';
import { useStore } from '@/store/store';
import { GITHUB_BASE, IOS, RARITY_COLORS } from '@/lib/constants';

const { width: SCREEN_W } = Dimensions.get('window');
const COLS = 3;
const CARD_SIZE = (SCREEN_W - 40 - (COLS - 1) * 12) / COLS;

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

type DexCardProps = {
  id: number;
  name: string;
  image: string;
  rarity: string;
  isUnlocked: boolean;
  onPress: () => void;
};

const DexCard = React.memo(({ id, name, image, rarity, isUnlocked, onPress }: DexCardProps) => {
  const rarityColor = RARITY_COLORS[rarity.toLowerCase()] || IOS.gray;
  const formattedId = '#' + String(id).padStart(3, '0');

  return (
    <TouchableOpacity style={[styles.card, { width: CARD_SIZE }]} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.cardInner, !isUnlocked && styles.cardLocked]}>
        <View style={styles.cardTop}>
          <Text style={styles.cardId}>{formattedId}</Text>
          <View style={[styles.rarityDot, { backgroundColor: rarityColor, shadowColor: rarityColor }]} />
        </View>
        <View style={styles.cardImgWrap}>
          <Image
            source={{ uri: GITHUB_BASE + image }}
            style={styles.cardImg}
            contentFit="contain"
            transition={300}
          />
        </View>
        <View style={styles.cardBottom}>
          <Text style={[styles.cardName, !isUnlocked && { color: IOS.gray }]} numberOfLines={2}>
            {name}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function DexTab({ navHeight }: { navHeight: number }) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const { globalSnusData, globalUserCollection, dexSortMode, dexFilterUnlocked, setDexSortMode, setDexFilterUnlocked, openSnusDetail } = useStore();

  const filteredItems = useMemo(() => {
    let items = [...globalSnusData];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(s => s.name.toLowerCase().includes(q));
    }

    if (dexFilterUnlocked) {
      items = items.filter(s => !!globalUserCollection[s.id]);
    }

    if (dexSortMode === 'alpha') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      items.sort((a, b) => a.id - b.id);
    }

    return items;
  }, [globalSnusData, globalUserCollection, searchQuery, dexSortMode, dexFilterUnlocked]);

  const renderItem = useCallback(({ item }: { item: typeof filteredItems[0] }) => (
    <DexCard
      id={item.id}
      name={item.name}
      image={item.image}
      rarity={item.rarity || 'common'}
      isUnlocked={!!globalUserCollection[item.id]}
      onPress={() => { triggerHaptic(); openSnusDetail(item.id); }}
    />
  ), [globalUserCollection, openSnusDetail]);

  const numCollected = useMemo(() => Object.keys(globalUserCollection).length, [globalUserCollection]);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.pageTitle}>Dex</Text>
        <TouchableOpacity
          style={styles.scanIconBtn}
          onPress={() => { triggerHaptic(); useStore.getState().openScanModal(); }}
          activeOpacity={0.75}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
            <Path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <Path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchIconWrap}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={IOS.gray} strokeWidth={2.5}>
            <Path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </Svg>
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search Snus..."
          placeholderTextColor={IOS.gray}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
        <View style={styles.searchActions}>
          <TouchableOpacity
            style={[styles.sortBtn, dexSortMode !== 'id' && styles.sortBtnActive]}
            onPress={() => { triggerHaptic(); setDexSortMode(dexSortMode === 'id' ? 'alpha' : 'id'); }}
            activeOpacity={0.75}
          >
            <Text style={styles.sortBtnText}>{dexSortMode === 'id' ? '#' : 'A'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, dexFilterUnlocked && styles.filterBtnActive]}
            onPress={() => { triggerHaptic(); setDexFilterUnlocked(!dexFilterUnlocked); }}
            activeOpacity={0.75}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={dexFilterUnlocked ? '#000' : IOS.gray} strokeWidth={3}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats line */}
      <Text style={styles.statsLine}>{numCollected} / {globalSnusData.length} collected</Text>

      {/* Grid */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        numColumns={COLS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: navHeight + 20, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={15}
        windowSize={10}
        removeClippedSubviews
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Keine Ergebnisse.' : 'Lade Dex...'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: { paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16 },
  pageTitle: { fontSize: 34, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  scanIconBtn: { width: 40, height: 40, backgroundColor: IOS.card, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

  searchWrap: { marginHorizontal: 20, marginBottom: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: IOS.card, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingLeft: 44, paddingRight: 8 },
  searchIconWrap: { position: 'absolute', left: 14, top: 0, bottom: 0, justifyContent: 'center' },
  searchInput: { flex: 1, color: '#fff', fontSize: 17, paddingVertical: 12 },
  searchActions: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  sortBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  sortBtnActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  sortBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  filterBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  filterBtnActive: { backgroundColor: '#fff' },

  statsLine: { color: IOS.gray, fontSize: 12, paddingHorizontal: 22, marginBottom: 8 },

  row: { gap: 12, marginBottom: 12 },
  card: { flexShrink: 0 },
  cardInner: { backgroundColor: '#2A2A2E', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardLocked: { opacity: 0.4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingTop: 10 },
  cardId: { fontSize: 10, color: IOS.gray, fontWeight: '500' },
  rarityDot: { width: 10, height: 10, borderRadius: 5, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 3 },
  cardImgWrap: { aspectRatio: 1, width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  cardImg: { width: '85%', height: '85%' },
  cardBottom: { paddingHorizontal: 8, paddingTop: 4, paddingBottom: 12, alignItems: 'center' },
  cardName: { fontSize: 12, fontWeight: '600', color: '#fff', textAlign: 'center', lineHeight: 16 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: IOS.gray, fontSize: 15 },
});
