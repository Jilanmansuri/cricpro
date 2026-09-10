import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useTheme } from '../../../components/Theme';
import Card from '../../../components/Card';
import Avatar from '../../../components/Avatar';
import api from '../../../services/api';
import { useFocusEffect } from 'expo-router';
import TeamLogo from '../../../components/TeamLogo';

export default function StatsLeaderboardTab() {
  const { colors, isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<'batting' | 'bowling'>('batting');
  const [selectedDivision, setSelectedDivision] = useState<'all' | 'international' | 'ipl'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<{ topBatsmen: any[], topBowlers: any[] }>({ topBatsmen: [], topBowlers: [] });
  const [battingSort, setBattingSort] = useState('Runs');
  const [bowlingSort, setBowlingSort] = useState('Wickets');
  
  const battingFilters = ['Runs', 'Highest Score', 'Average', 'Strike Rate', '100s', '50s', 'Sixes', 'Fours'];
  const bowlingFilters = ['Wickets', 'Economy', 'Average', 'Maidens'];

  const fetchLeaderboard = async (division = selectedDivision) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/players/leaderboard?division=${division}`);
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
      fetchLeaderboard(selectedDivision);
    }, [selectedDivision])
  );

  const resolveDisplayTeam = (player: any, rawTeam: any, division: string) => {
    const pName = (player?.name || '').toLowerCase();
    const isIndian = [
      'sharma', 'yadav', 'samson', 'gill', 'gaikwad', 'pandya',
      'bumrah', 'siraj', 'patel', 'arshdeep', 'kohli', 'rahul',
      'pant', 'chahal', 'dube', 'iyer', 'jaiswal', 'singh', 'rinku'
    ].some(sub => pName.includes(sub));

    if (division === 'ipl') {
      if (rawTeam && (rawTeam.teamId?.startsWith('IPL_') || rawTeam.shortName?.length <= 4)) {
        return rawTeam;
      }
      return rawTeam;
    }

    // In International or All division:
    if (isIndian) {
      return {
        name: 'India',
        shortName: 'IND',
        flag: '🇮🇳',
        color: '#0078FF',
        teamId: 'INT_IND'
      };
    }

    const isSouthAfrican = [
      'ferreira', 'naicker', 'marco', 'kg', 'khoza', 'klaasen',
      'de kock', 'rabada', 'miller', 'bavuma', 'nortje', 'stubbs'
    ].some(sub => pName.includes(sub));

    if (isSouthAfrican) {
      return {
        name: 'South Africa',
        shortName: 'SA',
        flag: '🇿🇦',
        color: '#007A3D',
        teamId: 'INT_RSA'
      };
    }

    return rawTeam;
  };

  const renderBattingItem = ({ item, index }: any) => {
    const player = item.playerId || { name: item.playerName || 'Unknown Player' };
    const stats = item.batting;
    const team = resolveDisplayTeam(player, item.team, selectedDivision);
    const strikeRate = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '0.0';
    const outs = stats.matches - (stats.notOuts || 0);
    const average = outs > 0 ? (stats.runs / outs).toFixed(1) : stats.runs.toString();

    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={[styles.rank, { color: colors.primary }]}>#{index + 1}</Text>
          <Avatar name={player.name} size={42} style={styles.avatar} />
          <View style={styles.info}>
            <View style={styles.nameAndTeamRow}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{player.name}</Text>
              {team ? (
                <View style={[styles.teamBadge, { backgroundColor: colors.surfaceLighter || 'rgba(255,255,255,0.06)', borderColor: colors.border }]}>
                  <TeamLogo
                    shortName={team.shortName}
                    teamName={team.name}
                    teamId={team.teamId}
                    playerName={player.name}
                    country={player.country}
                    logoUrl={team.logo}
                    fallbackEmoji={team.flag}
                    size={16}
                  />
                  <Text style={[styles.teamBadgeText, { color: team.color || colors.text }]}>
                    {team.shortName || team.name}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.subText, { color: colors.textMuted }]}>
              Runs: <Text style={{ color: colors.text, fontWeight: '700' }}>{stats.runs}</Text> | HS: <Text style={{ color: colors.primary, fontWeight: '700' }}>{stats.highestScore || 0}</Text> | SR: {strikeRate}
            </Text>
            <Text style={[styles.subText, { color: colors.textMuted, fontSize: 10, marginTop: 2 }]}>
              Avg: {average} | 100s: {stats.hundreds || 0} | 50s: {stats.fifties || 0} | 4s: {stats.fours} | 6s: {stats.sixes}
            </Text>
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
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {battingSort === 'Highest Score' ? 'High Score (HS)' : battingSort === 'Runs' ? 'Total Runs' : battingSort}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderBowlingItem = ({ item, index }: any) => {
    const player = item.playerId || { name: item.playerName || 'Unknown Player' };
    const stats = item.bowling;
    const team = resolveDisplayTeam(player, item.team, selectedDivision);
    const economy = stats.overs > 0 ? (stats.runsConceded / stats.overs).toFixed(2) : '0.00';
    const average = stats.wickets > 0 ? (stats.runsConceded / stats.wickets).toFixed(1) : '0.0';
    
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={[styles.rank, { color: colors.primary }]}>#{index + 1}</Text>
          <Avatar name={player.name} size={42} style={styles.avatar} />
          <View style={styles.info}>
            <View style={styles.nameAndTeamRow}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{player.name}</Text>
              {team ? (
                <View style={[styles.teamBadge, { backgroundColor: colors.surfaceLighter || 'rgba(255,255,255,0.06)', borderColor: colors.border }]}>
                  <TeamLogo
                    shortName={team.shortName}
                    teamName={team.name}
                    teamId={team.teamId}
                    playerName={player.name}
                    country={player.country}
                    logoUrl={team.logo}
                    fallbackEmoji={team.flag}
                    size={16}
                  />
                  <Text style={[styles.teamBadgeText, { color: team.color || colors.text }]}>
                    {team.shortName || team.name}
                  </Text>
                </View>
              ) : null}
            </View>
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
      {/* Real Cricket Style Division / Tournament Selector */}
      <View style={[styles.divisionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.divisionHeaderRow}>
          <Text style={[styles.divisionTitle, { color: colors.text }]}>🏆 Cricket Division</Text>
          <Text style={[styles.divisionBadge, { color: colors.primary, backgroundColor: colors.primary + '18' }]}>
            {selectedDivision === 'all' ? 'All Competitions' : selectedDivision === 'international' ? 'ICC International' : 'IPL Franchise'}
          </Text>
        </View>
        <View style={styles.divisionBtnRow}>
          {[
            { key: 'all', label: 'All', icon: '🌐' },
            { key: 'international', label: 'International', icon: '🇮🇳' },
            { key: 'ipl', label: 'IPL', icon: '🏏' }
          ].map(d => (
            <TouchableOpacity
              key={d.key}
              style={[
                styles.divisionBtn,
                { backgroundColor: colors.background, borderColor: colors.border },
                selectedDivision === d.key && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => setSelectedDivision(d.key as any)}
            >
              <Text style={{ fontSize: 13, marginRight: 4 }}>{d.icon}</Text>
              <Text
                style={[
                  styles.divisionBtnText,
                  { color: selectedDivision === d.key ? '#fff' : colors.text },
                  selectedDivision === d.key && { fontWeight: '800' }
                ]}
              >
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.tabSwitcher}>
        <TouchableOpacity 
          style={[
            styles.tabBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
            activeTab === 'batting' && { backgroundColor: colors.primary, borderColor: colors.primary }
          ]}
          onPress={() => setActiveTab('batting')}
        >
          <Text style={[styles.tabBtnText, { color: activeTab === 'batting' ? '#fff' : colors.text }]}>Top Batsmen</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.tabBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
            activeTab === 'bowling' && { backgroundColor: colors.primary, borderColor: colors.primary }
          ]}
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
    borderRadius: 10,
    borderWidth: 1,
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
  nameAndTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    gap: 3,
  },
  teamLogoImg: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  teamFlagEmoji: {
    fontSize: 12,
  },
  teamBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
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
  divisionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  divisionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  divisionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  divisionBadge: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  divisionBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  divisionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  divisionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
