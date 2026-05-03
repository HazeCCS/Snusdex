import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Dimensions, PanResponder, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { useStore } from '@/store/store';
import { GITHUB_BASE, IOS } from '@/lib/constants';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_H * 0.82;

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export default function AllScansModal() {
  const insets = useSafeAreaInsets();
  const { globalInactiveLogs, globalSnusData, closeAllScans, openSnusDetail, closeSnusDetail } = useStore();

  const translateY = useRef(new Animated.Value(0)).current;
  const scrollOffset = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_, gs) => scrollOffset.current <= 0,
      onMoveShouldSetPanResponder: (_, gs) => scrollOffset.current <= 0 && gs.dy > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100) {
          triggerHaptic();
          Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 300, useNativeDriver: true }).start(() => closeAllScans());
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const renderItem = ({ item: log }: { item: typeof globalInactiveLogs[0] }) => {
    const snus = globalSnusData.find(s => s.id === log.snus_id);
    if (!snus) return null;
    const dateObj = new Date(log.finished_at || log.opened_at);
    const dateStr = dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

    return (
      <TouchableOpacity
        style={styles.item}
        activeOpacity={0.75}
        onPress={() => {
          triggerHaptic();
          closeAllScans();
          setTimeout(() => openSnusDetail(snus.id), 300);
        }}
      >
        <View style={styles.itemLeft}>
          <View style={styles.itemImg}>
            <Image source={{ uri: GITHUB_BASE + snus.image }} style={styles.img} contentFit="contain" />
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>{snus.name}</Text>
            <Text style={styles.itemDate}>{dateStr}</Text>
          </View>
        </View>
        <View style={styles.itemRight}>
          <Text style={styles.itemNic}>{snus.nicotine}mg</Text>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={IOS.gray} strokeWidth={2.5}>
            <Path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </Svg>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => { triggerHaptic(); closeAllScans(); }} />
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Alle Scans</Text>
          <TouchableOpacity onPress={() => { triggerHaptic(); closeAllScans(); }} style={styles.closeBtn} activeOpacity={0.75}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={IOS.gray} strokeWidth={2.5}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </Svg>
          </TouchableOpacity>
        </View>

        <FlatList
          data={globalInactiveLogs}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          style={styles.list}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
          onScroll={e => { scrollOffset.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Noch keine Dosen geschlossen.</Text>
            </View>
          }
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: IOS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: { width: 36, height: 5, backgroundColor: IOS.gray3, borderRadius: 3, alignSelf: 'center', marginTop: 8, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  itemImg: { width: 44, height: 44, flexShrink: 0 },
  img: { width: '100%', height: '100%' },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 17, fontWeight: '600', color: '#fff', letterSpacing: -0.3 },
  itemDate: { fontSize: 13, fontWeight: '500', color: IOS.gray, marginTop: 2 },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, flexShrink: 0 },
  itemNic: { fontSize: 17, fontWeight: '600', color: '#fff' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: IOS.gray, fontSize: 15 },
});
