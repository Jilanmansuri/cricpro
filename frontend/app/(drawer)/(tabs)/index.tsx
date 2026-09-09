import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../components/Theme';
import { useAuthStore } from '../../../store/authStore';
import Card from '../../../components/Card';
import Avatar from '../../../components/Avatar';
import StatCard from '../../../components/StatCard';
import TeamLogo from '../../../components/TeamLogo';
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
          setStats((prev) => ({ ...prev, matchesCount: matchRes.data.pagination.total }));
        }

        if (tourneyRes.data.success) {
          setTournaments(tourneyRes.data.data);
          setStats((prev) => ({ ...prev, tournamentsCount: tourneyRes.data.data.length }));
        }

        if (playerRes.data.success) {
          setStats((prev) => ({ ...prev, playersCount: playerRes.data.pagination.total }));
        }

        if (teamRes.data.success) {
          setStats((prev) => ({ ...prev, teamsCount: teamRes.data.pagination.total }));
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
      <Card style={[styles.heroCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}> 
        <View style={styles.heroContent}>
          <View style={styles.heroTextBlock}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>Cricket Dashboard</Text>
            <Text style={[styles.username, { color: colors.text }]}>{user?.username || 'Player'}</Text>
            <Text style={[styles.heroSubtext, { color: colors.textMuted }]}>Stay on top of matches, tournaments, and team momentum.</Text>
          </View>
          <Avatar name={user?.username || 'P'} size={52} />
        </View>
      </Card>

      <View style={styles.statsRow}>
        <StatCard title="Matches" value={stats.matchesCount} subtext="Live feed" style={styles.statCard} />
        <StatCard title="Tournaments" value={stats.tournamentsCount} subtext="Active" style={styles.statCard} />
      </View>
      <View style={styles.statsRow}>
        <StatCard title="Teams" value={stats.teamsCount} subtext="Tracked" style={styles.statCard} />
        <StatCard title="Players" value={stats.playersCount} subtext="Registered" style={styles.statCard} />
      </View>

      <Card style={[styles.chartCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}> 
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance Insights</Text>
          <View style={[styles.pill, { backgroundColor: colors.accent }]}> 
            <Text style={[styles.pillText, { color: colors.primary }]}>Updated</Text>
          </View>
        </View>
        <Text style={[styles.chartHeader, { color: colors.textMuted }]}>Matches Played Over Time</Text>
        <LineChart
          data={[
            { date: '2026-01-01', value: 1 },
            { date: '2026-02-01', value: 3 },
            { date: '2026-03-01', value: 2 },
            { date: '2026-04-01', value: 5 },
            { date: '2026-05-01', value: 4 },
            { date: '2026-06-01', value: 6 },
          ]}
          title="Matches Played"
        />
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Matches</Text>
        <TouchableOpacity onPress={() => router.push('/(drawer)/(tabs)/players')}>
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>See All</Text>
        </TouchableOpacity>
      </View>

      {matches.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matchesList}>
          {matches.map((item) => (
            <TouchableOpacity
              key={item._id}
              onPress={() => router.push({ pathname: '/match-details', params: { id: item._id } })}
            >
              <Card style={styles.matchCard}>
                <Text style={[styles.matchDate, { color: colors.textMuted }]}> 
                  {new Date(item.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 4 }}>
                  <TeamLogo teamName={item.teamA?.name} shortName={item.teamA?.shortName} teamId={item.teamA?.teamId} size={20} />
                  <Text style={[styles.matchVs, { color: colors.text, marginVertical: 0 }]} numberOfLines={1}> 
                    {item.teamA?.name} vs {item.teamB?.name}
                  </Text>
                  <TeamLogo teamName={item.teamB?.name} shortName={item.teamB?.shortName} teamId={item.teamB?.teamId} size={20} />
                </View>
                <Text style={[styles.matchResult, { color: colors.primary }]} numberOfLines={1}>
                  {item.result}
                </Text>
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No recent matches yet.</Text>
        </Card>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>Active Tournaments</Text>
      <View style={styles.tourneyList}>
        {tournaments.length > 0 ? (
          tournaments.map((t) => (
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
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No tournaments available right now.</Text>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    marginTop: 6,
    marginBottom: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  heroTextBlock: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  username: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  heroSubtext: {
    fontSize: 13,
    lineHeight: 19,
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
    marginTop: 10,
    marginBottom: 12,
  },
  chartCard: {
    padding: 16,
    marginBottom: 10,
  },
  chartHeader: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  matchesList: {
    gap: 12,
    paddingRight: 4,
  },
  matchCard: {
    width: 220,
    padding: 14,
    marginRight: 12,
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
  emptyCard: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
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
    flex: 1,
    marginRight: 6,
  },
  tourneyDates: {
    fontSize: 12,
    fontWeight: '600',
  },
});
