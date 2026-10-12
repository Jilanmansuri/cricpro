import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../components/Theme';
import { useDrawerStore } from '../../store/drawerStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import Card from '../../components/Card';
import Svg, { Path } from 'react-native-svg';
import api from '../../services/api';

const HamburgerIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill={color} />
  </Svg>
);

const TrophyIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v3c0 2.44 1.72 4.48 4 4.81V18h-3v2h16v-2h-3v-3.19c2.28-.33 4-2.37 4-4.81V7c0-1.1-.9-2-2-2zM5 10V7h2v3H5zm14 0h-2V7h2v3z" fill={color} />
  </Svg>
);

export default function TournamentsDrawerScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const openDrawer = useDrawerStore((state) => state.openDrawer);

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

  useFocusEffect(
    useCallback(() => {
      fetchTournaments();
    }, [])
  );

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
    (t.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Drawer Hamburger */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            paddingTop: insets.top + (Platform.OS === 'ios' ? 8 : 12),
          },
        ]}
      >
        <TouchableOpacity onPress={openDrawer} style={styles.headerBtn}>
          <HamburgerIcon color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Tournaments</Text>
        <TouchableOpacity
          style={[styles.createHeaderBtn, { backgroundColor: colors.primary }]}
          onPress={() => setCreateModalVisible(true)}
        >
          <Text style={styles.createBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            placeholder="Search tournaments..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredTournaments}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
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
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🏟️</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Tournaments Found</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
                Create a tournament to organize matches and view standings.
              </Text>
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
              placeholder="e.g. IPL 2026, World Cup"
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  createHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchContainer: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    justifyContent: 'center',
  },
  searchInput: {
    fontSize: 14,
    height: '100%',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 14,
    marginBottom: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trophyContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  dates: {
    fontSize: 12,
  },
  arrow: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    paddingTop: 80,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
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
    marginTop: 16,
  },
  modalBtn: {
    flex: 1,
  },
});
