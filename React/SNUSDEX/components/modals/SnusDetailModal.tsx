import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
  Dimensions, PanResponder, Animated, ActivityIndicator, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle } from 'react-native-svg';
import { useStore } from '@/store/store';
import { supabase } from '@/lib/supabase';
import { GITHUB_BASE, IOS, RARITY_COLORS, RATING_STEPS, type RatingStep } from '@/lib/constants';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_H * 0.92;

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

// ─── Rating Pill (1-10 buttons) ──────────────────────────────
function RatingPill({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={pillStyles.wrap}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <TouchableOpacity
          key={n}
          style={[pillStyles.btn, n === value && pillStyles.btnActive]}
          onPress={() => { triggerHaptic(); onChange(n); }}
          activeOpacity={0.7}
        >
          <Text style={[pillStyles.btnText, n === value && pillStyles.btnTextActive]}>{n}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const pillStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 4, flexWrap: 'nowrap' },
  btn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  btnActive: { backgroundColor: '#fff', borderColor: '#fff' },
  btnText: { fontSize: 13, fontWeight: '600', color: IOS.gray },
  btnTextActive: { color: '#000' },
});

// ─── Info View ───────────────────────────────────────────────
type InfoViewProps = {
  snus: any;
  isUnlocked: boolean;
  fromScan: boolean;
  openedCount: number;
  collectedDate: string;
  onCollect: () => void;
  onEditRating: () => void;
  onViewRating: () => void;
  onStartCan: () => void;
  startingCan: boolean;
};

