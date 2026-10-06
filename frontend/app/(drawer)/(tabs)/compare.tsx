import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../components/Theme';
import Card from '../../../components/Card';
import Avatar from '../../../components/Avatar';
import TeamLogo from '../../../components/TeamLogo';
import api from '../../../services/api';
import Svg, { Path } from 'react-native-svg';

const SwordsIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path
      d="M19.78 4.22a.75.75 0 0 0-1.06 0l-5.47 5.47-1.41-1.41 5.47-5.47a.75.75 0 0 0-1.06-1.06L10.79 7.22 8.67 5.1a2.25 2.25 0 0 0-3.18 0l-.71.71a2.25 2.25 0 0 0 0 3.18l2.12 2.12-5.47 5.47a.75.75 0 0 0 0 1.06l1.06 1.06a.75.75 0 0 0 1.06 0l5.47-5.47 1.41 1.41-5.47 5.47a.75.75 0 0 0 1.06 1.06l5.47-5.47 2.12 2.12a2.25 2.25 0 0 0 3.18 0l.71-.71a2.25 2.25 0 0 0 0-3.18l-2.12-2.12 5.47-5.47a.75.75 0 0 0 0-1.06l-1.06-1.06z"
      fill={color}
    />
  </Svg>
);

const SwapIcon = ({ color }: { color: string }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path
      d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"
      fill={color}
    />
  </Svg>
);

const SearchIcon = ({ color }: { color: string }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path
      d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
      fill={color}
    />
  </Svg>
);

const KNOWN_FULL_NAMES: Record<string, string> = {
  'a sharma': 'Abhishek Sharma',
  's samson': 'Sanju Samson',
  's gill': 'Shubman Gill',
  's yadav': 'Suryakumar Yadav',
  'r gaikwad': 'Ruturaj Gaikwad',
  'h pandya': 'Hardik Pandya',
  'a patel': 'Axar Patel',
  'arshdeep': 'Arshdeep Singh',
  'j bumrah': 'Jasprit Bumrah',
  'm siraj': 'Mohammed Siraj',
  'r sharma': 'Rohit Sharma',
  'v kohli': 'Virat Kohli',
  'kl rahul': 'KL Rahul',
  'r pant': 'Rishabh Pant',
  'k yadav': 'Kuldeep Yadav',
  'y chahal': 'Yuzvendra Chahal',
  's dube': 'Shivam Dube',
  't head': 'Travis Head',
  'p cummins': 'Pat Cummins',
  'm starc': 'Mitchell Starc',
  'g maxwell': 'Glenn Maxwell',
  'd warner': 'David Warner',
  's smith': 'Steve Smith',
  'h klaasen': 'Heinrich Klaasen',
  'q de kock': 'Quinton de Kock',
  'k rabada': 'Kagiso Rabada',
  'j buttler': 'Jos Buttler',
  'b stokes': 'Ben Stokes',
  'b azam': 'Babar Azam',
  's afridi': 'Shaheen Afridi',
};

export const getPlayerFullName = (p: any): string => {
  if (!p) return '';
  if (p.fullName && typeof p.fullName === 'string' && p.fullName.trim()) {
    return p.fullName.trim();
  }
  const raw = (p.name || '').trim();
  const lower = raw.toLowerCase();
  if (KNOWN_FULL_NAMES[lower]) {
    return KNOWN_FULL_NAMES[lower];
  }
  return raw;
};

interface PlayerMetric {
  key: string;
  label: string;
  category: 'batting' | 'bowling' | 'milestone';
  val1: number | string | null;
  val2: number | string | null;
  display1: string;
  display2: string;
  winner: 1 | 2 | 0; // 1 = player 1, 2 = player 2, 0 = tie/none
}

