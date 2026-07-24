import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../components/Theme';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import Card from '../../../components/Card';
import Svg, { Path } from 'react-native-svg';
import api from '../../../services/api';

const TrophyIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v3c0 2.44 1.72 4.48 4 4.81V18h-3v2h16v-2h-3v-3.19c2.28-.33 4-2.37 4-4.81V7c0-1.1-.9-2-2-2zM5 10V7h2v3H5zm14 0h-2V7h2v3z" fill={color} />
  </Svg>
);

export default function TournamentsTab() {
  const { colors } = useTheme();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTournaments = async () => {
    try {
      const res = await api.get('/tournaments');
      if (res.data.success) {
        setTournaments(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching tournaments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const handleCreateTournament = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Tournament name cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/tournaments', {
        name,
        startDate,
        endDate,
      });

      if (res.data.success) {
        Alert.alert('Success', 'Tournament created successfully!');
        setName('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate(new Date().toISOString().split('T')[0]);
        setCreateModalVisible(false);
        fetchTournaments();
      } else {
        throw new Error(res.data.message || 'Creation failed');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to create tournament');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTournaments = tournaments.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topRow}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            placeholder="Search tournaments..."
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
          data={filteredTournaments}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push({ pathname: '/tournament-details', params: { id: item._id } })}>
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={[styles.trophyContainer, { backgroundColor: colors.surfaceLighter }]}>
                    <TrophyIcon color={colors.primary} />
                  </View>
                  <View style={styles.info}>
                    <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.dates, { color: colors.textMuted }]}>
                      {new Date(item.startDate).toLocaleDateString(undefined, { dateStyle: 'short' })} - {new Date(item.endDate).toLocaleDateString(undefined, { dateStyle: 'short' })}
                    </Text>
                  </View>
                  <Text style={[styles.arrow, { color: colors.primary }]}>→</Text>
                </View>
              </Card>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: colors.textMuted }}>No tournaments found.</Text>
            </View>
          }
        />
      )}

      {/* Create Tournament Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide" onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Tournament</Text>
            
            <Input
              label="Tournament Name"
              placeholder="e.g. IPL 2026"
              value={name}
              onChangeText={setName}
            />

            <Input
              label="Start Date (YYYY-MM-DD)"
              placeholder="e.g. 2026-04-01"
              value={startDate}
              onChangeText={setStartDate}
            />

            <Input
              label="End Date (YYYY-MM-DD)"
              placeholder="e.g. 2026-05-30"
              value={endDate}
              onChangeText={setEndDate}
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
                onPress={handleCreateTournament}
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
  trophyContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
  },
  dates: {
    fontSize: 11,
    marginTop: 4,
  },
  arrow: {
    fontSize: 18,
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
