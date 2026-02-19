/**
 * TinyBrainPlay — app/(tabs)/index.tsx
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  TERMINAL ME YEH COMMANDS CHALAO (EK BAAR):
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *  npx expo install expo-av
 *  npx expo install @react-native-async-storage/async-storage
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  FREE NON-COPYRIGHTED SOUND FILES (Mixkit):
 *  Download karo aur /assets/sounds/ mein rakho:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *  correct.mp3   → https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3
 *  wrong.mp3     → https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3
 *  levelup.mp3   → https://assets.mixkit.co/active_storage/sfx/1997/1997-preview.mp3
 *  pop.mp3       → https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3
 *  flip.mp3      → https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3
 *  click.mp3     → https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3
 *  daily.mp3     → https://assets.mixkit.co/active_storage/sfx/1989/1989-preview.mp3
 *
 *  mkdir -p assets/sounds
 *  curl -L "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3" -o assets/sounds/correct.mp3
 *  curl -L "https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3" -o assets/sounds/wrong.mp3
 *  curl -L "https://assets.mixkit.co/active_storage/sfx/1997/1997-preview.mp3" -o assets/sounds/levelup.mp3
 *  curl -L "https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3" -o assets/sounds/pop.mp3
 *  curl -L "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3" -o assets/sounds/flip.mp3
 *  curl -L "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3" -o assets/sounds/click.mp3
 *  curl -L "https://assets.mixkit.co/active_storage/sfx/1989/1989-preview.mp3" -o assets/sounds/daily.mp3
 */

import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Animated, Dimensions, StatusBar, SafeAreaView, Modal,
  Platform, Alert,
} from "react-native";
import { Audio } from "expo-av";

// ─── AsyncStorage (graceful fallback) ────────────────────────
let AS: any = null;
try { AS = require("@react-native-async-storage/async-storage").default; } catch (_) {}
const store = async (k: string, v: any) => { try { await AS?.setItem(k, JSON.stringify(v)); } catch (_) {} };
const load  = async (k: string, fallback: any) => {
  try { const r = await AS?.getItem(k); return r ? JSON.parse(r) : fallback; } catch (_) { return fallback; }
};

// ══════════════════════════════════════════════════════════════
//  SOUND SYSTEM  🔊  — FIX: game khatam hote hi hard stop
// ══════════════════════════════════════════════════════════════
type SoundKey = "correct" | "wrong" | "levelup" | "pop" | "flip" | "click" | "daily";

const SOUND_ASSETS = {
  correct: require("../../assets/sounds/correct.mp3"),
  wrong:   require("../../assets/sounds/wrong.mp3"),
  levelup: require("../../assets/sounds/levelup.mp3"),
  pop:     require("../../assets/sounds/pop.mp3"),
  flip:    require("../../assets/sounds/flip.mp3"),
  click:   require("../../assets/sounds/click.mp3"),
  daily:   require("../../assets/sounds/daily.mp3"),
};

let soundEnabled = true;
let soundCache: Partial<Record<SoundKey, Audio.Sound>> = {};

// ✅ KEY FIX: yeh flag true hote hi playSound() kuch nahi bajata
// Game khatam → flag on → koi bhi pending setTimeout ka playSound() block ho jata hai
let gameSoundBlocked = false;

async function preloadSounds() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
    for (const key of Object.keys(SOUND_ASSETS) as SoundKey[]) {
      const { sound } = await Audio.Sound.createAsync(SOUND_ASSETS[key], { shouldPlay: false });
      soundCache[key] = sound;
    }
  } catch (e) {
    console.log("Sound preload failed (expo-av not installed?)", e);
  }
}

// Normal game sounds — flag se block hoti hain
async function playSound(type: SoundKey) {
  if (!soundEnabled || gameSoundBlocked) return;
  try {
    const sound = soundCache[type];
    if (sound) {
      await sound.stopAsync().catch(() => {});
      await sound.setPositionAsync(0);
      await sound.playAsync();
    }
  } catch (_) {}
}

// Result/UI sounds — flag ignore karte hain (daily reward, result screen ke liye)
async function playSoundForce(type: SoundKey) {
  if (!soundEnabled) return;
  try {
    const sound = soundCache[type];
    if (sound) {
      await sound.stopAsync().catch(() => {});
      await sound.setPositionAsync(0);
      await sound.playAsync();
    }
  } catch (_) {}
}

// ✅ MAIN FIX:
// gameSoundBlocked = true SYNCHRONOUSLY (await se pehle) — is se koi race condition nahi
// Phir Promise.all se saari sounds ek saath hard stop
function stopAllSounds() {
  gameSoundBlocked = true;   // SYNC — turant, koi await nahi
  // Saari sounds ek saath stop karo — fire and forget (await nahi karte)
  Object.values(soundCache).forEach((s) => {
    try {
      s?.stopAsync().catch(() => {});
    } catch (_) {}
  });
}

// Game shuru hone par flag reset karo
function resetSoundBlock() {
  gameSoundBlocked = false;
}

async function unloadSounds() {
  for (const s of Object.values(soundCache)) {
    try { await s?.unloadAsync(); } catch (_) {}
  }
  soundCache = {};
}

// ══════════════════════════════════════════════════════════════
//  CONSTANTS & THEME
// ══════════════════════════════════════════════════════════════
const { width: SW, height: SH } = Dimensions.get("window");
const PER_LEVEL = 5;

const T = {
  bg:      "#FFF9F0",
  card:    "#FFFFFF",
  primary: "#FF6B35",
  teal:    "#4ECDC4",
  purple:  "#A855F7",
  green:   "#22C55E",
  gold:    "#F59E0B",
  text:    "#1A1A2E",
  muted:   "#6B7280",
  dark:    "#111827",
  exit:    "#EF4444", // Red for exit button
};

// ══════════════════════════════════════════════════════════════
//  UTILITY
// ══════════════════════════════════════════════════════════════
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function today() { return new Date().toISOString().split("T")[0]; }

// ══════════════════════════════════════════════════════════════
//  PROGRESS / REWARD STORE
// ══════════════════════════════════════════════════════════════
interface Progress {
  coins: number; xp: number; streak: number;
  lastDate: string; claimedToday: boolean;
  bestScores: Record<string, number>;
  badges: string[];
  soundOn: boolean;
  collections: Record<string, string[]>;  // gameId → collected emoji[]
}
const DEFAULT_PROGRESS: Progress = {
  coins: 0, xp: 0, streak: 0, lastDate: "",
  claimedToday: false, bestScores: {}, badges: [], soundOn: true,
  collections: {},
};

async function loadProgress(): Promise<Progress> {
  const p = await load("tbp_progress", DEFAULT_PROGRESS);
  // ✅ Ensure collections field hamesha exist kare (old saved data ke liye)
  return { ...DEFAULT_PROGRESS, ...p, collections: p.collections ?? {} };
}
async function saveProgress(p: Progress)          { await store("tbp_progress", p); }

function addCollection(p: Progress, gameId: string, emoji: string): Progress {
  // ✅ FIX: purane saved data mein collections undefined ho sakta hai
  const safeCollections = p.collections ?? {};
  const existing = safeCollections[gameId] ?? [];
  if (existing.includes(emoji)) return p;
  return { ...p, collections: { ...safeCollections, [gameId]: [...existing, emoji] } };
}

function addReward(p: Progress, coins: number, xp: number, gameId: string, pct: number): Progress {
  const updated = { ...p, coins: p.coins + coins, xp: p.xp + xp };
  if (pct > (updated.bestScores[gameId] ?? 0))
    updated.bestScores = { ...updated.bestScores, [gameId]: pct };
  const badges = [...updated.badges];
  if (pct === 100 && !badges.includes(`perfect_${gameId}`)) badges.push(`perfect_${gameId}`);
  if (updated.xp >= 100  && !badges.includes("xp100"))   badges.push("xp100");
  if (updated.xp >= 500  && !badges.includes("xp500"))   badges.push("xp500");
  if (updated.coins >= 50 && !badges.includes("coins50")) badges.push("coins50");
  if (updated.streak >= 3 && !badges.includes("streak3")) badges.push("streak3");
  if (updated.streak >= 7 && !badges.includes("streak7")) badges.push("streak7");
  return { ...updated, badges };
}

const DAILY_REWARDS = [10, 15, 20, 25, 30, 40, 50];
const BADGE_META: Record<string, { icon: string; name: string }> = {
  perfect_sound:  { icon: "🎵", name: "Sound Master"  },
  perfect_color:  { icon: "🎨", name: "Color Expert"  },
  perfect_memory: { icon: "🧠", name: "Memory Genius" },
  perfect_feed:   { icon: "🍎", name: "Animal Chef"   },
  xp100:          { icon: "⚡", name: "XP Champ"      },
  xp500:          { icon: "🚀", name: "XP Legend"     },
  coins50:        { icon: "💰", name: "Rich Kid"       },
  streak3:        { icon: "🔥", name: "3-Day Streak"  },
  streak7:        { icon: "🌟", name: "7-Day Streak"  },
};

