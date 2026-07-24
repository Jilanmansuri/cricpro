import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../components/Theme';
import { useSettingsStore } from '../../store/settingsStore';
import Button from '../../components/Button';
import Svg, { Circle, Rect, Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ScanIcon = ({ color }: { color: string }) => (
  <Svg width="60" height="60" viewBox="0 0 24 24" fill="none">
    <Path d="M4 6V4h2v2H4zm0 4H2v4h2v-4zm0 6v2h2v-2H4zm4 2v2h4v-2H8zm6 0h4v2h-4v-2zm4-2v-2h2v4h-2zm0-6V6h2v4h-2zm-6-4V2H8v2h6zm4-2h2v2h-2V2zM6 10h12v4H6v-4z" fill={color} />
  </Svg>
);

const ChartIcon = ({ color }: { color: string }) => (
  <Svg width="60" height="60" viewBox="0 0 24 24" fill="none">
    <Path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" fill={color} />
  </Svg>
);

const LeagueIcon = ({ color }: { color: string }) => (
  <Svg width="60" height="60" viewBox="0 0 24 24" fill="none">
    <Path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 8 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill={color} />
  </Svg>
);

interface Slide {
  title: string;
  desc: string;
  icon: React.ReactNode;
}

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const setOnboardingCompleted = useSettingsStore(state => state.setOnboardingCompleted);

  const [activeIdx, setActiveIdx] = useState(0);

  const slides: Slide[] = [
    {
      title: 'Scan Scorecards',
      desc: 'Take a photo of any print or digital scorecard screenshot, and our OCR engine will binarize, extract, and structure all team scores and player stats.',
      icon: <ScanIcon color={colors.primary} />,
    },
    {
      title: 'Auto-Update Careers',
      desc: 'No manual entry needed. The statistical calculator updates every player’s matches, runs, balls, strike rates, overs, economy, and best bowling records on the fly.',
      icon: <ChartIcon color={colors.secondary} />,
    },
    {
      title: 'Tournament Standings',
      desc: 'Link matches to tournaments to dynamically manage points tables, calculate Net Run Rates (NRR), and award Orange and Purple Caps automatically.',
      icon: <LeagueIcon color={colors.primary} />,
    },
  ];

  const handleNext = () => {
    if (activeIdx < slides.length - 1) {
      setActiveIdx(prev => prev + 1);
    } else {
      setOnboardingCompleted(true);
      router.replace('/(auth)/login');
    }
  };

  const handleSkip = () => {
    setOnboardingCompleted(true);
    router.replace('/(auth)/login');
  };

  const activeSlide = slides[activeIdx];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Skip button */}
      <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
        <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip</Text>
      </TouchableOpacity>

      {/* Slide Content */}
      <View style={styles.slideContainer}>
        <View style={[styles.iconBg, { backgroundColor: colors.surfaceLighter }]}>
          {activeSlide.icon}
        </View>
        <Text style={[styles.slideTitle, { color: colors.text }]}>{activeSlide.title}</Text>
        <Text style={[styles.slideDesc, { color: colors.textMuted }]}>{activeSlide.desc}</Text>
      </View>

      {/* Navigation Indicators & Buttons */}
      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {slides.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                {
                  backgroundColor: idx === activeIdx ? colors.primary : colors.border,
                  width: idx === activeIdx ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <Button
          title={activeIdx === slides.length - 1 ? 'Get Started' : 'Next'}
          onPress={handleNext}
          style={styles.actionBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  skipBtn: {
    alignSelf: 'flex-end',
    marginTop: 40,
    padding: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '700',
  },
  slideContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    flex: 1,
    justifyContent: 'center',
  },
  iconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  slideDesc: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  actionBtn: {
    width: '100%',
    height: 52,
  },
});
