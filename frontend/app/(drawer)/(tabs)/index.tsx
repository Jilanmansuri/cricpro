import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../components/Theme';
import { useAuthStore } from '../../../store/authStore';
import Card from '../../../components/Card';
import Avatar from '../../../components/Avatar';
import StatCard from '../../../components/StatCard';
import { LineChart } from '../../../components/Charts';
import api from '../../../services/api';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [matches, setMatches] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    matchesCount: 0,
    teamsCount: 0,
    tournamentsCount: 0,
    playersCount: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [matchRes, tourneyRes, playerRes, teamRes] = await Promise.all([
          api.get('/matches?limit=5'),
          api.get('/tournaments'),
          api.get('/players?limit=1'),
          api.get('/teams?limit=1'),
        ]);

        if (matchRes.data.success) {
          setMatches(matchRes.data.data);
          setStats(prev => ({ ...prev, matchesCount: matchRes.data.pagination.total }));
        }

        if (tourneyRes.data.success) {
          setTournaments(tourneyRes.data.data);
          setStats(prev => ({ ...prev, tournamentsCount: tourneyRes.data.data.length }));
        }

        if (playerRes.data.success) {
          setStats(prev => ({ ...prev, playersCount: playerRes.data.pagination.total }));
        }

        if (teamRes.data.success) {
          setStats(prev => ({ ...prev, teamsCount: teamRes.data.pagination.total }));
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Header welcome banner */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>Welcome back,</Text>
          <Text style={[styles.username, { color: colors.text }]}>{user?.username || 'Player'}</Text>
        </View>
        <Avatar name={user?.username || 'P'} size={48} />
      </View>

      {/* Quick stats cards */}
      <View style={styles.statsRow}>
        <StatCard title="Matches" value={stats.matchesCount} style={styles.statCard} />
        <StatCard title="Tournaments" value={stats.tournamentsCount} style={styles.statCard} />
      </View>
      <View style={styles.statsRow}>
        <StatCard title="Teams" value={stats.teamsCount} style={styles.statCard} />
        <StatCard title="Players" value={stats.playersCount} style={styles.statCard} />
      </View>

      {/* Analytics chart */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance Insights</Text>
      <Card style={styles.chartCard}>
        <Text style={[styles.chartHeader, { color: colors.textMuted }]}>Matches Played Over Time</Text>
        <LineChart
          data={[
            { date: '2026-01-01', value: 1 },
            { date: '2026-02-01', value: 3 },
            { date: '2026-03-01', value: 2 },
            { date: '2026-04-01', value: 5 },
            { date: '2026-05-01', value: 4 },
            { date: '2026-06-01', value: 6 }
          ]}
          title="Matches Played"
        />
      </Card>

      {/* Recent Matches */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Matches</Text>
        <TouchableOpacity onPress={() => router.push('/(drawer)/(tabs)/players')}>
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>See All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={matches}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push({ pathname: '/match-details', params: { id: item._id } })}>
            <Card style={styles.matchCard}>
              <Text style={[styles.matchDate, { color: colors.textMuted }]}>
                {new Date(item.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </Text>
              <Text style={[styles.matchVs, { color: colors.text }]}>
                {item.teamA?.name} vs {item.teamB?.name}
              </Text>
              <Text style={[styles.matchResult, { color: colors.primary }]} numberOfLines={1}>
                {item.result}
              </Text>
            </Card>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.matchesList}
      />

      {/* Recent Tournaments */}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>Active Tournaments</Text>
      <View style={styles.tourneyList}>
        {tournaments.map((t) => (
          <TouchableOpacity
            key={t._id}
            onPress={() => router.push({ pathname: '/tournament-details', params: { id: t._id } })}
          >
            <Card style={styles.tourneyCard}>
              <View style={styles.tourneyHeader}>
                <Text style={[styles.tourneyName, { color: colors.text }]}>{t.name}</Text>
                <Text style={[styles.tourneyDates, { color: colors.textMuted }]}>
                  {new Date(t.startDate).getFullYear()}
                </Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

import { Dimensions } from 'react-native';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 90,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '600',
  },
  username: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 24,
    marginBottom: 12,
  },
  chartCard: {
    padding: 16,
  },
  chartHeader: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  matchesList: {
    gap: 12,
  },
  matchCard: {
    width: 200,
    padding: 14,
  },
  matchDate: {
    fontSize: 11,
    marginBottom: 4,
  },
  matchVs: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  matchResult: {
    fontSize: 12,
    fontWeight: '700',
  },
  tourneyList: {
    gap: 10,
  },
  tourneyCard: {
    padding: 14,
  },
  tourneyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tourneyName: {
    fontSize: 14,
    fontWeight: '800',
  },
  tourneyDates: {
    fontSize: 12,
  },
});
