import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../components/Theme';
import Card from '../components/Card';
import TeamLogo from '../components/TeamLogo';
import api from '../services/api';
import Svg, { Path } from 'react-native-svg';

const BackIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill={color} />
  </Svg>
);

const SearchIcon = ({ color }: { color: string }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <Path
      d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
      fill={color}
    />
  </Svg>
);

export default function TeamH2HScreen() {
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ teamId?: string }>();

  const targetTeamId = params.teamId || 'india';

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [selectedFormat, setSelectedFormat] = useState<'all' | 't20' | 'odi' | 'test'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOpponentId, setExpandedOpponentId] = useState<string | null>(null);

  const fetchH2H = async (fmt = selectedFormat, isRefresh = false) => {
    try {
      if (!isRefresh) setIsLoading(true);
      const res = await api.get(`/teams/head-to-head/${targetTeamId}?format=${fmt}`);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching head-to-head data:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchH2H(selectedFormat);
  }, [selectedFormat, targetTeamId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchH2H(selectedFormat, true);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(drawer)/teams' as any);
    }
  };

  const toggleExpand = (oppId: string) => {
    setExpandedOpponentId((prev) => (prev === oppId ? null : oppId));
  };

  const teamName = data?.team?.name || 'India';
  const summary = data?.summary || {
    totalPlayed: 0,
    totalWon: 0,
    totalLost: 0,
    totalTied: 0,
    totalNoResult: 0,
    overallWinPercentage: '0.0%',
  };

  const opponents = (data?.opponents || []).filter((opp: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (opp.opponentName || '').toLowerCase().includes(q) ||
      (opp.opponentShortName || '').toLowerCase().includes(q) ||
      (opp.teamId || '').toLowerCase().includes(q)
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={[styles.navHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.navHeaderLeft}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <BackIcon color={colors.text} />
          </TouchableOpacity>
          <View style={{ marginLeft: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.navTitle, { color: colors.text }]}>Head-to-Head Table</Text>
              <View style={[styles.flagPill, { backgroundColor: '#FF993320', borderColor: '#FF9933' }]}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#FF9933' }}>🇮🇳 {teamName.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
              Points & win/loss records vs all opponents
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleRefresh}
          style={[styles.refreshBtn, { backgroundColor: colors.surfaceLighter, borderColor: colors.border }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />}
      >
        {/* Format Selector Pills */}
        <View style={styles.formatRow}>
          {[
            { key: 'all', label: 'All Formats' },
            { key: 't20', label: 'T20 Matches' },
            { key: 'odi', label: 'ODI Matches' },
            { key: 'test', label: 'Test Matches' },
          ].map((fmt) => (
            <TouchableOpacity
              key={fmt.key}
              style={[
                styles.formatPill,
                { borderColor: colors.border, backgroundColor: colors.surface },
                selectedFormat === fmt.key && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setSelectedFormat(fmt.key as any)}
            >
              <Text
                style={[
                  styles.formatPillText,
                  { color: selectedFormat === fmt.key ? '#fff' : colors.textMuted },
                  selectedFormat === fmt.key && { fontWeight: '800' },
                ]}
              >
                {fmt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hero Overall Summary Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIdentity}>
              <TeamLogo
                teamName={teamName}
                shortName={data?.team?.shortName || 'IND'}
                teamId={data?.team?.teamId || 'INT_IND'}
                logoUrl={data?.team?.logo}
                size={46}
              />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.heroTeamName, { color: colors.text }]}>Team India</Text>
                <Text style={[styles.heroSubText, { color: colors.textMuted }]}>
                  {summary.totalPlayed} matches played against {opponents.length} international teams
                </Text>
              </View>
            </View>

            <View style={[styles.winRateBadge, { backgroundColor: '#10B98115', borderColor: '#10B98140' }]}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#10B981' }}>
                {summary.overallWinPercentage}
              </Text>
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#10B981', letterSpacing: 0.5 }}>WIN RATE</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Quick Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: colors.text }]}>{summary.totalPlayed}</Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>MATCHES (P)</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: '#10B981' }]}>{summary.totalWon}</Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>WON (W)</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: '#EF4444' }]}>{summary.totalLost}</Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>LOST (L)</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: '#F59E0B' }]}>{summary.totalTied}</Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>TIED (T)</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: colors.textMuted }]}>{summary.totalNoResult}</Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>NO RES (NR)</Text>
            </View>
          </View>
        </Card>

        {/* Search Bar for Opponents */}
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SearchIcon color={colors.textMuted} />
          <TextInput
            placeholder="Search opponent team (e.g. Australia, Pak)..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.trim() !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Head-to-Head Points Table</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Win = 2 pts • Tie/NR = 1 pt
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 13 }}>
              Calculating points table & match records...
            </Text>
          </View>
        ) : opponents.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={{ fontSize: 24, textAlign: 'center', marginBottom: 6 }}>🏏</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Opponents Found</Text>
            <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 13 }}>
              No matches found for this format filter or search query.
            </Text>
          </Card>
        ) : (
          <Card style={styles.tableCard}>
            {/* Table Header Row */}
            <View style={[styles.tableHeader, { borderBottomColor: colors.border, backgroundColor: colors.surfaceLighter }]}>
              <Text style={[styles.thCol, { flex: 3.2, textAlign: 'left', color: colors.textMuted }]}>OPPONENT</Text>
              <Text style={[styles.thCol, { color: colors.textMuted }]}>P</Text>
              <Text style={[styles.thCol, { color: '#10B981' }]}>W</Text>
              <Text style={[styles.thCol, { color: '#EF4444' }]}>L</Text>
              <Text style={[styles.thCol, { color: colors.textMuted }]}>T/NR</Text>
              <Text style={[styles.thCol, { color: colors.primary, fontWeight: '900' }]}>PTS</Text>
              <Text style={[styles.thCol, { flex: 1.8, textAlign: 'right', color: colors.textMuted }]}>WIN %</Text>
            </View>

            {/* Table Body Rows */}
            {opponents.map((opp: any, idx: number) => {
              const isExpanded = expandedOpponentId === opp.opponentId;
              const winPctNum = parseFloat(opp.winPercentage) || 0;
              const winPctColor = winPctNum >= 70 ? '#10B981' : winPctNum >= 50 ? colors.primary : '#F59E0B';

              return (
                <View key={opp.opponentId || idx} style={[styles.rowContainer, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity
                    style={[
                      styles.tableRow,
                      isExpanded && { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
                    ]}
                    onPress={() => toggleExpand(opp.opponentId)}
                    activeOpacity={0.7}
                  >
                    {/* Opponent Identity */}
                    <View style={styles.oppIdentityCol}>
                      <TeamLogo
                        teamName={opp.opponentName}
                        shortName={opp.opponentShortName}
                        teamId={opp.teamId}
                        logoUrl={opp.opponentLogo}
                        size={24}
                      />
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <Text style={[styles.oppNameText, { color: colors.text }]} numberOfLines={1}>
                          {opp.opponentName}
                        </Text>
                        <Text style={[styles.oppSubText, { color: colors.textMuted }]}>
                          {opp.opponentShortName || opp.teamId}
                        </Text>
                      </View>
                    </View>

                    {/* Stats Columns */}
                    <Text style={[styles.tdCol, { color: colors.text }]}>{opp.played}</Text>
                    <Text style={[styles.tdCol, { color: '#10B981', fontWeight: '800' }]}>{opp.won}</Text>
                    <Text style={[styles.tdCol, { color: '#EF4444', fontWeight: '800' }]}>{opp.lost}</Text>
                    <Text style={[styles.tdCol, { color: colors.textMuted }]}>{opp.tied + opp.noResult}</Text>
                    <Text style={[styles.tdCol, { color: colors.primary, fontWeight: '900', fontSize: 13 }]}>
                      {opp.points}
                    </Text>

                    {/* Win % Badge */}
                    <View style={styles.winBadgeCol}>
                      <View style={[styles.winPill, { backgroundColor: winPctColor + '18', borderColor: winPctColor + '40' }]}>
                        <Text style={[styles.winPillText, { color: winPctColor }]}>
                          {opp.winPercentage}%
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Expanded Match History Breakdown */}
                  {isExpanded && (
                    <View style={[styles.expandedDrawer, { backgroundColor: colors.surfaceLighter, borderColor: colors.border }]}>
                      <View style={styles.expandedHeader}>
                        <Text style={[styles.expandedTitle, { color: colors.text }]}>
                          Recent India vs {opp.opponentName} Matches
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                          Tap any match to view scorecard
                        </Text>
                      </View>

                      {opp.recentMatches && opp.recentMatches.length > 0 ? (
                        opp.recentMatches.map((m: any, mIdx: number) => {
                          const mDate = m.date
                            ? new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Recent';
                          const isIndiaWin = (m.result || '').toLowerCase().includes('india won');

                          return (
                            <TouchableOpacity
                              key={m.matchId || mIdx}
                              style={[styles.matchHistoryItem, { borderBottomColor: colors.border }]}
                              onPress={() => router.push({ pathname: '/match-details', params: { id: m.matchId } })}
                            >
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                  <View style={[styles.historyFmtBadge, { backgroundColor: colors.primary + '20' }]}>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>
                                      {m.format}
                                    </Text>
                                  </View>
                                  <Text style={{ fontSize: 11, color: colors.textMuted }}>{mDate}</Text>
                                </View>
                                <Text
                                  style={[
                                    styles.historyResultText,
                                    { color: isIndiaWin ? '#10B981' : colors.text },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {m.result}
                                </Text>
                                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                                  IND: {m.teamScore} • {opp.opponentShortName}: {m.opponentScore}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '800', marginLeft: 8 }}>
                                View →
                              </Text>
                            </TouchableOpacity>
                          );
                        })
                      ) : (
                        <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic', paddingVertical: 8 }}>
                          No individual match breakdown recorded.
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  navHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  navSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  flagPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  refreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  scrollContent: {
    padding: 16,
  },
  formatRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  formatPill: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  formatPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroCard: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  heroTeamName: {
    fontSize: 18,
    fontWeight: '900',
  },
  heroSubText: {
    fontSize: 11,
    marginTop: 2,
    maxWidth: 180,
  },
  winRateBadge: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '900',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginHorizontal: 2,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  centerBox: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  tableCard: {
    padding: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  thCol: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  rowContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  oppIdentityCol: {
    flex: 3.2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  oppNameText: {
    fontSize: 12,
    fontWeight: '700',
  },
  oppSubText: {
    fontSize: 10,
    marginTop: 1,
  },
  tdCol: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  winBadgeCol: {
    flex: 1.8,
    alignItems: 'flex-end',
  },
  winPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  winPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  expandedDrawer: {
    padding: 12,
    borderTopWidth: 1,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expandedTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  matchHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyFmtBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  historyResultText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
