import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, Image, Animated } from 'react-native';
import { useTheme } from '../../../components/Theme';
import Card from '../../../components/Card';
import Avatar from '../../../components/Avatar';
import api from '../../../services/api';
import { useFocusEffect, useRouter } from 'expo-router';
import TeamLogo from '../../../components/TeamLogo';
import { clientCache } from '../../../services/cache';

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
  'r pant': 'Rishabh Pant',
  'v kohli': 'Virat Kohli',
  'rohit': 'Rohit Sharma',
  'r sharma': 'Rohit Sharma',
  'y jaiswal': 'Yashasvi Jaiswal',
  's dube': 'Shivam Dube',
  'k rahul': 'KL Rahul',
  'kl rahul': 'KL Rahul',
  'r jadeja': 'Ravindra Jadeja',
  'k pandya': 'Krunal Pandya',
  'r ashwin': 'Ravichandran Ashwin',
  'kuldeep': 'Kuldeep Yadav',
  'y chahal': 'Yuzvendra Chahal',
  'm shami': 'Mohammed Shami',
  'b kumar': 'Bhuvneshwar Kumar',
  'd chahar': 'Deepak Chahar',
  'r rinku': 'Rinku Singh',
  'rinku': 'Rinku Singh',
  's iyer': 'Shreyas Iyer',
  'v iyer': 'Venkatesh Iyer',
  'w sundar': 'Washington Sundar',
  'q de kock': 'Quinton de Kock',
  'h klaasen': 'Heinrich Klaasen',
  'd miller': 'David Miller',
  'k rabada': 'Kagiso Rabada',
  'a nortje': 'Anrich Nortje',
  't stubbs': 'Tristan Stubbs',
  'm jansen': 'Marco Jansen',
  'g coetzee': 'Gerald Coetzee',
  't bavuma': 'Temba Bavuma',
  'a markram': 'Aiden Markram',
  'k maharaj': 'Keshav Maharaj',
  'l ngidi': 'Lungi Ngidi',
};

