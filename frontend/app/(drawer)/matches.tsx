import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../components/Theme';
import { useDrawerStore } from '../../store/drawerStore';
import Card from '../../components/Card';
import TeamLogo from '../../components/TeamLogo';
import api from '../../services/api';
import Svg, { Path } from 'react-native-svg';

const HamburgerIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill={color} />
  </Svg>
);

const BackIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill={color} />
  </Svg>
);

const SearchIcon = ({ color }: { color: string }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path
      d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
      fill={color}
    />
  </Svg>
);

export default function MatchesDrawerScreen() {
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const openDrawer = useDrawerStore((state) => state.openDrawer);

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalMatches, setTotalMatches] = useState(0);

  const [search, setSearch] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'All' | 'T20' | 'ODI' | 'Test'>('All');

  const fetchMatches = async (pageNum = 1, isRefresh = false) => {
    try {
      if (pageNum === 1 && !isRefresh) setIsLoading(true);
      const res = await api.get(`/matches?page=${pageNum}&limit=15`);
      if (res?.data?.success) {
        const newMatches = res.data.data || [];
        const total = res.data.pagination?.total || newMatches.length;
        setTotalMatches(total);

        if (pageNum === 1) {
          setMatches(newMatches);
        } else {
          setMatches((prev) => [...prev, ...newMatches]);
        }

        const totalPages = res.data.pagination?.pages || 1;
        setHasMore(pageNum < totalPages);
        setPage(pageNum);
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMatches(1);
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMatches(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !isLoading) {
      setLoadingMore(true);
      fetchMatches(page + 1);
    }
  };

  const filteredMatches = matches.filter((m) => {
    // Format filter
    if (selectedFormat !== 'All') {
      const fmt = (m.format || (Number(m.overs) <= 20 ? 'T20' : Number(m.overs) <= 50 ? 'ODI' : 'Test')).toUpperCase();
      if (fmt !== selectedFormat.toUpperCase()) return false;
    }

    // Search filter
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const teamAName = (m.teamA?.name || '').toLowerCase();
    const teamBName = (m.teamB?.name || '').toLowerCase();
    const venueName = (m.venueId?.name || m.venueName || '').toLowerCase();
    const resultText = (m.result || '').toLowerCase();

    return teamAName.includes(q) || teamBName.includes(q) || venueName.includes(q) || resultText.includes(q);
  });

  const renderMatchCard = ({ item }: { item: any }) => {
    const matchDateStr = item.date
      ? new Date(item.date).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Recent';

    const fmt = item.format || (Number(item.overs) <= 20 ? 'T20' : Number(item.overs) <= 50 ? 'ODI' : 'Test');

    const runsA = item.teamAScore?.runs ?? '-';
    const wktsA = item.teamAScore?.wickets ?? '-';
    const oversA = item.teamAScore?.overs ? `(${item.teamAScore.overs} ov)` : '';

    const runsB = item.teamBScore?.runs ?? '-';
    const wktsB = item.teamBScore?.wickets ?? '-';
    const oversB = item.teamBScore?.overs ? `(${item.teamBScore.overs} ov)` : '';

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: '/match-details', params: { id: item._id } })}
        style={styles.cardContainer}
      >
        <Card style={styles.matchCard}>
          {/* Header Row: Date & Format Badge */}
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.matchDateText, { color: colors.textMuted }]}>{matchDateStr}</Text>
            <View style={[styles.formatBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '35' }]}>
              <Text style={[styles.formatBadgeText, { color: colors.primary }]}>{fmt}</Text>
            </View>
          </View>

          {/* Teams and Scores */}
          <View style={styles.teamsSection}>
            {/* Team A */}
            <View style={styles.teamRow}>
              <View style={styles.teamIdentity}>
                <TeamLogo
                  teamName={item.teamA?.name}
                  shortName={item.teamA?.shortName}
                  teamId={item.teamA?.teamId}
                  size={24}
                />
                <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
                  {item.teamA?.name || 'Team 1'}
                </Text>
              </View>
              <Text style={[styles.scoreText, { color: colors.text }]}>
                {runsA}/{wktsA} <Text style={[styles.oversText, { color: colors.textMuted }]}>{oversA}</Text>
              </Text>
            </View>

            {/* Team B */}
            <View style={[styles.teamRow, { marginTop: 8 }]}>
              <View style={styles.teamIdentity}>
                <TeamLogo
                  teamName={item.teamB?.name}
                  shortName={item.teamB?.shortName}
                  teamId={item.teamB?.teamId}
                  size={24}
                />
                <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
                  {item.teamB?.name || 'Team 2'}
                </Text>
              </View>
              <Text style={[styles.scoreText, { color: colors.text }]}>
                {runsB}/{wktsB} <Text style={[styles.oversText, { color: colors.textMuted }]}>{oversB}</Text>
              </Text>
            </View>
          </View>

          <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

          {/* Result and Venue Footer */}
          <View style={styles.footerRow}>
            <Text style={[styles.resultText, { color: colors.primary }]} numberOfLines={1}>
              {item.result || 'Match Completed'}
            </Text>
            {item.venueId?.name || item.venueName ? (
              <Text style={[styles.venueText, { color: colors.textMuted }]} numberOfLines={1}>
                📍 {item.venueId?.name || item.venueName}
              </Text>
            ) : null}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.iconBtn} onPress={openDrawer}>
            <HamburgerIcon color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { marginLeft: 4 }]} onPress={() => router.back()}>
            <BackIcon color={colors.text} />
          </TouchableOpacity>
          <View style={{ marginLeft: 8 }}>
            <Text style={[styles.title, { color: colors.text }]}>All Matches</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {totalMatches} career & tournament games
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.refreshHeaderBtn, { backgroundColor: colors.surfaceLighter, borderColor: colors.border }]}
          onPress={handleRefresh}
        >
          <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '700' }}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SearchIcon color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by team, ground, or result..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '700' }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Format Filter Bar */}
      <View style={styles.formatFilterRow}>
        {(['All', 'T20', 'ODI', 'Test'] as const).map((fmt) => (
          <TouchableOpacity
            key={fmt}
            style={[
              styles.formatFilterPill,
              { borderColor: colors.border, backgroundColor: colors.surface },
              selectedFormat === fmt && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setSelectedFormat(fmt)}
          >
            <Text
              style={[
                styles.formatFilterText,
                { color: selectedFormat === fmt ? '#fff' : colors.textMuted },
                selectedFormat === fmt && { fontWeight: '800' },
              ]}
            >
              {fmt === 'All' ? '🌐 All Formats' : fmt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Matches List */}
      {isLoading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loaderText, { color: colors.textMuted }]}>Loading matches...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMatches}
          keyExtractor={(item) => item._id}
          renderItem={renderMatchCard}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 44, marginBottom: 12 }}>🏏</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Matches Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {search.trim()
                  ? `No matches match "${search}" in ${selectedFormat} format.`
                  : 'No matches uploaded yet. Snap or upload your cricket scorecard in the Upload tab!'}
              </Text>
            </View>
          }
        />
      )}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  refreshHeaderBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  formatFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  formatFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  formatFilterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  cardContainer: {
    marginBottom: 12,
  },
  matchCard: {
    padding: 14,
    borderRadius: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  matchDateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  formatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  formatBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  teamsSection: {
    paddingVertical: 2,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '700',
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '800',
  },
  oversText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardDivider: {
    height: 1,
    marginVertical: 10,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  venueText: {
    fontSize: 11,
    fontWeight: '500',
    maxWidth: 140,
  },
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 13,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});

