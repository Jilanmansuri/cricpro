import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../components/Theme';
import Card from '../components/Card';
import TeamLogo from '../components/TeamLogo';
import api from '../services/api';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export default function MatchDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = Array.isArray(id) ? id[0] : id;

  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // All state hooks declared unconditionally at the top (Rules of Hooks compliant)
  const [isLoading, setIsLoading] = useState(true);
  const [matchData, setMatchData] = useState<any | null>(null);
  const [playerStats, setPlayerStats] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'summary' | 'scorecard' | 'commentary'>('summary');
  const [activeTeamTab, setActiveTeamTab] = useState<'teamA' | 'teamB'>('teamA');
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) {
      setIsLoading(false);
      setErrorMsg('No match ID specified.');
      return;
    }

    let isMounted = true;
    const fetchMatchDetails = async () => {
      try {
        setIsLoading(true);
        setErrorMsg(null);
        const res = await api.get(`/matches/${matchId}`);
        if (!isMounted) return;

        if (res.data?.success && res.data?.data?.match) {
          setMatchData(res.data.data.match);
          setPlayerStats(res.data.data.playerStats || []);
        } else {
          setErrorMsg(res.data?.message || 'Match details could not be found.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error fetching match details:', err);
        setErrorMsg(err.response?.data?.message || err.message || 'Failed to load match details.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchMatchDetails();

    return () => {
      isMounted = false;
    };
  }, [matchId]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/matches' as any);
    }
  };

  const handleExport = async (format: 'csv' | 'html') => {
    if (!matchData) return;
    setIsExporting(true);
    try {
      const res = await api.get(`/matches/${matchId}/export?format=${format}`);
      const fileExt = format === 'html' ? 'html' : 'csv';
      const tAName = matchData.teamA?.name || matchData.teamA?.displayName || 'TeamA';
      const tBName = matchData.teamB?.name || matchData.teamB?.displayName || 'TeamB';
      const filename = `scorecard_${tAName}_vs_${tBName}.${fileExt}`.replace(/\s+/g, '_');

      if (Platform.OS === 'web') {
        const blob = new Blob([res.data], { type: format === 'html' ? 'text/html' : 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert('Exported', `Scorecard downloaded as ${filename}`);
      } else {
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, res.data, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: format === 'html' ? 'text/html' : 'text/csv',
            dialogTitle: `Export ${format.toUpperCase()} Scorecard`,
          });
        } else {
          Alert.alert('Export Complete', `Scorecard saved to file.`);
        }
      }
    } catch (err: any) {
      console.error('Export error:', err);
      Alert.alert('Export Failed', err.response?.data?.message || err.message || 'Unable to export scorecard');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.navHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={{ fontSize: 16, color: colors.text, fontWeight: '700' }}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.navHeaderTitle, { color: colors.text }]}>Match Details</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 13, fontWeight: '600' }}>
            Loading scorecard & match details...
          </Text>
        </View>
      </View>
    );
  }

  if (errorMsg || !matchData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.navHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={{ fontSize: 16, color: colors.text, fontWeight: '700' }}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.navHeaderTitle, { color: colors.text }]}>Match Details</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={{ fontSize: 32, marginBottom: 12 }}>🏏</Text>
          <Text style={[styles.errorTitle, { color: colors.text }]}>Could Not Load Match</Text>
          <Text style={{ color: colors.textMuted, textAlign: 'center', marginBottom: 20, paddingHorizontal: 32, fontSize: 13 }}>
            {errorMsg || 'Match details could not be found.'}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setIsLoading(true);
              setErrorMsg(null);
              api.get(`/matches/${matchId}`).then(res => {
                if (res.data?.success && res.data?.data?.match) {
                  setMatchData(res.data.data.match);
                  setPlayerStats(res.data.data.playerStats || []);
                } else {
                  setErrorMsg(res.data?.message || 'Match details not found.');
                }
              }).catch(err => {
                setErrorMsg(err.response?.data?.message || err.message || 'Failed to load match.');
              }).finally(() => setIsLoading(false));
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>🔄 Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const teamAName = matchData.teamA?.name || matchData.teamA?.displayName || matchData.teamA?.officialName || 'Team 1';
  const teamBName = matchData.teamB?.name || matchData.teamB?.displayName || matchData.teamB?.officialName || 'Team 2';

  const runsA = matchData.teamAScore?.runs ?? '-';
  const wktsA = matchData.teamAScore?.wickets ?? '-';
  const oversA = matchData.teamAScore?.overs ? `(${matchData.teamAScore.overs} ov)` : '';

  const runsB = matchData.teamBScore?.runs ?? '-';
  const wktsB = matchData.teamBScore?.wickets ?? '-';
  const oversB = matchData.teamBScore?.overs ? `(${matchData.teamBScore.overs} ov)` : '';

  const formatStr = matchData.format || (Number(matchData.overs) <= 20 ? 'T20' : Number(matchData.overs) <= 50 ? 'ODI' : 'Test');

  const matchDateFormatted = matchData.date
    ? new Date(matchData.date).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recent Match';

  // Team IDs for filtering scorecard entries
  const getTeamId = (team: any) => (team?._id || team)?.toString();
  const teamAId = getTeamId(matchData.teamA);
  const teamBId = getTeamId(matchData.teamB);

  // Batters for Team A & Team B
  const teamABatting = playerStats.filter((s: any) => {
    const sTeam = (s.teamId?._id?.toString() || s.teamId?.toString());
    return sTeam === teamAId && !s.batting?.didNotBat;
  });

  const teamBBatting = playerStats.filter((s: any) => {
    const sTeam = (s.teamId?._id?.toString() || s.teamId?.toString());
    return sTeam === teamBId && !s.batting?.didNotBat;
  });

  // Opponent bowlers who bowled against Team A & Team B
  const teamABowling = playerStats.filter((s: any) => {
    const sTeam = (s.teamId?._id?.toString() || s.teamId?.toString());
    return sTeam === teamBId && !s.bowling?.didNotBowl;
  });

  const teamBBowling = playerStats.filter((s: any) => {
    const sTeam = (s.teamId?._id?.toString() || s.teamId?.toString());
    return sTeam === teamAId && !s.bowling?.didNotBowl;
  });

  const battingList = activeTeamTab === 'teamA' ? teamABatting : teamBBatting;
  const bowlingList = activeTeamTab === 'teamA' ? teamABowling : teamBBowling;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top Header with Back button */}
      <View style={[styles.navHeader, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={{ fontSize: 16, color: colors.text, fontWeight: '700' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.navHeaderTitle, { color: colors.text }]} numberOfLines={1}>
          Match Details
        </Text>
        <View style={[styles.formatBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '35' }]}>
          <Text style={[styles.formatBadgeText, { color: colors.primary }]}>{formatStr}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {/* Score Card Hero */}
        <Card style={styles.headerCard}>
          <Text style={[styles.matchDateHeader, { color: colors.textMuted }]}>
            {matchDateFormatted} • {matchData.overs ? `${matchData.overs} Overs Match` : formatStr}
          </Text>

          <View style={styles.scoreRow}>
            {/* Team A */}
            <View style={styles.teamCol}>
              <TeamLogo
                teamName={teamAName}
                shortName={matchData.teamA?.shortName}
                teamId={matchData.teamA?.teamId}
                logoUrl={matchData.teamA?.logo || matchData.teamA?.logoUrl}
                size={46}
              />
              <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
                {teamAName}
              </Text>
              <Text style={[styles.scoreText, { color: colors.text }]}>
                {runsA}/{wktsA}
              </Text>
              <Text style={[styles.oversText, { color: colors.textMuted }]}>
                {oversA}
              </Text>
            </View>

            <Text style={[styles.vsText, { color: colors.primary }]}>VS</Text>

            {/* Team B */}
            <View style={styles.teamCol}>
              <TeamLogo
                teamName={teamBName}
                shortName={matchData.teamB?.shortName}
                teamId={matchData.teamB?.teamId}
                logoUrl={matchData.teamB?.logo || matchData.teamB?.logoUrl}
                size={46}
              />
              <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
                {teamBName}
              </Text>
              <Text style={[styles.scoreText, { color: colors.text }]}>
                {runsB}/{wktsB}
              </Text>
              <Text style={[styles.oversText, { color: colors.textMuted }]}>
                {oversB}
              </Text>
            </View>
          </View>

          {/* Result Banner */}
          <View style={[styles.resultBanner, { backgroundColor: colors.surfaceLighter }]}>
            <Text style={[styles.resultText, { color: colors.primary }]} numberOfLines={2}>
              {matchData.result || 'Match Completed'}
            </Text>
          </View>
        </Card>

        {/* Navigation Tabs */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {(['summary', 'scorecard', 'commentary'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabItem, activeTab === tab && { borderBottomColor: colors.primary }]}
            >
              <Text style={[styles.tabLabel, { color: activeTab === tab ? colors.primary : colors.textMuted }]}>
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab 1: Summary */}
        {activeTab === 'summary' && (
          <View style={styles.tabContent}>
            <Card style={styles.detailsCard}>
              <Text style={[styles.detailsTitle, { color: colors.text }]}>Match Information</Text>

              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Ground / Venue</Text>
                <Text style={[styles.infoVal, { color: colors.text }]} numberOfLines={1}>
                  {matchData.venueId?.name || matchData.venueName || 'N/A'}
                </Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Match Date</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>
                  {matchDateFormatted}
                </Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Format</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>
                  {formatStr} ({matchData.overs || 20} Overs)
                </Text>
              </View>

              {matchData.mvp && (
                <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>Player of the Match (MVP)</Text>
                  <Text style={[styles.infoVal, { color: colors.primary, fontWeight: '800' }]}>
                    ⭐ {matchData.mvp?.name || matchData.mvp?.fullName || 'N/A'}
                  </Text>
                </View>
              )}

              {matchData.ocrConfidence !== undefined && (
                <View style={styles.infoRow}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>OCR Parse Accuracy</Text>
                  <Text style={[styles.infoVal, { color: colors.primary }]}>
                    {Math.round(matchData.ocrConfidence * 100)}%
                  </Text>
                </View>
              )}
            </Card>

            {/* Export & Share Scorecard */}
            <Card style={[styles.exportCard, { borderColor: colors.border }]}>
              <Text style={[styles.exportTitle, { color: colors.text }]}>Export & Share Scorecard</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 14, lineHeight: 18 }}>
                Download this official match scorecard as a spreadsheet (CSV) or printable web document (HTML).
              </Text>
              <View style={styles.exportButtonsRow}>
                <TouchableOpacity
                  style={[styles.exportBtn, { backgroundColor: colors.surfaceLighter, borderColor: colors.border }]}
                  onPress={() => handleExport('csv')}
                  disabled={isExporting}
                >
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>
                    {isExporting ? 'Exporting...' : '📊 Export CSV'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.exportBtn, { backgroundColor: colors.surfaceLighter, borderColor: colors.border }]}
                  onPress={() => handleExport('html')}
                  disabled={isExporting}
                >
                  <Text style={{ color: colors.secondary || '#38bdf8', fontWeight: '700' }}>
                    {isExporting ? 'Exporting...' : '🌐 Export HTML'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        )}

        {/* Tab 2: Scorecard */}
        {activeTab === 'scorecard' && (
          <View style={styles.tabContent}>
            {/* Team Selector Row */}
            <View style={styles.teamTabRow}>
              <TouchableOpacity
                onPress={() => setActiveTeamTab('teamA')}
                style={[
                  styles.teamTabItem,
                  { borderColor: colors.border },
                  activeTeamTab === 'teamA' && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                ]}
              >
                <Text
                  style={{
                    color: activeTeamTab === 'teamA' ? colors.primary : colors.textMuted,
                    fontWeight: '800',
                    fontSize: 13,
                  }}
                  numberOfLines={1}
                >
                  {teamAName} Innings
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTeamTab('teamB')}
                style={[
                  styles.teamTabItem,
                  { borderColor: colors.border },
                  activeTeamTab === 'teamB' && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                ]}
              >
                <Text
                  style={{
                    color: activeTeamTab === 'teamB' ? colors.primary : colors.textMuted,
                    fontWeight: '800',
                    fontSize: 13,
                  }}
                  numberOfLines={1}
                >
                  {teamBName} Innings
                </Text>
              </TouchableOpacity>
            </View>

            {/* Batting Section */}
            <Text style={[styles.tableSectionTitle, { color: colors.text }]}>BATTING</Text>
            <Card style={styles.tableCard}>
              <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.headerCell, { flex: 3, color: colors.textMuted, textAlign: 'left' }]}>Batsman</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>R</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>B</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>4s</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>6s</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>SR</Text>
              </View>

              {battingList.length > 0 ? (
                battingList.map((item: any, idx: number) => {
                  const pId = item.playerId?._id || item.playerId;
                  const pName = item.playerId?.fullName || item.playerId?.name || item.playerName || item.name || 'Player';
                  const runs = Number(item.batting?.runs) || 0;
                  const balls = Number(item.batting?.balls) || 0;
                  const fours = Number(item.batting?.fours) || 0;
                  const sixes = Number(item.batting?.sixes) || 0;
                  const sr = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0';
                  const isOut = item.batting?.outStatus !== 'not_out' && !item.batting?.outStatus?.includes('not out');

                  return (
                    <View key={idx} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                      <TouchableOpacity
                        style={{ flex: 3 }}
                        onPress={() => pId && router.push({ pathname: '/player-career', params: { id: pId.toString() } })}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.playerNameText, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
                          {pName}
                        </Text>
                        <Text style={[styles.outText, { color: isOut ? colors.textMuted : colors.primary }]}>
                          {isOut ? 'out' : 'not out'}
                        </Text>
                      </TouchableOpacity>
                      <Text style={[styles.rowCell, { color: colors.text, fontWeight: '800' }]}>{runs}</Text>
                      <Text style={[styles.rowCell, { color: colors.text }]}>{balls}</Text>
                      <Text style={[styles.rowCell, { color: colors.text }]}>{fours}</Text>
                      <Text style={[styles.rowCell, { color: colors.text }]}>{sixes}</Text>
                      <Text style={[styles.rowCell, { color: colors.textMuted, fontSize: 11 }]}>{sr}</Text>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyTableBox}>
                  <Text style={[styles.emptyTableText, { color: colors.textMuted }]}>
                    No batting scorecard recorded for this innings.
                  </Text>
                </View>
              )}
            </Card>

            {/* Bowling Section */}
            <Text style={[styles.tableSectionTitle, { color: colors.text, marginTop: 24 }]}>BOWLING</Text>
            <Card style={styles.tableCard}>
              <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.headerCell, { flex: 3, color: colors.textMuted, textAlign: 'left' }]}>Bowler</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>O</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>M</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>R</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>W</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>Econ</Text>
              </View>

              {bowlingList.length > 0 ? (
                bowlingList.map((item: any, idx: number) => {
                  const pId = item.playerId?._id || item.playerId;
                  const pName = item.playerId?.fullName || item.playerId?.name || item.playerName || item.name || 'Player';
                  const overs = item.bowling?.overs ?? 0;
                  const maidens = item.bowling?.maidens ?? 0;
                  const runsConceded = item.bowling?.runsConceded ?? 0;
                  const wickets = item.bowling?.wickets ?? 0;
                  
                  // Compute legal ball economy
                  const oversNum = Number(overs) || 0;
                  const fullOvers = Math.floor(oversNum);
                  const remBalls = Math.round((oversNum - fullOvers) * 10);
                  const totalBalls = (fullOvers * 6) + remBalls;
                  const econ = totalBalls > 0 ? ((runsConceded / totalBalls) * 6).toFixed(2) : '-';

                  return (
                    <View key={idx} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                      <TouchableOpacity
                        style={{ flex: 3 }}
                        onPress={() => pId && router.push({ pathname: '/player-career', params: { id: pId.toString() } })}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.playerNameText, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
                          {pName}
                        </Text>
                      </TouchableOpacity>
                      <Text style={[styles.rowCell, { color: colors.text }]}>{overs}</Text>
                      <Text style={[styles.rowCell, { color: colors.text }]}>{maidens}</Text>
                      <Text style={[styles.rowCell, { color: colors.text }]}>{runsConceded}</Text>
                      <Text style={[styles.rowCell, { color: colors.primary, fontWeight: '800' }]}>{wickets}</Text>
                      <Text style={[styles.rowCell, { color: colors.textMuted, fontSize: 11 }]}>{econ}</Text>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyTableBox}>
                  <Text style={[styles.emptyTableText, { color: colors.textMuted }]}>
                    No bowling figures recorded for this innings.
                  </Text>
                </View>
              )}
            </Card>
          </View>
        )}

        {/* Tab 3: Commentary */}
        {activeTab === 'commentary' && (
          <View style={styles.tabContent}>
            <Card style={styles.commentaryCard}>
              <Text style={[styles.comTitle, { color: colors.text }]}>Ball-by-Ball Match Insights</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 20 }}>
                Detailed ball-by-ball commentary feeds are automatically generated during live cricket sessions. For scanned and imported paper scorecards, verified batting and bowling records are compiled under the Scorecard tab.
              </Text>
            </Card>
          </View>
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
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  navHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  formatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  formatBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  scrollContent: {
    padding: 16,
  },
  headerCard: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  matchDateHeader: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 14,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 14,
  },
  teamCol: {
    alignItems: 'center',
    flex: 1,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '900',
  },
  oversText: {
    fontSize: 12,
    marginTop: 2,
  },
  vsText: {
    fontSize: 16,
    fontWeight: '900',
    marginHorizontal: 10,
  },
  resultBanner: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  resultText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  tabContent: {
    width: '100%',
  },
  detailsCard: {
    padding: 16,
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  infoVal: {
    fontWeight: '700',
    fontSize: 13,
    maxWidth: '60%',
    textAlign: 'right',
  },
  teamTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  teamTabItem: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  tableSectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  tableCard: {
    padding: 0,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  headerCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  playerNameText: {
    fontSize: 13,
  },
  outText: {
    fontSize: 10,
    fontWeight: '600',
  },
  rowCell: {
    flex: 1,
    fontSize: 12,
    textAlign: 'right',
  },
  emptyTableBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTableText: {
    fontSize: 13,
    fontWeight: '600',
  },
  commentaryCard: {
    padding: 16,
  },
  comTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  exportCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  exportTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  exportButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  exportBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
});