function getDisplayPlayerName(player: any): string {
  if (!player) return 'Player';
  if (player.fullName && typeof player.fullName === 'string' && player.fullName.trim().length > 0) {
    return player.fullName;
  }
  const rawName = player.name || '';
  const key = rawName.trim().toLowerCase();
  if (KNOWN_FULL_NAMES[key]) return KNOWN_FULL_NAMES[key];
  for (const [k, v] of Object.entries(KNOWN_FULL_NAMES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return rawName;
}

export default function StatsLeaderboardTab() {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<'batting' | 'bowling' | 'fielding'>('batting');
  const [selectedDivision, setSelectedDivision] = useState<'all' | 'international' | 'ipl'>('all');

  // Auto-hiding header scroll animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<any>(null);
  const [headerHeight, setHeaderHeight] = useState(195);

  const clampedScroll = useRef(
    Animated.diffClamp(scrollY, 0, 205)
  ).current;

  const headerTranslateY = useRef(
    clampedScroll.interpolate({
      inputRange: [0, 205],
      outputRange: [0, -205],
      extrapolate: 'clamp',
    })
  ).current;

  const handleTabChange = (tab: 'batting' | 'bowling' | 'fielding') => {
    setActiveTab(tab);
    scrollY.setValue(0);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const handleDivisionChange = (div: 'all' | 'international' | 'ipl') => {
    setSelectedDivision(div);
    scrollY.setValue(0);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  };
  // Initialize state with cached data if available for instant 0ms rendering
  const initialLb = clientCache.get<{ topBatsmen: any[]; topBowlers: any[]; topFielders?: any[]; topMvps?: any[] }>('leaderboard_all', true);
  const initialRec = clientCache.get<{ batting: any[]; bowling: any[]; team: any[]; rankings?: any[] }>('records_all', true);
  const initialRank = clientCache.get<{ topBatters: any[]; topBowlers: any[]; topAllRounders: any[] }>('rankings_T20_career_10', true);

  const [isLoading, setIsLoading] = useState(!initialLb && !initialRec);
  const [leaderboard, setLeaderboard] = useState<{ topBatsmen: any[]; topBowlers: any[]; topFielders: any[]; topMvps?: any[] }>(
    initialLb ? { ...initialLb, topFielders: initialLb.topFielders || [] } : { topBatsmen: [], topBowlers: [], topFielders: [], topMvps: [] }
  );
  const [records, setRecords] = useState<{ batting: any[]; bowling: any[]; team: any[]; rankings?: any[] }>(
    initialRec || { batting: [], bowling: [], team: [], rankings: [] }
  );
  const [recordsCategory, setRecordsCategory] = useState<'all' | 'rankings' | 'batting' | 'bowling' | 'team'>('all');

  // ICC Rankings State
  const [rankingFormat, setRankingFormat] = useState<'T20' | 'ODI' | 'Test'>('T20');
  const [rankingCategory, setRankingCategory] = useState<'batters' | 'bowlers' | 'all-rounders'>('batters');
  const [rankingScope, setRankingScope] = useState<'career' | 'tournament'>('career');
  const [rankingWindow, setRankingWindow] = useState<'recent' | 'all'>('recent');
  const [rankings, setRankings] = useState<{ topBatters: any[]; topBowlers: any[]; topAllRounders: any[] }>(
    initialRank || { topBatters: [], topBowlers: [], topAllRounders: [] }
  );

  const [battingSort, setBattingSort] = useState('Runs');
  const [bowlingSort, setBowlingSort] = useState('Wickets');
  const [fieldingSort, setFieldingSort] = useState('Catches');
  
  const battingFilters = ['Runs', 'Highest Score', 'Average', 'Strike Rate', '100s', '50s', 'Fastest 50', 'Fastest 100', 'Sixes', 'Fours', 'MVPs', '⭐ Ranking'];
  const bowlingFilters = ['Wickets', 'Economy', 'Average', 'Maidens', 'MVPs', '⭐ Ranking'];
  const fieldingFilters = ['Catches', 'Run Outs', 'Stumpings', 'Total Dismissals'];

  const fetchRankingsData = async (fmt = rankingFormat, scp = rankingScope, win = rankingWindow) => {
    const rkKey = `rankings_${fmt}_${scp}_${win}_10`;
    let cached = clientCache.get<any>(rkKey, true);
    if (!cached) {
      cached = await clientCache.getAsync<any>(rkKey, true);
    }
    if (cached) {
      setRankings(cached);
    }
    try {
      const res = await api.get(`/players/rankings?format=${fmt}&scope=${scp}&window=${win}&limit=10`);
      if (res?.data?.success) {
        setRankings(res.data.data);
        clientCache.set(rkKey, res.data.data);
      }
    } catch (err) {
      console.error('Error fetching rankings:', err);
    }
  };

  const fetchAllStats = async (division = selectedDivision, fmt = rankingFormat, scp = rankingScope, win = rankingWindow) => {
    const lKey = `leaderboard_${division}`;
    const rKey = `records_${division}`;
    const rkKey = `rankings_${fmt}_${scp}_${win}_10`;

    // 1. Check synchronous RAM cache first
    let cachedLb = clientCache.get<any>(lKey, true);
    let cachedRec = clientCache.get<any>(rKey, true);
    let cachedRank = clientCache.get<any>(rkKey, true);

    if (cachedLb) setLeaderboard(cachedLb);
    if (cachedRec) setRecords(cachedRec);
    if (cachedRank) setRankings(cachedRank);

    // 2. If RAM was empty (e.g. cold start after app kill), load from AsyncStorage disk
    if (!cachedLb || !cachedRec || !cachedRank) {
      const [diskLb, diskRec, diskRank] = await Promise.all([
        cachedLb ? Promise.resolve(cachedLb) : clientCache.getAsync<any>(lKey, true),
        cachedRec ? Promise.resolve(cachedRec) : clientCache.getAsync<any>(rKey, true),
        cachedRank ? Promise.resolve(cachedRank) : clientCache.getAsync<any>(rkKey, true),
      ]);

      if (diskLb) {
        cachedLb = diskLb;
        setLeaderboard(diskLb);
      }
      if (diskRec) {
        cachedRec = diskRec;
        setRecords(diskRec);
      }
      if (diskRank) {
        cachedRank = diskRank;
        setRankings(diskRank);
      }
    }

    // Only show full-screen loader if zero data is in storage
    if (!cachedLb && !cachedRec && !cachedRank) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }

    // 3. Trigger network update in background & persist fresh data to AsyncStorage
    try {
      const [lbRes, recRes, rankRes] = await Promise.allSettled([
        api.get(`/players/leaderboard?division=${division}`),
        api.get(`/players/records?division=${division}`),
        api.get(`/players/rankings?format=${fmt}&scope=${scp}&window=${win}&limit=10`)
      ]);
      if (lbRes.status === 'fulfilled' && lbRes.value?.data?.success) {
        setLeaderboard(lbRes.value.data.data);
        clientCache.set(lKey, lbRes.value.data.data);
      }
      if (recRes.status === 'fulfilled' && recRes.value?.data?.success) {
        setRecords(recRes.value.data.data);
        clientCache.set(rKey, recRes.value.data.data);
      }
      if (rankRes.status === 'fulfilled' && rankRes.value?.data?.success) {
        setRankings(rankRes.value.data.data);
        clientCache.set(rkKey, rankRes.value.data.data);
      }
    } catch (err) {
      console.error('Error fetching stats and records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAllStats(selectedDivision, rankingFormat, rankingScope, rankingWindow);
    }, [selectedDivision, rankingFormat, rankingScope, rankingWindow])
  );

  const resolveDisplayTeam = (player: any, rawTeam: any, division: string) => {
    const pName = (player?.name || '').toLowerCase();
    const isIndian = [
      'sharma', 'yadav', 'samson', 'gill', 'gaikwad', 'pandya',
      'bumrah', 'siraj', 'patel', 'arshdeep', 'kohli', 'rahul',
      'pant', 'chahal', 'dube', 'iyer', 'jaiswal', 'singh', 'rinku'
    ].some(sub => pName.includes(sub));

    if (division === 'ipl') {
      if (rawTeam && (rawTeam.teamId?.startsWith('IPL_') || rawTeam.shortName?.length <= 4)) {
        return rawTeam;
      }
      return rawTeam;
    }

    // In International or All division:
    if (isIndian) {
      return {
        name: 'India',
        shortName: 'IND',
        flag: '🇮🇳',
        color: '#0078FF',
        teamId: 'INT_IND'
      };
    }

    const isSouthAfrican = [
      'ferreira', 'naicker', 'marco', 'kg', 'khoza', 'klaasen',
      'de kock', 'rabada', 'miller', 'bavuma', 'nortje', 'stubbs'
    ].some(sub => pName.includes(sub));

    if (isSouthAfrican) {
      return {
        name: 'South Africa',
        shortName: 'SA',
        flag: '🇿🇦',
        color: '#007A3D',
        teamId: 'INT_RSA'
      };
    }

    return rawTeam;
  };

  const handlePlayerPress = (item: any) => {
    const pId =
      item?.playerProfileId ||
      item?.playerId?._id ||
      item?._id ||
      item?.id ||
      (typeof item?.playerId === 'string' ? item.playerId : null) ||
      (item?.playerId && typeof item.playerId === 'object' && item.playerId.toString && item.playerId.toString() !== '[object Object]' ? item.playerId.toString() : null);
    if (pId) {
      router.push({ pathname: '/player-career', params: { id: pId.toString() } });
    }
  };

  const renderBattingItem = ({ item, index }: any) => {
    const player = item.playerId || { name: item.playerName || 'Unknown Player' };
    const stats = item.batting;
    const team = resolveDisplayTeam(player, item.team, selectedDivision);
    const strikeRate = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '0.0';
    const outs = stats.matches - (stats.notOuts || 0);
    const average = outs > 0 ? (stats.runs / outs).toFixed(1) : stats.runs.toString();
    const displayName = getDisplayPlayerName(player);

    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => handlePlayerPress(item)}>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.rank, { color: colors.primary }]}>#{index + 1}</Text>
            <Avatar name={displayName} size={42} style={styles.avatar} />
            <View style={styles.info}>
              <View style={styles.nameAndTeamRow}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{displayName}</Text>
                {team ? (
                  <View style={[styles.teamBadge, { backgroundColor: colors.surfaceLighter || 'rgba(255,255,255,0.06)', borderColor: colors.border }]}>
                    <TeamLogo
                      shortName={team.shortName}
                      teamName={team.name}
                      teamId={team.teamId}
                      playerName={displayName}
                      country={player.country}
                      logoUrl={team.logo}
                      fallbackEmoji={team.flag}
                      size={16}
                    />
                    <Text style={[styles.teamBadgeText, { color: team.color || colors.text }]}>
                      {team.shortName || team.name}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.subText, { color: colors.textMuted }]}>
                Runs: <Text style={{ color: colors.text, fontWeight: '700' }}>{stats.runs}</Text> | HS: <Text style={{ color: colors.primary, fontWeight: '700' }}>{stats.highestScore || 0}</Text> | SR: {strikeRate}
              </Text>
              <Text style={[styles.subText, { color: colors.textMuted, fontSize: 10, marginTop: 2 }]}>
                Avg: {average} | 100s: {stats.hundreds || 0} | 50s: {stats.fifties || 0}
                {stats.fastestFifty ? ` | F50: ${stats.fastestFifty}b` : ''}
                {stats.fastestHundred ? ` | F100: ${stats.fastestHundred}b` : ''}
              </Text>
            </View>
            <View style={styles.statsRight}>
              <Text style={[styles.mainStat, (battingSort === 'MVPs' || battingSort === 'Fastest 50' || battingSort === 'Fastest 100') ? { color: '#F59E0B' } : { color: colors.text }]}>
                {battingSort === 'Average' ? average :
                 battingSort === 'Strike Rate' ? strikeRate :
                 battingSort === 'Highest Score' ? (stats.highestScore || 0) :
                 battingSort === 'Sixes' ? stats.sixes :
                 battingSort === 'Fours' ? stats.fours :
                 battingSort === '50s' ? stats.fifties :
                 battingSort === '100s' ? stats.hundreds :
                 battingSort === 'Fastest 50' ? (stats.fastestFifty ? `${stats.fastestFifty}b` : '—') :
                 battingSort === 'Fastest 100' ? (stats.fastestHundred ? `${stats.fastestHundred}b` : '—') :
                 battingSort === 'MVPs' ? (item.mvps || 0) :
                 stats.runs}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                {battingSort === 'Highest Score' ? 'High Score (HS)' :
                 battingSort === 'Runs' ? 'Total Runs' :
                 battingSort === 'Fastest 50' ? 'Fastest 50 (Balls)' :
                 battingSort === 'Fastest 100' ? 'Fastest 100 (Balls)' :
                 battingSort === 'MVPs' ? 'MVPs Won' : battingSort}
              </Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderBowlingItem = ({ item, index }: any) => {
    const player = item.playerId || { name: item.playerName || 'Unknown Player' };
    const stats = item.bowling;
    const team = resolveDisplayTeam(player, item.team, selectedDivision);
    const economy = stats.overs > 0 ? (stats.runsConceded / stats.overs).toFixed(2) : '0.00';
    const average = stats.wickets > 0 ? (stats.runsConceded / stats.wickets).toFixed(1) : '0.0';
    const displayName = getDisplayPlayerName(player);
    
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => handlePlayerPress(item)}>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.rank, { color: colors.primary }]}>#{index + 1}</Text>
            <Avatar name={displayName} size={42} style={styles.avatar} />
            <View style={styles.info}>
              <View style={styles.nameAndTeamRow}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{displayName}</Text>
                {team ? (
                  <View style={[styles.teamBadge, { backgroundColor: colors.surfaceLighter || 'rgba(255,255,255,0.06)', borderColor: colors.border }]}>
                    <TeamLogo
                      shortName={team.shortName}
                      teamName={team.name}
                      teamId={team.teamId}
                      playerName={displayName}
                      country={player.country}
                      logoUrl={team.logo}
                      fallbackEmoji={team.flag}
                      size={16}
                    />
                    <Text style={[styles.teamBadgeText, { color: team.color || colors.text }]}>
                      {team.shortName || team.name}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.subText, { color: colors.textMuted }]}>Econ: {economy} | Avg: {average}</Text>
              <Text style={[styles.subText, { color: colors.textMuted, fontSize: 10, marginTop: 2 }]}>Overs: {stats.overs} | Runs: {stats.runsConceded}</Text>
            </View>
            <View style={styles.statsRight}>
              <Text style={[styles.mainStat, bowlingSort === 'MVPs' ? { color: '#F59E0B' } : { color: colors.text }]}>
                {bowlingSort === 'Economy' ? economy :
                 bowlingSort === 'Average' ? average :
                 bowlingSort === 'Maidens' ? (stats.maidens || 0) :
                 bowlingSort === 'MVPs' ? (item.mvps || 0) :
                 stats.wickets}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{bowlingSort === 'MVPs' ? 'MVPs Won' : bowlingSort}</Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderFieldingItem = ({ item, index }: { item: any; index: number }) => {
    const player = item.playerId || {};
    const stats = item.fielding || {};
    const displayName = getDisplayPlayerName(player);
    const team = item.team ? resolveDisplayTeam(player, item.team, selectedDivision) : null;
    const catches = stats.catches || 0;
    const runOuts = stats.runOuts || 0;
    const stumpings = stats.stumpings || 0;
    const totalDismissals = catches + runOuts + stumpings;

    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => handlePlayerPress(item.playerId)}>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.rank, { color: '#10B981' }]}>#{index + 1}</Text>
            <Avatar name={displayName} size={42} style={styles.avatar} />
            <View style={styles.info}>
              <View style={styles.nameAndTeamRow}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{displayName}</Text>
                {team ? (
                  <View style={[styles.teamBadge, { backgroundColor: colors.surfaceLighter || 'rgba(255,255,255,0.06)', borderColor: colors.border }]}>
                    <TeamLogo
                      shortName={team.shortName}
                      teamName={team.name}
                      teamId={team.teamId}
                      playerName={displayName}
                      country={player.country}
                      logoUrl={team.logo}
                      fallbackEmoji={team.flag}
                      size={16}
                    />
                    <Text style={[styles.teamBadgeText, { color: team.color || colors.text }]}>
                      {team.shortName || team.name}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.subText, { color: colors.textMuted }]}>
                Catches: <Text style={{ color: colors.text, fontWeight: '700' }}>{catches}</Text> | Run Outs: <Text style={{ color: colors.primary, fontWeight: '700' }}>{runOuts}</Text>
              </Text>
              <Text style={[styles.subText, { color: colors.textMuted, fontSize: 10, marginTop: 2 }]}>
                Stumpings: {stumpings} | Matches: {item.matches || 0}
              </Text>
            </View>
            <View style={styles.statsRight}>
              <Text style={[styles.mainStat, { color: '#10B981' }]}>
                {fieldingSort === 'Catches' ? catches :
                 fieldingSort === 'Run Outs' ? runOuts :
                 fieldingSort === 'Stumpings' ? stumpings :
                 totalDismissals}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                {fieldingSort === 'Total Dismissals' ? 'Dismissals' : fieldingSort}
              </Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderRecordCard = ({ item }: { item: any }) => {
    const isPlayerRecord = !!item.player;
    const displayName = isPlayerRecord ? getDisplayPlayerName(item.player) : null;
    const formattedDate = item.date
      ? new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;

    return (
      <TouchableOpacity
        activeOpacity={isPlayerRecord ? 0.7 : 1}
        onPress={() => isPlayerRecord && handlePlayerPress(item.player)}
        disabled={!isPlayerRecord}
      >
        <Card
          style={[
            styles.recordCard,
            {
              borderColor: isDarkMode ? 'rgba(245, 158, 11, 0.28)' : 'rgba(245, 158, 11, 0.4)',
              backgroundColor: isDarkMode ? '#141824' : '#FFFFFF',
            },
          ]}
        >
          {/* Record Header: Badge & Date */}
          <View style={styles.recordHeaderRow}>
            <View style={styles.recordTagContainer}>
              <Text style={styles.recordBadgeText}>{item.badge || '🏆 RECORD'}</Text>
            </View>
            <Text style={[styles.recordDateText, { color: colors.textMuted }]}>
              {formattedDate ? `📅 ${formattedDate}` : '⭐ All-Time Record'}
            </Text>
          </View>

          {/* Record Title */}
          <Text style={[styles.recordTitle, { color: colors.text }]}>{item.title}</Text>

          {/* Hero Stat Box */}
          <View
            style={[
              styles.recordStatBox,
              {
                backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.1)',
                borderColor: 'rgba(245, 158, 11, 0.25)',
              },
            ]}
          >
            <Text style={styles.recordHeroValue}>{item.statValue}</Text>
            <Text style={[styles.recordHeroLabel, { color: colors.textMuted }]}>{item.statLabel}</Text>
          </View>

          {/* Record Holder Row */}
          <View style={styles.recordHolderRow}>
            {isPlayerRecord && (
              <Avatar name={displayName || item.player.name} size={40} style={{ marginRight: 10 }} />
            )}

            <View style={{ flex: 1 }}>
              <View style={styles.recordHolderNameRow}>
                {isPlayerRecord && (
                  <Text style={[styles.recordHolderName, { color: colors.text }]} numberOfLines={1}>
                    {displayName}
                  </Text>
                )}

                {item.team ? (
                  <View
                    style={[
                      styles.teamBadge,
                      {
                        backgroundColor: colors.surfaceLighter || 'rgba(255,255,255,0.06)',
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <TeamLogo
                      shortName={item.team.shortName}
                      teamName={item.team.name}
                      teamId={item.team.teamId}
                      playerName={displayName || ''}
                      logoUrl={item.team.logo}
                      fallbackEmoji={item.team.flag}
                      size={16}
                    />
                    <Text style={[styles.teamBadgeText, { color: item.team.color || colors.text }]}>
                      {item.team.shortName || item.team.name}
                    </Text>
                  </View>
                ) : null}

                {item.opponent ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>vs</Text>
                    <View
                      style={[
                        styles.teamBadge,
                        {
                          backgroundColor: colors.surfaceLighter || 'rgba(255,255,255,0.06)',
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <TeamLogo
                        shortName={item.opponent.shortName}
                        teamName={item.opponent.name}
                        teamId={item.opponent.teamId}
                        logoUrl={item.opponent.logo}
                        fallbackEmoji={item.opponent.flag}
                        size={16}
                      />
                      <Text style={[styles.teamBadgeText, { color: item.opponent.color || colors.text }]}>
                        {item.opponent.shortName || item.opponent.name}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>

              {item.details ? (
                <Text style={[styles.recordDetailsText, { color: colors.textMuted }]} numberOfLines={2}>
                  {item.details}
                </Text>
              ) : null}
            </View>

            {isPlayerRecord && (
              <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const getRankingsData = () => {
    if (rankingCategory === 'all-rounders') return rankings.topAllRounders || [];
    if (rankingCategory === 'bowlers' || (activeTab === 'bowling' && rankingCategory !== 'batters')) return rankings.topBowlers || [];
    return rankings.topBatters || [];
  };

  const renderRankingCard = ({ item, index }: any) => {
    const isGold = index === 0;
    const isSilver = index === 1;
    const isBronze = index === 2;

    const rankBadgeColor = isGold ? '#F59E0B' : isSilver ? '#94A3B8' : isBronze ? '#D97706' : colors.primary;
    const rankLabel = isGold ? '👑 #1' : isSilver ? '🥈 #2' : isBronze ? '🥉 #3' : `#${index + 1}`;

    const displayName = KNOWN_FULL_NAMES[(item.playerName || '').toLowerCase()] || item.playerName || 'Player';

    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => handlePlayerPress(item)}>
        <Card
          style={[
            styles.card,
            isGold && {
              borderColor: 'rgba(245, 158, 11, 0.45)',
              borderWidth: 1.5,
              backgroundColor: isDarkMode ? '#171923' : '#FFFDF5',
            },
          ]}
        >
          <View style={styles.row}>
            {/* Rank Badge + Trend */}
            <View style={{ alignItems: 'center', minWidth: 46, marginRight: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: rankBadgeColor }}>
                {rankLabel}
              </Text>
              {item.trend && (
                <View
                  style={{
                    marginTop: 3,
                    paddingHorizontal: 5,
                    paddingVertical: 1.5,
                    borderRadius: 4,
                    backgroundColor: item.trend.isNew
                      ? 'rgba(6, 182, 212, 0.12)'
                      : item.trend.change > 0
                      ? 'rgba(16, 185, 129, 0.14)'
                      : item.trend.change < 0
                      ? 'rgba(239, 68, 68, 0.14)'
                      : 'rgba(148, 163, 184, 0.12)',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: '800',
                      color: item.trend.isNew
                        ? '#06B6D4'
                        : item.trend.change > 0
                        ? '#10B981'
                        : item.trend.change < 0
                        ? '#EF4444'
                        : '#94A3B8',
                    }}
                  >
                    {item.trend.isNew
                      ? 'NEW'
                      : item.trend.change > 0
                      ? `▲ +${item.trend.change}`
                      : item.trend.change < 0
                      ? `▼ ${Math.abs(item.trend.change)}`
                      : '▬ 0'}
                  </Text>
                </View>
              )}
            </View>

            <Avatar name={displayName} size={42} style={styles.avatar} />

            <View style={styles.info}>
              <View style={styles.nameAndTeamRow}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                  {displayName}
                </Text>
              </View>

              {/* Batting Ranking Stats */}
              {rankingCategory === 'batters' && item.stats && (
                <>
                  <Text style={[styles.subText, { color: colors.textMuted }]}>
                    Runs/M: <Text style={{ color: colors.text, fontWeight: '700' }}>{item.stats.runsPerMatch}</Text> | Avg: <Text style={{ color: colors.primary, fontWeight: '700' }}>{item.stats.average}</Text> | SR: {item.stats.strikeRate}
                  </Text>
                  <Text style={[styles.subText, { color: colors.textMuted, fontSize: 10, marginTop: 2 }]}>
                    Runs: {item.stats.runs} | Inngs: {item.stats.innings} | Cons: {item.components?.consistencyScore || 50}%
                  </Text>
                </>
              )}

              {/* Bowling Ranking Stats */}
              {rankingCategory === 'bowlers' && item.stats && (
                <>
                  <Text style={[styles.subText, { color: colors.textMuted }]}>
                    W/M: <Text style={{ color: colors.text, fontWeight: '700' }}>{item.stats.wicketsPerMatch}</Text> | Econ: <Text style={{ color: colors.primary, fontWeight: '700' }}>{item.stats.economy}</Text> | Avg: {item.stats.average}
                  </Text>
                  <Text style={[styles.subText, { color: colors.textMuted, fontSize: 10, marginTop: 2 }]}>
                    Overs: {item.stats.overs} ({item.stats.legalBalls}b) | Wickets: {item.stats.wickets}
                  </Text>
                </>
              )}

              {/* All-Rounder Ranking Stats */}
              {rankingCategory === 'all-rounders' && item.stats && (
                <>
                  <Text style={[styles.subText, { color: colors.textMuted }]}>
                    Bat: <Text style={{ color: '#10B981', fontWeight: '700' }}>{item.battingRating || 'N/A'}</Text> | Bowl: <Text style={{ color: '#3B82F6', fontWeight: '700' }}>{item.bowlingRating || 'N/A'}</Text>
                  </Text>
                  <Text style={[styles.subText, { color: colors.textMuted, fontSize: 10, marginTop: 2 }]}>
                    Runs: {item.stats.runs} ({item.stats.ballsFaced}b) | Wkts: {item.stats.wickets} ({item.stats.oversBowled} ov)
                  </Text>
                </>
              )}
            </View>

            {/* Rating Points Badge */}
            <View style={[styles.statsRight, { minWidth: 62, alignItems: 'flex-end' }]}>
              <View
                style={{
                  backgroundColor: isGold
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(59, 130, 246, 0.12)',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: isGold
                    ? 'rgba(245, 158, 11, 0.4)'
                    : 'rgba(59, 130, 246, 0.25)',
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '900',
                    color: isGold ? '#F59E0B' : colors.primary,
                  }}
                >
                  {item.rating || item.rawRating || 0}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: '800',
                  color: colors.textMuted,
                  marginTop: 2,
                  letterSpacing: 0.5,
                }}
              >
                RATING
              </Text>
              <Text
                style={{
                  fontSize: 8,
                  fontWeight: '800',
                  color: rankingWindow === 'recent' ? '#10B981' : '#8B5CF6',
                  marginTop: 1,
                  letterSpacing: 0.3,
                }}
              >
                {rankingWindow === 'recent' ? 'FORM (10M)' : 'CAREER'}
              </Text>
            </View>

            <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const getSortedData = () => {
    if (activeTab === 'batting') {
      let data = [...leaderboard.topBatsmen];
      return data.sort((a, b) => {
        const statsA = a.batting || {};
        const statsB = b.batting || {};
        
        const srA = statsA.balls > 0 ? (statsA.runs / statsA.balls) * 100 : 0;
        const srB = statsB.balls > 0 ? (statsB.runs / statsB.balls) * 100 : 0;
        
        const outsA = statsA.matches - (statsA.notOuts || 0);
        const avgA = outsA > 0 ? statsA.runs / outsA : statsA.runs;
        
        const outsB = statsB.matches - (statsB.notOuts || 0);
        const avgB = outsB > 0 ? statsB.runs / outsB : statsB.runs;

        switch(battingSort) {
          case 'Runs': return statsB.runs - statsA.runs;
          case 'Average': return avgB - avgA;
          case 'Strike Rate': return srB - srA;
          case 'Highest Score': return (statsB.highestScore || 0) - (statsA.highestScore || 0);
          case 'Sixes': return statsB.sixes - statsA.sixes;
          case 'Fours': return statsB.fours - statsA.fours;
          case '50s': return statsB.fifties - statsA.fifties;
          case '100s': return statsB.hundreds - statsA.hundreds;
          case 'Fastest 50': {
            const valA = statsA.fastestFifty && statsA.fastestFifty > 0 ? statsA.fastestFifty : 999999;
            const valB = statsB.fastestFifty && statsB.fastestFifty > 0 ? statsB.fastestFifty : 999999;
            if (valA !== valB) return valA - valB;
            return (statsB.fifties || 0) - (statsA.fifties || 0);
          }
          case 'Fastest 100': {
            const valA = statsA.fastestHundred && statsA.fastestHundred > 0 ? statsA.fastestHundred : 999999;
            const valB = statsB.fastestHundred && statsB.fastestHundred > 0 ? statsB.fastestHundred : 999999;
            if (valA !== valB) return valA - valB;
            return (statsB.hundreds || 0) - (statsA.hundreds || 0);
          }
          case 'MVPs': return (b.mvps || 0) - (a.mvps || 0) || ((statsB.runs || 0) - (statsA.runs || 0));
          default: return statsB.runs - statsA.runs;
        }
      });
    } else if (activeTab === 'bowling') {
      let data = [...(leaderboard.topBowlers || [])];
      return data.sort((a, b) => {
        const statsA = a.bowling || {};
        const statsB = b.bowling || {};

        const econA = statsA.overs > 0 ? (statsA.runsConceded / statsA.overs) : 999;
        const econB = statsB.overs > 0 ? (statsB.runsConceded / statsB.overs) : 999;

        const avgA = statsA.wickets > 0 ? (statsA.runsConceded / statsA.wickets) : 999;
        const avgB = statsB.wickets > 0 ? (statsB.runsConceded / statsB.wickets) : 999;

        switch(bowlingSort) {
          case 'Wickets': return statsB.wickets - statsA.wickets;
          case 'Economy': return econA - econB;
          case 'Average': return avgA - avgB;
          case 'Maidens': return (statsB.maidens || 0) - (statsA.maidens || 0);
          case 'MVPs': return (b.mvps || 0) - (a.mvps || 0) || ((statsB.wickets || 0) - (statsA.wickets || 0));
          default: return statsB.wickets - statsA.wickets;
        }
      });
    } else {
      let data = [...(leaderboard.topFielders || [])];
      return data.sort((a, b) => {
        const statsA = a.fielding || {};
        const statsB = b.fielding || {};
        const catA = statsA.catches || 0;
        const catB = statsB.catches || 0;
        const roA = statsA.runOuts || 0;
        const roB = statsB.runOuts || 0;
        const stA = statsA.stumpings || 0;
        const stB = statsB.stumpings || 0;
        const totA = catA + roA + stA;
        const totB = catB + roB + stB;

        switch(fieldingSort) {
          case 'Catches': return catB - catA || totB - totA;
          case 'Run Outs': return roB - roA || totB - totA;
          case 'Stumpings': return stB - stA || totB - totA;
          case 'Total Dismissals': return totB - totA || catB - catA;
          default: return catB - catA;
        }
      });
    }
  };

  const getRecordsData = () => {
    if (recordsCategory === 'rankings') return records.rankings || [];
    if (recordsCategory === 'batting') return records.batting || [];
    if (recordsCategory === 'bowling') return records.bowling || [];
    if (recordsCategory === 'team') return records.team || [];
    return [
      ...(records.rankings || []),
      ...(records.batting || []),
      ...(records.bowling || []),
      ...(records.team || []),
    ];
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Auto-Hiding Collapsible Header: slides up on scroll down, comes back on reverse scroll */}
      <Animated.View
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && Math.abs(h - headerHeight) > 2) {
            setHeaderHeight(h);
          }
        }}
        style={[
          styles.headerContainer,
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            backgroundColor: colors.background,
            transform: [{ translateY: headerTranslateY }],
          }
        ]}
      >
        <View style={styles.topSectionPadding}>
          {/* Real Cricket Style Division / Tournament Selector */}
          <View style={[styles.divisionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.divisionHeaderRow}>
              <Text style={[styles.divisionTitle, { color: colors.text }]}>🏆 Cricket Division</Text>
              <Text style={[styles.divisionBadge, { color: colors.primary, backgroundColor: colors.primary + '18' }]}>
                {selectedDivision === 'all' ? 'All Competitions' : selectedDivision === 'international' ? 'ICC International' : 'IPL Franchise'}
              </Text>
            </View>
            <View style={styles.divisionBtnRow}>
              {[
                { key: 'all', label: 'All', icon: '🌐' },
                { key: 'international', label: 'International', icon: '🇮🇳' },
                { key: 'ipl', label: 'IPL', icon: '🏏' }
              ].map(d => (
                <TouchableOpacity
                  key={d.key}
                  style={[
                    styles.divisionBtn,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    selectedDivision === d.key && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => handleDivisionChange(d.key as any)}
                >
                  <Text style={{ fontSize: 13, marginRight: 4 }}>{d.icon}</Text>
                  <Text
                    style={[
                      styles.divisionBtnText,
                      { color: selectedDivision === d.key ? '#fff' : colors.text },
                      selectedDivision === d.key && { fontWeight: '800' }
                    ]}
                  >
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 3-Tab Switcher: Batters, Bowlers, Fielders */}
          <View style={styles.tabSwitcher}>
            <TouchableOpacity 
              style={[
                styles.tabBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
                activeTab === 'batting' && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => handleTabChange('batting')}
            >
              <Text style={[styles.tabBtnText, { color: activeTab === 'batting' ? '#fff' : colors.text, fontWeight: activeTab === 'batting' ? '800' : '600' }]}>🏏 Batters</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.tabBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
                activeTab === 'bowling' && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => handleTabChange('bowling')}
            >
              <Text style={[styles.tabBtnText, { color: activeTab === 'bowling' ? '#fff' : colors.text, fontWeight: activeTab === 'bowling' ? '800' : '600' }]}>🎯 Bowlers</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.tabBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
                activeTab === 'fielding' && { backgroundColor: '#10B981', borderColor: '#10B981' }
              ]}
              onPress={() => handleTabChange('fielding')}
            >
              <Text style={[styles.tabBtnText, { color: activeTab === 'fielding' ? '#fff' : colors.text, fontWeight: activeTab === 'fielding' ? '900' : '700' }]}>🧤 Fielders</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
            {activeTab === 'fielding' ? (
              fieldingFilters.map(filter => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterPill,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    fieldingSort === filter && { backgroundColor: '#10B981', borderColor: '#10B981' }
                  ]}
                  onPress={() => setFieldingSort(filter)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: colors.textMuted },
                      fieldingSort === filter && { color: '#fff', fontWeight: '800' }
                    ]}
                  >
                    {filter === 'Catches' ? '🧤 ' : filter === 'Run Outs' ? '⚡ ' : filter === 'Stumpings' ? '🏏 ' : '🛡️ '}
                    {filter}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <>
                {(activeTab === 'batting' ? battingFilters : bowlingFilters).map(filter => {
                  const isCurrent = (activeTab === 'batting' ? battingSort : bowlingSort) === filter;
                  const isRankFilter = filter === '⭐ Ranking';

                  return (
                    <TouchableOpacity 
                      key={filter} 
                      style={[
                        styles.filterPill, 
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        isCurrent && {
                          backgroundColor: isRankFilter ? '#8B5CF6' : colors.primary,
                          borderColor: isRankFilter ? '#8B5CF6' : colors.primary,
                        }
                      ]}
                      onPress={() => {
                        if (activeTab === 'batting') {
                          setBattingSort(filter);
                          if (filter === '⭐ Ranking') {
                            setRankingCategory('batters');
                            fetchRankingsData(rankingFormat, rankingScope, rankingWindow);
                          }
                        } else {
                          setBowlingSort(filter);
                          if (filter === '⭐ Ranking') {
                            setRankingCategory('bowlers');
                            fetchRankingsData(rankingFormat, rankingScope, rankingWindow);
                          }
                        }
                      }}
                    >
                      <Text style={[
                        styles.filterText, 
                        { color: colors.textMuted },
                        isCurrent && { color: '#fff', fontWeight: 'bold' }
                      ]}>
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Mode, Format, and All-Rounder selectors when ⭐ Ranking is selected */}
                {((activeTab === 'batting' && battingSort === '⭐ Ranking') || (activeTab === 'bowling' && bowlingSort === '⭐ Ranking')) && (
                  <>
                    <View style={{ width: 1, height: 18, backgroundColor: colors.border, alignSelf: 'center', marginHorizontal: 6 }} />
                    
                    {/* Dual-Mode Selector: Recent 10 (Current Form) vs All-Time Career */}
                    <TouchableOpacity
                      style={[
                        styles.filterPill,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        rankingWindow === 'recent' && { backgroundColor: '#10B981', borderColor: '#10B981' }
                      ]}
                      onPress={() => {
                        setRankingWindow('recent');
                        fetchRankingsData(rankingFormat, rankingScope, 'recent');
                      }}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          { color: colors.textMuted },
                          rankingWindow === 'recent' && { color: '#fff', fontWeight: '800' }
                        ]}
                      >
                        🔥 Recent 10 (Form)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.filterPill,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        rankingWindow === 'all' && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }
                      ]}
                      onPress={() => {
                        setRankingWindow('all');
                        fetchRankingsData(rankingFormat, rankingScope, 'all');
                      }}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          { color: colors.textMuted },
                          rankingWindow === 'all' && { color: '#fff', fontWeight: '800' }
                        ]}
                      >
                        🏛️ All-Time Career
                      </Text>
                    </TouchableOpacity>

                    <View style={{ width: 1, height: 18, backgroundColor: colors.border, alignSelf: 'center', marginHorizontal: 6 }} />

                    {(['T20', 'ODI', 'Test'] as const).map(fmt => (
                      <TouchableOpacity
                        key={fmt}
                        style={[
                          styles.filterPill,
                          { backgroundColor: colors.surface, borderColor: colors.border },
                          rankingFormat === fmt && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }
                        ]}
                        onPress={() => {
                          setRankingFormat(fmt);
                          fetchRankingsData(fmt, rankingScope, rankingWindow);
                        }}
                      >
                        <Text
                          style={[
                            styles.filterText,
                            { color: colors.textMuted },
                            rankingFormat === fmt && { color: '#fff', fontWeight: '800' }
                          ]}
                        >
                          {fmt}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                      style={[
                        styles.filterPill,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        rankingCategory === 'all-rounders' && { backgroundColor: '#10B981', borderColor: '#10B981' }
                      ]}
                      onPress={() => {
                        const nextCat = rankingCategory === 'all-rounders'
                          ? (activeTab === 'batting' ? 'batters' : 'bowlers')
                          : 'all-rounders';
                        setRankingCategory(nextCat);
                      }}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          { color: rankingCategory === 'all-rounders' ? '#fff' : colors.textMuted, fontWeight: rankingCategory === 'all-rounders' ? '800' : '600' }
                        ]}
                      >
                        ⚡ All-Rounders
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Animated.View>

      {/* FlatList Section */}
      {(() => {
        const isRankingActive =
          (activeTab === 'batting' && battingSort === '⭐ Ranking') ||
          (activeTab === 'bowling' && bowlingSort === '⭐ Ranking');

        return (
          <Animated.FlatList
            ref={flatListRef}
            data={
              isLoading
                ? []
                : (isRankingActive
                    ? getRankingsData()
                    : getSortedData())
            }
            keyExtractor={(item: any, idx: number) => (item.id ? `${item.id}-${idx}` : (item._id ? `${item._id}-${idx}` : (item.playerId ? `${typeof item.playerId === 'object' ? item.playerId._id : item.playerId}-${idx}` : String(idx))))}
            contentContainerStyle={[
              styles.list,
              { paddingTop: headerHeight + 8 }
            ]}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            renderItem={
              isRankingActive
                ? renderRankingCard
                : (activeTab === 'batting'
                    ? renderBattingItem
                    : (activeTab === 'bowling'
                        ? renderBowlingItem
                        : renderFieldingItem))
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              isLoading ? (
                <View style={styles.loader}>
                  <ActivityIndicator
                    size="large"
                    color={
                      isRankingActive
                        ? '#8B5CF6'
                        : (activeTab === 'fielding' ? '#10B981' : colors.primary)
                    }
                  />
                  <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 13, fontWeight: '600' }}>
                    {isRankingActive
                      ? 'Calculating official format ratings...'
                      : (activeTab === 'fielding' ? 'Loading fielding leaderboard...' : 'Loading stats...')}
                  </Text>
                </View>
              ) : (
                <View style={styles.empty}>
                  <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                    {isRankingActive
                      ? `No qualified ${rankingCategory} found for ${rankingFormat} (${rankingScope}) rankings yet.\nPlay more matches in this format to meet qualification criteria!`
                      : `No ${activeTab} stats recorded yet in this division.`}
                  </Text>
                </View>
              )
            }
          />
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  headerContainer: {
    marginBottom: 4,
  },
  topSectionPadding: {
    paddingHorizontal: 16,
  },
  divisionCard: {
    marginHorizontal: 0,
    marginTop: 10,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  divisionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  divisionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  divisionBadge: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  divisionBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  divisionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  divisionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabSwitcher: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 4,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  tabBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  filtersContainer: {
    paddingVertical: 6,
    marginBottom: 4,
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
  },
  filterText: {
    fontSize: 12,
  },
  loader: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 140,
    gap: 10,
  },
  card: {
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rank: {
    fontSize: 18,
    fontWeight: '900',
    marginRight: 10,
    width: 32,
  },
  avatar: {
    marginRight: 10,
  },
  info: {
    flex: 1,
  },
  nameAndTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    gap: 3,
  },
  teamBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subText: {
    fontSize: 12,
    marginTop: 4,
  },
  statsRight: {
    alignItems: 'flex-end',
    marginLeft: 6,
  },
  mainStat: {
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  chevron: {
    fontSize: 22,
    fontWeight: '400',
    marginLeft: 8,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  // Records Specific Styles
  recordCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.2,
  },
  recordHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recordTagContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recordBadgeText: {
    color: '#F59E0B',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  recordDateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  recordStatBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  recordHeroValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.3,
  },
  recordHeroLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  recordHolderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordHolderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  recordHolderName: {
    fontSize: 14,
    fontWeight: '800',
  },
  recordDetailsText: {
    fontSize: 11.5,
    fontWeight: '500',
    lineHeight: 16,
  },
});
