import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../../components/Theme';
import Card from '../../../components/Card';
import Avatar from '../../../components/Avatar';
import api from '../../../services/api';
import { useFocusEffect } from 'expo-router';

export default function StatsLeaderboardTab() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'batting' | 'bowling'>('batting');
  const [isLoading, setIsLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<{ topBatsmen: any[], topBowlers: any[] }>({ topBatsmen: [], topBowlers: [] });
  const [battingSort, setBattingSort] = useState('Runs');
  const [bowlingSort, setBowlingSort] = useState('Wickets');
  
  const battingFilters = ['Runs', 'Average', 'Strike Rate', 'Highest Score', 'Sixes', 'Fours', '50s', '100s'];
  const bowlingFilters = ['Wickets', 'Economy', 'Average', 'Maidens'];

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/players/leaderboard');
      if (res.data.success) {
        setLeaderboard(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLeaderboard();
    }, [])
  );

  const renderBattingItem = ({ item, index }: any) => {
    const player = item.playerId || { name: 'Unknown Player' };
    const stats = item.batting;
    const strikeRate = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '0.0';
    const outs = stats.matches - (stats.notOuts || 0);
    const average = outs > 0 ? (stats.runs / outs).toFixed(1) : stats.runs.toFixed(1);
    
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={[styles.rank, { color: colors.primary }]}>#{index + 1}</Text>
          <Avatar name={player.name} size={42} style={styles.avatar} />
          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.text }]}>{player.name}</Text>
            <Text style={[styles.subText, { color: colors.textMuted }]}>SR: {strikeRate} | Avg: {average}</Text>
            <Text style={[styles.subText, { color: colors.textMuted, fontSize: 10, marginTop: 2 }]}>4s: {stats.fours} | 6s: {stats.sixes} | 50s: {stats.fifties}</Text>
          </View>
          <View style={styles.statsRight}>
            <Text style={[styles.mainStat, { color: colors.text }]}>
              {battingSort === 'Average' ? average :
               battingSort === 'Strike Rate' ? strikeRate :
               battingSort === 'Highest Score' ? (stats.highestScore || 0) :
               battingSort === 'Sixes' ? stats.sixes :
               battingSort === 'Fours' ? stats.fours :
               battingSort === '50s' ? stats.fifties :
               battingSort === '100s' ? stats.hundreds :
               stats.runs}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{battingSort}</Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderBowlingItem = ({ item, index }: any) => {
    const player = item.playerId || { name: 'Unknown Player' };
    const stats = item.bowling;
    const economy = stats.overs > 0 ? (stats.runsConceded / stats.overs).toFixed(2) : '0.00';
    const average = stats.wickets > 0 ? (stats.runsConceded / stats.wickets).toFixed(1) : '0.0';
    
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={[styles.rank, { color: colors.primary }]}>#{index + 1}</Text>
          <Avatar name={player.name} size={42} style={styles.avatar} />
          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.text }]}>{player.name}</Text>
            <Text style={[styles.subText, { color: colors.textMuted }]}>Econ: {economy} | Avg: {average}</Text>
            <Text style={[styles.subText, { color: colors.textMuted, fontSize: 10, marginTop: 2 }]}>Overs: {stats.overs} | Runs: {stats.runsConceded}</Text>
          </View>
          <View style={styles.statsRight}>
            <Text style={[styles.mainStat, { color: colors.text }]}>
              {bowlingSort === 'Economy' ? economy :
               bowlingSort === 'Average' ? average :
               bowlingSort === 'Maidens' ? (stats.maidens || 0) :
               stats.wickets}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{bowlingSort}</Text>
          </View>
        </View>
      </Card>
    );
  };


  const getSortedData = () => {
    if (activeTab === 'batting') {
      let data = [...leaderboard.topBatsmen];
      return data.sort((a, b) => {
        const statsA = a.batting;
        const statsB = b.batting;
        
        const srA = statsA.balls > 0 ? (statsA.runs / statsA.balls) * 100 : 0;
        const srB = statsB.balls > 0 ? (statsB.runs / statsB.balls) * 100 : 0;
        
        const outsA = statsA.matches - (statsA.notOuts || 0);
        const avgA = outsA > 0 ? statsA.runs / outsA : statsA.runs;
        
        const outsB = statsB.matches - (statsB.notOuts || 0);
        const avgB = outsB > 0 ? statsB.runs / outsB : statsB.runs;

        switch(battingSort) {
          case 'Runs': return statsB.runs - statsA.runs;
          case 'Average': return avgB - avgA;
          case 'Strike Rate': return srB - srA;
          case 'Highest Score': return (statsB.highestScore || 0) - (statsA.highestScore || 0);
          case 'Sixes': return statsB.sixes - statsA.sixes;
          case 'Fours': return statsB.fours - statsA.fours;
          case '50s': return statsB.fifties - statsA.fifties;
          case '100s': return statsB.hundreds - statsA.hundreds;
          default: return statsB.runs - statsA.runs;
        }
      });
    } else {
      let data = [...leaderboard.topBowlers];
      return data.sort((a, b) => {
        const statsA = a.bowling;
        const statsB = b.bowling;

        const econA = statsA.overs > 0 ? (statsA.runsConceded / statsA.overs) : 999;
        const econB = statsB.overs > 0 ? (statsB.runsConceded / statsB.overs) : 999;

        const avgA = statsA.wickets > 0 ? (statsA.runsConceded / statsA.wickets) : 999;
        const avgB = statsB.wickets > 0 ? (statsB.runsConceded / statsB.wickets) : 999;

        switch(bowlingSort) {
          case 'Wickets': return statsB.wickets - statsA.wickets;
          case 'Economy': return econA - econB; // Lower is better
          case 'Average': return avgA - avgB; // Lower is better
          case 'Maidens': return (statsB.maidens || 0) - (statsA.maidens || 0);
          default: return statsB.wickets - statsA.wickets;
        }
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.tabSwitcher}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'batting' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          onPress={() => setActiveTab('batting')}
        >
          <Text style={[styles.tabBtnText, { color: activeTab === 'batting' ? '#fff' : colors.text }]}>Top Batsmen</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'bowling' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          onPress={() => setActiveTab('bowling')}
        >
          <Text style={[styles.tabBtnText, { color: activeTab === 'bowling' ? '#fff' : colors.text }]}>Top Bowlers</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {(activeTab === 'batting' ? battingFilters : bowlingFilters).map(filter => (
            <TouchableOpacity 
              key={filter} 
              style={[
                styles.filterPill, 
                { backgroundColor: colors.surface, borderColor: colors.border },
                (activeTab === 'batting' ? battingSort : bowlingSort) === filter && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => activeTab === 'batting' ? setBattingSort(filter) : setBowlingSort(filter)}
            >
              <Text style={[
                styles.filterText, 
                { color: colors.textMuted },
                (activeTab === 'batting' ? battingSort : bowlingSort) === filter && { color: '#fff', fontWeight: 'bold' }
              ]}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={getSortedData()}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          renderItem={activeTab === 'batting' ? renderBattingItem : renderBowlingItem}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: colors.textMuted }}>No {activeTab} stats recorded yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  tabSwitcher: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 12,
  },
  filtersContainer: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: {
    fontSize: 13,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  tabBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 90,
    gap: 10,
  },
  card: {
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rank: {
    fontSize: 18,
    fontWeight: '900',
    marginRight: 12,
    width: 32,
  },
  avatar: {
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
  },
  subText: {
    fontSize: 12,
    marginTop: 4,
  },
  statsRight: {
    alignItems: 'flex-end',
  },
  mainStat: {
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    marginTop: 40,
  },
});
