import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../components/Theme';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import api from '../services/api';

interface ScorecardRow {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  outStatus: string;
}

interface BowlingRow {
  name: string;
  overs: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
}

interface MatchDetails {
  _id: string;
  date: string;
  overs: number;
  result: string;
  scorecardUrl?: string;
  ocrConfidence?: number;
  teamA: { _id: string; name: string; logo?: string };
  teamB: { _id: string; name: string; logo?: string };
  teamAScore: { runs: number; wickets: number; overs: number };
  teamBScore: { runs: number; wickets: number; overs: number };
  mvp?: { _id: string; name: string };
  venueId?: { name: string };
}

export default function MatchDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [matchData, setMatchData] = useState<MatchDetails | null>(null);
  const [playerStats, setPlayerStats] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'summary' | 'scorecard' | 'commentary'>('summary');
  const [activeTeamTab, setActiveTeamTab] = useState<'teamA' | 'teamB'>('teamA');

  useEffect(() => {
    if (!id) return;

    const fetchMatchDetails = async () => {
      try {
        const res = await api.get(`/matches/${id}`);
        if (res.data.success) {
          setMatchData(res.data.data.match);
          setPlayerStats(res.data.data.playerStats);
        }
      } catch (err) {
        console.error('Error fetching match details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatchDetails();
  }, [id]);

  if (isLoading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!matchData) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>Match details could not be found.</Text>
      </View>
    );
  }

  const teamABatting = playerStats.filter(s => s.teamId === matchData.teamA._id && !s.batting.didNotBat);
  const teamABowling = playerStats.filter(s => s.teamId === matchData.teamB._id && !s.bowling.didNotBowl);
  
  const teamBBatting = playerStats.filter(s => s.teamId === matchData.teamB._id && !s.batting.didNotBat);
  const teamBBowling = playerStats.filter(s => s.teamId === matchData.teamA._id && !s.bowling.didNotBowl);

  const battingList = activeTeamTab === 'teamA' ? teamABatting : teamBBatting;
  const bowlingList = activeTeamTab === 'teamA' ? teamABowling : teamBBowling;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Score header */}
      <Card style={styles.headerCard}>
        <View style={styles.scoreRow}>
          <View style={styles.teamCol}>
            <Avatar name={matchData.teamA.name} size={44} />
            <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>{matchData.teamA.name}</Text>
            <Text style={[styles.scoreText, { color: colors.text }]}>
              {matchData.teamAScore.runs}/{matchData.teamAScore.wickets}
            </Text>
            <Text style={[styles.oversText, { color: colors.textMuted }]}>
              ({matchData.teamAScore.overs} ov)
            </Text>
          </View>

          <Text style={[styles.vsText, { color: colors.primary }]}>VS</Text>

          <View style={styles.teamCol}>
            <Avatar name={matchData.teamB.name} size={44} />
            <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>{matchData.teamB.name}</Text>
            <Text style={[styles.scoreText, { color: colors.text }]}>
              {matchData.teamBScore.runs}/{matchData.teamBScore.wickets}
            </Text>
            <Text style={[styles.oversText, { color: colors.textMuted }]}>
              ({matchData.teamBScore.overs} ov)
            </Text>
          </View>
        </View>
        
        <Text style={[styles.resultText, { color: colors.primary, backgroundColor: colors.primary + '12' }]}>
          {matchData.result}
        </Text>
      </Card>

      {/* Tabs list */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {(['summary', 'scorecard', 'commentary'] as const).map(tab => (
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'summary' && (
          <View style={styles.tabContent}>
            <Card style={styles.detailsCard}>
              <Text style={[styles.detailsTitle, { color: colors.text }]}>Match Information</Text>
              
              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={{ color: colors.textMuted }}>Venue</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>{matchData.venueId?.name || 'N/A'}</Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={{ color: colors.textMuted }}>Date</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>
                  {new Date(matchData.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </Text>
              </View>

              {matchData.mvp && (
                <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                  <Text style={{ color: colors.textMuted }}>Match MVP</Text>
                  <Text style={[styles.infoVal, { color: colors.primary, fontWeight: '800' }]}>
                    {matchData.mvp.name}
                  </Text>
                </View>
              )}

              {matchData.ocrConfidence && (
                <View style={styles.infoRow}>
                  <Text style={{ color: colors.textMuted }}>OCR Parse Confidence</Text>
                  <Text style={[styles.infoVal, { color: colors.primary }]}>
                    {Math.round(matchData.ocrConfidence * 100)}%
                  </Text>
                </View>
              )}
            </Card>
          </View>
        )}

        {activeTab === 'scorecard' && (
          <View style={styles.tabContent}>
            <View style={styles.teamTabRow}>
              <TouchableOpacity
                onPress={() => setActiveTeamTab('teamA')}
                style={[styles.teamTabItem, activeTeamTab === 'teamA' && { backgroundColor: colors.primary + '15' }]}
              >
                <Text style={{ color: activeTeamTab === 'teamA' ? colors.primary : colors.textMuted, fontWeight: '700' }}>
                  {matchData.teamA.name}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTeamTab('teamB')}
                style={[styles.teamTabItem, activeTeamTab === 'teamB' && { backgroundColor: colors.primary + '15' }]}
              >
                <Text style={{ color: activeTeamTab === 'teamB' ? colors.primary : colors.textMuted, fontWeight: '700' }}>
                  {matchData.teamB.name}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Batting scorecard */}
            <Text style={[styles.tableSectionTitle, { color: colors.text }]}>BATTING</Text>
            <Card style={styles.tableCard}>
              <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.headerCell, { flex: 3, color: colors.textMuted }]}>Batsman</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>R</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>B</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>4s</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>6s</Text>
              </View>
              {battingList.map((item, idx) => (
                <View key={idx} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 3 }}>
                    <Text style={[styles.playerNameText, { color: colors.text }]}>{item.playerId.name}</Text>
                    <Text style={[styles.outText, { color: colors.textMuted }]}>
                      {item.batting.outStatus === 'not_out' ? 'not out' : 'out'}
                    </Text>
                  </View>
                  <Text style={[styles.rowCell, { color: colors.text, fontWeight: '800' }]}>{item.batting.runs}</Text>
                  <Text style={[styles.rowCell, { color: colors.text }]}>{item.batting.balls}</Text>
                  <Text style={[styles.rowCell, { color: colors.text }]}>{item.batting.fours}</Text>
                  <Text style={[styles.rowCell, { color: colors.text }]}>{item.batting.sixes}</Text>
                </View>
              ))}
            </Card>

            {/* Bowling scorecard */}
            <Text style={[styles.tableSectionTitle, { color: colors.text, marginTop: 24 }]}>BOWLING</Text>
            <Card style={styles.tableCard}>
              <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.headerCell, { flex: 3, color: colors.textMuted }]}>Bowler</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>O</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>M</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>R</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>W</Text>
              </View>
              {bowlingList.map((item, idx) => (
                <View key={idx} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.playerNameText, { flex: 3, color: colors.text }]}>{item.playerId.name}</Text>
                  <Text style={[styles.rowCell, { color: colors.text }]}>{item.bowling.overs}</Text>
                  <Text style={[styles.rowCell, { color: colors.text }]}>{item.bowling.maidens}</Text>
                  <Text style={[styles.rowCell, { color: colors.text }]}>{item.bowling.runsConceded}</Text>
                  <Text style={[styles.rowCell, { color: colors.primary, fontWeight: '800' }]}>{item.bowling.wickets}</Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {activeTab === 'commentary' && (
          <View style={styles.tabContent}>
            <Card style={styles.commentaryCard}>
              <Text style={[styles.comTitle, { color: colors.text }]}>Ball-by-Ball commentary</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>
                Commentary logs are automatically generated for live simulated matches. For scanned scorecards, summary analytics are compiled above.
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    margin: 16,
    padding: 16,
    alignItems: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
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
    fontSize: 18,
    fontWeight: '900',
  },
  oversText: {
    fontSize: 12,
  },
  vsText: {
    fontSize: 16,
    fontWeight: '900',
    marginHorizontal: 12,
  },
  resultText: {
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    textAlign: 'center',
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
  },
  tabContent: {
    width: '100%',
  },
  detailsCard: {
    padding: 16,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoVal: {
    fontWeight: '700',
  },
  teamTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  teamTabItem: {
    flex: 1,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
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
    fontWeight: '700',
  },
  outText: {
    fontSize: 10,
  },
  rowCell: {
    flex: 1,
    fontSize: 13,
    textAlign: 'right',
  },
  commentaryCard: {
    padding: 16,
  },
  comTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
});