// ══════════════════════════════════════════════════════════════
//  ANIMATED PRESS BUTTON
// ══════════════════════════════════════════════════════════════
function PressBtn({ onPress, style, children, disabled = false }: {
  onPress: () => void; style?: any; children: React.ReactNode; disabled?: boolean;
}) {
  const sc = useRef(new Animated.Value(1)).current;
  const handlePress = () => { playSound("click"); onPress(); };
  return (
    <TouchableOpacity activeOpacity={1} disabled={disabled}
      onPressIn={() => Animated.spring(sc, { toValue: .91, useNativeDriver: true, speed: 40 }).start()}
      onPressOut={() => Animated.spring(sc, { toValue: 1,   useNativeDriver: true, speed: 30 }).start()}
      onPress={handlePress}>
      <Animated.View style={[style, { transform: [{ scale: sc }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
}

// ══════════════════════════════════════════════════════════════
//  EXIT BUTTON COMPONENT
// ══════════════════════════════════════════════════════════════
function ExitButton({ onExit, color = T.exit }: { onExit: () => void; color?: string }) {
  const sc = useRef(new Animated.Value(1)).current;
  
  const handleExit = () => {
    playSound("click");
    // Optional: Add confirmation dialog
    Alert.alert(
      "Exit Game",
      "Are you sure you want to exit? Your progress will be saved.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Exit", onPress: onExit, style: "destructive" }
      ]
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={() => Animated.spring(sc, { toValue: 0.85, useNativeDriver: true, speed: 40 }).start()}
      onPressOut={() => Animated.spring(sc, { toValue: 1, useNativeDriver: true, speed: 30 }).start()}
      onPress={handleExit}
      style={styles.exitButtonContainer}
    >
      <Animated.View style={[styles.exitButton, { backgroundColor: color, transform: [{ scale: sc }] }]}>
        <Text style={styles.exitButtonText}>✕</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ══════════════════════════════════════════════════════════════
//  CONFETTI
// ══════════════════════════════════════════════════════════════
const CC = ["#FF6B35", "#4ECDC4", "#FFE66D", "#A855F7", "#22C55E", "#EC4899"];
function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    id: i, color: CC[i % CC.length], left: Math.random() * SW,
    anim: new Animated.Value(0), rot: new Animated.Value(0), delay: Math.random() * 600,
    size: 8 + Math.random() * 6,
  })), []);
  useEffect(() => {
    pieces.forEach(p => Animated.parallel([
      Animated.timing(p.anim, { toValue: 1, duration: 1800, delay: p.delay, useNativeDriver: true }),
      Animated.timing(p.rot,  { toValue: 1, duration: 1800, delay: p.delay, useNativeDriver: true }),
    ]).start());
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map(p => (
        <Animated.View key={p.id} style={{
          position: "absolute", left: p.left, top: -20,
          width: p.size, height: p.size,
          borderRadius: p.id % 3 === 0 ? p.size / 2 : 2,
          backgroundColor: p.color,
          opacity: p.anim.interpolate({ inputRange: [0, .8, 1], outputRange: [1, 1, 0] }),
          transform: [
            { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, SH + 40] }) },
            { rotate: p.rot.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "720deg"] }) },
          ],
        }} />
      ))}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
//  FLOATING COIN BURST
// ══════════════════════════════════════════════════════════════
function CoinBurst({ amount }: { amount: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.delay(300),
      Animated.timing(anim, { toValue: 2, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{
      position: "absolute", alignSelf: "center", top: 0, zIndex: 99,
      opacity: anim.interpolate({ inputRange: [0, .3, 1, 1.5, 2], outputRange: [0, 1, 1, 1, 0] }),
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, -65, -95] }) }],
    }}>
      <Text style={{ fontSize: 24, fontWeight: "900", color: T.gold }}>+{amount} 🪙</Text>
    </Animated.View>
  );
}

// ══════════════════════════════════════════════════════════════
//  DAILY REWARD MODAL  🎁
// ══════════════════════════════════════════════════════════════
function DailyRewardModal({ streak, coins, onClaim }: {
  streak: number; coins: number; onClaim: () => void;
}) {
  const sc = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.spring(sc, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
    playSound("daily");
  }, []);
  const dayRewards = DAILY_REWARDS.slice(0, 7);
  return (
    <Modal transparent animationType="fade">
      <View style={dm.overlay}>
        <Confetti />
        <Animated.View style={[dm.box, { transform: [{ scale: sc }] }]}>
          <Text style={dm.title}>🎁 Daily Reward!</Text>
          <Text style={dm.sub}>Day {streak} Streak 🔥</Text>
          <View style={dm.dayRow}>
            {dayRewards.map((c, i) => {
              const day = i + 1;
              const done   = day < streak;
              const active = day === streak;
              return (
                <View key={day} style={[dm.dayBox,
                  done   ? { backgroundColor: "#D1FAE5", borderColor: "#22C55E" } :
                  active ? { backgroundColor: T.gold + "22", borderColor: T.gold, borderWidth: 2.5 } :
                           { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" }]}>
                  <Text style={{ fontSize: 14 }}>{done ? "✅" : active ? "🎁" : "🔒"}</Text>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: active ? T.gold : T.muted }}>{c}🪙</Text>
                </View>
              );
            })}
          </View>
          <Text style={dm.coinBig}>+{coins} 🪙</Text>
          <PressBtn onPress={onClaim} style={dm.claimBtn}>
            <Text style={dm.claimTxt}>Claim Reward! 🎉</Text>
          </PressBtn>
        </Animated.View>
      </View>
    </Modal>
  );
}
const dm = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: "#0009", alignItems: "center", justifyContent: "center", padding: 24 },
  box:      { backgroundColor: "#fff", borderRadius: 28, padding: 24, width: "100%", maxWidth: 360, alignItems: "center",
              shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 20, elevation: 12 },
  title:    { fontSize: 28, fontWeight: "900", color: T.text, marginBottom: 4 },
  sub:      { fontSize: 16, fontWeight: "700", color: T.muted, marginBottom: 16 },
  dayRow:   { flexDirection: "row", gap: 6, marginBottom: 20, flexWrap: "wrap", justifyContent: "center" },
  dayBox:   { width: 40, height: 52, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center", gap: 2 },
  coinBig:  { fontSize: 38, fontWeight: "900", color: T.gold, marginBottom: 20 },
  claimBtn: { backgroundColor: T.gold, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 40,
              shadowColor: T.gold, shadowOpacity: 0.4, shadowRadius: 10, elevation: 4 },
  claimTxt: { color: "#fff", fontSize: 18, fontWeight: "900" },
});

// ══════════════════════════════════════════════════════════════
//  REWARD RESULT SCREEN  ✅ FIX: Perfectly Centered
// ══════════════════════════════════════════════════════════════
function RewardResultScreen({ score, total, coinsEarned, xpEarned, color, newBadge, onRestart, onHome }: {
  score: number; total: number; coinsEarned: number; xpEarned: number; color: string;
  newBadge: string | null; onRestart: () => void; onHome: () => void;
}) {
  const pct   = Math.round((score / total) * 100);
  const stars = pct >= 80 ? "⭐⭐⭐" : pct >= 50 ? "⭐⭐" : "⭐";
  const msg   = pct >= 80 ? "Amazing! 🎉" : pct >= 50 ? "Good Job! 👍" : "Keep Trying! 💪";
  const sc    = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.spring(sc, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }).start();
    // ✅ FIX: Delay hatao — turant bajao taaki "Let's Go!" press se overlap na ho
    // playSoundForce use karo — gameSoundBlocked ignore karta hai (result screen ke liye)
    if (pct >= 80) playSoundForce("levelup"); else playSoundForce("correct");
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      {pct >= 80 && <Confetti />}

      {/* FIX: flex:1 + justifyContent center → sab kuch screen ke bilkul beech */}
      <View style={rr.outerWrap}>

        {/* ── TROPHY CARD ── */}
        <Animated.View style={[rr.trophyCard, { transform: [{ scale: sc }] }]}>
          <Text style={rr.trophy}>🏆</Text>
          <Text style={[rr.msgText, { color }]}>{msg}</Text>
          <Text style={rr.starsText}>{stars}</Text>

          {/* Score Pill */}
          <View style={[rr.scorePill, { borderColor: color, backgroundColor: color + "12" }]}>
            <Text style={[rr.scoreNum, { color }]}>{score}</Text>
            <Text style={[rr.scoreDivide, { color: color + "88" }]}>/</Text>
            <Text style={[rr.scoreTotal, { color: color + "88" }]}>{total}</Text>
          </View>
          <Text style={rr.pctText}>{pct}% Correct</Text>
        </Animated.View>

        {/* ── REWARD BOX ── */}
        <View style={rr.rewardBox}>
          <CoinBurst amount={coinsEarned} />
          <Text style={rr.rewardTitle}>🎁 REWARDS EARNED</Text>
          <View style={rr.rewardRow}>
            <View style={rr.chip}><Text style={rr.chipTxt}>+{coinsEarned} 🪙 Coins</Text></View>
            <View style={rr.chip}><Text style={rr.chipTxt}>+{xpEarned} ⚡ XP</Text></View>
          </View>
          {newBadge && (
            <View style={rr.badgeRow}>
              <Text style={{ fontSize: 28 }}>{BADGE_META[newBadge]?.icon}</Text>
              <View>
                <Text style={{ fontSize: 11, color: T.muted, fontWeight: "700" }}>🎊 NEW BADGE UNLOCKED!</Text>
                <Text style={{ fontSize: 16, fontWeight: "900", color: T.text }}>{BADGE_META[newBadge]?.name}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── BUTTONS ── */}
        <View style={rr.btnGroup}>
          <PressBtn onPress={onRestart} style={[styles.bigBtn, { backgroundColor: color }]}>
            <Text style={styles.bigBtnTxt}>Play Again 🔄</Text>
          </PressBtn>
          <PressBtn onPress={onHome} style={[styles.bigBtn, { backgroundColor: T.muted }]}>
            <Text style={styles.bigBtnTxt}>Home 🏠</Text>
          </PressBtn>
        </View>

      </View>
    </SafeAreaView>
  );
}

