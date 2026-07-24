import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../components/Theme';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import api from '../services/api';

interface StandingsRow {
  teamId: { _id: string; name: string };
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  nrr: number;
}

interface LeaderRow {
  playerId: string;
  name: string;
  runs?: number;
  wickets?: number;
  matches: number;
}

export default function TournamentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [tournamentName, setTournamentName] = useState('');
  const [standings, setStandings] = useState<StandingsRow[]>([]);
  const [orangeCap, setOrangeCap] = useState<LeaderRow[]>([]);
  const [purpleCap, setPurpleCap] = useState<LeaderRow[]>([]);
  
  const [activeTab, setActiveTab] = useState<'standings' | 'caps'>('standings');

  useEffect(() => {
    if (!id) return;

    const fetchTournamentData = async () => {
      try {
        const [tourneyRes, standingsRes, leadersRes] = await Promise.all([
          api.get('/tournaments'), // to find name
          api.get(`/tournaments/${id}/standings`),
          api.get(`/tournaments/${id}/leaders`),
        ]);

        if (tourneyRes.data.success) {
          const matched = tourneyRes.data.data.find((t: any) => t._id === id);
          if (matched) {
            setTournamentName(matched.name);
          }
        }

        if (standingsRes.data.success) {
          setStandings(standingsRes.data.data);
        }

        if (leadersRes.data.success) {
          setOrangeCap(leadersRes.data.data.orangeCap || []);
          setPurpleCap(leadersRes.data.data.purpleCap || []);
        }
      } catch (err) {
        console.error('Error fetching tournament data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournamentData();
  }, [id]);

  if (isLoading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tournament title banner */}
      <Card style={styles.headerCard}>
        <Text style={[styles.title, { color: colors.text }]}>{tournamentName || 'Tournament Details'}</Text>
        <Text style={[styles.desc, { color: colors.textMuted }]}>
          Season Standing Leagues & Leaderboards
        </Text>
      </Card>

      {/* Tabs list */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('standings')}
          style={[styles.tabItem, activeTab === 'standings' && { borderBottomColor: colors.primary }]}
        >
          <Text style={[styles.tabLabel, { color: activeTab === 'standings' ? colors.primary : colors.textMuted }]}>
            POINTS STANDINGS
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('caps')}
          style={[styles.tabItem, activeTab === 'caps' && { borderBottomColor: colors.primary }]}
        >
          <Text style={[styles.tabLabel, { color: activeTab === 'caps' ? colors.primary : colors.textMuted }]}>
            CAP LEADERS
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'standings' && (
          <View style={styles.tabContent}>
            <Card style={styles.tableCard}>
              <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.headerCell, { flex: 2, textAlign: 'left', color: colors.textMuted }]}>Team</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>P</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>W</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>NRR</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted }]}>PTS</Text>
              </View>
              
              {standings.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => router.push({ pathname: '/team-profile', params: { id: item.teamId._id } })}
                >
                  <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.teamNameText, { flex: 2, color: colors.text }]} numberOfLines={1}>
                      {item.teamId.name}
                    </Text>
                    <Text style={[styles.rowCell, { color: colors.text }]}>{item.played}</Text>
                    <Text style={[styles.rowCell, { color: colors.text }]}>{item.won}</Text>
                    <Text style={[styles.rowCell, { color: colors.text }]}>{item.nrr.toFixed(3)}</Text>
                    <Text style={[styles.rowCell, { color: colors.primary, fontWeight: '800' }]}>{item.points}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {standings.length === 0 && (
                <View style={styles.emptyTable}>
                  <Text style={{ color: colors.textMuted }}>No team match records submitted yet.</Text>
                </View>
              )}
            </Card>
          </View>
        )}

        {activeTab === 'caps' && (
          <View style={styles.tabContent}>
            {/* Orange Cap Section */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>ORANGE CAP (MOST RUNS)</Text>
            <Card style={styles.leadersCard}>
              {orangeCap.map((row, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => router.push({ pathname: '/player-career', params: { id: row.playerId } })}
                >
                  <View style={[styles.leaderRowItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.leaderProfile}>
                      <Text style={[styles.rankText, { color: colors.primary }]}>#{idx + 1}</Text>
                      <Text style={[styles.leaderName, { color: colors.text }]}>{row.name}</Text>
                    </View>
                    <Text style={[styles.leaderStat, { color: colors.text }]}>{row.runs} runs</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {orangeCap.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No batting records compiled yet.</Text>
              )}
            </Card>

            {/* Purple Cap Section */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>PURPLE CAP (MOST WICKETS)</Text>
            <Card style={styles.leadersCard}>
              {purpleCap.map((row, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => router.push({ pathname: '/player-career', params: { id: row.playerId } })}
                >
                  <View style={[styles.leaderRowItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.leaderProfile}>
                      <Text style={[styles.rankText, { color: colors.primary }]}>#{idx + 1}</Text>
                      <Text style={[styles.leaderName, { color: colors.text }]}>{row.name}</Text>
                    </View>
                    <Text style={[styles.leaderStat, { color: colors.text }]}>{row.wickets} wkts</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {purpleCap.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No bowling records compiled yet.</Text>
              )}
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
  headerCard: {
    margin: 16,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  desc: {
    fontSize: 12,
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
  tableCard: {
    padding: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  teamNameText: {
    fontSize: 13,
    fontWeight: '700',
  },
  rowCell: {
    flex: 1,
    fontSize: 13,
    textAlign: 'right',
  },
  emptyTable: {
    alignItems: 'center',
    padding: 30,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  leadersCard: {
    padding: 0,
  },
  leaderRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  leaderProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '900',
  },
  leaderName: {
    fontSize: 14,
    fontWeight: '700',
  },
  leaderStat: {
    fontSize: 13,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 13,
    padding: 16,
    textAlign: 'center',
  },
});
