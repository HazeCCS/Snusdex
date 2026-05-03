import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, PanResponder, Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle } from 'react-native-svg';
import { useStore } from '@/store/store';
import { IOS } from '@/lib/constants';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

const CAMERA_MODES = [
  { label: 'Normal', zoom: 0 },
  { label: 'Wide', zoom: 0 },
  { label: 'Tele', zoom: 0.5 },
];

export default function ScanModal() {
  const { closeScanModal, globalSnusData, openSnusDetail } = useStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [flashOn, setFlashOn] = useState(false);
  const [cameraModeIdx, setCameraModeIdx] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const translateY = useRef(new Animated.Value(0)).current;
  const isDragging = useRef(false);
  const startY = useRef(0);

  const handleClose = useCallback(() => {
    triggerHaptic();
    Animated.timing(translateY, { toValue: SCREEN_H, duration: 350, useNativeDriver: true }).start(closeScanModal);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderGrant: () => { isDragging.current = true; translateY.setValue(0); },
      onPanResponderMove: (_, gs) => { if (gs.dy > 0) translateY.setValue(gs.dy); },
      onPanResponderRelease: (_, gs) => {
        isDragging.current = false;
        if (gs.dy > 100) {
          handleClose();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const handleBarcode = useCallback(({ data }: { data: string }) => {
    if (isProcessing) return;
    setIsProcessing(true);
    triggerHaptic();
    const foundSnus = globalSnusData.find(s => String(s.barcode) === data);
    closeScanModal();
    setTimeout(() => {
      if (foundSnus) {
        openSnusDetail(foundSnus.id, true);
      }
    }, 400);
  }, [isProcessing, globalSnusData]);

  const toggleFlash = () => {
    triggerHaptic();
    setFlashOn(v => !v);
  };

  const cycleCamera = () => {
    triggerHaptic();
    setCameraModeIdx(i => (i + 1) % CAMERA_MODES.length);
  };

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.dragHandle} {...panResponder.panHandlers}>
          <View style={styles.handle} />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Scan</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.75}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={IOS.gray} strokeWidth={2.5}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </Svg>
          </TouchableOpacity>
        </View>

        <View style={styles.cameraWrap}>
          {!permission?.granted ? (
            <View style={styles.permWrap}>
              <Text style={styles.permText}>Kamera-Zugriff benötigt</Text>
              <TouchableOpacity style={styles.permBtn} onPress={requestPermission} activeOpacity={0.8}>
                <Text style={styles.permBtnText}>Erlauben</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={styles.camera}
              facing="back"
              enableTorch={flashOn}
              zoom={CAMERA_MODES[cameraModeIdx].zoom}
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
              onBarcodeScanned={isProcessing ? undefined : handleBarcode}
            />
          )}

          <View style={styles.scanOverlay}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.scanHint}>Barcode in den Rahmen halten</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlBtn, flashOn && styles.controlBtnActive]}
            onPress={toggleFlash}
            activeOpacity={0.75}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={flashOn ? '#000' : '#fff'} strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </Svg>
            <Text style={[styles.controlLabel, flashOn && styles.controlLabelActive]}>
              {flashOn ? 'An' : 'Licht'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlBtn} onPress={cycleCamera} activeOpacity={0.75}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <Circle cx="12" cy="13" r="3" />
            </Svg>
            <Text style={styles.controlLabel}>{CAMERA_MODES[cameraModeIdx].label}</Text>
          </TouchableOpacity>
        </View>
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
    height: SCREEN_H * 0.88,
    backgroundColor: '#000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  dragHandle: { paddingTop: 8, paddingBottom: 4, alignItems: 'center' },
  handle: { width: 36, height: 5, backgroundColor: IOS.gray3, borderRadius: 3 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  cameraWrap: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
  },
  camera: { flex: 1 },

  permWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  permText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  permBtn: { backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  permBtnText: { color: '#000', fontSize: 16, fontWeight: '600' },

  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  scanFrame: {
    width: SCREEN_W * 0.65,
    height: SCREEN_W * 0.4,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#fff',
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  scanHint: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 16 },

  controls: { flexDirection: 'row', justifyContent: 'center', gap: 32, paddingVertical: 24, paddingBottom: 36 },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: 72,
    height: 72,
    backgroundColor: IOS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  controlBtnActive: { backgroundColor: '#fff' },
  controlLabel: { fontSize: 12, color: '#fff', fontWeight: '500' },
  controlLabelActive: { color: '#000' },
});
