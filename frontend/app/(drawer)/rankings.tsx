import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../components/Theme';
import { useDrawerStore } from '../../store/drawerStore';
import Card from '../../components/Card';
import Avatar from '../../components/Avatar';
import api from '../../services/api';
import Svg, { Path } from 'react-native-svg';

const HamburgerIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill={color} />
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
  'y kuldeep': 'Kuldeep Yadav',
  'k yadav': 'Kuldeep Yadav',
  's dube': 'Shivam Dube',
  'r sharma': 'Rohit Sharma',
  'v kohli': 'Virat Kohli',
  't varma': 'Tilak Varma',
  'm shami': 'Mohammed Shami',
  'r jadeja': 'Ravindra Jadeja',
  'kl rahul': 'KL Rahul',
  's iyer': 'Shreyas Iyer',
};

export default function RankingsDrawerScreen() {
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const openDrawer = useDrawerStore((state) => state.openDrawer);

  const [isLoading, setIsLoading] = useState(true);
  const [format, setFormat] = useState<'T20' | 'ODI' | 'Test'>('T20');
  const [category, setCategory] = useState<'batters' | 'bowlers' | 'all-rounders'>('batters');
  const [scope, setScope] = useState<'career' | 'tournament'>('career');

  // Time-based filtering state
  const [timeFilter, setTimeFilter] = useState<'all' | 'year' | '30days' | 'custom'>('all');
  const [selectedAsOfDate, setSelectedAsOfDate] = useState<string | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [customDateInput, setCustomDateInput] = useState('');

  const [rankings, setRankings] = useState<{
    asOfDate?: string | null;
    availableMatchDates?: string[];
    totalMatchesCount?: number;
    topBatters: any[];
    topBowlers: any[];
    topAllRounders: any[];
  }>({
    asOfDate: null,
    availableMatchDates: [],
    totalMatchesCount: 0,
    topBatters: [],
    topBowlers: [],
    topAllRounders: [],
  });

  const fetchRankings = async (
    fmt = format,
    scp = scope,
    tFilter = timeFilter,
    asOf = selectedAsOfDate
  ) => {
    setIsLoading(true);
    try {
      let queryParams = `/players/rankings?format=${fmt}&scope=${scp}&limit=10`;
      if (tFilter === 'year') {
        const currentYear = new Date().getFullYear();
        queryParams += `&startDate=${currentYear}-01-01`;
      } else if (tFilter === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        queryParams += `&startDate=${d.toISOString().split('T')[0]}`;
      } else if (tFilter === 'custom' && asOf) {
        queryParams += `&asOfDate=${asOf}`;
      }

      const res = await api.get(queryParams);
      if (res?.data?.success) {
        setRankings(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching rankings in drawer:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRankings(format, scope, timeFilter, selectedAsOfDate);
    }, [format, scope, timeFilter, selectedAsOfDate])
  );

  const getCurrentList = () => {
    if (category === 'batters') return rankings.topBatters || [];
    if (category === 'bowlers') return rankings.topBowlers || [];
    return rankings.topAllRounders || [];
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

  const handleApplyCustomDate = (dateStr: string) => {
    if (!dateStr || dateStr.trim() === '') return;
    const cleanDate = dateStr.trim();
    setSelectedAsOfDate(cleanDate);
    setTimeFilter('custom');
    setIsDatePickerVisible(false);
    fetchRankings(format, scope, 'custom', cleanDate);
  };

  const handleResetToAllTime = () => {
    setTimeFilter('all');
    setSelectedAsOfDate(null);
    fetchRankings(format, scope, 'all', null);
  };

  const renderRankingItem = ({ item, index }: any) => {
    const isGold = index === 0;
    const isSilver = index === 1;
    const isBronze = index === 2;

    const rankBadgeColor = isGold ? '#F59E0B' : isSilver ? '#94A3B8' : isBronze ? '#D97706' : colors.primary;
    const rankLabel = isGold ? '👑 #1' : isSilver ? '🥈 #2' : isBronze ? '🥉 #3' : `#${index + 1}`;

    const displayName =
      KNOWN_FULL_NAMES[(item.playerName || '').toLowerCase()] || item.playerName || 'Player';

    const trend = item.trend;

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
          <View style={styles.cardRow}>
            {/* Rank badge + Trend Movement Pill */}
            <View style={{ alignItems: 'center', minWidth: 46, marginRight: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: rankBadgeColor }}>
                {rankLabel}
              </Text>

              {trend && (
                <View
                  style={{
                    marginTop: 3,
                    paddingHorizontal: 5,
                    paddingVertical: 1.5,
                    borderRadius: 4,
                    backgroundColor: trend.isNew
                      ? 'rgba(6, 182, 212, 0.12)'
                      : trend.change > 0
                      ? 'rgba(16, 185, 129, 0.14)'
                      : trend.change < 0
                      ? 'rgba(239, 68, 68, 0.14)'
                      : 'rgba(148, 163, 184, 0.12)',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: '800',
                      color: trend.isNew
                        ? '#06B6D4'
                        : trend.change > 0
                        ? '#10B981'
                        : trend.change < 0
                        ? '#EF4444'
                        : '#94A3B8',
                    }}
                  >
                    {trend.isNew
                      ? 'NEW'
                      : trend.change > 0
                      ? `▲ +${trend.change}`
                      : trend.change < 0
                      ? `▼ ${Math.abs(trend.change)}`
                      : '▬ 0'}
                  </Text>
                </View>
              )}
            </View>

            <Avatar name={displayName} size={42} style={styles.avatar} />

            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {displayName}
              </Text>

              {/* Batting metrics */}
              {category === 'batters' && item.stats && (
                <>
                  <Text style={[styles.subText, { color: colors.textMuted }]}>
                    Runs/M: <Text style={{ color: colors.text, fontWeight: '700' }}>{item.stats.runsPerMatch}</Text> | Avg: <Text style={{ color: colors.primary, fontWeight: '700' }}>{item.stats.average}</Text> | SR: {item.stats.strikeRate}
                  </Text>
                  <Text style={[styles.subText, { color: colors.textMuted, fontSize: 10, marginTop: 2 }]}>
                    Runs: {item.stats.runs} | Inngs: {item.stats.innings} | Cons: {item.components?.consistencyScore || 50}%
                  </Text>
                </>
              )}

              {/* Bowling metrics */}
              {category === 'bowlers' && item.stats && (
                <>
                  <Text style={[styles.subText, { color: colors.textMuted }]}>
                    W/M: <Text style={{ color: colors.text, fontWeight: '700' }}>{item.stats.wicketsPerMatch}</Text> | Econ: <Text style={{ color: colors.primary, fontWeight: '700' }}>{item.stats.economy}</Text> | Avg: {item.stats.average}
                  </Text>
                  <Text style={[styles.subText, { color: colors.textMuted, fontSize: 10, marginTop: 2 }]}>
                    Overs: {item.stats.overs} ({item.stats.legalBalls} balls) | Wickets: {item.stats.wickets}
                  </Text>
                </>
              )}

              {/* All-Rounder metrics */}
              {category === 'all-rounders' && item.stats && (
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

            {/* Rating points badge */}
            <View style={{ minWidth: 62, alignItems: 'flex-end', marginLeft: 8 }}>
              <View
                style={{
                  backgroundColor: isGold ? 'rgba(245, 158, 11, 0.15)' : 'rgba(139, 92, 246, 0.12)',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: isGold ? 'rgba(245, 158, 11, 0.4)' : 'rgba(139, 92, 246, 0.25)',
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '900',
                    color: isGold ? '#F59E0B' : '#8B5CF6',
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
            </View>

            <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const currentData = getCurrentList();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            paddingTop: insets.top + (Platform.OS === 'ios' ? 8 : 12),
          },
        ]}
      >
        <TouchableOpacity onPress={openDrawer} style={styles.headerBtn}>
          <HamburgerIcon color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>ICC Player Rankings</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Selectors Bar */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {/* Category Selector */}
        <View style={styles.categoryRow}>
          {[
            { key: 'batters', label: '🏏 Batters' },
            { key: 'bowlers', label: '🎯 Bowlers' },
            { key: 'all-rounders', label: '⚡ All-Rounders' },
          ].map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[
                styles.categoryBtn,
                { borderColor: colors.border, backgroundColor: colors.background },
                category === c.key && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
              ]}
              onPress={() => setCategory(c.key as any)}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: category === c.key ? '#fff' : colors.text },
                  category === c.key && { fontWeight: '800' },
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Format & Scope Filter Row */}
        <View style={styles.subFilterRow}>
          {/* Formats */}
          <View style={styles.pillGroup}>
            {(['T20', 'ODI', 'Test'] as const).map((fmt) => (
              <TouchableOpacity
                key={fmt}
                style={[
                  styles.subPill,
                  { borderColor: colors.border, backgroundColor: colors.background },
                  format === fmt && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => {
                  setFormat(fmt);
                  fetchRankings(fmt, scope, timeFilter, selectedAsOfDate);
                }}
              >
                <Text
                  style={[
                    styles.subPillText,
                    { color: format === fmt ? '#fff' : colors.textMuted },
                    format === fmt && { fontWeight: '800' },
                  ]}
                >
                  {fmt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Scopes */}
          <View style={styles.pillGroup}>
            {(['career', 'tournament'] as const).map((scp) => (
              <TouchableOpacity
                key={scp}
                style={[
                  styles.subPill,
                  { borderColor: colors.border, backgroundColor: colors.background },
                  scope === scp && { backgroundColor: 'rgba(139, 92, 246, 0.15)', borderColor: '#8B5CF6' },
                ]}
                onPress={() => {
                  setScope(scp);
                  fetchRankings(format, scp, timeFilter, selectedAsOfDate);
                }}
              >
                <Text
                  style={[
                    styles.subPillText,
                    { color: scope === scp ? '#8B5CF6' : colors.textMuted },
                    scope === scp && { fontWeight: '800' },
                  ]}
                >
                  {scp === 'career' ? '🏆 Career' : '🏟️ Tourney'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time-Based Period / As-Of Date Filter Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeFilterScroll}
        >
          <TouchableOpacity
            style={[
              styles.timePill,
              { borderColor: colors.border, backgroundColor: colors.background },
              timeFilter === 'all' && { backgroundColor: colors.surfaceLighter, borderColor: colors.primary },
            ]}
            onPress={handleResetToAllTime}
          >
            <Text
              style={[
                styles.timePillText,
                { color: timeFilter === 'all' ? colors.primary : colors.textMuted },
                timeFilter === 'all' && { fontWeight: '800' },
              ]}
            >
              🌐 All-Time
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.timePill,
              { borderColor: colors.border, backgroundColor: colors.background },
              timeFilter === 'year' && { backgroundColor: colors.surfaceLighter, borderColor: colors.primary },
            ]}
            onPress={() => {
              setTimeFilter('year');
              setSelectedAsOfDate(null);
              fetchRankings(format, scope, 'year', null);
            }}
          >
            <Text
              style={[
                styles.timePillText,
                { color: timeFilter === 'year' ? colors.primary : colors.textMuted },
                timeFilter === 'year' && { fontWeight: '800' },
              ]}
            >
              📅 {new Date().getFullYear()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.timePill,
              { borderColor: colors.border, backgroundColor: colors.background },
              timeFilter === '30days' && { backgroundColor: colors.surfaceLighter, borderColor: colors.primary },
            ]}
            onPress={() => {
              setTimeFilter('30days');
              setSelectedAsOfDate(null);
              fetchRankings(format, scope, '30days', null);
            }}
          >
            <Text
              style={[
                styles.timePillText,
                { color: timeFilter === '30days' ? colors.primary : colors.textMuted },
                timeFilter === '30days' && { fontWeight: '800' },
              ]}
            >
              ⚡ Last 30 Days
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.timePill,
              { borderColor: colors.border, backgroundColor: colors.background },
              timeFilter === 'custom' && {
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                borderColor: '#8B5CF6',
              },
            ]}
            onPress={() => setIsDatePickerVisible(true)}
          >
            <Text
              style={[
                styles.timePillText,
                { color: timeFilter === 'custom' ? '#8B5CF6' : colors.textMuted },
                timeFilter === 'custom' && { fontWeight: '800' },
              ]}
            >
              {timeFilter === 'custom' && selectedAsOfDate ? `🗓️ As of: ${selectedAsOfDate}` : '🗓️ Pick Date'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Active As-Of-Date Notification Banner */}
        {timeFilter !== 'all' && (
          <View style={[styles.activeBanner, { backgroundColor: isDarkMode ? '#1e1b4b' : '#ede9fe' }]}>
            <Text style={[styles.activeBannerText, { color: '#8b5cf6' }]} numberOfLines={1}>
              {timeFilter === 'custom' && selectedAsOfDate
                ? `📅 Showing historical rankings as of ${selectedAsOfDate}`
                : timeFilter === 'year'
                ? `📅 Showing ${new Date().getFullYear()} season rankings`
                : '⚡ Showing last 30 days rankings'}
              {rankings.totalMatchesCount !== undefined ? ` (${rankings.totalMatchesCount} matches)` : ''}
            </Text>
            <TouchableOpacity onPress={handleResetToAllTime} style={styles.bannerResetBtn}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#8b5cf6' }}>✕ Reset</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Rankings List */}
      <FlatList
        data={isLoading ? [] : currentData}
        keyExtractor={(item, index) => `${item.playerId || index}-${index}`}
        renderItem={renderRankingItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                Calculating {format} {category} rankings...
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>⭐</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Qualified Players</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                No matches found or minimum sample requirements not met for {format} ({scope})
                {selectedAsOfDate ? ` up to ${selectedAsOfDate}` : ''}.
              </Text>
              {timeFilter !== 'all' && (
                <TouchableOpacity
                  style={[styles.resetEmptyBtn, { backgroundColor: '#8B5CF6' }]}
                  onPress={handleResetToAllTime}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Reset to All-Time</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />

      {/* Modal: Pick As-Of Date / Historical Point in Time */}
      <Modal
        visible={isDatePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDatePickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>📅 View Past Rankings</Text>
              <TouchableOpacity onPress={() => setIsDatePickerVisible(false)}>
                <Text style={{ fontSize: 18, color: colors.textMuted, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
              Select any past date to view who held the #1 spot and podium ranks on that exact day.
            </Text>

            {/* Quick Match Dates (if available from matches) */}
            {rankings.availableMatchDates && rankings.availableMatchDates.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <Text style={[styles.sectionSubtitle, { color: colors.text }]}>Recent Match Days:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                  {rankings.availableMatchDates.slice(0, 8).map((dStr) => (
                    <TouchableOpacity
                      key={dStr}
                      style={[
                        styles.quickDatePill,
                        { borderColor: colors.border, backgroundColor: colors.background },
                        selectedAsOfDate === dStr && {
                          borderColor: '#8B5CF6',
                          backgroundColor: 'rgba(139, 92, 246, 0.15)',
                        },
                      ]}
                      onPress={() => {
                        setCustomDateInput(dStr);
                        handleApplyCustomDate(dStr);
                      }}
                    >
                      <Text
                        style={[
                          styles.quickDateText,
                          { color: selectedAsOfDate === dStr ? '#8B5CF6' : colors.text },
                        ]}
                      >
                        {dStr}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Manual Date Input */}
            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>Or Enter Custom Date (YYYY-MM-DD):</Text>
            <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput
                style={[styles.dateInput, { color: colors.text }]}
                placeholder="e.g. 2026-05-15"
                placeholderTextColor={colors.textMuted}
                value={customDateInput}
                onChangeText={setCustomDateInput}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => handleApplyCustomDate(customDateInput)}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Apply</Text>
              </TouchableOpacity>
            </View>

            {/* Action buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { borderColor: colors.border }]}
                onPress={handleResetToAllTime}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 13 }}>
                  Clear & Show All-Time
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  filterBar: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 6,
  },
  categoryBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  pillGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  subPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  subPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timeFilterScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  timePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  timePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 2,
  },
  activeBannerText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  bannerResetBtn: {
    marginLeft: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  card: {
    padding: 12,
    marginBottom: 0,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 10,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  subText: {
    fontSize: 11,
  },
  chevron: {
    fontSize: 18,
    marginLeft: 6,
  },
  loaderContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingTop: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  resetEmptyBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  quickDatePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 6,
  },
  quickDateText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  dateInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
  },
  applyBtn: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  modalActions: {
    alignItems: 'center',
  },
  modalCloseBtn: {
    paddingVertical: 6,
  },
});