export default function PlayerComparisonTab() {
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(true);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);

  // Selected player IDs
  const [player1Id, setPlayer1Id] = useState<string | null>(null);
  const [player2Id, setPlayer2Id] = useState<string | null>(null);

  // Player full data
  const [player1Data, setPlayer1Data] = useState<any | null>(null);
  const [player2Data, setPlayer2Data] = useState<any | null>(null);

  // Filter category
  const [category, setCategory] = useState<'all' | 'batting' | 'bowling'>('all');

  // Search Modal state
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [pickingSlot, setPickingSlot] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Initial load: Fetch all players list
  const loadInitialPlayers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/players');
      if (res.data.success && res.data.data.length > 0) {
        const players = res.data.data;
        setAllPlayers(players);

        // Pre-select first two distinct players if not selected yet
        if (!player1Id && players[0]) {
          setPlayer1Id(players[0]._id);
        }
        if (!player2Id && players[1]) {
          setPlayer2Id(players[1]._id);
        } else if (!player2Id && players[0]) {
          setPlayer2Id(players[0]._id);
        }
      }
    } catch (err) {
      console.error('Error loading players:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadInitialPlayers();
    }, [])
  );

  // Fetch career stats when player IDs change
  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!player1Id && !player2Id) return;

      try {
        const [res1, res2] = await Promise.all([
          player1Id ? api.get(`/players/${player1Id}/career`).catch(() => null) : null,
          player2Id ? api.get(`/players/${player2Id}/career`).catch(() => null) : null,
        ]);

        if (res1?.data?.success) {
          setPlayer1Data(res1.data.data);
        }
        if (res2?.data?.success) {
          setPlayer2Data(res2.data.data);
        }
      } catch (err) {
        console.error('Error fetching compare player careers:', err);
      }
    };

    fetchPlayerData();
  }, [player1Id, player2Id]);

  // Swap players
  const handleSwapPlayers = () => {
    const tempId = player1Id;
    const tempData = player1Data;
    setPlayer1Id(player2Id);
    setPlayer1Data(player2Data);
    setPlayer2Id(tempId);
    setPlayer2Data(tempData);
  };

  // Open player picker modal
  const openPicker = (slot: 1 | 2) => {
    setPickingSlot(slot);
    setSearchQuery('');
    setPickerModalVisible(true);
  };

  // Select a player from modal
  const handleSelectPlayer = (selected: any) => {
    if (pickingSlot === 1) {
      setPlayer1Id(selected._id);
    } else {
      setPlayer2Id(selected._id);
    }
    setPickerModalVisible(false);
  };

  // Filtered player list for search modal
  const filteredPlayersList = useMemo(() => {
    if (!searchQuery.trim()) return allPlayers;
    const q = searchQuery.toLowerCase();
    return allPlayers.filter((p) => {
      const full = getPlayerFullName(p).toLowerCase();
      const raw = (p.name || '').toLowerCase();
      const country = (p.country || '').toLowerCase();
      const role = (p.role || '').toLowerCase();
      return full.includes(q) || raw.includes(q) || country.includes(q) || role.includes(q);
    });
  }, [allPlayers, searchQuery]);

  // Compute stats comparison metrics
  const comparisonMetrics = useMemo((): PlayerMetric[] => {
    const c1 = player1Data?.career || {};
    const b1 = c1.batting || {};
    const bw1 = c1.bowling || {};

    const c2 = player2Data?.career || {};
    const b2 = c2.batting || {};
    const bw2 = c2.bowling || {};

    // Helper functions
    const calcSr = (runs: number, balls: number) =>
      balls > 0 ? Number(((runs / balls) * 100).toFixed(1)) : 0;
    const calcAvg = (runs: number, matches: number, notOuts: number) => {
      const outs = matches - notOuts;
      return outs > 0 ? Number((runs / outs).toFixed(1)) : runs;
    };
    const calcEcon = (runsConceded: number, overs: number) =>
      overs > 0 ? Number((runsConceded / overs).toFixed(2)) : 0;
    const calcBowlAvg = (runsConceded: number, wickets: number) =>
      wickets > 0 ? Number((runsConceded / wickets).toFixed(1)) : 0;

    const sr1 = calcSr(b1.runs || 0, b1.balls || 0);
    const sr2 = calcSr(b2.runs || 0, b2.balls || 0);

    const avg1 = calcAvg(b1.runs || 0, b1.matches || 0, b1.notOuts || 0);
    const avg2 = calcAvg(b2.runs || 0, b2.matches || 0, b2.notOuts || 0);

    const econ1 = calcEcon(bw1.runsConceded || 0, bw1.overs || 0);
    const econ2 = calcEcon(bw2.runsConceded || 0, bw2.overs || 0);

    const bowlAvg1 = calcBowlAvg(bw1.runsConceded || 0, bw1.wickets || 0);
    const bowlAvg2 = calcBowlAvg(bw2.runsConceded || 0, bw2.wickets || 0);

    // Winner comparator helper (higher is better)
    const higherWinner = (v1: number, v2: number): 1 | 2 | 0 =>
      v1 > v2 ? 1 : v2 > v1 ? 2 : 0;

    // Winner comparator helper (lower is better, but > 0)
    const lowerWinner = (v1: number, v2: number): 1 | 2 | 0 => {
      if (v1 <= 0 && v2 <= 0) return 0;
      if (v1 <= 0) return 2;
      if (v2 <= 0) return 1;
      return v1 < v2 ? 1 : v2 < v1 ? 2 : 0;
    };

    const metrics: PlayerMetric[] = [
      // BATTING
      {
        key: 'runs',
        label: 'Total Runs',
        category: 'batting',
        val1: b1.runs || 0,
        val2: b2.runs || 0,
        display1: String(b1.runs || 0),
        display2: String(b2.runs || 0),
        winner: higherWinner(b1.runs || 0, b2.runs || 0),
      },
      {
        key: 'highestScore',
        label: 'Highest Score (HS)',
        category: 'batting',
        val1: b1.highestScore || 0,
        val2: b2.highestScore || 0,
        display1: String(b1.highestScore || 0),
        display2: String(b2.highestScore || 0),
        winner: higherWinner(b1.highestScore || 0, b2.highestScore || 0),
      },
      {
        key: 'battingAvg',
        label: 'Batting Average',
        category: 'batting',
        val1: avg1,
        val2: avg2,
        display1: String(avg1),
        display2: String(avg2),
        winner: higherWinner(avg1, avg2),
      },
      {
        key: 'strikeRate',
        label: 'Strike Rate (SR)',
        category: 'batting',
        val1: sr1,
        val2: sr2,
        display1: `${sr1}`,
        display2: `${sr2}`,
        winner: higherWinner(sr1, sr2),
      },
      {
        key: 'centuries',
        label: 'Centuries (100s)',
        category: 'batting',
        val1: b1.hundreds || 0,
        val2: b2.hundreds || 0,
        display1: String(b1.hundreds || 0),
        display2: String(b2.hundreds || 0),
        winner: higherWinner(b1.hundreds || 0, b2.hundreds || 0),
      },
      {
        key: 'fifties',
        label: 'Half Centuries (50s)',
        category: 'batting',
        val1: b1.fifties || 0,
        val2: b2.fifties || 0,
        display1: String(b1.fifties || 0),
        display2: String(b2.fifties || 0),
        winner: higherWinner(b1.fifties || 0, b2.fifties || 0),
      },
      {
        key: 'fastestFifty',
        label: 'Fastest 50 (Balls)',
        category: 'batting',
        val1: b1.fastestFifty || 0,
        val2: b2.fastestFifty || 0,
        display1: b1.fastestFifty ? `${b1.fastestFifty}b` : '—',
        display2: b2.fastestHundred ? `${b2.fastestFifty}b` : '—',
        winner: lowerWinner(b1.fastestFifty || 0, b2.fastestFifty || 0),
      },
      {
        key: 'fastestHundred',
        label: 'Fastest 100 (Balls)',
        category: 'batting',
        val1: b1.fastestHundred || 0,
        val2: b2.fastestHundred || 0,
        display1: b1.fastestHundred ? `${b1.fastestHundred}b` : '—',
        display2: b2.fastestHundred ? `${b2.fastestHundred}b` : '—',
        winner: lowerWinner(b1.fastestHundred || 0, b2.fastestHundred || 0),
      },
      {
        key: 'sixes',
        label: 'Sixes (6s)',
        category: 'batting',
        val1: b1.sixes || 0,
        val2: b2.sixes || 0,
        display1: String(b1.sixes || 0),
        display2: String(b2.sixes || 0),
        winner: higherWinner(b1.sixes || 0, b2.sixes || 0),
      },
      {
        key: 'fours',
        label: 'Fours (4s)',
        category: 'batting',
        val1: b1.fours || 0,
        val2: b2.fours || 0,
        display1: String(b1.fours || 0),
        display2: String(b2.fours || 0),
        winner: higherWinner(b1.fours || 0, b2.fours || 0),
      },

      // BOWLING
      {
        key: 'wickets',
        label: 'Total Wickets',
        category: 'bowling',
        val1: bw1.wickets || 0,
        val2: bw2.wickets || 0,
        display1: String(bw1.wickets || 0),
        display2: String(bw2.wickets || 0),
        winner: higherWinner(bw1.wickets || 0, bw2.wickets || 0),
      },
      {
        key: 'economy',
        label: 'Economy Rate (Econ)',
        category: 'bowling',
        val1: econ1,
        val2: econ2,
        display1: String(econ1 || '—'),
        display2: String(econ2 || '—'),
        winner: lowerWinner(econ1, econ2),
      },
      {
        key: 'bowlingAvg',
        label: 'Bowling Average',
        category: 'bowling',
        val1: bowlAvg1,
        val2: bowlAvg2,
        display1: String(bowlAvg1 || '—'),
        display2: String(bowlAvg2 || '—'),
        winner: lowerWinner(bowlAvg1, bowlAvg2),
      },
      {
        key: 'maidens',
        label: 'Maidens',
        category: 'bowling',
        val1: bw1.maidens || 0,
        val2: bw2.maidens || 0,
        display1: String(bw1.maidens || 0),
        display2: String(bw2.maidens || 0),
        winner: higherWinner(bw1.maidens || 0, bw2.maidens || 0),
      },

      // MILESTONES & AWARDS
      {
        key: 'matches',
        label: 'Matches Played',
        category: 'milestone',
        val1: c1.matches || b1.matches || 0,
        val2: c2.matches || b2.matches || 0,
        display1: String(c1.matches || b1.matches || 0),
        display2: String(c2.matches || b2.matches || 0),
        winner: higherWinner(c1.matches || b1.matches || 0, c2.matches || b2.matches || 0),
      },
      {
        key: 'mvps',
        label: 'MVPs Won 🏆',
        category: 'milestone',
        val1: c1.mvps || 0,
        val2: c2.mvps || 0,
        display1: String(c1.mvps || 0),
        display2: String(c2.mvps || 0),
        winner: higherWinner(c1.mvps || 0, c2.mvps || 0),
      },
    ];

    if (category === 'all') return metrics;
    return metrics.filter((m) => m.category === category);
  }, [player1Data, player2Data, category]);

  // Overall winner scoreboard calculation
  const { wins1, wins2, ties } = useMemo(() => {
    let w1 = 0;
    let w2 = 0;
    let t = 0;
    comparisonMetrics.forEach((m) => {
      if (m.winner === 1) w1++;
      else if (m.winner === 2) w2++;
      else t++;
    });
    return { wins1: w1, wins2: w2, ties: t };
  }, [comparisonMetrics]);

  const p1 = player1Data?.player || allPlayers.find((p) => p._id === player1Id);
  const p2 = player2Data?.player || allPlayers.find((p) => p._id === player2Id);

  const p1Name = getPlayerFullName(p1);
  const p2Name = getPlayerFullName(p2);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Head to Head Header Cards */}
        <View style={styles.topHeader}>
          {/* Player 1 Card */}
          <TouchableOpacity
            style={[
              styles.playerCard,
              { backgroundColor: colors.surface, borderColor: '#3B82F6' },
            ]}
            onPress={() => openPicker(1)}
            activeOpacity={0.8}
          >
            <View style={styles.avatarWrapper}>
              <Avatar name={p1Name || 'Player 1'} size={52} />
              <View style={[styles.slotBadge, { backgroundColor: '#3B82F6' }]}>
                <Text style={styles.slotBadgeText}>P1</Text>
              </View>
            </View>
            <Text style={[styles.playerName, { color: colors.text }]} numberOfLines={1}>
              {p1Name || 'Select Player 1'}
            </Text>
            <Text style={[styles.playerRole, { color: colors.textMuted }]} numberOfLines={1}>
              {p1?.role || p1?.country || 'Tap to choose'}
            </Text>
            <View style={[styles.changePill, { backgroundColor: '#3B82F618', borderColor: '#3B82F640' }]}>
              <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700' }}>Change</Text>
            </View>
          </TouchableOpacity>

          {/* VS Center Badge with Swap */}
          <View style={styles.vsCenter}>
            <View style={[styles.vsCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <SwordsIcon color="#F59E0B" />
              <Text style={[styles.vsText, { color: '#F59E0B' }]}>VS</Text>
            </View>
            <TouchableOpacity
              style={[styles.swapBtn, { backgroundColor: colors.surfaceLighter, borderColor: colors.border }]}
              onPress={handleSwapPlayers}
              activeOpacity={0.7}
            >
              <SwapIcon color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Player 2 Card */}
          <TouchableOpacity
            style={[
              styles.playerCard,
              { backgroundColor: colors.surface, borderColor: '#10B981' },
            ]}
            onPress={() => openPicker(2)}
            activeOpacity={0.8}
          >
            <View style={styles.avatarWrapper}>
              <Avatar name={p2Name || 'Player 2'} size={52} />
              <View style={[styles.slotBadge, { backgroundColor: '#10B981' }]}>
                <Text style={styles.slotBadgeText}>P2</Text>
              </View>
            </View>
            <Text style={[styles.playerName, { color: colors.text }]} numberOfLines={1}>
              {p2Name || 'Select Player 2'}
            </Text>
            <Text style={[styles.playerRole, { color: colors.textMuted }]} numberOfLines={1}>
              {p2?.role || p2?.country || 'Tap to choose'}
            </Text>
            <View style={[styles.changePill, { backgroundColor: '#10B98118', borderColor: '#10B98140' }]}>
              <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>Change</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Head-to-Head Scoreboard / Summary Banner */}
        <Card style={[styles.scoreBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.scoreBannerRow}>
            <View style={[styles.scoreChip, { backgroundColor: '#3B82F618' }]}>
              <Text style={[styles.scoreChipVal, { color: '#3B82F6' }]}>{wins1}</Text>
              <Text style={[styles.scoreChipLabel, { color: '#3B82F6' }]}>Leads</Text>
            </View>

            <View style={styles.summaryCenter}>
              <Text style={[styles.summaryHeadline, { color: colors.text }]} numberOfLines={1}>
                {wins1 > wins2
                  ? `${p1Name} leads`
                  : wins2 > wins1
                  ? `${p2Name} leads`
                  : 'Evenly Matched'}
              </Text>
              <Text style={[styles.summarySub, { color: colors.textMuted }]}>
                Across {comparisonMetrics.length} metrics
              </Text>
            </View>

            <View style={[styles.scoreChip, { backgroundColor: '#10B98118' }]}>
              <Text style={[styles.scoreChipVal, { color: '#10B981' }]}>{wins2}</Text>
              <Text style={[styles.scoreChipLabel, { color: '#10B981' }]}>Leads</Text>
            </View>
          </View>
        </Card>

        {/* Category Pill Switcher */}
        <View style={styles.pillRow}>
          {[
            { key: 'all', label: 'All Stats', icon: '⚡' },
            { key: 'batting', label: 'Batting', icon: '🏏' },
            { key: 'bowling', label: 'Bowling', icon: '🎯' },
          ].map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryPill,
                { backgroundColor: colors.surface, borderColor: colors.border },
                category === cat.key && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setCategory(cat.key as any)}
            >
              <Text style={{ fontSize: 13, marginRight: 4 }}>{cat.icon}</Text>
              <Text
                style={[
                  styles.categoryPillText,
                  { color: category === cat.key ? '#fff' : colors.text },
                  category === cat.key && { fontWeight: '800' },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Metric Comparison Cards */}
        <View style={styles.metricsContainer}>
          {comparisonMetrics.map((m) => {
            // Calculate proportional bar width
            const num1 = typeof m.val1 === 'number' ? m.val1 : 0;
            const num2 = typeof m.val2 === 'number' ? m.val2 : 0;
            const total = num1 + num2;
            const pct1 = total > 0 ? Math.max(15, Math.min(85, (num1 / total) * 100)) : 50;
            const pct2 = 100 - pct1;

            return (
              <Card key={m.key} style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {/* Metric Label Row */}
                <View style={styles.metricHeader}>
                  <Text style={[styles.metricTitle, { color: colors.textMuted }]}>{m.label}</Text>
                </View>

                {/* Values Row */}
                <View style={styles.metricValuesRow}>
                  {/* Player 1 Value */}
                  <View style={styles.valColLeft}>
                    <Text
                      style={[
                        styles.metricValue,
                        { color: m.winner === 1 ? '#3B82F6' : colors.text },
                        m.winner === 1 && { fontWeight: '900' },
                      ]}
                    >
                      {m.display1}
                    </Text>
                    {m.winner === 1 && <Text style={styles.crownBadge}>👑</Text>}
                  </View>

                  {/* Player 2 Value */}
                  <View style={styles.valColRight}>
                    {m.winner === 2 && <Text style={styles.crownBadge}>👑</Text>}
                    <Text
                      style={[
                        styles.metricValue,
                        { color: m.winner === 2 ? '#10B981' : colors.text },
                        m.winner === 2 && { fontWeight: '900' },
                      ]}
                    >
                      {m.display2}
                    </Text>
                  </View>
                </View>

                {/* Comparative Visual Split Bar */}
                <View style={[styles.progressTrack, { backgroundColor: colors.surfaceLighter }]}>
                  <View
                    style={[
                      styles.barFillLeft,
                      {
                        width: `${pct1}%`,
                        backgroundColor: m.winner === 1 ? '#3B82F6' : '#3B82F660',
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.barFillRight,
                      {
                        width: `${pct2}%`,
                        backgroundColor: m.winner === 2 ? '#10B981' : '#10B98160',
                      },
                    ]}
                  />
                </View>
              </Card>
            );
          })}
        </View>

        {/* View Profile Action Buttons */}
        <View style={styles.actionButtonsRow}>
          {p1 && (
            <TouchableOpacity
              style={[styles.profileBtn, { backgroundColor: colors.surface, borderColor: '#3B82F6' }]}
              onPress={() => router.push({ pathname: '/player-career', params: { id: p1._id } })}
            >
              <Text style={[styles.profileBtnText, { color: '#3B82F6' }]} numberOfLines={1}>
                {p1Name} Profile ›
              </Text>
            </TouchableOpacity>
          )}

          {p2 && (
            <TouchableOpacity
              style={[styles.profileBtn, { backgroundColor: colors.surface, borderColor: '#10B981' }]}
              onPress={() => router.push({ pathname: '/player-career', params: { id: p2._id } })}
            >
              <Text style={[styles.profileBtnText, { color: '#10B981' }]} numberOfLines={1}>
                {p2Name} Profile ›
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Player Selection Search Modal */}
      <Modal
        visible={pickerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Card style={[styles.pickerModal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Select Player {pickingSlot}
              </Text>
              <TouchableOpacity
                onPress={() => setPickerModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={{ fontSize: 18, color: colors.textMuted, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View
              style={[
                styles.modalSearchRow,
                { backgroundColor: colors.surfaceLighter, borderColor: colors.border },
              ]}
            >
              <SearchIcon color={colors.textMuted} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text }]}
                placeholder="Search by name, country, or role..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>

            {/* Players List */}
            <FlatList
              data={filteredPlayersList}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingVertical: 8 }}
              renderItem={({ item }) => {
                const isSelected =
                  (pickingSlot === 1 && item._id === player1Id) ||
                  (pickingSlot === 2 && item._id === player2Id);
                const itemFullName = getPlayerFullName(item);

                return (
                  <TouchableOpacity
                    style={[
                      styles.playerOptionRow,
                      { borderBottomColor: colors.border },
                      isSelected && { backgroundColor: colors.surfaceLighter },
                    ]}
                    onPress={() => handleSelectPlayer(item)}
                  >
                    <Avatar name={itemFullName} size={38} />
                    <View style={styles.playerOptionInfo}>
                      <Text style={[styles.playerOptionName, { color: colors.text }]}>
                        {itemFullName}
                      </Text>
                      <Text style={[styles.playerOptionSub, { color: colors.textMuted }]}>
                        {item.name && item.name !== itemFullName ? `${item.name} • ` : ''}{item.country || 'Team'} • {item.role || 'Player'}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={[styles.selectedCheck, { backgroundColor: colors.primary }]}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={{ color: colors.textMuted }}>No players found.</Text>
                </View>
              }
            />
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  playerCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  slotBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  slotBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 2,
  },
  playerRole: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
  },
  changePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  vsCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  vsCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  vsText: {
    fontSize: 9,
    fontWeight: '900',
    marginTop: -2,
  },
  swapBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBanner: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  scoreBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 54,
  },
  scoreChipVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  scoreChipLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  summaryCenter: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  summaryHeadline: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 2,
  },
  summarySub: {
    fontSize: 11,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricsContainer: {
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  metricHeader: {
    alignItems: 'center',
    marginBottom: 6,
  },
  metricTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  valColLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valColRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  crownBadge: {
    fontSize: 14,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barFillLeft: {
    height: '100%',
  },
  barFillRight: {
    height: '100%',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  profileBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '75%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
  },
  playerOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  playerOptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerOptionName: {
    fontSize: 14,
    fontWeight: '700',
  },
  playerOptionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  selectedCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
});
