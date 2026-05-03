import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput,
  Dimensions, PanResponder, Animated, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { useStore } from '@/store/store';
import { supabase } from '@/lib/supabase';
import { IOS } from '@/lib/constants';

const { width: SCREEN_W } = Dimensions.get('window');

type TabName = 'freunde' | 'follower' | 'following' | 'anfragen';

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

type ConnectionItem = {
  id: string;
  username: string;
  avatar_url?: string;
  xp?: number;
  followStatus?: string;
  requestId?: string;
};

// ─── Search Result Item (stateful component, can use hooks) ──
type SearchItemProps = {
  item: ConnectionItem;
  userId: string | null;
};

function SearchResultItem({ item, userId }: SearchItemProps) {
  const [status, setStatus] = useState(item.followStatus || 'none');

  const level = Math.floor((item.xp || 0) / 300) + 1;
  const cans = Math.floor((item.xp || 0) / 100);
  const avatarUri = item.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.username)}&background=1C1C1E&color=fff`;

  const handleToggleFollow = async () => {
    if (!userId) return;
    triggerHaptic();
    if (status === 'accepted' || status === 'pending') {
      await supabase.from('user_follows').delete().eq('follower_id', userId).eq('following_id', item.id);
      setStatus('none');
    } else {
      await supabase.from('user_follows').insert([{ follower_id: userId, following_id: item.id, status: 'pending' }]);
      setStatus('pending');
    }
  };

  let btnLabel = 'Folgen';
  const isFollowing = status === 'accepted' || status === 'pending';
  if (status === 'accepted') btnLabel = 'Folge ich';
  else if (status === 'pending') btnLabel = 'Angefragt';

  return (
    <View style={styles.connItem}>
      <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
      <View style={styles.connInfo}>
        <Text style={styles.connName} numberOfLines={1}>{item.username}</Text>
        <Text style={styles.connSub}>Lvl {level} • {cans} Dosen</Text>
      </View>
      <TouchableOpacity
        style={[styles.followBtn, isFollowing ? styles.followBtnSecondary : styles.followBtnPrimary]}
        onPress={handleToggleFollow}
        activeOpacity={0.8}
      >
        <Text style={[styles.followBtnText, isFollowing ? styles.followBtnSecondaryText : styles.followBtnPrimaryText]}>
          {btnLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ConnectionsPage() {
  const insets = useSafeAreaInsets();
  const { userId, closeConnections } = useStore();
  const [activeTab, setActiveTab] = useState<TabName>('freunde');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ConnectionItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [tabData, setTabData] = useState<Record<TabName, ConnectionItem[]>>({
    freunde: [], follower: [], following: [], anfragen: [],
  });
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dx > 10 && Math.abs(gs.dy) < Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => { if (gs.dx > 0) translateX.setValue(gs.dx); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > SCREEN_W / 3 || gs.dx > 100) {
          Animated.timing(translateX, { toValue: SCREEN_W, duration: 280, useNativeDriver: true }).start(() => closeConnections());
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const loadTabData = useCallback(async (tab: TabName) => {
    if (!userId) return;
    setLoading(true);
    try {
      if (tab === 'freunde') {
        const { data } = await supabase
          .from('user_follows')
          .select('following_id, profiles!user_follows_following_id_fkey(id, username, avatar_url, xp)')
          .eq('follower_id', userId).eq('status', 'accepted');
        setTabData(prev => ({
          ...prev,
          freunde: (data || []).map((f: any) => ({ id: f.profiles?.id, username: f.profiles?.username || 'Unknown', avatar_url: f.profiles?.avatar_url, xp: f.profiles?.xp || 0, followStatus: 'accepted' })),
        }));
      } else if (tab === 'follower') {
        const { data } = await supabase
          .from('user_follows')
          .select('follower_id, profiles!user_follows_follower_id_fkey(id, username, avatar_url, xp)')
          .eq('following_id', userId).eq('status', 'accepted');
        setTabData(prev => ({
          ...prev,
          follower: (data || []).map((f: any) => ({ id: f.profiles?.id, username: f.profiles?.username || 'Unknown', avatar_url: f.profiles?.avatar_url, xp: f.profiles?.xp || 0 })),
        }));
      } else if (tab === 'following') {
        const { data } = await supabase
          .from('user_follows')
          .select('following_id, status, profiles!user_follows_following_id_fkey(id, username, avatar_url, xp)')
          .eq('follower_id', userId).in('status', ['accepted', 'pending']);
        setTabData(prev => ({
          ...prev,
          following: (data || []).map((f: any) => ({ id: f.profiles?.id, username: f.profiles?.username || 'Unknown', avatar_url: f.profiles?.avatar_url, xp: f.profiles?.xp || 0, followStatus: f.status })),
        }));
      } else if (tab === 'anfragen') {
        const { data } = await supabase
          .from('user_follows')
          .select('id, follower_id, profiles!user_follows_follower_id_fkey(id, username, avatar_url, xp)')
          .eq('following_id', userId).eq('status', 'pending');
        setTabData(prev => ({
          ...prev,
          anfragen: (data || []).map((f: any) => ({ id: f.profiles?.id, username: f.profiles?.username || 'Unknown', avatar_url: f.profiles?.avatar_url, xp: f.profiles?.xp || 0, requestId: f.id })),
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadTabData('freunde');
  }, []);

  const switchTab = (tab: TabName) => {
    triggerHaptic();
    setActiveTab(tab);
    loadTabData(tab);
    setIsSearchMode(false);
    setSearchQuery('');
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!text.trim()) { setIsSearchMode(false); setSearchResults([]); return; }
    setIsSearchMode(true);
    if (text.trim().length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const { data: profiles } = await supabase
          .from('profiles').select('id, username, avatar_url, xp')
          .ilike('username', `%${text.trim()}%`).neq('id', userId).limit(20);
        if (!profiles || profiles.length === 0) { setSearchResults([]); return; }
        const { data: follows } = await supabase.from('user_follows')
          .select('following_id, status').eq('follower_id', userId || '')
          .in('following_id', profiles.map((p: any) => p.id));
        const followMap: Record<string, string> = {};
        (follows || []).forEach((f: any) => { followMap[f.following_id] = f.status; });
        setSearchResults(profiles.map((p: any) => ({ id: p.id, username: p.username || 'Unknown', avatar_url: p.avatar_url, xp: p.xp || 0, followStatus: followMap[p.id] || 'none' })));
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const acceptRequest = async (requestId: string) => {
    triggerHaptic();
    await supabase.from('user_follows').update({ status: 'accepted' }).eq('id', requestId);
    loadTabData('anfragen');
    loadTabData('freunde');
  };

  const declineRequest = async (requestId: string) => {
    triggerHaptic();
    await supabase.from('user_follows').delete().eq('id', requestId);
    loadTabData('anfragen');
  };

  const renderSearchResult = useCallback(({ item }: { item: ConnectionItem }) => (
    <SearchResultItem item={item} userId={userId} />
  ), [userId]);

  const renderTabItem = useCallback(({ item }: { item: ConnectionItem }) => {
    const level = Math.floor((item.xp || 0) / 300) + 1;
    const cans = Math.floor((item.xp || 0) / 100);
    const avatarUri = item.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.username)}&background=1C1C1E&color=fff`;

    if (activeTab === 'anfragen' && item.requestId) {
      return (
        <View style={styles.connItem}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
          <View style={styles.connInfo}>
            <Text style={styles.connName} numberOfLines={1}>{item.username}</Text>
            <Text style={styles.connSub}>Lvl {level} • {cans} Dosen</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[styles.followBtn, styles.followBtnPrimary, { paddingHorizontal: 12 }]} onPress={() => acceptRequest(item.requestId!)} activeOpacity={0.8}>
              <Text style={[styles.followBtnText, styles.followBtnPrimaryText]}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.followBtn, styles.followBtnSecondary, { paddingHorizontal: 12 }]} onPress={() => declineRequest(item.requestId!)} activeOpacity={0.8}>
              <Text style={[styles.followBtnText, styles.followBtnSecondaryText]}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.connItem}>
        <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
        <View style={styles.connInfo}>
          <Text style={styles.connName} numberOfLines={1}>{item.username}</Text>
          <Text style={styles.connSub}>Lvl {level} • {cans} Dosen</Text>
        </View>
      </View>
    );
  }, [activeTab]);

  const TABS: { key: TabName; label: string }[] = [
    { key: 'freunde', label: 'Freunde' },
    { key: 'follower', label: 'Follower' },
    { key: 'following', label: 'Following' },
    { key: 'anfragen', label: 'Anfragen' },
  ];

  const currentData = isSearchMode ? searchResults : tabData[activeTab];

  return (
    <Animated.View style={[styles.root, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
      <View style={[styles.inner, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => { triggerHaptic(); closeConnections(); }} activeOpacity={0.75}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </Svg>
          </TouchableOpacity>
          <Text style={styles.title}>Connections</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.searchWrap}>
          <View style={styles.searchIconWrap}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={IOS.gray} strokeWidth={2.5}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </Svg>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Collector suchen..."
            placeholderTextColor={IOS.gray}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setIsSearchMode(false); setSearchResults([]); }} style={styles.clearBtn} activeOpacity={0.75}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={IOS.gray} strokeWidth={2.5}>
                <Path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </Svg>
            </TouchableOpacity>
          )}
        </View>

        {!isSearchMode && (
          <View style={styles.tabBar}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
                onPress={() => switchTab(tab.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {isSearchMode && searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
          <View style={styles.emptyWrap}><Text style={styles.emptyText}>Keine Collector gefunden.</Text></View>
        )}
        {isSearchMode && isSearching && (
          <View style={styles.emptyWrap}><ActivityIndicator color={IOS.gray} /></View>
        )}

        <FlatList
          data={currentData}
          renderItem={isSearchMode ? renderSearchResult : renderTabItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={!isSearchMode && !loading ? (
            <View style={styles.emptyWrap}><Text style={styles.emptyText}>Noch niemand hier.</Text></View>
          ) : null}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 95 },
  inner: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  placeholder: { width: 40 },
  searchWrap: { marginHorizontal: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: IOS.card, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingLeft: 40, paddingRight: 8, position: 'relative' },
  searchIconWrap: { position: 'absolute', left: 14, top: 0, bottom: 0, justifyContent: 'center' },
  searchInput: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 12 },
  clearBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 8, gap: 8 },
  tabItem: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  tabItemActive: { backgroundColor: '#fff' },
  tabLabel: { fontSize: 13, fontWeight: '600', color: IOS.gray },
  tabLabelActive: { color: '#000' },
  connItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: IOS.card2 },
  connInfo: { flex: 1, minWidth: 0 },
  connName: { fontSize: 15, fontWeight: '600', color: '#fff', letterSpacing: -0.2 },
  connSub: { fontSize: 13, color: IOS.gray, marginTop: 2 },
  followBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  followBtnPrimary: { backgroundColor: '#fff' },
  followBtnSecondary: { backgroundColor: IOS.card2 },
  followBtnText: { fontSize: 13, fontWeight: '600' },
  followBtnPrimaryText: { color: '#000' },
  followBtnSecondaryText: { color: '#fff' },
  emptyWrap: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: IOS.gray, fontSize: 15 },
});
