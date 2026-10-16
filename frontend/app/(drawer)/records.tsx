import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../components/Theme';
import { useDrawerStore } from '../../store/drawerStore';
import Card from '../../components/Card';
import Avatar from '../../components/Avatar';
import TeamLogo from '../../components/TeamLogo';
import api from '../../services/api';
import { clientCache } from '../../services/cache';

export default function CricketRecordsScreen() {
  const { colors, isDarkMode } = useTheme();
  const { openDrawer } = useDrawerStore();
  const router = useRouter();

  const [selectedDivision, setSelectedDivision] = useState<'all' | 'international' | 'ipl'>('all');
  const [recordsCategory, setRecordsCategory] = useState<'all' | 'rankings' | 'batting' | 'bowling' | 'fielding' | 'team'>('all');
  const [records, setRecords] = useState<{
    rankings: any[];
    batting: any[];
    bowling: any[];
    fielding: any[];
    team: any[];
  }>({
    rankings: [],
    batting: [],
    bowling: [],
    fielding: [],
    team: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecords = async (division = selectedDivision) => {
    const rKey = `records_${division}`;
    const cached = clientCache.get<any>(rKey, true);
    if (cached) {
      setRecords(cached);
    } else {
      setIsLoading(true);
    }

    try {
      const res = await api.get(`/players/records?division=${division}`);
      if (res?.data?.success) {
        setRecords(res.data.data);
        clientCache.set(rKey, res.data.data);
      }
    } catch (err) {
      console.error('Error fetching cricket records:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRecords(selectedDivision);
    }, [selectedDivision])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecords(selectedDivision);
  };

  const getRecordsData = () => {
    if (recordsCategory === 'rankings') return records.rankings || [];
    if (recordsCategory === 'batting') return records.batting || [];
    if (recordsCategory === 'bowling') return records.bowling || [];
    if (recordsCategory === 'fielding') return records.fielding || [];
    if (recordsCategory === 'team') return records.team || [];
    return [
      ...(records.rankings || []),
      ...(records.batting || []),
      ...(records.bowling || []),
      ...(records.fielding || []),
      ...(records.team || []),
    ];
  };

  const handlePlayerPress = (player: any) => {
    if (!player) return;
    const targetId = typeof player === 'object' ? (player._id || player.id) : player;
    if (targetId) {
      router.push(`/player-career?id=${targetId}` as any);
    }
  };

  const renderRecordCard = ({ item }: { item: any }) => {
    const isPlayerRecord = !!item.player;
    const displayName = isPlayerRecord ? (item.player.fullName || item.player.name) : null;
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
              borderColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.45)',
              backgroundColor: isDarkMode ? '#141824' : '#FFFFFF',
            },
          ]}
        >
          {/* Header Badge & Date */}
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

  const recordCategories = [
    { key: 'all', label: 'All Records' },
    { key: 'rankings', label: '👑 No. 1 Reign' },
    { key: 'batting', label: '🏏 Batting' },
    { key: 'bowling', label: '🎯 Bowling' },
    { key: 'fielding', label: '🧤 Fielding' },
    { key: 'team', label: '🏰 Team & Match' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.topHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity onPress={openDrawer} style={styles.menuBtn}>
            <Text style={{ fontSize: 22, color: colors.text }}>☰</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.title, { color: colors.text }]}>📜 Cricket Records</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>All-time Hall of Fame & Milestone Records</Text>
          </View>
        </View>

        {/* Division Selector Pills */}
        <View style={styles.divisionRow}>
          {[
            { key: 'all', label: 'All Divisions' },
            { key: 'international', label: '🇮🇳 International' },
            { key: 'ipl', label: '🏆 IPL' },
          ].map(d => (
            <TouchableOpacity
              key={d.key}
              style={[
                styles.divisionPill,
                { backgroundColor: colors.background, borderColor: colors.border },
                selectedDivision === d.key && { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
              ]}
              onPress={() => {
                setSelectedDivision(d.key as any);
                fetchRecords(d.key as any);
              }}
            >
              <Text
                style={[
                  styles.divisionText,
                  { color: selectedDivision === d.key ? '#000' : colors.textMuted },
                  selectedDivision === d.key && { fontWeight: '800' },
                ]}
              >
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category Pills Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {recordCategories.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.filterPill,
                { backgroundColor: colors.background, borderColor: colors.border },
                recordsCategory === cat.key && { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
              ]}
              onPress={() => setRecordsCategory(cat.key as any)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: colors.textMuted },
                  recordsCategory === cat.key && { color: '#000', fontWeight: '800' },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Records List */}
      <FlatList
        data={isLoading ? [] : getRecordsData()}
        keyExtractor={(item: any, idx: number) => (item.id ? `${item.id}-${idx}` : String(idx))}
        contentContainerStyle={styles.list}
        renderItem={renderRecordCard}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F59E0B']} />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#F59E0B" />
              <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 13, fontWeight: '600' }}>
                Loading all-time cricket records...
              </Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🏆</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No records found in this category
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    paddingTop: 54,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  menuBtn: {
    padding: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  divisionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  divisionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  divisionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  recordCard: {
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
  },
  recordHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  recordTagContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  recordBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  recordDateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    lineHeight: 22,
  },
  recordStatBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  recordHeroValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: -0.5,
  },
  recordHeroLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  recordHolderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  recordHolderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  recordHolderName: {
    fontSize: 14,
    fontWeight: '800',
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  teamBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  recordDetailsText: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
  chevron: {
    fontSize: 20,
    fontWeight: '300',
    marginLeft: 8,
  },
  loader: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  empty: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
