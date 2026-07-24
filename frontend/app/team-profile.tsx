import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../components/Theme';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import api from '../services/api';

interface TeamProfile {
  _id: string;
  name: string;
  logo?: string;
  players: any[];
  stats: {
    matches: number;
    wins: number;
    losses: number;
    points: number;
    nrr: number;
  };
}

export default function TeamProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [team, setTeam] = useState<TeamProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'squad' | 'stats'>('squad');

  useEffect(() => {
    if (!id) return;
    const fetchTeamProfile = async () => {
      try {
        const res = await api.get(`/teams/${id}`);
        if (res.data.success) {
          setTeam(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching team profile:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeamProfile();
  }, [id]);

  if (isLoading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>Team details could not be found.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Team header */}
      <Card style={styles.headerCard}>
        <Avatar name={team.name} size={64} style={styles.avatar} />
        <Text style={[styles.teamName, { color: colors.text }]}>{team.name}</Text>
        <View style={styles.recordRow}>
          <Text style={[styles.recordText, { color: colors.textMuted }]}>
            Wins: <Text style={{ color: colors.text, fontWeight: '700' }}>{team.stats?.wins || 0}</Text>
          </Text>
          <Text style={[styles.recordText, { color: colors.textMuted }]}>
            Losses: <Text style={{ color: colors.text, fontWeight: '700' }}>{team.stats?.losses || 0}</Text>
          </Text>
          <Text style={[styles.recordText, { color: colors.textMuted }]}>
            NRR: <Text style={{ color: colors.primary, fontWeight: '800' }}>{team.stats?.nrr || '0.00'}</Text>
          </Text>
        </View>
      </Card>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('squad')}
          style={[styles.tabItem, activeTab === 'squad' && { borderBottomColor: colors.primary }]}
        >
          <Text style={[styles.tabLabel, { color: activeTab === 'squad' ? colors.primary : colors.textMuted }]}>
            SQUAD
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('stats')}
          style={[styles.tabItem, activeTab === 'stats' && { borderBottomColor: colors.primary }]}
        >
          <Text style={[styles.tabLabel, { color: activeTab === 'stats' ? colors.primary : colors.textMuted }]}>
            STATISTICS
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'squad' && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Squad Players</Text>
            {team.players && team.players.length > 0 ? (
              <View style={styles.list}>
                {team.players.map((item) => (
                  <TouchableOpacity
                    key={item._id}
                    onPress={() => router.push({ pathname: '/player-career', params: { id: item._id } })}
                  >
                    <Card style={styles.playerCard}>
                      <View style={styles.playerRow}>
                        <Avatar name={item.name} size={36} style={styles.playerAvatar} />
                        <Text style={[styles.playerName, { color: colors.text }]}>{item.name}</Text>
                        <Text style={[styles.arrow, { color: colors.primary }]}>→</Text>
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={{ color: colors.textMuted }}>No players linked to this squad yet.</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'stats' && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Season Standing Details</Text>
            <Card style={styles.statsCard}>
              <View style={[styles.statsRow, { borderBottomColor: colors.border }]}>
                <Text style={{ color: colors.textMuted }}>Matches Played</Text>
                <Text style={[styles.statsVal, { color: colors.text }]}>{team.stats?.matches || 0}</Text>
              </View>
              <View style={[styles.statsRow, { borderBottomColor: colors.border }]}>
                <Text style={{ color: colors.textMuted }}>Matches Won</Text>
                <Text style={[styles.statsVal, { color: colors.text }]}>{team.stats?.wins || 0}</Text>
              </View>
              <View style={[styles.statsRow, { borderBottomColor: colors.border }]}>
                <Text style={{ color: colors.textMuted }}>Matches Lost</Text>
                <Text style={[styles.statsVal, { color: colors.text }]}>{team.stats?.losses || 0}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={{ color: colors.textMuted }}>League Points</Text>
                <Text style={[styles.statsVal, { color: colors.primary, fontWeight: '800' }]}>
                  {team.stats?.points || 0} pts
                </Text>
              </View>
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
    padding: 20,
    alignItems: 'center',
  },
  avatar: {
    marginBottom: 12,
  },
  teamName: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  recordRow: {
    flexDirection: 'row',
    gap: 16,
  },
  recordText: {
    fontSize: 13,
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  list: {
    gap: 10,
  },
  playerCard: {
    padding: 12,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerAvatar: {
    marginRight: 12,
  },
  playerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  arrow: {
    fontSize: 16,
    fontWeight: '900',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 30,
  },
  statsCard: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statsVal: {
    fontWeight: '700',
  },
});
