import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../components/Theme';
import { getPlayerCareer, getPlayerHistory } from '../services/playerService';
import { Card } from '../components/Card';
import { LineChart } from '../components/Charts';

export default function PlayerCareerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  const [playerData, setPlayerData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [careerRes, historyRes] = await Promise.all([
          getPlayerCareer(id),
          getPlayerHistory(id)
        ]);

        if (careerRes.success) setPlayerData(careerRes.data);
        if (historyRes.success) setHistory(historyRes.data);
      } catch (err) {
        console.error('Failed to load profile details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchProfile();
  }, [id]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!playerData) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Player profile not found.</Text>
      </View>
    );
  }

  const { player, career } = playerData;
  const batting = career.batting || {};
  const bowling = career.bowling || {};
  const fielding = career.fielding || {};

  // Formulate stats averages
  const outs = batting.matches - batting.notOuts;
  const battingAvg = outs > 0 ? parseFloat((batting.runs / outs).toFixed(2)) : batting.runs;
  const battingSR = batting.balls > 0 ? parseFloat(((batting.runs / batting.balls) * 100).toFixed(2)) : 0;

  // Exact bowling economy
  // Helper to convert overs decimal notation to balls
  const oversToBalls = (o: number) => Math.floor(o) * 6 + Math.round((o % 1) * 10);
  const totalBallsBowled = oversToBalls(bowling.overs);
  const bowlingEcon = totalBallsBowled > 0 ? parseFloat(((bowling.runsConceded / totalBallsBowled) * 6).toFixed(2)) : 0;

  // Prepare chart datasets
  const runsChartData = history.map(h => ({ date: h.date, value: h.runs }));
  const wicketsChartData = history.map(h => ({ date: h.date, value: h.wickets }));
  const srChartData = history.map(h => ({ date: h.date, value: h.strikeRate }));
  const econChartData = history.map(h => ({ date: h.date, value: h.economy }));

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Card style={styles.profileHeaderCard}>
        <View style={styles.headerRow}>
          <View style={[styles.largeAvatar, { backgroundColor: colors.surfaceLighter }]}>
            <Text style={[styles.largeAvatarText, { color: colors.primary }]}>{player.name[0].toUpperCase()}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.playerName, { color: colors.text }]}>{player.name}</Text>
            <Text style={[styles.matchesLabel, { color: colors.textMuted }]}>Matches: {batting.matches || 0}</Text>
            {player.aliases?.length > 1 && (
              <Text style={[styles.aliasesLabel, { color: colors.textMuted }]}>
                Aliases: {player.aliases.filter((a: string) => a.toLowerCase() !== player.name.toLowerCase()).join(', ')}
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.recordsRow, { borderTopColor: colors.border }]}>
          <View style={styles.recordStat}>
            <Text style={[styles.recordValue, { color: colors.text }]}>{career.wins || 0}</Text>
            <Text style={[styles.recordLabel, { color: colors.textMuted }]}>Wins</Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={[styles.recordValue, { color: colors.text }]}>{career.losses || 0}</Text>
            <Text style={[styles.recordLabel, { color: colors.textMuted }]}>Losses</Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={[styles.recordValue, { color: colors.text }]}>{career.mvps || 0}</Text>
            <Text style={[styles.recordLabel, { color: colors.textMuted }]}>MVPs</Text>
          </View>
        </View>
      </Card>

      <Text style={[styles.sectionHeading, { color: colors.text }]}>Batting Statistics</Text>
      <Card style={styles.statsGridCard}>
        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{batting.runs || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Runs</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{battingAvg}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Average</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{battingSR}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Strike Rate</Text>
          </View>
        </View>
        <View style={[styles.gridRow, { marginTop: 16 }]}>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{batting.highestScore || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Highest Score</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{batting.fifties || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>50s</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{batting.hundreds || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>100s</Text>
          </View>
        </View>
        <View style={[styles.gridRow, { marginTop: 16 }]}>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{batting.fours || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Fours (4s)</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{batting.sixes || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Sixes (6s)</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{batting.ducks || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Ducks</Text>
          </View>
        </View>
      </Card>

      <Text style={[styles.sectionHeading, { color: colors.text }]}>Bowling Statistics</Text>
      <Card style={styles.statsGridCard}>
        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{bowling.wickets || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Wickets</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{bowling.overs || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Overs</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{bowlingEcon}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Economy</Text>
          </View>
        </View>
        <View style={[styles.gridRow, { marginTop: 16 }]}>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>
              {bowling.bestBowling?.wickets || 0}/{bowling.bestBowling?.runs || 0}
            </Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Best Bowling</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{bowling.maidens || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Maidens</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{bowling.runsConceded || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Runs Conceded</Text>
          </View>
        </View>
      </Card>

      <Text style={[styles.sectionHeading, { color: colors.text }]}>Fielding Statistics</Text>
      <Card style={styles.statsGridCard}>
        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{fielding.catches || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Catches</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{fielding.stumpings || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Stumpings</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{fielding.runOuts || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Run Outs</Text>
          </View>
        </View>
      </Card>

      <Text style={[styles.sectionHeading, { color: colors.text }]}>Performance Trends</Text>
      <LineChart data={runsChartData} title="Runs Per Match" colorType="primary" />
      <LineChart data={srChartData} title="Batting Strike Rate" colorType="secondary" />
      <LineChart data={wicketsChartData} title="Wickets Per Match" colorType="primary" />
      <LineChart data={econChartData} title="Bowling Economy Rate" colorType="warning" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeaderCard: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  largeAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  largeAvatarText: {
    fontSize: 26,
    fontWeight: '800',
  },
  headerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  matchesLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  aliasesLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  recordsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 16,
  },
  recordStat: {
    alignItems: 'center',
  },
  recordValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  recordLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  statsGridCard: {
    marginBottom: 20,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCol: {
    flex: 1,
    alignItems: 'center',
  },
  gridVal: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
