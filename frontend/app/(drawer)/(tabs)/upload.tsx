import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../../components/Theme';
import { Button } from '../../../components/Button';
import Card from '../../../components/Card';
import api from '../../../services/api';
import { Swipeable } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';

const TrashIcon = ({ color }: { color: string }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z" fill={color} />
  </Svg>
);

const TABS = ['Details', 'Batting', 'Bowling', 'Review'];

const PlayerAutocomplete = ({ value, onChangeText, players, colors, styles }: any) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const filtered = players
    .filter((p: any) => p.name.toLowerCase().includes(value.toLowerCase()) && p.name.toLowerCase() !== value.toLowerCase())
    .slice(0, 5);

  return (
    <View style={{ position: 'relative', zIndex: showSuggestions ? 999 : 1 }}>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={value}
        onChangeText={(t) => {
          onChangeText(t);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder="Player Name"
        placeholderTextColor={colors.textMuted}
      />
      {showSuggestions && filtered.length > 0 && (
        <View style={{ position: 'absolute', top: 50, left: 0, right: 0, backgroundColor: colors.surfaceLighter || '#333', borderRadius: 8, elevation: 5, zIndex: 1000, borderWidth: 1, borderColor: colors.border }}>
          {filtered.map((p: any) => (
            <TouchableOpacity key={p._id} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }} onPress={() => { onChangeText(p.name); setShowSuggestions(false); }}>
              <Text style={{ color: colors.text }}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default function ManualMatchEntry() {
  const { colors } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const [matchInfo, setMatchInfo] = useState({
    date: new Date().toISOString().split('T')[0],
    teamName: '',
    opponentTeam: '',
    venueName: '',
    tournamentId: '',
    matchType: 'T20',
    overs: '20',
    result: '',
  });

  const initialBatting = () => Array.from({ length: 11 }).map((_, i) => ({
    id: Date.now().toString() + i, name: '', outStatus: 'out', runs: '0', balls: '0', fours: '0', sixes: '0'
  }));
  const initialBowling = () => Array.from({ length: 11 }).map((_, i) => ({
    id: Date.now().toString() + i + 100, name: '', overs: '0', maidens: '0', runs: '0', wickets: '0'
  }));

  const [batting, setBatting] = useState<any[]>(initialBatting());
  const [bowling, setBowling] = useState<any[]>(initialBowling());
  const [dbPlayers, setDbPlayers] = useState<any[]>([]);

  useEffect(() => {
    api.get('/players?limit=100').then(res => {
      const players = res.data.data;
      setDbPlayers(players);
      
      if (players.length > 0) {
        setBatting(prev => prev.map((row, i) => {
          if (row.name === '' && players[i]) return { ...row, name: players[i].name };
          return row;
        }));
        
        setBowling(prev => prev.map((row, i) => {
          if (row.name === '' && players[i]) return { ...row, name: players[i].name };
          return row;
        }));
      }
    }).catch(err => console.error(err));
  }, []);

  const addBatsman = () => {
    setBatting([...batting, { id: Date.now().toString(), name: '', outStatus: 'out', runs: '0', balls: '0', fours: '0', sixes: '0' }]);
  };

  const updateBatsman = (id: string, field: string, value: string) => {
    setBatting(batting.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const removeBatsman = (id: string) => {
    setBatting(batting.filter(b => b.id !== id));
  };

  const addBowler = () => {
    setBowling([...bowling, { id: Date.now().toString(), name: '', overs: '0', maidens: '0', runs: '0', wickets: '0' }]);
  };

  const updateBowler = (id: string, field: string, value: string) => {
    setBowling(bowling.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const removeBowler = (id: string) => {
    setBowling(bowling.filter(b => b.id !== id));
  };

  const renderRightActions = (onDelete: () => void) => {
    return (
      <TouchableOpacity style={styles.deleteAction} onPress={onDelete}>
        <TrashIcon color="#fff" />
      </TouchableOpacity>
    );
  };

  const saveMatch = async () => {
    if (!matchInfo.teamName) {
      Alert.alert('Validation Error', 'Please enter your Team Name.');
      setActiveTab(0);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        matchInfo,
        myTeamBatting: batting.filter(b => b.name.trim() !== ''),
        myTeamBowling: bowling.filter(b => b.name.trim() !== '')
      };

      const response = await api.post('/manual-match/save', payload);
      if (response.data.success) {
        Alert.alert('Success', 'Match saved successfully!', [
          { 
            text: 'OK', 
            onPress: () => {
              setMatchInfo({
                date: new Date().toISOString().split('T')[0],
                teamName: '',
                opponentTeam: '',
                venueName: '',
                tournamentId: '',
                matchType: 'T20',
                overs: '20',
                result: '',
              });
              setBatting(initialBatting());
              setBowling(initialBowling());
              setActiveTab(0);
              router.push('/(drawer)/(tabs)');
            }
          }
        ]);
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to save match');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Tab Navigation */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {TABS.map((tab, idx) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === idx && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
            onPress={() => setActiveTab(idx)}
          >
            <Text style={[styles.tabText, { color: activeTab === idx ? colors.primary : colors.textMuted }]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Match Details Tab */}
        {activeTab === 0 && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Match Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Date (YYYY-MM-DD)</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={matchInfo.date} onChangeText={t => setMatchInfo({...matchInfo, date: t})} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>My Team Name</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={matchInfo.teamName} onChangeText={t => setMatchInfo({...matchInfo, teamName: t})} placeholder="e.g. Royal Strikers" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Opponent Team</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={matchInfo.opponentTeam} onChangeText={t => setMatchInfo({...matchInfo, opponentTeam: t})} placeholder="e.g. Mumbai Indians" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Venue</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={matchInfo.venueName} onChangeText={t => setMatchInfo({...matchInfo, venueName: t})} />
            </View>
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Match Type</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={matchInfo.matchType} onChangeText={t => setMatchInfo({...matchInfo, matchType: t})} />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Overs</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={matchInfo.overs} onChangeText={t => setMatchInfo({...matchInfo, overs: t})} keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Result</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={matchInfo.result} onChangeText={t => setMatchInfo({...matchInfo, result: t})} placeholder="e.g. My Team won by 5 wickets" placeholderTextColor={colors.textMuted} />
            </View>
          </View>
        )}

        {/* Batting Tab */}
        {activeTab === 1 && (
          <View style={styles.tabContent}>
            <View style={styles.headerRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>My Team Batting</Text>
              <TouchableOpacity onPress={addBatsman}>
                <Text style={[styles.addText, { color: colors.primary }]}>+ Add Batsman</Text>
              </TouchableOpacity>
            </View>

            {batting.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No batsmen added. Tap "+ Add Batsman" to begin.</Text>
            ) : (
              batting.map((b, idx) => (
                <Swipeable key={b.id} renderRightActions={() => renderRightActions(() => removeBatsman(b.id))}>
                  <Card style={styles.rowCard}>
                    <View style={styles.rowInputs}>
                      <View style={[styles.inputGroup, { flex: 2, zIndex: 10 }]}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Player Name</Text>
                        <PlayerAutocomplete value={b.name} onChangeText={(t: string) => updateBatsman(b.id, 'name', t)} players={dbPlayers} colors={colors} styles={styles} />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Status</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={b.outStatus} onChangeText={t => updateBatsman(b.id, 'outStatus', t)} placeholder="out/not_out/DNB" placeholderTextColor={colors.textMuted} />
                      </View>
                    </View>
                    <View style={styles.rowInputs}>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>R</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={b.runs} onChangeText={t => updateBatsman(b.id, 'runs', t)} keyboardType="numeric" />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>B</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={b.balls} onChangeText={t => updateBatsman(b.id, 'balls', t)} keyboardType="numeric" />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>4s</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={b.fours} onChangeText={t => updateBatsman(b.id, 'fours', t)} keyboardType="numeric" />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>6s</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={b.sixes} onChangeText={t => updateBatsman(b.id, 'sixes', t)} keyboardType="numeric" />
                      </View>
                    </View>
                  </Card>
                </Swipeable>
              ))
            )}
          </View>
        )}

        {/* Bowling Tab */}
        {activeTab === 2 && (
          <View style={styles.tabContent}>
            <View style={styles.headerRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>My Team Bowling</Text>
              <TouchableOpacity onPress={addBowler}>
                <Text style={[styles.addText, { color: colors.primary }]}>+ Add Bowler</Text>
              </TouchableOpacity>
            </View>

            {bowling.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No bowlers added. Tap "+ Add Bowler" to begin.</Text>
            ) : (
              bowling.map((b, idx) => (
                <Swipeable key={b.id} renderRightActions={() => renderRightActions(() => removeBowler(b.id))}>
                  <Card style={styles.rowCard}>
                    <View style={[styles.inputGroup, { zIndex: 10 }]}>
                      <Text style={[styles.label, { color: colors.textMuted }]}>Bowler Name</Text>
                      <PlayerAutocomplete value={b.name} onChangeText={(t: string) => updateBowler(b.id, 'name', t)} players={dbPlayers} colors={colors} styles={styles} />
                    </View>
                    <View style={styles.rowInputs}>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>O</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={b.overs} onChangeText={t => updateBowler(b.id, 'overs', t)} keyboardType="numeric" />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>M</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={b.maidens} onChangeText={t => updateBowler(b.id, 'maidens', t)} keyboardType="numeric" />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>R</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={b.runs} onChangeText={t => updateBowler(b.id, 'runs', t)} keyboardType="numeric" />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>W</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={b.wickets} onChangeText={t => updateBowler(b.id, 'wickets', t)} keyboardType="numeric" />
                      </View>
                    </View>
                  </Card>
                </Swipeable>
              ))
            )}
          </View>
        )}

        {/* Review Tab */}
        {activeTab === 3 && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Review Match Data</Text>
            <Card style={styles.summaryCard}>
              <Text style={[styles.summaryTitle, { color: colors.text }]}>{matchInfo.teamName || 'My Team'} vs {matchInfo.opponentTeam || 'Opponent'}</Text>
              <Text style={{ color: colors.textMuted }}>Date: {matchInfo.date} | Venue: {matchInfo.venueName}</Text>
              <Text style={{ color: colors.textMuted }}>Result: {matchInfo.result}</Text>
              
              <View style={styles.divider} />
              
              <Text style={[styles.summarySubtitle, { color: colors.text }]}>Batting Summary</Text>
              <Text style={{ color: colors.textMuted }}>Total Batsmen: {batting.length}</Text>
              <Text style={{ color: colors.textMuted }}>Total Runs (from bats): {batting.reduce((s, b) => s + (Number(b.runs) || 0), 0)}</Text>
              
              <View style={styles.divider} />
              
              <Text style={[styles.summarySubtitle, { color: colors.text }]}>Bowling Summary</Text>
              <Text style={{ color: colors.textMuted }}>Total Bowlers: {bowling.length}</Text>
              <Text style={{ color: colors.textMuted }}>Total Wickets: {bowling.reduce((s, b) => s + (Number(b.wickets) || 0), 0)}</Text>
            </Card>

            <Button
              title={isSaving ? "Saving..." : "Save Match"}
              onPress={saveMatch}
              variant="primary"
              style={styles.saveBtn}
              disabled={isSaving}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  tabContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addText: {
    fontWeight: '700',
    fontSize: 15,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  rowCard: {
    padding: 16,
    marginBottom: 16,
  },
  deleteAction: {
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    height: '90%',
    borderRadius: 12,
    marginLeft: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
  summaryCard: {
    padding: 20,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  summarySubtitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 12,
  },
  saveBtn: {
    marginTop: 10,
  }
});
