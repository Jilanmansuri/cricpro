import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../components/Theme';
import Card from '../components/Card';
import TeamLogo from '../components/TeamLogo';
import api from '../services/api';
import { bulkExportMatches } from '../services/matchService';
import Svg, { Path } from 'react-native-svg';

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

const CheckboxCheckedIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
      fill={color}
    />
  </Svg>
);

const CheckboxUncheckedIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"
      fill={color}
    />
  </Svg>
);

export default function MatchesScreen() {
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalMatches, setTotalMatches] = useState(0);

  const [search, setSearch] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'All' | 'T20' | 'ODI' | 'Test'>('All');

  // Bulk selection & export states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'html' | 'csv'>('pdf');

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

  const handleBack = () => {
    if (isSelectionMode) {
      setIsSelectionMode(false);
      setSelectedMatchIds([]);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(drawer)/(tabs)');
    }
  };

  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      setIsSelectionMode(false);
      setSelectedMatchIds([]);
    } else {
      setIsSelectionMode(true);
    }
  };

  const toggleMatchSelection = (matchId: string) => {
    setSelectedMatchIds((prev) =>
      prev.includes(matchId) ? prev.filter((id) => id !== matchId) : [...prev, matchId]
    );
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

  const handleSelectAll = () => {
    const allFilteredIds = filteredMatches.map((m) => m._id);
    const areAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedMatchIds.includes(id));

    if (areAllSelected) {
      // Deselect all filtered
      setSelectedMatchIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      // Select all filtered
      const combined = Array.from(new Set([...selectedMatchIds, ...allFilteredIds]));
      setSelectedMatchIds(combined);
    }
  };

  const handleBulkExport = async (format: 'pdf' | 'html' | 'csv' = exportFormat) => {
    if (selectedMatchIds.length === 0) {
      Alert.alert('No Matches Selected', 'Please select at least 1 match to export.');
      return;
    }

    setIsExporting(true);
    try {
      const res = await bulkExportMatches(selectedMatchIds, format, true);
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename =
        res.filename || `cricpro_${selectedMatchIds.length}_matches_report_${timestamp}.${format}`;

      if (format === 'pdf') {
        const base64Data = res.base64 || (typeof res === 'string' ? res : '');
        if (!base64Data) throw new Error('No PDF data received from server');

        if (Platform.OS === 'web') {
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
          Alert.alert('Exported', `Bulk PDF scorecard downloaded as ${filename}`);
        } else {
          const fileUri = `${FileSystem.documentDirectory}${filename}`;
          await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/pdf',
              dialogTitle: `Export ${selectedMatchIds.length} Matches PDF Report`,
              UTI: 'com.adobe.pdf',
            });
          } else {
            Alert.alert('Export Complete', `Scorecard PDF saved successfully.`);
          }
        }
      } else {
        const textPayload = typeof res === 'string' ? res : res.data || '';
        if (Platform.OS === 'web') {
          const blob = new Blob([textPayload], {
            type: format === 'html' ? 'text/html' : 'text/csv',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
          Alert.alert('Exported', `Matches report downloaded as ${filename}`);
        } else {
          const fileUri = `${FileSystem.documentDirectory}${filename}`;
          await FileSystem.writeAsStringAsync(fileUri, textPayload, {
            encoding: FileSystem.EncodingType.UTF8,
          });

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: format === 'html' ? 'text/html' : 'text/csv',
              dialogTitle: `Export ${selectedMatchIds.length} Matches (${format.toUpperCase()})`,
            });
          } else {
            Alert.alert('Export Complete', `Matches report saved successfully.`);
          }
        }
      }
    } catch (err: any) {
      console.error('Bulk export error:', err);
      Alert.alert(
        'Export Failed',
        err.response?.data?.message || err.message || 'Unable to generate bulk export report.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const allFilteredSelected =
    filteredMatches.length > 0 && filteredMatches.every((m) => selectedMatchIds.includes(m._id));

  const renderMatchCard = ({ item }: { item: any }) => {
    const isSelected = selectedMatchIds.includes(item._id);

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
        onPress={() => {
          if (isSelectionMode) {
            toggleMatchSelection(item._id);
          } else {
            router.push({ pathname: '/match-details', params: { id: item._id } });
          }
        }}
        onLongPress={() => {
          if (!isSelectionMode) {
            setIsSelectionMode(true);
            setSelectedMatchIds([item._id]);
          }
        }}
        style={styles.cardContainer}
      >
        <Card
          style={[
            styles.matchCard,
            isSelected && {
              borderColor: colors.primary,
              borderWidth: 1.5,
              backgroundColor: isDarkMode ? '#132338' : '#F0FDF4',
            },
          ]}
        >
          {/* Header Row: Selection Checkbox / Date & Format Badge */}
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              {isSelectionMode && (
                <View style={styles.checkboxContainer}>
                  {isSelected ? (
                    <CheckboxCheckedIcon color={colors.primary} />
                  ) : (
                    <CheckboxUncheckedIcon color={colors.textMuted} />
                  )}
                </View>
              )}
              <Text style={[styles.matchDateText, { color: colors.textMuted }]}>{matchDateStr}</Text>
            </View>

            <View
              style={[
                styles.formatBadge,
                { backgroundColor: colors.primary + '18', borderColor: colors.primary + '35' },
              ]}
            >
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
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        {isSelectionMode ? (
          // Selection Mode Header Bar
          <View style={styles.selectionHeaderRow}>
            <TouchableOpacity onPress={handleBack} style={styles.cancelBtn}>
              <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>✕ Cancel</Text>
            </TouchableOpacity>

            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.selectionCountTitle, { color: colors.text }]}>
                {selectedMatchIds.length} Selected
              </Text>
              <Text style={[styles.selectionCountSub, { color: colors.textMuted }]}>
                Tap to pick matches
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSelectAll}
              style={[
                styles.selectAllBtn,
                { backgroundColor: colors.surfaceLighter, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.selectAllBtnText, { color: colors.primary }]}>
                {allFilteredSelected ? 'Deselect' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Standard Header Bar
          <>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={handleBack}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <BackIcon color={colors.text} />
              </TouchableOpacity>
              <View style={{ marginLeft: 8 }}>
                <Text style={[styles.title, { color: colors.text }]}>All Matches</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  {totalMatches} career & tournament games
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                style={[
                  styles.selectToggleBtn,
                  { backgroundColor: colors.primary + '18', borderColor: colors.primary },
                ]}
                onPress={toggleSelectionMode}
              >
                <Text style={[styles.selectToggleBtnText, { color: colors.primary }]}>
                  📑 Export PDF
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.refreshHeaderBtn,
                  { backgroundColor: colors.surfaceLighter, borderColor: colors.border },
                ]}
                onPress={handleRefresh}
              >
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '700' }}>🔄</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
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

      {/* Selection Mode Info Ribbon */}
      {isSelectionMode && (
        <View
          style={[
            styles.selectionRibbon,
            { backgroundColor: isDarkMode ? '#132338' : '#E0F2FE', borderColor: colors.primary + '40' },
          ]}
        >
          <Text style={[styles.selectionRibbonText, { color: colors.text }]}>
            💡 Tap matches to include in your PDF report, then tap{' '}
            <Text style={{ fontWeight: '800', color: colors.primary }}>Export PDF</Text> below.
          </Text>
        </View>
      )}

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
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: isSelectionMode && selectedMatchIds.length > 0 ? insets.bottom + 95 : insets.bottom + 24 },
          ]}
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

      {/* Floating Bottom Bulk Export Bar */}
      {isSelectionMode && selectedMatchIds.length > 0 && (
        <View
          style={[
            styles.floatingExportBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              bottom: Math.max(insets.bottom, 12) + 8,
            },
          ]}
        >
          <View style={styles.floatingExportInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.floatingExportCount, { color: colors.text }]}>
                {selectedMatchIds.length} {selectedMatchIds.length === 1 ? 'Match' : 'Matches'}
              </Text>
              <View style={[styles.formatChip, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.formatChipText, { color: colors.primary }]}>
                  {exportFormat.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.formatSelectRow}>
              {(['pdf', 'csv', 'html'] as const).map((fmt) => (
                <TouchableOpacity
                  key={fmt}
                  onPress={() => setExportFormat(fmt)}
                  style={[
                    styles.miniFormatTab,
                    exportFormat === fmt && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.miniFormatTabText,
                      { color: exportFormat === fmt ? '#fff' : colors.textMuted },
                    ]}
                  >
                    {fmt.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.floatingExportBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleBulkExport(exportFormat)}
            disabled={isExporting}
            activeOpacity={0.82}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.floatingExportBtnText}>
                  {exportFormat === 'pdf' ? '📄 Export PDF' : `Export ${exportFormat.toUpperCase()}`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  selectToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectToggleBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  refreshHeaderBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectionCountTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  selectionCountSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  selectAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  selectionRibbon: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectionRibbonText: {
    fontSize: 12,
    lineHeight: 16,
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
  checkboxContainer: {
    marginRight: 2,
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
  floatingExportBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  floatingExportInfo: {
    flex: 1,
  },
  floatingExportCount: {
    fontSize: 14,
    fontWeight: '800',
  },
  formatChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  formatChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
  formatSelectRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  miniFormatTab: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#64748B40',
  },
  miniFormatTabText: {
    fontSize: 10,
    fontWeight: '700',
  },
  floatingExportBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  floatingExportBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