const rr = StyleSheet.create({
  // FIX: flex:1, justifyContent:"center" → poora content vertically centered
  outerWrap:  {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
  },
  trophyCard: {
    alignItems: "center",
    backgroundColor: T.card,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 28,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
    gap: 6,
  },
  trophy:     { fontSize: 72, textAlign: "center" },
  msgText:    { fontSize: 28, fontWeight: "900", textAlign: "center" },
  starsText:  { fontSize: 34, letterSpacing: 4, marginVertical: 2 },
  scorePill:  {
    flexDirection: "row", alignItems: "baseline", gap: 4,
    borderRadius: 20, borderWidth: 2,
    paddingHorizontal: 24, paddingVertical: 10, marginTop: 6,
  },
  scoreNum:   { fontSize: 52, fontWeight: "900", lineHeight: 60 },
  scoreDivide:{ fontSize: 26, fontWeight: "700" },
  scoreTotal: { fontSize: 30, fontWeight: "700" },
  pctText:    { fontSize: 14, fontWeight: "700", color: T.muted, letterSpacing: 0.5 },
  rewardBox:  {
    backgroundColor: "#fff", borderRadius: 20, padding: 18, width: "100%",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    position: "relative",
  },
  rewardTitle:{ fontSize: 13, fontWeight: "800", color: T.muted, textAlign: "center",
                marginBottom: 12, letterSpacing: 1 },
  rewardRow:  { flexDirection: "row", gap: 10, justifyContent: "center" },
  chip:       { backgroundColor: T.gold + "22", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
                borderWidth: 1.5, borderColor: T.gold },
  chipTxt:    { fontSize: 15, fontWeight: "800", color: "#92400E" },
  badgeRow:   { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14,
                backgroundColor: "#FFF9F0", borderRadius: 14, padding: 12,
                borderWidth: 1.5, borderColor: T.gold },
  btnGroup:   { width: "100%", gap: 12 },
});

// ══════════════════════════════════════════════════════════════
//  LEVEL UP SCREEN  🎊  ✅ FIX: Centered
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
//  COLLECTIBLE DATA — har game ke alag items
// ══════════════════════════════════════════════════════════════
const COLLECT_META: Record<string, { items: { emoji: string; name: string }[]; label: string; color: string }> = {
  sound:  {
    label: "Animal Friend",
    color: "#FF6B35",
    items: [
      { emoji: "🐶", name: "Dog"      }, { emoji: "🐱", name: "Cat"      },
      { emoji: "🐮", name: "Cow"      }, { emoji: "🦆", name: "Duck"     },
      { emoji: "🐷", name: "Pig"      }, { emoji: "🐑", name: "Sheep"    },
      { emoji: "🐴", name: "Horse"    }, { emoji: "🐸", name: "Frog"     },
      { emoji: "🦁", name: "Lion"     }, { emoji: "🐍", name: "Snake"    },
      { emoji: "🐘", name: "Elephant" }, { emoji: "🐒", name: "Monkey"   },
      { emoji: "🦉", name: "Owl"      }, { emoji: "🐻", name: "Bear"     },
      { emoji: "🦊", name: "Fox"      },
    ],
  },
  color:  {
    label: "Color Gem",
    color: "#4ECDC4",
    items: [
      { emoji: "🔴", name: "Ruby"     }, { emoji: "🔵", name: "Sapphire" },
      { emoji: "🟡", name: "Topaz"    }, { emoji: "🟢", name: "Emerald"  },
      { emoji: "🟠", name: "Amber"    }, { emoji: "🟣", name: "Amethyst" },
      { emoji: "🩷", name: "Rose"     }, { emoji: "🩵", name: "Aqua"     },
      { emoji: "🤎", name: "Bronze"   }, { emoji: "🩶", name: "Silver"   },
      { emoji: "🍏", name: "Lime"     }, { emoji: "💙", name: "Indigo"   },
      { emoji: "🩦", name: "Cyan"     }, { emoji: "🌟", name: "Gold"     },
      { emoji: "🌹", name: "Crimson"  },
    ],
  },
  memory: {
    label: "Safari Animal",
    color: "#A855F7",
    items: [
      { emoji: "🦁", name: "Lion"     }, { emoji: "🐘", name: "Elephant" },
      { emoji: "🦒", name: "Giraffe"  }, { emoji: "🦓", name: "Zebra"    },
      { emoji: "🐆", name: "Cheetah"  }, { emoji: "🦏", name: "Rhino"    },
      { emoji: "🦛", name: "Hippo"    }, { emoji: "🐊", name: "Croc"     },
      { emoji: "🦊", name: "Fox"      }, { emoji: "🐺", name: "Wolf"     },
      { emoji: "🦝", name: "Raccoon"  }, { emoji: "🐻", name: "Bear"     },
      { emoji: "🦜", name: "Parrot"   }, { emoji: "🦋", name: "Butterfly"},
      { emoji: "🐬", name: "Dolphin"  },
    ],
  },
  feed:   {
    label: "Happy Pet",
    color: "#22C55E",
    items: [
      { emoji: "🐰", name: "Rabbit"   }, { emoji: "🐱", name: "Cat"      },
      { emoji: "🐶", name: "Dog"      }, { emoji: "🐘", name: "Elephant" },
      { emoji: "🐼", name: "Panda"    }, { emoji: "🐧", name: "Penguin"  },
      { emoji: "🦁", name: "Lion"     }, { emoji: "🐄", name: "Cow"      },
      { emoji: "🐻", name: "Bear"     }, { emoji: "🦊", name: "Fox"      },
      { emoji: "🐦", name: "Bird"     }, { emoji: "🐢", name: "Turtle"   },
      { emoji: "🦒", name: "Giraffe"  }, { emoji: "🐨", name: "Koala"    },
      { emoji: "🦓", name: "Zebra"    },
    ],
  },
};

