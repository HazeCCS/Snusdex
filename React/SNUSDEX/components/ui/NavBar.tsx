import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { Path, G, Circle, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming, withDelay,
} from 'react-native-reanimated';
import { IOS } from '@/lib/constants';

export type TabName = 'home' | 'dex' | 'social' | 'profile';

type Props = {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
};

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

// ── HOME ICON ─────────────────────────────
function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 3L2 11.5h2.5L12 5.8l7.5 5.7H22L12 3z" />
      <Path d="M5 11.5V21h5v-5.5h4V21h5V11.5L12 5.8 5 11.5z" />
    </Svg>
  );
}

// ── DEX ICON ──────────────────────────────
function DexIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill={color}>
      <Rect x={3} y={4.5} width={18} height={2.8} rx={1.4} />
      <Rect x={3} y={10.6} width={18} height={2.8} rx={1.4} />
      <Rect x={3} y={16.7} width={18} height={2.8} rx={1.4} />
    </Svg>
  );
}

// ── SOCIAL ICON ────────────────────────────
function SocialIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill={color}>
      <G>
        <Circle cx={8} cy={7.5} r={3} />
        <Path d="M1.5 19c0-3.04 2.96-5 6.5-5s6.5 1.96 6.5 5H1.5z" />
      </G>
      <G opacity={0.65}>
        <Circle cx={17} cy={7} r={2.5} />
        <Path d="M13.2 13.1C14.3 13.7 15.6 14 17 14c3.04 0 5.5 1.7 5.5 4.5V19H15v-.5c0-1.9-.68-3.5-1.8-4.4z" />
      </G>
    </Svg>
  );
}

// ── PROFILE ICON ───────────────────────────
function ProfileIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill={color}>
      <Circle cx={12} cy={7.5} r={4} />
      <Path d="M4 20.5c0-4.14 3.58-7.5 8-7.5s8 3.36 8 7.5H4z" />
    </Svg>
  );
}

const TABS: { id: TabName; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'dex', label: 'Dex' },
  { id: 'social', label: 'Social' },
  { id: 'profile', label: 'Profile' },
];

function TabButton({ tab, isActive, onPress }: { tab: typeof TABS[0]; isActive: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const color = isActive ? '#fff' : IOS.gray;

  function handlePress() {
    triggerHaptic();
    scale.value = withSequence(withTiming(0.88, { duration: 80 }), withTiming(1, { duration: 200 }));
    onPress();
  }

  const Icon = tab.id === 'home' ? HomeIcon
    : tab.id === 'dex' ? DexIcon
    : tab.id === 'social' ? SocialIcon
    : ProfileIcon;

  return (
    <TouchableOpacity style={styles.navBtn} onPress={handlePress} activeOpacity={1}>
      <Animated.View style={[{ alignItems: 'center', gap: 4 }, animStyle]}>
        <Icon color={color} />
        <Text style={[styles.navLabel, { color }]}>{tab.label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function NavBar({ activeTab, onTabPress }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 8 }]}>
      {TABS.map(tab => (
        <TabButton
          key={tab.id}
          tab={tab}
          isActive={activeTab === tab.id}
          onPress={() => onTabPress(tab.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(28,28,30,0.9)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 12,
    zIndex: 50,
    ...(Platform.OS === 'ios' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    } : { elevation: 8 }),
  },
  navBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
});
