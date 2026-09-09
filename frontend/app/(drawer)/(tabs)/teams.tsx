import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../../components/Theme';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import Card from '../../../components/Card';
import Avatar from '../../../components/Avatar';
import TeamLogo from '../../../components/TeamLogo';
import api from '../../../services/api';

export default function TeamsTab() {
  const { colors } = useTheme();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTeams = async (searchQuery = '') => {
    try {
      const res = await api.get(`/teams?search=${searchQuery}`);
      if (res.data.success) {
        setTeams(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchTeams(search);
    }, [search])
  );

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      Alert.alert('Error', 'Team name cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/teams', { name: newTeamName });
      if (res.data.success) {
        Alert.alert('Success', 'Team created successfully!');
        setNewTeamName('');
        setCreateModalVisible(false);
        fetchTeams(search); // Refresh list
      } else {
        throw new Error(res.data.message || 'Creation failed');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to create team');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topRow}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            placeholder="Search teams..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
          onPress={() => setCreateModalVisible(true)}
        >
          <Text style={styles.createBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={teams}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push({ pathname: '/team-profile', params: { id: item._id } })}>
              <Card style={styles.card}>
                <View style={styles.row}>
                  <TeamLogo
                    teamName={item.name}
                    shortName={item.shortName}
                    teamId={item.teamId}
                    logoUrl={item.logo || item.logoUrl}
                    size={42}
                    containerStyle={styles.avatar}
                  />
                  <View style={styles.info}>
                    <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.stats, { color: colors.textMuted }]}>
                      Matches: {item.stats?.matches || 0} | NRR: {item.stats?.nrr || '0.00'}
                    </Text>
                  </View>
                  <Text style={[styles.pointsText, { color: colors.primary }]}>
                    {item.stats?.points || 0} pts
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: colors.textMuted }}>No teams created yet.</Text>
            </View>
          }
        />
      )}

      {/* Create Team Modal overlay */}
      <Modal visible={createModalVisible} transparent animationType="slide" onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Team</Text>
            
            <Input
              label="Team Name"
              placeholder="e.g. Royal Challengers"
              value={newTeamName}
              onChangeText={setNewTeamName}
            />

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                onPress={() => setCreateModalVisible(false)}
                variant="secondary"
                style={styles.modalBtn}
              />
              <Button
                title="Create"
                onPress={handleCreateTeam}
                isLoading={isSubmitting}
                style={styles.modalBtn}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    marginBottom: 8,
  },
  searchContainer: {
    flex: 1,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
  },
  searchInput: {
    fontSize: 14,
    fontWeight: '600',
  },
  createBtn: {
    width: 76,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createBtnText: {
    color: '#ffffff',
    fontWeight: '800',
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
  avatar: {
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
  },
  stats: {
    fontSize: 11,
    marginTop: 4,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 8,
  },
  empty: {
    alignItems: 'center',
    marginTop: 40,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  modalBtn: {
    flex: 1,
  },
});