// ══════════════════════════════════════════════════════════════
//  COLLECTIBLE POPUP — level complete ke baad naya item mila!
// ══════════════════════════════════════════════════════════════
function CollectiblePopup({ gameId, levelIdx, collected, onDone }: {
  gameId: string; levelIdx: number; collected: string[]; onDone: () => void;
}) {
  const meta     = COLLECT_META[gameId];
  const newItem  = meta?.items[levelIdx];            // is level ka naya item
  const sc       = useRef(new Animated.Value(0)).current;
  const bounceSc = useRef(new Animated.Value(0.5)).current;
  const sparkle  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Background fade in
    Animated.timing(sc, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    // Emoji bounce in
    Animated.sequence([
      Animated.delay(150),
      Animated.spring(bounceSc, { toValue: 1.2, friction: 3, tension: 120, useNativeDriver: true }),
      Animated.spring(bounceSc, { toValue: 1,   friction: 5, useNativeDriver: true }),
    ]).start();
    // Sparkle pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkle, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(sparkle, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    ).start();
    playSoundForce("pop");
  }, []);

  if (!newItem || !meta) return null;

  // Already collected items (excluding new one)
  const prevCollected = collected.filter(e => e !== newItem.emoji);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Dark overlay */}
      <Animated.View style={[StyleSheet.absoluteFill,
        { backgroundColor: "#0008", opacity: sc }]} />

      {/* Popup card */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Animated.View style={[cp.card, { transform: [{ scale: bounceSc }] }]}>

          {/* Header */}
          <View style={[cp.header, { backgroundColor: meta.color }]}>
            <Text style={cp.headerTxt}>🎁 NEW {meta.label.toUpperCase()} UNLOCKED!</Text>
          </View>

          {/* New item — big sparkly display */}
          <View style={cp.newItemWrap}>
            <Animated.Text style={[cp.newEmoji, {
              transform: [{ scale: sparkle.interpolate({ inputRange:[0,1], outputRange:[1,1.12] }) }]
            }]}>
              {newItem.emoji}
            </Animated.Text>
            <Text style={[cp.newName, { color: meta.color }]}>{newItem.name}</Text>
            <View style={[cp.newBadge, { backgroundColor: meta.color + "20", borderColor: meta.color }]}>
              <Text style={[cp.newBadgeTxt, { color: meta.color }]}>#{levelIdx + 1} Collected!</Text>
            </View>
          </View>

          {/* Collection progress */}
          <View style={cp.collectionSection}>
            <Text style={cp.collLabel}>YOUR COLLECTION ({levelIdx + 1}/{meta.items.length})</Text>
            <View style={cp.collGrid}>
              {meta.items.map((item, i) => {
                const isNew  = i === levelIdx;
                const isHave = i < levelIdx;
                return (
                  <View key={i} style={[cp.collSlot,
                    isNew  ? { backgroundColor: meta.color + "25", borderColor: meta.color, borderWidth: 2 } :
                    isHave ? { backgroundColor: "#F0FDF4", borderColor: "#86EFAC" } :
                             { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" }
                  ]}>
                    <Text style={{ fontSize: 18, opacity: isHave || isNew ? 1 : 0.2 }}>
                      {isHave || isNew ? item.emoji : "❓"}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Continue button */}
          <PressBtn onPress={onDone}
            style={[cp.btn, { backgroundColor: meta.color }]}>
            <Text style={cp.btnTxt}>Let's Go! 🚀</Text>
          </PressBtn>

        </Animated.View>
      </View>
      <Confetti />
    </View>
  );
}

const cp = StyleSheet.create({
  card:            { backgroundColor: "#fff", borderRadius: 28, width: "100%", overflow: "hidden",
                     shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 24, elevation: 16 },
  header:          { paddingVertical: 14, alignItems: "center" },
  headerTxt:       { fontSize: 13, fontWeight: "900", color: "#fff", letterSpacing: 1 },
  newItemWrap:     { alignItems: "center", paddingVertical: 24, gap: 8 },
  newEmoji:        { fontSize: 90, lineHeight: 104 },
  newName:         { fontSize: 28, fontWeight: "900" },
  newBadge:        { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1.5, marginTop: 4 },
  newBadgeTxt:     { fontSize: 13, fontWeight: "800" },
  collectionSection:{ paddingHorizontal: 18, paddingBottom: 10 },
  collLabel:       { fontSize: 11, fontWeight: "800", color: "#6B7280", letterSpacing: 1, marginBottom: 10, textAlign: "center" },
  collGrid:        { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  collSlot:        { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5,
                     alignItems: "center", justifyContent: "center" },
  btn:             { margin: 18, borderRadius: 16, paddingVertical: 16, alignItems: "center",
                     shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  btnTxt:          { color: "#fff", fontSize: 18, fontWeight: "900" },
});

function LevelUpScreen({ nextLevel, color, onContinue }: {
  nextLevel: number; color: string; onContinue: () => void;
}) {
  const sc = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.spring(sc, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }).start();
    playSound("levelup");
    // ✅ FIX: "Let's Go!" dabane ke baad screen unmount hoti hai
    // cleanup mein sound TURANT stop — next level start hone par koi awaaz nahi
    return () => {
      const s = soundCache["levelup" as SoundKey];
      if (s) { s.stopAsync().catch(() => {}); }
    };
  }, []);
  return (
    // FIX: flex:1 + alignItems/justifyContent center
    <View style={{ flex: 1, backgroundColor: "#1A1A2E", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Confetti />
      <Animated.View style={{ alignItems: "center", width: "100%", transform: [{ scale: sc }] }}>
        <Text style={{ fontSize: 80 }}>🎊</Text>
        <Text style={{ fontSize: 32, fontWeight: "900", color: "#FFD700", marginTop: 14, textAlign: "center" }}>
          Level Complete!
        </Text>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 8, textAlign: "center" }}>
          ⭐⭐⭐ Well Done!
        </Text>
        <Text style={{ fontSize: 17, color: "#aaa", marginTop: 8, textAlign: "center" }}>
          Get ready for Level {nextLevel}!
        </Text>
        <PressBtn onPress={onContinue}
          style={[styles.bigBtn, { backgroundColor: color, marginTop: 36, paddingHorizontal: 48, width: "80%" }]}>
          <Text style={styles.bigBtnTxt}>Let's Go! 🚀</Text>
        </PressBtn>
      </Animated.View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
//  GAME HEADER WITH EXIT BUTTON - UPDATED
// ══════════════════════════════════════════════════════════════
function GameHeader({ score, total, qInLevel, level, maxLevel, color, onBack, onExit }: {
  score: number; total: number; qInLevel: number; level: number;
  maxLevel: number; color: string; onBack: () => void; onExit?: () => void;
}) {
  const barW = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barW, { toValue: qInLevel / PER_LEVEL, duration: 380, useNativeDriver: false }).start();
  }, [qInLevel]);
  
  return (
    <View style={gh.wrap}>
      <TouchableOpacity onPress={() => { playSound("click"); onBack(); }} style={gh.back}>
        <Text style={gh.backTxt}>←</Text>
      </TouchableOpacity>
      <View style={gh.center}>
        <View style={gh.barTrack}>
          <Animated.View style={[gh.barFill, { backgroundColor: color,
            width: barW.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
        </View>
        <Text style={gh.levelTxt}>Level {level}/{maxLevel}  ·  Q{qInLevel + 1}/{PER_LEVEL}</Text>
      </View>
      <View style={[gh.scorePill, { borderColor: color }]}>
        <Text style={[gh.scoreTxt, { color }]}>⭐{score}</Text>
      </View>
      {onExit && <ExitButton onExit={onExit} color={T.exit} />}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
//  FEEDBACK PULSE
// ══════════════════════════════════════════════════════════════
function FeedbackPulse({ correct, text }: { correct: boolean; text: string }) {
  const sc  = useRef(new Animated.Value(0.5)).current;
  const tx  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (correct) {
      Animated.spring(sc, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }).start();
    } else {
      Animated.sequence([
        Animated.spring(sc, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
        Animated.timing(tx, { toValue: 8,  duration: 50, useNativeDriver: true }),
        Animated.timing(tx, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(tx, { toValue: 6,  duration: 50, useNativeDriver: true }),
        Animated.timing(tx, { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(tx, { toValue: 0,  duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, []);
  return (
    <Animated.Text style={[styles.feedback,
      { color: correct ? "#16A34A" : "#DC2626", transform: [{ scale: sc }, { translateX: tx }] }]}>
      {text}
    </Animated.Text>
  );
}

// ══════════════════════════════════════════════════════════════
//  DATA
// ══════════════════════════════════════════════════════════════
const SOUND_DATA = [
  { name: "Dog",      emoji: "🐶", sound: "Woof!"      },
  { name: "Cat",      emoji: "🐱", sound: "Meow!"      },
  { name: "Cow",      emoji: "🐮", sound: "Moo!"       },
  { name: "Duck",     emoji: "🦆", sound: "Quack!"     },
  { name: "Pig",      emoji: "🐷", sound: "Oink!"      },
  { name: "Sheep",    emoji: "🐑", sound: "Baa!"       },
  { name: "Horse",    emoji: "🐴", sound: "Neigh!"     },
  { name: "Frog",     emoji: "🐸", sound: "Ribbit!"    },
  { name: "Lion",     emoji: "🦁", sound: "Roar!"      },
  { name: "Snake",    emoji: "🐍", sound: "Hiss!"      },
  { name: "Elephant", emoji: "🐘", sound: "Trumpet!"   },
  { name: "Monkey",   emoji: "🐒", sound: "Ooh Ooh!"  },
  { name: "Owl",      emoji: "🦉", sound: "Hoo Hoo!"  },
  { name: "Bear",     emoji: "🐻", sound: "Growl!"     },
  { name: "Fox",      emoji: "🦊", sound: "Yip!"       },
];
const ALL_SOUNDS = SOUND_DATA.map(a => a.sound);

const COLOR_DATA = [
  { name: "Red",    hex: "#EF4444" }, { name: "Blue",   hex: "#3B82F6" },
  { name: "Yellow", hex: "#EAB308" }, { name: "Green",  hex: "#22C55E" },
  { name: "Orange", hex: "#F97316" }, { name: "Purple", hex: "#A855F7" },
  { name: "Pink",   hex: "#EC4899" }, { name: "Teal",   hex: "#14B8A6" },
  { name: "Brown",  hex: "#92400E" }, { name: "Gray",   hex: "#6B7280" },
  { name: "Lime",   hex: "#84CC16" }, { name: "Indigo", hex: "#6366F1" },
  { name: "Cyan",   hex: "#06B6D4" }, { name: "Amber",  hex: "#F59E0B" },
  { name: "Rose",   hex: "#F43F5E" },
];

const SAFARI_POOL = ["🦁","🐘","🦒","🦓","🐆","🦏","🦛","🐊","🦊","🐺","🦝","🐻","🦜","🦋","🐬","🦈","🐙","🦩"];
const MEM_LEVELS  = [4, 6, 8];

const FEED_DATA = [
  { animal: "🐰", name: "Rabbit",   food: "🥕", label: "Carrot",      wrong: ["🍖","🐟","🍕"] },
  { animal: "🐱", name: "Cat",      food: "🐟", label: "Fish",        wrong: ["🥕","🌿","🍌"] },
  { animal: "🐶", name: "Dog",      food: "🦴", label: "Bone",        wrong: ["🥕","🌿","🍎"] },
  { animal: "🐘", name: "Elephant", food: "🍌", label: "Banana",      wrong: ["🐟","🦴","🥩"] },
  { animal: "🐼", name: "Panda",    food: "🎋", label: "Bamboo",      wrong: ["🥩","🐟","🦴"] },
  { animal: "🐧", name: "Penguin",  food: "🐟", label: "Fish",        wrong: ["🥕","🌿","🍎"] },
  { animal: "🦁", name: "Lion",     food: "🥩", label: "Meat",        wrong: ["🥕","🎋","🍌"] },
  { animal: "🐄", name: "Cow",      food: "🌿", label: "Grass",       wrong: ["🐟","🦴","🥩"] },
  { animal: "🐻", name: "Bear",     food: "🍎", label: "Apple",       wrong: ["🦴","🐟","🌿"] },
  { animal: "🦊", name: "Fox",      food: "🍇", label: "Grapes",      wrong: ["🦴","🐟","🌿"] },
  { animal: "🐦", name: "Bird",     food: "🌾", label: "Seeds",       wrong: ["🥩","🦴","🎋"] },
  { animal: "🐢", name: "Turtle",   food: "🥬", label: "Lettuce",     wrong: ["🦴","🐟","🥩"] },
  { animal: "🦒", name: "Giraffe",  food: "🍃", label: "Leaves",      wrong: ["🥩","🐟","🦴"] },
  { animal: "🐨", name: "Koala",    food: "🌿", label: "Eucalyptus",  wrong: ["🥩","🐟","🥕"] },
  { animal: "🦓", name: "Zebra",    food: "🌾", label: "Grass",       wrong: ["🥩","🦴","🐟"] },
];

// ══════════════════════════════════════════════════════════════
//  GAME FINISH HOOK  ✅ FIX: stopAllSounds pehle, phir state update
// ══════════════════════════════════════════════════════════════
function useGameFinish(gameId: string, color: string, onHome: () => void) {
  const [resultData, setResultData] = useState<{
    score: number; total: number; coins: number; xp: number; badge: string | null;
  } | null>(null);

  const finish = useCallback(async (score: number, total: number) => {
    // gameSoundBlocked = true TURANT — koi bhi pending setTimeout ka playSound block
    stopAllSounds();
    const prog  = await loadProgress();
    const pct   = Math.round((score / total) * 100);
    const coins = pct >= 80 ? 15 : pct >= 50 ? 8 : 3;
    const xp    = pct >= 80 ? 20 : pct >= 50 ? 10 : 4;
    const prev  = [...prog.badges];
    const updated = addReward(prog, coins, xp, gameId, pct);
    await saveProgress(updated);
    const newBadge = updated.badges.find(b => !prev.includes(b)) ?? null;
    setResultData({ score, total, coins, xp, badge: newBadge });
  }, [gameId]);

  const resultScreen = resultData ? (
    <RewardResultScreen
      score={resultData.score} total={resultData.total}
      coinsEarned={resultData.coins} xpEarned={resultData.xp}
      newBadge={resultData.badge} color={color}
      onRestart={() => { resetSoundBlock(); setResultData(null); }}
      onHome={onHome}
    />
  ) : null;

  return { finish, resultScreen, isDone: !!resultData };
}

// ══════════════════════════════════════════════════════════════
//  GAME 1 — ANIMAL SOUND HERO 🎵  ✅ FIX: Centered layout with exit button
// ══════════════════════════════════════════════════════════════
function AnimalSoundGame({ onHome }: { onHome: () => void }) {
  const { finish, resultScreen, isDone } = useGameFinish("sound", T.primary, onHome);
  const [queue]  = useState(() => shuffle(SOUND_DATA));
  const [idx, setIdx]       = useState(0);
  const [score, setScore]   = useState(0);
  const [sel, setSel]       = useState<string | null>(null);
  const [showCollect, setShowCollect] = useState(false);
  const [collectLvl, setCollectLvl]   = useState(0);
  const [myCollection, setMyCollection] = useState<string[]>([]);
  const emojiSc = useRef(new Animated.Value(1)).current;

  const level  = Math.floor(idx / PER_LEVEL) + 1;
  const maxLvl = Math.ceil(queue.length / PER_LEVEL);
  const q      = queue[idx];
  const opts   = useMemo(() => shuffle([q.sound, ...shuffle(ALL_SOUNDS.filter(s => s !== q.sound)).slice(0, 3)]), [idx]);

  useEffect(() => {
    loadProgress().then(p => setMyCollection(p.collections["sound"] ?? []));
  }, []);

  const wiggleBig = () => Animated.sequence([
    Animated.spring(emojiSc, { toValue: 1.3, useNativeDriver: true, speed: 40 }),
    Animated.spring(emojiSc, { toValue: 1,   useNativeDriver: true, speed: 25 }),
  ]).start();

  const answer = (opt: string) => {
    if (sel) return;
    const correct = opt === q.sound;
    setSel(opt);
    if (correct) { setScore(s => s + 1); wiggleBig(); playSound("correct"); }
    else { playSound("wrong"); }
    setTimeout(() => {
      setSel(null);
      const next = idx + 1;
      if (next >= queue.length) { finish(score + (correct ? 1 : 0), queue.length); return; }
      if (next % PER_LEVEL === 0) {
        // Level complete — show collectible popup
        const lvlIdx = Math.floor(next / PER_LEVEL) - 1;
        const newEmoji = COLLECT_META["sound"].items[lvlIdx]?.emoji;
        if (newEmoji) {
          loadProgress().then(async p => {
            const updated = addCollection(p, "sound", newEmoji);
            await saveProgress(updated);
            setMyCollection(updated.collections["sound"] ?? []);
          });
        }
        setCollectLvl(lvlIdx);
        setShowCollect(true);
        return;
      }
      setIdx(next);
    }, 1000);
  };

  if (isDone) return resultScreen;
  if (showCollect) return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <CollectiblePopup
        gameId="sound"
        levelIdx={collectLvl}
        collected={myCollection}
        onDone={() => { resetSoundBlock(); setShowCollect(false); setIdx(idx + 1); }}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <GameHeader 
          score={score} 
          total={queue.length} 
          qInLevel={idx % PER_LEVEL}
          level={level} 
          maxLevel={maxLvl} 
          color={T.primary} 
          onBack={onHome}
          onExit={onHome}
        />
      </View>

      {/* FIX: flex:1 + justifyContent:"center" → options screen ke beech mein */}
      <View style={gs.centerWrap}>
        <Animated.Text style={{ fontSize: Math.min(SW * 0.26, 104),
          textAlign: "center", transform: [{ scale: emojiSc }], marginBottom: 20 }}>
          {q.emoji}
        </Animated.Text>

        <View style={{ alignItems: "center", gap: 6, marginBottom: 20 }}>
          <Text style={styles.question}>
            What sound does the{"\n"}
            <Text style={{ color: T.primary, fontWeight: "900" }}>{q.name}</Text> make?
          </Text>
          {sel && <FeedbackPulse correct={sel === q.sound}
            text={sel === q.sound ? "🎉 Correct!" : `❌ It says "${q.sound}"`} />}
        </View>

        <View style={styles.grid2}>
          {opts.map(opt => {
            let bg = T.card, bc = "#E5E7EB";
            if (sel === opt)         { bg = opt === q.sound ? "#BBF7D0" : "#FECACA"; bc = opt === q.sound ? "#16A34A" : "#DC2626"; }
            else if (sel && opt === q.sound) { bg = "#DCFCE7"; bc = "#16A34A"; }
            return (
              <PressBtn key={opt} disabled={!!sel} onPress={() => answer(opt)}
                style={[styles.optBtn, { backgroundColor: bg, borderColor: bc, width: (SW - 48) / 2 }]}>
                <Text style={styles.optTxt}>{opt}</Text>
              </PressBtn>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
//  GAME 2 — COLOR BALLOON POP 🎈  ✅ FIX: Centered layout with exit button
// ══════════════════════════════════════════════════════════════
function ColorBalloonGame({ onHome }: { onHome: () => void }) {
  const { finish, resultScreen, isDone } = useGameFinish("color", T.teal, onHome);
  const [queue]  = useState(() => shuffle(COLOR_DATA));
  const [idx, setIdx]     = useState(0);
  const [score, setScore] = useState(0);
  const [sel, setSel]     = useState<string | null>(null);
  const [popped, setPopped] = useState<string | null>(null);
  const [showCollect, setShowCollect] = useState(false);
  const [collectLvl, setCollectLvl]   = useState(0);
  const [myCollection, setMyCollection] = useState<string[]>([]);

  const level  = Math.floor(idx / PER_LEVEL) + 1;
  const maxLvl = Math.ceil(queue.length / PER_LEVEL);
  const target = queue[idx];
  const opts   = useMemo(() => shuffle([target, ...shuffle(COLOR_DATA.filter(c => c.name !== target.name)).slice(0, 3)]), [idx]);
  const anims  = useMemo(() => opts.map(() => new Animated.Value(1)), [idx]);

  useEffect(() => {
    loadProgress().then(p => setMyCollection(p.collections["color"] ?? []));
  }, []);

  const pick = (c: { name: string; hex: string }, i: number) => {
    if (sel) return;
    const ok = c.name === target.name;
    setSel(c.name);
    if (ok) {
      setPopped(c.name); setScore(s => s + 1); playSound("pop");
      Animated.sequence([
        Animated.spring(anims[i], { toValue: 1.55, friction: 3, useNativeDriver: true }),
        Animated.timing(anims[i], { toValue: 0, duration: 140, useNativeDriver: true }),
      ]).start();
    } else {
      playSound("wrong");
      Animated.sequence([
        Animated.spring(anims[i], { toValue: 0.72, friction: 5, useNativeDriver: true }),
        Animated.spring(anims[i], { toValue: 1,    friction: 5, useNativeDriver: true }),
      ]).start();
    }
    setTimeout(() => {
      setSel(null); setPopped(null); anims.forEach(a => a.setValue(1));
      const next = idx + 1;
      if (next >= queue.length) { finish(score + (ok ? 1 : 0), queue.length); return; }
      if (next % PER_LEVEL === 0) {
        const lvlIdx = Math.floor(next / PER_LEVEL) - 1;
        const newEmoji = COLLECT_META["color"].items[lvlIdx]?.emoji;
        if (newEmoji) {
          loadProgress().then(async p => {
            const updated = addCollection(p, "color", newEmoji);
            await saveProgress(updated);
            setMyCollection(updated.collections["color"] ?? []);
          });
        }
        setCollectLvl(lvlIdx); setShowCollect(true); return;
      }
      setIdx(next);
    }, 1000);
  };

  if (isDone) return resultScreen;
  if (showCollect) return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <CollectiblePopup
        gameId="color"
        levelIdx={collectLvl}
        collected={myCollection}
        onDone={() => { resetSoundBlock(); setShowCollect(false); setIdx(idx + 1); }}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <GameHeader 
          score={score} 
          total={queue.length} 
          qInLevel={idx % PER_LEVEL}
          level={level} 
          maxLevel={maxLvl} 
          color={T.teal} 
          onBack={onHome}
          onExit={onHome}
        />
      </View>

      <View style={gs.centerWrap}>
        {/* Target color */}
        <View style={{ alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Text style={[styles.question, { fontSize: 20 }]}>
            🎈 Pop the{" "}
            <Text style={{ color: target.hex, fontWeight: "900" }}>{target.name}</Text> balloon!
          </Text>
          <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: target.hex,
            borderWidth: 4, borderColor: "#fff",
            shadowColor: target.hex, shadowOpacity: 0.65, shadowRadius: 14, elevation: 8 }} />
        </View>

        {/* Balloons 2×2 */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 28, marginBottom: 20 }}>
          {opts.map((c, i) => {
            const isPopped = popped === c.name;
            const isDim    = !!sel && c.name !== target.name && !isPopped;
            return (
              <TouchableOpacity key={c.name} onPress={() => pick(c, i)} disabled={!!sel}
                style={{ alignItems: "center", opacity: isDim ? 0.38 : 1 }}>
                <Animated.Text style={{ fontSize: Math.min(SW * 0.17, 70), transform: [{ scale: anims[i] }] }}>
                  {isPopped ? "💥" : "🎈"}
                </Animated.Text>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.hex,
                  marginTop: -14, borderWidth: 4, borderColor: "#fff",
                  shadowColor: c.hex, shadowOpacity: 0.5, shadowRadius: 8, elevation: 4 }} />
                <Text style={{ fontSize: 13, fontWeight: "700", color: T.text, marginTop: 6 }}>{c.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {sel && !popped && (
          <FeedbackPulse correct={false} text={`❌ That is not ${target.name}!`} />
        )}
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
//  GAME 3 — MEMORY MATCH SAFARI 🧠 with exit button
// ══════════════════════════════════════════════════════════════
type MemCard = { id: number; emoji: string; flipped: boolean; matched: boolean };
function makeDeck(n: number): MemCard[] {
  const a = shuffle(SAFARI_POOL).slice(0, n);
  return shuffle([...a, ...a].map((emoji, id) => ({ id, emoji, flipped: false, matched: false })));
}

function MemoryMatchGame({ onHome }: { onHome: () => void }) {
  const [level, setLevel]       = useState(0);
  const [cards, setCards]       = useState<MemCard[]>(() => makeDeck(MEM_LEVELS[0]));
  const [open, setOpen]         = useState<number[]>([]);
  const [moves, setMoves]       = useState(0);
  const [locked, setLocked]     = useState(false);
  const [matchCount, setMC]     = useState(0);
  const [totalScore, setTS]     = useState(0);
  const [lvlUp, setLvlUp]       = useState(false);
  const [showCollect, setShowCollect] = useState(false);
  const [collectLvl, setCollectLvl]   = useState(0);
  const [myCollection, setMyCollection] = useState<string[]>([]);
  const { finish, resultScreen, isDone } = useGameFinish("memory", T.purple, onHome);
  const cardAnims = useRef<Animated.Value[]>([]).current;

  const pairs = MEM_LEVELS[level];

  useEffect(() => {
    cardAnims.length = 0;
    cards.forEach(() => cardAnims.push(new Animated.Value(0)));
  }, [level]);

  useEffect(() => {
    loadProgress().then(p => setMyCollection(p.collections["memory"] ?? []));
  }, []);

  const flip = useCallback((id: number) => {
    if (locked) return;
    playSound("flip");
    setCards(prev => {
      const card = prev.find(c => c.id === id);
      if (!card || card.flipped || card.matched) return prev;
      const next = prev.map(c => c.id === id ? { ...c, flipped: true } : c);
      setOpen(op => {
        const nw = [...op, id];
        if (nw.length === 2) {
          setLocked(true); setMoves(m => m + 1);
          const [a, b] = nw.map(fid => next.find(c => c.id === fid)!);
          if (a.emoji === b.emoji) {
            playSound("correct");
            setTimeout(() => {
              setCards(p => {
                const u = p.map(c => nw.includes(c.id) ? { ...c, matched: true } : c);
                const mc = u.filter(c => c.matched).length / 2;
                setMC(mc); setTS(s => s + 1);
                if (mc === pairs) {
                  setTimeout(() => {
                    if (level + 1 < MEM_LEVELS.length) doCollect(level);
                    else finish(totalScore + 1, MEM_LEVELS.reduce((a, b) => a + b, 0));
                  }, 380);
                }
                return u;
              });
              setOpen([]); setLocked(false);
            }, 450);
          } else {
            setTimeout(() => {
              setCards(p => p.map(c => nw.includes(c.id) ? { ...c, flipped: false } : c));
              setOpen([]); setLocked(false);
            }, 750);
          }
        }
        return nw;
      });
      return next;
    });
  }, [locked, pairs, level, totalScore]);

  const nextLevel = () => {
    resetSoundBlock();
    const nl = level + 1; setLevel(nl);
    setCards(makeDeck(MEM_LEVELS[nl]));
    setOpen([]); setMoves(0); setLocked(false); setMC(0); setLvlUp(false);
    setShowCollect(false);
  };

  const doCollect = (currentLevel: number) => {
    const newEmoji = COLLECT_META["memory"].items[currentLevel]?.emoji;
    if (newEmoji) {
      loadProgress().then(async p => {
        const updated = addCollection(p, "memory", newEmoji);
        await saveProgress(updated);
        setMyCollection(updated.collections["memory"] ?? []);
      });
    }
    setCollectLvl(currentLevel);
    setShowCollect(true);
  };

  if (isDone) return resultScreen;
  if (showCollect) return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <CollectiblePopup
        gameId="memory"
        levelIdx={collectLvl}
        collected={myCollection}
        onDone={nextLevel}
      />
    </View>
  );

  const cols   = 4;
  const gap    = 8;
  const cardSz = (SW - 32 - (cols - 1) * gap) / cols;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <View style={gh.wrap}>
          <TouchableOpacity onPress={() => { playSound("click"); onHome(); }} style={gh.back}>
            <Text style={gh.backTxt}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 14, fontWeight: "900", color: T.purple }}>
              {["Easy 🐾", "Medium 🌿", "Hard 🔥"][level]}  ·  {matchCount}/{pairs} matched
            </Text>
          </View>
          <View style={[gh.scorePill, { borderColor: T.purple }]}>
            <Text style={[gh.scoreTxt, { color: T.purple }]}>Moves:{moves}</Text>
          </View>
          <ExitButton onExit={onHome} color={T.exit} />
        </View>
      </View>

      {/* FIX: center kiya */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap, justifyContent: "center" }}>
          {cards.map(c => {
            const revealed = c.flipped || c.matched;
            return (
              <TouchableOpacity key={c.id} onPress={() => flip(c.id)}
                disabled={locked || c.matched || c.flipped}>
                <Animated.View style={[styles.memCard, {
                  width: cardSz, height: cardSz,
                  backgroundColor: c.matched ? "#DCFCE7" : c.flipped ? "#F3E8FF" : "#F1F5F9",
                  borderColor: c.matched ? "#22C55E" : c.flipped ? T.purple : "#CBD5E1",
                  transform: [{ scale: revealed ? 1.05 : 1 }],
                }]}>
                  <Text style={{ fontSize: cardSz * 0.44 }}>{revealed ? c.emoji : "❓"}</Text>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={{ color: T.muted, fontWeight: "700", fontSize: 13, marginTop: 16, textAlign: "center" }}>
          Flip two cards to find matching animals!
        </Text>
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
//  GAME 4 — FEED THE ANIMAL 🍎  ✅ FIX: Centered layout with exit button
// ══════════════════════════════════════════════════════════════
function FeedAnimalGame({ onHome }: { onHome: () => void }) {
  const { finish, resultScreen, isDone } = useGameFinish("feed", T.green, onHome);
  const [queue]  = useState(() => shuffle(FEED_DATA));
  const [idx, setIdx]       = useState(0);
  const [score, setScore]   = useState(0);
  const [sel, setSel]       = useState<string | null>(null);
  const [flying, setFlying] = useState(false);
  const [showCollect, setShowCollect] = useState(false);
  const [collectLvl, setCollectLvl]   = useState(0);
  const [myCollection, setMyCollection] = useState<string[]>([]);

  const flyY  = useRef(new Animated.Value(0)).current;
  const flyX  = useRef(new Animated.Value(0)).current;
  const flyOp = useRef(new Animated.Value(0)).current;
  const anSc  = useRef(new Animated.Value(1)).current;

  const level  = Math.floor(idx / PER_LEVEL) + 1;
  const maxLvl = Math.ceil(queue.length / PER_LEVEL);
  const q      = queue[idx];
  const opts   = useMemo(() => shuffle([q.food, ...q.wrong]), [idx]);

  useEffect(() => {
    loadProgress().then(p => setMyCollection(p.collections["feed"] ?? []));
  }, []);

  const answer = (opt: string) => {
    if (sel) return;
    const ok = opt === q.food;
    setSel(opt);
    if (ok) {
      setScore(s => s + 1); setFlying(true); playSound("correct");
      flyY.setValue(0); flyX.setValue(0); flyOp.setValue(1);
      Animated.parallel([
        Animated.timing(flyY,  { toValue: -110, duration: 950, useNativeDriver: true }),
        Animated.timing(flyX,  { toValue: Math.random() > 0.5 ? 20 : -20, duration: 950, useNativeDriver: true }),
        Animated.timing(flyOp, { toValue: 0,    duration: 950, useNativeDriver: true }),
        Animated.sequence([
          Animated.spring(anSc, { toValue: 1.3, friction: 4, useNativeDriver: true }),
          Animated.spring(anSc, { toValue: 1,   friction: 4, useNativeDriver: true }),
        ]),
      ]).start(() => setFlying(false));
    } else {
      playSound("wrong");
    }
    setTimeout(() => {
      setSel(null);
      const next = idx + 1;
      if (next >= queue.length) { finish(score + (ok ? 1 : 0), queue.length); return; }
      if (next % PER_LEVEL === 0) {
        const lvlIdx = Math.floor(next / PER_LEVEL) - 1;
        const newEmoji = COLLECT_META["feed"].items[lvlIdx]?.emoji;
        if (newEmoji) {
          loadProgress().then(async p => {
            const updated = addCollection(p, "feed", newEmoji);
            await saveProgress(updated);
            setMyCollection(updated.collections["feed"] ?? []);
          });
        }
        setCollectLvl(lvlIdx); setShowCollect(true); return;
      }
      setIdx(next);
    }, 1200);
  };

  if (isDone) return resultScreen;
  if (showCollect) return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <CollectiblePopup
        gameId="feed"
        levelIdx={collectLvl}
        collected={myCollection}
        onDone={() => { resetSoundBlock(); setShowCollect(false); setIdx(idx + 1); }}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <GameHeader 
          score={score} 
          total={queue.length} 
          qInLevel={idx % PER_LEVEL}
          level={level} 
          maxLevel={maxLvl} 
          color={T.green} 
          onBack={onHome}
          onExit={onHome}
        />
      </View>

      <View style={gs.centerWrap}>
        <Text style={styles.question}>
          What does the{"\n"}
          <Text style={{ color: T.green, fontWeight: "900" }}>{q.name}</Text> eat?
        </Text>

        {/* Animal + flying food */}
        <View style={{ alignItems: "center", justifyContent: "center", height: 120, marginBottom: 20 }}>
          <Animated.Text style={{ fontSize: Math.min(SW * 0.22, 90), transform: [{ scale: anSc }] }}>
            {q.animal}
          </Animated.Text>
          {flying && (
            <Animated.Text style={{ position: "absolute", fontSize: 36, top: 0,
              transform: [{ translateY: flyY }, { translateX: flyX }], opacity: flyOp }}>
              {q.food}
            </Animated.Text>
          )}
        </View>

        {sel && (
          <FeedbackPulse correct={sel === q.food}
            text={sel === q.food ? `🎉 Yes! ${q.label}!` : `❌ It's ${q.label} ${q.food}`} />
        )}

        <View style={styles.grid2}>
          {opts.map(opt => {
            let bg = T.card, bc = "#E5E7EB";
            if (sel === opt)         { bg = opt === q.food ? "#BBF7D0" : "#FECACA"; bc = opt === q.food ? "#16A34A" : "#DC2626"; }
            else if (sel && opt === q.food) { bg = "#DCFCE7"; bc = "#16A34A"; }
            return (
              <PressBtn key={opt} disabled={!!sel} onPress={() => answer(opt)}
                style={[styles.optBtn, { backgroundColor: bg, borderColor: bc, width: (SW - 48) / 2 }]}>
                <Text style={{ fontSize: 40 }}>{opt}</Text>
              </PressBtn>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
//  HOME SCREEN  🏠
// ══════════════════════════════════════════════════════════════
const GAME_LIST = [
  { id: "sound",  icon: "🎵", name: "Animal Sound Hero",   desc: "3 levels · 15 animals", color: T.primary, bg: "#FFF3EE" },
  { id: "color",  icon: "🎨", name: "Color Balloon Pop",   desc: "3 levels · 15 colors",  color: T.teal,   bg: "#F0FDFB" },
  { id: "memory", icon: "🧠", name: "Memory Match Safari", desc: "Easy → Medium → Hard",  color: T.purple, bg: "#FAF5FF" },
  { id: "feed",   icon: "🍎", name: "Feed The Animal",     desc: "3 levels · 15 animals", color: T.green,  bg: "#F0FDF4" },
];

function HomeScreen({ onPlay, prog, onToggleSound }: {
  onPlay: (id: string) => void;
  prog: Progress;
  onToggleSound: () => void;
}) {
  const xpLevel = Math.floor(prog.xp / 100) + 1;
  const xpPct   = (prog.xp % 100) / 100;
  const xpAnim  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(xpAnim, { toValue: xpPct, duration: 700, useNativeDriver: false }).start();
  }, [xpPct]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }} showsVerticalScrollIndicator={false}>
      <View style={hs.hero}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={hs.heroTitle}>TinyBrainPlay 🧸</Text>
          <TouchableOpacity onPress={onToggleSound}
            style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, padding: 8 }}>
            <Text style={{ fontSize: 20 }}>{prog.soundOn ? "🔊" : "🔇"}</Text>
          </TouchableOpacity>
        </View>
        <View style={hs.xpRow}>
          <Text style={hs.xpTxt}>⚡ Lv {xpLevel}</Text>
          <View style={hs.xpTrack}>
            <Animated.View style={[hs.xpFill, {
              width: xpAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
            }]} />
          </View>
          <Text style={hs.xpTxt}>{prog.xp % 100}/100 XP</Text>
        </View>
        <View style={hs.statsRow}>
          <View style={hs.statBox}>
            <Text style={hs.statVal}>🪙 {prog.coins}</Text>
            <Text style={hs.statLbl}>Coins</Text>
          </View>
          <View style={[hs.statBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: "rgba(255,255,255,0.25)" }]}>
            <Text style={hs.statVal}>🔥 {prog.streak}</Text>
            <Text style={hs.statLbl}>Streak</Text>
          </View>
          <View style={hs.statBox}>
            <Text style={hs.statVal}>🏅 {prog.badges.length}</Text>
            <Text style={hs.statLbl}>Badges</Text>
          </View>
        </View>
      </View>

      <View style={{ padding: 16, gap: 14 }}>
        {prog.badges.length > 0 && (
          <View style={hs.badgesWrap}>
            <Text style={hs.sectionTtl}>🏅 Your Badges</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {prog.badges.map(b => (
                <View key={b} style={hs.badgeChip}>
                  <Text style={{ fontSize: 22 }}>{BADGE_META[b]?.icon ?? "🏅"}</Text>
                  <Text style={hs.badgeName}>{BADGE_META[b]?.name ?? b}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Collections section */}
        {Object.keys(prog.collections ?? {}).some(k => (prog.collections[k]?.length ?? 0) > 0) && (
          <View style={hs.badgesWrap}>
            <Text style={hs.sectionTtl}>🗂️ My Collections</Text>
            {Object.entries(COLLECT_META).map(([gameId, meta]) => {
              const items = prog.collections?.[gameId] ?? [];
              if (items.length === 0) return null;
              return (
                <View key={gameId} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: meta.color }} />
                    <Text style={{ fontSize: 12, fontWeight: "800", color: meta.color }}>
                      {meta.label}s ({items.length}/{meta.items.length})
                    </Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6, paddingBottom: 2 }}>
                    {meta.items.map((item, i) => {
                      const have = items.includes(item.emoji);
                      return (
                        <View key={i} style={[hs.collectSlot,
                          have ? { backgroundColor: meta.color + "18", borderColor: meta.color }
                               : { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" }]}>
                          <Text style={{ fontSize: 20, opacity: have ? 1 : 0.18 }}>
                            {have ? item.emoji : "❓"}
                          </Text>
                          {have && <Text style={{ fontSize: 9, color: meta.color, fontWeight: "700" }}>
                            {item.name}
                          </Text>}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              );
            })}
          </View>
        )}

        <Text style={hs.sectionTtl}>🎮 Play a Game</Text>

        {GAME_LIST.map(g => {
          const best      = prog.bestScores[g.id];
          const bestStars = best != null ? (best >= 80 ? "⭐⭐⭐" : best >= 50 ? "⭐⭐" : "⭐") : "";
          return (
            <PressBtn key={g.id} onPress={() => onPlay(g.id)}
              style={[hs.gameCard, { backgroundColor: g.bg, borderColor: g.color + "40" }]}>
              <View style={[hs.gameIcon, { backgroundColor: g.color + "22" }]}>
                <Text style={{ fontSize: 30 }}>{g.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[hs.gameName, { color: T.text }]}>{g.name}</Text>
                <Text style={hs.gameDesc}>{g.desc}</Text>
                {bestStars ? <Text style={{ fontSize: 13, marginTop: 3 }}>{bestStars} best</Text> : null}
              </View>
              <View style={[hs.playBtn, { backgroundColor: g.color }]}>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900" }}>▶</Text>
              </View>
            </PressBtn>
          );
        })}

        <Text style={{ textAlign: "center", color: T.muted, fontSize: 12, fontStyle: "italic",
          marginTop: 8, marginBottom: 24 }}>
          🌈 Play every day to keep your streak alive!
        </Text>
      </View>
    </ScrollView>
  );
}
const hs = StyleSheet.create({
  hero:       { backgroundColor: T.primary, padding: 20,
                paddingTop: Platform.OS === "android" ? 44 : 20,
                borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 12 },
  heroTitle:  { fontSize: 24, fontWeight: "900", color: "#fff", letterSpacing: 0.5 },
  xpRow:      { flexDirection: "row", alignItems: "center", gap: 8 },
  xpTxt:      { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "800", minWidth: 52 },
  xpTrack:    { flex: 1, height: 10, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 99, overflow: "hidden" },
  xpFill:     { height: 10, backgroundColor: "#FFD700", borderRadius: 99 },
  statsRow:   { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 16 },
  statBox:    { flex: 1, alignItems: "center", paddingVertical: 10 },
  statVal:    { fontSize: 17, fontWeight: "900", color: "#fff" },
  statLbl:    { fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: "700" },
  badgesWrap: { backgroundColor: T.card, borderRadius: 16, padding: 14,
                shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  sectionTtl: { fontSize: 16, fontWeight: "900", color: T.text, marginBottom: 6 },
  badgeChip:  { alignItems: "center", backgroundColor: "#FFF9F0", borderRadius: 12,
                padding: 10, borderWidth: 1.5, borderColor: T.gold, minWidth: 74, gap: 4 },
  badgeName:  { fontSize: 10, fontWeight: "800", color: "#92400E", textAlign: "center" },
  gameCard:   { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 18,
                borderWidth: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  gameIcon:   { width: 58, height: 58, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  gameName:   { fontSize: 16, fontWeight: "900", marginBottom: 2 },
  gameDesc:   { fontSize: 12, color: T.muted, lineHeight: 17 },
  playBtn:    { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  collectSlot:{ width: 44, height: 52, borderRadius: 10, borderWidth: 1.5,
                alignItems: "center", justifyContent: "center", gap: 2, paddingVertical: 4 },
});

// ══════════════════════════════════════════════════════════════
//  ROOT  —  App Entry Point
// ══════════════════════════════════════════════════════════════
export default function TinyBrainPlay() {
  const [active, setActive]       = useState<string | null>(null);
  const [prog, setProg]           = useState<Progress>(DEFAULT_PROGRESS);
  const [showDaily, setShowDaily] = useState(false);
  const [dailyCoins, setDailyCoins] = useState(0);

  useEffect(() => {
    preloadSounds();
    (async () => {
      const p  = await loadProgress();
      const td = today();
      let updated = { ...p };
      soundEnabled = p.soundOn ?? true;

      if (p.lastDate !== td) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr      = yesterday.toISOString().split("T")[0];
        const newStreak = p.lastDate === yStr ? p.streak + 1 : 1;
        const coins     = DAILY_REWARDS[Math.min(newStreak - 1, 6)];
        updated = { ...updated, streak: newStreak, lastDate: td, claimedToday: false };
        await saveProgress(updated);
        setDailyCoins(coins);
        setShowDaily(true);
      }
      setProg(updated);
    })();
    return () => { unloadSounds(); };
  }, []);

  const claimDaily = async () => {
    const updated: Progress = { ...prog, coins: prog.coins + dailyCoins, claimedToday: true };
    await saveProgress(updated);
    setProg(updated);
    setShowDaily(false);
  };

  const onHome = useCallback(async () => {
    stopAllSounds();
    resetSoundBlock();   // naya game ke liye block hatao
    setActive(null);
    const p = await loadProgress();
    setProg(p);
  }, []);

  const onToggleSound = useCallback(async () => {
    soundEnabled = !soundEnabled;
    const updated = { ...prog, soundOn: soundEnabled };
    await saveProgress(updated);
    setProg(updated);
    if (soundEnabled) playSound("click");
  }, [prog]);

  const gameMap: Record<string, React.ReactNode> = {
    sound:  <AnimalSoundGame  onHome={onHome} />,
    color:  <ColorBalloonGame onHome={onHome} />,
    memory: <MemoryMatchGame  onHome={onHome} />,
    feed:   <FeedAnimalGame   onHome={onHome} />,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={T.primary} />
      {showDaily && (
        <DailyRewardModal streak={prog.streak} coins={dailyCoins} onClaim={claimDaily} />
      )}
      {active
        ? gameMap[active]
        : <HomeScreen onPlay={setActive} prog={prog} onToggleSound={onToggleSound} />
      }
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════
//  SHARED STYLES
// ══════════════════════════════════════════════════════════════

// ✅ FIX: gs = Game Shared styles — centerWrap for all 4 games
const gs = StyleSheet.create({
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-evenly",   // items ke beech equal space — bilkul center
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
});

const styles = StyleSheet.create({
  question: { fontSize: 20, fontWeight: "800", color: T.text, textAlign: "center", lineHeight: 28 },
  feedback: { fontSize: 20, fontWeight: "900", textAlign: "center", marginTop: 4 },
  grid2:    { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  optBtn:   { height: SH > 700 ? 72 : 60, justifyContent: "center", alignItems: "center",
              borderRadius: 18, borderWidth: 2.5,
              shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  optTxt:   { fontSize: 17, fontWeight: "800", color: T.text },
  bigBtn:   { borderRadius: 16, paddingVertical: 15, alignItems: "center",
              shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  bigBtnTxt:{ color: "#fff", fontSize: 18, fontWeight: "900" },
  memCard:  { borderRadius: 14, borderWidth: 3, alignItems: "center", justifyContent: "center",
              shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  exitButtonContainer: {
    marginLeft: 8,
  },
  exitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.exit,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  exitButtonText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24,
  },
});

const gh = StyleSheet.create({
  wrap:     { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  back:     { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  backTxt:  { fontSize: 18, fontWeight: "900", color: T.muted },
  center:   { flex: 1, gap: 4 },
  barTrack: { height: 8, backgroundColor: "#E5E7EB", borderRadius: 99, overflow: "hidden" },
  barFill:  { height: 8, borderRadius: 99 },
  levelTxt: { fontSize: 11, color: T.muted, fontWeight: "700" },
  scorePill:{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 2 },
  scoreTxt: { fontSize: 15, fontWeight: "900" },
});