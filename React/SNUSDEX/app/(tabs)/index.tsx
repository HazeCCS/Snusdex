import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NavBar, { TabName } from '@/components/ui/NavBar';
import HomeTab from '@/components/home/HomeTab';
import DexTab from '@/components/dex/DexTab';
import SocialTab from '@/components/social/SocialTab';
import ProfileTab from '@/components/profile/ProfileTab';
import SnusDetailModal from '@/components/modals/SnusDetailModal';
import ScanModal from '@/components/modals/ScanModal';
import BadgeUnlockModal from '@/components/modals/BadgeUnlockModal';
import BadgesGridPage from '@/components/modals/BadgesGridPage';
import ConnectionsPage from '@/components/modals/ConnectionsPage';
import AllScansModal from '@/components/modals/AllScansModal';
import SettingsSubpage from '@/components/modals/SettingsSubpage';
import { useStore } from '@/store/store';
import { supabase } from '@/lib/supabase';
import type { SnusProduct, UsageLog } from '@/lib/supabase';
import type { CollectionEntry } from '@/store/store';

export default function MainScreen() {
  const [activeTab, setActiveTab] = useState<TabName>('home');
  const insets = useSafeAreaInsets();
  const NAV_HEIGHT = 60 + insets.bottom;

  const {
    setSnusData, setUserCollection, setUsageLogs,
    setStats, setBadges,
    snusDetailVisible, scanModalVisible,
    badgeUnlockVisible, badgesGridVisible,
    connectionsVisible, allScansVisible,
    settingsSubpageVisible,
    userId,
    xpValue, levelValue,
  } = useStore();

  useEffect(() => {
    if (userId) {
      loadAllData();
    }
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'social' && userId) {
      loadBadges();
    }
  }, [activeTab]);

  async function loadAllData() {
    await Promise.all([loadDex(), loadUsageData(), loadBadges()]);
  }

  async function loadDex() {
    if (!userId) return;

    const [{ data: snusItems }, { data: myCol }] = await Promise.all([
      supabase.from('snus_products').select('*').order('id', { ascending: true }),
      supabase.from('user_collections').select('*').eq('user_id', userId),
    ]);

    const snusData: SnusProduct[] = snusItems || [];
    setSnusData(snusData);

    const collection: Record<number, CollectionEntry> = {};
    if (myCol) {
      myCol.forEach((item: any) => {
        collection[item.snus_id] = {
          date: item.collected_at,
          ratings: {
            taste: item.rating_taste || 5,
            taste_text: item.rating_taste_text || '',
            smell: item.rating_smell || 5,
            smell_text: item.rating_smell_text || '',
            bite: item.rating_bite || 5,
            bite_text: item.rating_bite_text || '',
            drip: item.rating_drip || 5,
            drip_text: item.rating_drip_text || '',
            visuals: item.rating_visuals || 5,
            visuals_text: item.rating_visuals_text || '',
            strength: item.rating_strength || 5,
            strength_text: item.rating_strength_text || '',
          },
        };
      });
    }
    setUserCollection(collection);

    const count = Object.keys(collection).length;
    const xp = count * 100;
    const level = Math.floor(xp / 300) + 1;
    setStats(xp, level, count, useStore.getState().statFlow, useStore.getState().statAvgPouches, useStore.getState().statAvgMg);
  }

  async function loadUsageData() {
    if (!userId) return;
    const { data } = await supabase
      .from('usage_logs')
      .select('*, snus_products(*)')
      .eq('user_id', userId)
      .order('opened_at', { ascending: false });

    const all: UsageLog[] = data || [];
    const active = all.filter(l => l.is_active);
    const inactive = all.filter(l => !l.is_active);
    setUsageLogs(all, active, inactive);
    calculateAndSetUsageStats(all);
  }

  function calculateAndSetUsageStats(logs: UsageLog[]) {
    const finished = logs.filter(l => !l.is_active && l.finished_at);
    if (finished.length === 0) return;
    let totalFlow = 0;
    finished.forEach(l => { totalFlow += l.mg_per_gram || 0; });
    const days = new Set(finished.map(l => l.opened_at.split('T')[0]));
    const daysCount = Math.max(1, days.size);
    const avgPouches = Math.round(finished.length / daysCount);
    const avgMg = Math.round(totalFlow / daysCount);
    const s = useStore.getState();
    setStats(s.xpValue, s.levelValue, s.statCount, totalFlow, avgPouches, avgMg);
  }

  async function loadBadges() {
    if (!userId) return;
    const [{ data: allBadges }, { data: userBadges }, { data: collections }] = await Promise.all([
      supabase.from('badges').select('*').order('level', { ascending: true }),
      supabase.from('user_badges').select('badge_id').eq('user_id', userId),
      supabase.from('user_collections').select('snus_id').eq('user_id', userId),
    ]);
    const badgeSet = new Set<number>(userBadges ? userBadges.map((ub: any) => ub.badge_id) : []);
    const progress = collections ? new Set(collections.map((c: any) => c.snus_id)).size : 0;
    setBadges(allBadges || [], badgeSet, progress);
  }

  return (
    <View style={styles.root}>
      <View style={[styles.tabPane, activeTab === 'home' ? styles.visible : styles.hidden]}>
        <HomeTab navHeight={NAV_HEIGHT} onScanPress={() => useStore.getState().openScanModal()} />
      </View>
      <View style={[styles.tabPane, activeTab === 'dex' ? styles.visible : styles.hidden]}>
        <DexTab navHeight={NAV_HEIGHT} />
      </View>
      <View style={[styles.tabPane, activeTab === 'social' ? styles.visible : styles.hidden]}>
        <SocialTab navHeight={NAV_HEIGHT} />
      </View>
      <View style={[styles.tabPane, activeTab === 'profile' ? styles.visible : styles.hidden]}>
        <ProfileTab navHeight={NAV_HEIGHT} />
      </View>

      <NavBar activeTab={activeTab} onTabPress={setActiveTab} />

      {snusDetailVisible && <SnusDetailModal onRefreshDex={loadDex} onRefreshUsage={loadUsageData} />}
      {scanModalVisible && <ScanModal />}
      {badgeUnlockVisible && <BadgeUnlockModal />}
      {badgesGridVisible && <BadgesGridPage />}
      {connectionsVisible && <ConnectionsPage />}
      {allScansVisible && <AllScansModal />}
      {settingsSubpageVisible && <SettingsSubpage onRefreshDex={loadDex} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  tabPane: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  visible: { opacity: 1, zIndex: 1 },
  hidden: { opacity: 0, zIndex: 0, pointerEvents: 'none' },
});