function InfoView({ snus, isUnlocked, fromScan, openedCount, collectedDate, onCollect, onEditRating, onViewRating, onStartCan, startingCan }: InfoViewProps) {
  const rarity = (snus.rarity || 'common').toLowerCase().trim();
  const rarityColor = RARITY_COLORS[rarity] || IOS.gray;
  const formattedId = '#' + String(snus.id).padStart(3, '0');
  const affiliateUrl = `https://snuzone.com/search?q=${encodeURIComponent(snus.name)}`;

  return (
    <ScrollView style={infoStyles.scroll} contentContainerStyle={infoStyles.content} showsVerticalScrollIndicator={false}>
      {/* Image */}
      <View style={infoStyles.imgWrap}>
        <Image
          source={{ uri: GITHUB_BASE + snus.image }}
          style={infoStyles.img}
          contentFit="contain"
          transition={300}
        />
      </View>

      {/* ID + Name */}
      <Text style={infoStyles.id}>{formattedId}</Text>
      <Text style={infoStyles.name}>{snus.name}</Text>

      {/* Badges */}
      <View style={infoStyles.badges}>
        <View style={infoStyles.nicBadge}>
          <Text style={infoStyles.nicText}>{snus.nicotine || '??'} MG/G</Text>
        </View>
        <View style={[infoStyles.rarityBadge, { borderColor: rarityColor + '50', backgroundColor: rarityColor + '1A' }]}>
          <Text style={[infoStyles.rarityText, { color: rarityColor }]}>{snus.rarity || 'Common'}</Text>
        </View>
      </View>

      {/* Collection status / actions */}
      {isUnlocked ? (
        <View style={infoStyles.collectedGroup}>
          <View style={infoStyles.collectedRow}>
            <View style={infoStyles.collectedInfo}>
              <Text style={infoStyles.collectedLabel}>Gesammelt</Text>
              <Text style={infoStyles.collectedDate}>{collectedDate}</Text>
            </View>
            <View style={infoStyles.collectedInfo}>
              <Text style={infoStyles.collectedLabel}>Geöffnet</Text>
              <Text style={infoStyles.collectedDate}>{openedCount}x</Text>
            </View>
          </View>
          <View style={infoStyles.btnRow}>
            <TouchableOpacity style={infoStyles.btnSecondary} onPress={onViewRating} activeOpacity={0.8}>
              <Text style={infoStyles.btnSecondaryText}>Bewertung</Text>
            </TouchableOpacity>
            <TouchableOpacity style={infoStyles.btnSecondary} onPress={onEditRating} activeOpacity={0.8}>
              <Text style={infoStyles.btnSecondaryText}>Bearbeiten</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={infoStyles.btnPrimary} onPress={onStartCan} disabled={startingCan} activeOpacity={0.85}>
            {startingCan ? <ActivityIndicator color="#000" size="small" /> : <Text style={infoStyles.btnPrimaryText}>Neue Dose öffnen</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={infoStyles.uncollectedGroup}>
          {fromScan ? (
            <TouchableOpacity style={infoStyles.btnPrimary} onPress={onCollect} activeOpacity={0.85}>
              <Text style={infoStyles.btnPrimaryText}>Sammeln & Bewerten</Text>
            </TouchableOpacity>
          ) : (
            <View style={infoStyles.btnRow}>
              <TouchableOpacity style={infoStyles.btnPrimary} onPress={onCollect} activeOpacity={0.85}>
                <Text style={infoStyles.btnPrimaryText}>Sammeln</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={infoStyles.orderBtn} onPress={() => Linking.openURL(affiliateUrl)} activeOpacity={0.8}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={IOS.gray} strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </Svg>
            <Text style={infoStyles.orderText}>Jetzt bestellen</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const infoStyles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 20 },
  imgWrap: { width: '100%', height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  img: { width: 180, height: 180 },
  id: { fontSize: 13, color: IOS.gray, fontWeight: '500', textAlign: 'center', marginBottom: 4 },
  name: { fontSize: 26, fontWeight: '700', color: '#fff', textAlign: 'center', letterSpacing: -0.5, marginBottom: 12 },
  badges: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  nicBadge: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 20 },
  nicText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  rarityBadge: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderRadius: 20 },
  rarityText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  collectedGroup: { gap: 12 },
  collectedRow: { flexDirection: 'row', gap: 12 },
  collectedInfo: { flex: 1, backgroundColor: IOS.card2, borderRadius: 16, padding: 16, alignItems: 'center' },
  collectedLabel: { fontSize: 12, color: IOS.gray, marginBottom: 4 },
  collectedDate: { fontSize: 16, fontWeight: '700', color: '#fff' },

  uncollectedGroup: { gap: 12 },

  btnRow: { flexDirection: 'row', gap: 10 },
  btnPrimary: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { fontSize: 17, fontWeight: '600', color: '#000' },
  btnSecondary: { flex: 1, backgroundColor: IOS.card2, borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  btnSecondaryText: { fontSize: 16, fontWeight: '500', color: '#fff' },
  orderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  orderText: { fontSize: 15, color: IOS.gray, fontWeight: '500' },
});

// ─── Rating Wizard View ──────────────────────────────────────
type RatingWizardProps = {
  stepIndex: number;
  ratings: Record<string, number>;
  texts: Record<string, string>;
  onSetRating: (cat: RatingStep, val: number) => void;
  onSetText: (cat: RatingStep, text: string) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
  saving: boolean;
};

const STEP_LABELS: Record<string, string> = {
  visuals: 'Visuals',
  smell: 'Smell',
  taste: 'Taste',
  bite: 'Bite',
  drip: 'Drip',
  strength: 'Strength',
};

function RatingWizardView({ stepIndex, ratings, texts, onSetRating, onSetText, onNext, onBack, onCancel, saving }: RatingWizardProps) {
  const currentStep = RATING_STEPS[stepIndex] as RatingStep;
  const isLast = stepIndex === RATING_STEPS.length - 1;

  return (
    <View style={wizStyles.root}>
      {/* Header */}
      <View style={wizStyles.header}>
        <TouchableOpacity onPress={stepIndex === 0 ? onCancel : onBack} style={wizStyles.headerBtn} activeOpacity={0.75}>
          <Text style={wizStyles.headerBtnText}>{stepIndex === 0 ? 'Abbrechen' : 'Zurück'}</Text>
        </TouchableOpacity>
        <Text style={wizStyles.stepIndicator}>{stepIndex + 1}/{RATING_STEPS.length}</Text>
        <TouchableOpacity onPress={onNext} style={[wizStyles.nextBtn, isLast && wizStyles.nextBtnSave]} disabled={saving} activeOpacity={0.85}>
          {saving ? (
            <ActivityIndicator color={isLast ? '#fff' : '#000'} size="small" />
          ) : (
            <>
              <Text style={[wizStyles.nextBtnText, isLast && wizStyles.nextBtnTextSave]}>{isLast ? 'Speichern' : 'Weiter'}</Text>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={isLast ? '#fff' : '#000'} strokeWidth={2.5}>
                {isLast
                  ? <Path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  : <Path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                }
              </Svg>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Step title */}
      <Text style={wizStyles.stepTitle}>{STEP_LABELS[currentStep]}</Text>
      <Text style={wizStyles.valLabel}>{ratings[currentStep] || 5}/10</Text>

      {/* Pill slider */}
      <View style={wizStyles.pillWrap}>
        <RatingPill
          value={ratings[currentStep] || 5}
          onChange={v => onSetRating(currentStep, v)}
        />
      </View>

      {/* Text note */}
      <TextInput
        style={wizStyles.textInput}
        placeholder={`Notiz zu ${STEP_LABELS[currentStep]}... (optional)`}
        placeholderTextColor={IOS.gray}
        value={texts[currentStep] || ''}
        onChangeText={t => onSetText(currentStep, t)}
        multiline
        numberOfLines={3}
        returnKeyType="done"
      />
    </View>
  );
}

const wizStyles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  headerBtn: { paddingVertical: 8 },
  headerBtnText: { fontSize: 17, color: IOS.gray },
  stepIndicator: { fontSize: 15, color: IOS.gray, fontWeight: '600' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24 },
  nextBtnSave: { backgroundColor: IOS.green },
  nextBtnText: { fontSize: 16, fontWeight: '600', color: '#000' },
  nextBtnTextSave: { color: '#fff' },
  stepTitle: { fontSize: 32, fontWeight: '700', color: '#fff', letterSpacing: -0.5, marginBottom: 4 },
  valLabel: { fontSize: 17, color: IOS.gray, marginBottom: 20 },
  pillWrap: { marginBottom: 20 },
  textInput: {
    backgroundColor: IOS.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 90,
    textAlignVertical: 'top',
  },
});

// ─── Saved Rating View ───────────────────────────────────────
function SavedRatingView({ ratings, onEdit }: { ratings: any; onEdit: () => void }) {
  const bars = [
    { label: 'Visuals', val: ratings.visuals, text: ratings.visuals_text },
    { label: 'Smell', val: ratings.smell, text: ratings.smell_text },
    { label: 'Taste', val: ratings.taste, text: ratings.taste_text },
    { label: 'Bite', val: ratings.bite, text: ratings.bite_text },
    { label: 'Drip', val: ratings.drip, text: ratings.drip_text },
    { label: 'Strength', val: ratings.strength, text: ratings.strength_text },
  ];

  return (
    <ScrollView style={savedStyles.scroll} contentContainerStyle={savedStyles.content} showsVerticalScrollIndicator={false}>
      <View style={savedStyles.header}>
        <Text style={savedStyles.title}>Bewertung</Text>
        <TouchableOpacity style={savedStyles.editBtn} onPress={onEdit} activeOpacity={0.8}>
          <Text style={savedStyles.editBtnText}>Bearbeiten</Text>
        </TouchableOpacity>
      </View>

      {bars.map(({ label, val, text }) => (
        <View key={label} style={savedStyles.barItem}>
          <View style={savedStyles.barHeader}>
            <Text style={savedStyles.barLabel}>{label}</Text>
            <Text style={savedStyles.barVal}>{val}/10</Text>
          </View>
          <View style={savedStyles.barBg}>
            <View style={[savedStyles.barFill, { width: `${(val || 5) * 10}%` as any }]} />
          </View>
          {text && text.trim() ? (
            <View style={savedStyles.quoteWrap}>
              <Text style={savedStyles.quoteText}>"{text}"</Text>
            </View>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const savedStyles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  editBtn: { backgroundColor: IOS.card2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  editBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  barItem: { marginBottom: 20 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLabel: { fontSize: 13, color: IOS.gray },
  barVal: { fontSize: 13, color: '#fff', fontWeight: '600' },
  barBg: { height: 6, backgroundColor: '#000', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  barFill: { height: '100%', backgroundColor: '#fff', borderRadius: 3 },
  quoteWrap: { backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12 },
  quoteText: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontStyle: 'italic', lineHeight: 20 },
});

// ─── Main Component ──────────────────────────────────────────
type Props = {
  onRefreshDex: () => void;
  onRefreshUsage: () => void;
};

export default function SnusDetailModal({ onRefreshDex, onRefreshUsage }: Props) {
  const insets = useSafeAreaInsets();
  const {
    snusDetailId,
    snusDetailFromScan,
    globalSnusData,
    globalUserCollection,
    globalAllLogs,
    userId,
    closeSnusDetail,
    addToCollection,
    updateCollectionEntry,
    setUsageLogs,
    ratingMode,
    setRatingMode,
    ratingStepIndex,
    setRatingStep,
    tempRatings,
    setRatingValue,
    setRatingText,
    resetTempRatings,
  } = useStore();

  const [saving, setSaving] = useState(false);
  const [startingCan, setStartingCan] = useState(false);

  const snus = snusDetailId != null ? globalSnusData.find(s => s.id === snusDetailId) : null;
  const entry = snusDetailId != null ? globalUserCollection[snusDetailId] : null;
  const isUnlocked = !!entry;

  const snusLogs = snusDetailId != null ? globalAllLogs.filter(l => l.snus_id === snusDetailId) : [];
  const openedCount = snusLogs.length;
  const collectedDate = (() => {
    if (!entry) return '';
    if (snusLogs.length > 0) {
      const earliest = snusLogs.reduce((prev, curr) => new Date(prev.opened_at) < new Date(curr.opened_at) ? prev : curr);
      return new Date(earliest.opened_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
    return new Date(entry.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
  })();

  const translateY = useRef(new Animated.Value(0)).current;

  const handleClose = useCallback(() => {
    triggerHaptic();
    Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 350, useNativeDriver: true }).start(() => {
      closeSnusDetail();
      resetTempRatings();
    });
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8,
      onPanResponderMove: (_, gs) => { if (gs.dy > 0) translateY.setValue(gs.dy); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 120) {
          handleClose();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const handleCollect = useCallback(() => {
    triggerHaptic();
    resetTempRatings();
    setRatingMode('rating');
    setRatingStep(0);
  }, []);

  const handleEditRating = useCallback(() => {
    if (!entry) return;
    triggerHaptic();
    const r = entry.ratings;
    RATING_STEPS.forEach(cat => {
      setRatingValue(cat, r[cat] || 5);
      setRatingText(cat, r[`${cat}_text` as keyof typeof r] as string || '');
    });
    setRatingStep(0);
    setRatingMode('rating');
  }, [entry]);

  const handleViewRating = useCallback(() => {
    triggerHaptic();
    setRatingMode('saved');
  }, []);

  const handleSave = async () => {
    if (!userId || !snusDetailId) return;
    setSaving(true);
    const isUpdate = isUnlocked;
    const payload = {
      rating_taste: tempRatings.taste,
      rating_taste_text: tempRatings.taste_text,
      rating_smell: tempRatings.smell,
      rating_smell_text: tempRatings.smell_text,
      rating_bite: tempRatings.bite,
      rating_bite_text: tempRatings.bite_text,
      rating_drip: tempRatings.drip,
      rating_drip_text: tempRatings.drip_text,
      rating_visuals: tempRatings.visuals,
      rating_visuals_text: tempRatings.visuals_text,
      rating_strength: tempRatings.strength,
      rating_strength_text: tempRatings.strength_text,
    };

    let savedDate = new Date().toISOString();

    if (isUpdate) {
      const { error } = await supabase.from('user_collections')
        .update(payload)
        .eq('user_id', userId)
        .eq('snus_id', snusDetailId);
      if (error) { setSaving(false); return; }
      savedDate = entry!.date;
      updateCollectionEntry(snusDetailId, { date: savedDate, ratings: { taste: tempRatings.taste, taste_text: tempRatings.taste_text, smell: tempRatings.smell, smell_text: tempRatings.smell_text, bite: tempRatings.bite, bite_text: tempRatings.bite_text, drip: tempRatings.drip, drip_text: tempRatings.drip_text, visuals: tempRatings.visuals, visuals_text: tempRatings.visuals_text, strength: tempRatings.strength, strength_text: tempRatings.strength_text } });
    } else {
      const { data, error } = await supabase.from('user_collections')
        .insert([{ user_id: userId, snus_id: snusDetailId, ...payload }])
        .select().single();
      if (error) { setSaving(false); return; }
      if (data?.collected_at) savedDate = data.collected_at;
      addToCollection(snusDetailId, { date: savedDate, ratings: { taste: tempRatings.taste, taste_text: tempRatings.taste_text, smell: tempRatings.smell, smell_text: tempRatings.smell_text, bite: tempRatings.bite, bite_text: tempRatings.bite_text, drip: tempRatings.drip, drip_text: tempRatings.drip_text, visuals: tempRatings.visuals, visuals_text: tempRatings.visuals_text, strength: tempRatings.strength, strength_text: tempRatings.strength_text } });

      // Start can automatically after collecting
      const snusItem = globalSnusData.find(s => s.id === snusDetailId);
      await supabase.from('usage_logs').insert([{ user_id: userId, snus_id: snusDetailId, mg_per_gram: snusItem?.nicotine || 0, is_active: true }]);

      // Evaluate badges
      await evaluateBadgesAfterCollect(userId);
    }

    setSaving(false);
    onRefreshDex();
    await onRefreshUsage();
    handleClose();
  };

  const evaluateBadgesAfterCollect = async (uid: string) => {
    const { globalBadges, globalUserBadges, globalBadgeProgress, addUserBadge, showBadgeUnlock } = useStore.getState();
    const xpMap: Record<number, number> = { 1: 250, 2: 400, 3: 600, 4: 800, 5: 1000, 6: 1200, 7: 1400, 8: 1600, 9: 1800, 10: 2000 };
    for (const badge of globalBadges) {
      if (!globalUserBadges.has(badge.id) && badge.category === 'collector' && globalBadgeProgress >= badge.required_count) {
        const { error } = await supabase.from('user_badges').insert([{ user_id: uid, badge_id: badge.id }]);
        if (!error) {
          const xpGained = xpMap[badge.level] || 100;
          await supabase.rpc('increment_badge_xp', { uid, xp_amount: xpGained });
          addUserBadge(badge.id);
          showBadgeUnlock(badge, xpGained);
        }
      }
    }
  };

  const handleStartCan = async () => {
    if (!userId || !snusDetailId) return;
    setStartingCan(true);
    triggerHaptic();
    const snusItem = globalSnusData.find(s => s.id === snusDetailId);
    await supabase.from('usage_logs').insert([{ user_id: userId, snus_id: snusDetailId, mg_per_gram: snusItem?.nicotine || 0, is_active: true }]);
    await onRefreshUsage();
    setStartingCan(false);
    handleClose();
  };

  const handleNextStep = () => {
    triggerHaptic();
    if (ratingStepIndex < RATING_STEPS.length - 1) {
      setRatingStep(ratingStepIndex + 1);
    } else {
      handleSave();
    }
  };

  const handlePrevStep = () => {
    triggerHaptic();
    if (ratingStepIndex > 0) setRatingStep(ratingStepIndex - 1);
  };

  if (!snus) return null;

  const ratingTexts: Record<string, string> = {
    visuals: tempRatings.visuals_text,
    smell: tempRatings.smell_text,
    taste: tempRatings.taste_text,
    bite: tempRatings.bite_text,
    drip: tempRatings.drip_text,
    strength: tempRatings.strength_text,
  };

  const ratingVals: Record<string, number> = {
    visuals: tempRatings.visuals,
    smell: tempRatings.smell,
    taste: tempRatings.taste,
    bite: tempRatings.bite,
    drip: tempRatings.drip,
    strength: tempRatings.strength,
  };

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* Drag handle */}
        <View style={styles.dragArea} {...panResponder.panHandlers}>
          <View style={styles.handle} />
        </View>

        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.75}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={IOS.gray} strokeWidth={2.5}>
            <Path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </Svg>
        </TouchableOpacity>

        {/* Views */}
        {ratingMode === 'info' && (
          <InfoView
            snus={snus}
            isUnlocked={isUnlocked}
            fromScan={snusDetailFromScan}
            openedCount={openedCount}
            collectedDate={collectedDate}
            onCollect={handleCollect}
            onEditRating={handleEditRating}
            onViewRating={handleViewRating}
            onStartCan={handleStartCan}
            startingCan={startingCan}
          />
        )}

        {ratingMode === 'rating' && (
          <RatingWizardView
            stepIndex={ratingStepIndex}
            ratings={ratingVals}
            texts={ratingTexts}
            onSetRating={setRatingValue}
            onSetText={setRatingText}
            onNext={handleNextStep}
            onBack={handlePrevStep}
            onCancel={() => { triggerHaptic(); setRatingMode('info'); }}
            saving={saving}
          />
        )}

        {ratingMode === 'saved' && entry && (
          <SavedRatingView
            ratings={entry.ratings}
            onEdit={handleEditRating}
          />
        )}

        <View style={{ height: insets.bottom + 16 }} />
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
    overflow: 'hidden',
  },
  dragArea: { paddingTop: 8, paddingBottom: 4, alignItems: 'center' },
  handle: { width: 36, height: 5, backgroundColor: IOS.gray3, borderRadius: 3 },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
