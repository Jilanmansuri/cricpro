import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TextInput, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../../components/Theme';
import Card from '../../../components/Card';
import Avatar from '../../../components/Avatar';
import api from '../../../services/api';
import { Button } from '../../../components/Button';

export default function PlayersTab() {
  const { colors } = useTheme();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [players, setPlayers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  
  const [editPlayerId, setEditPlayerId] = useState<string | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');

  const fetchPlayers = async (pageNumber = 1, searchQuery = '', append = false) => {
    try {
      const res = await api.get(`/players?page=${pageNumber}&limit=15&search=${searchQuery}`);
      if (res.data.success) {
        if (append) {
          setPlayers((prev) => [...prev, ...res.data.data]);
        } else {
          setPlayers(res.data.data);
        }
        setTotalPages(res.data.pagination.pages);
      }
    } catch (err) {
      console.error('Error fetching players:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchPlayers(1, search, false);
    }, [search])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setPage(1);
    fetchPlayers(1, search, false);
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return;
    try {
      const res = await api.post('/players', { name: newPlayerName });
      if (res.data.success) {
        setNewPlayerName('');
        setIsAdding(false);
        handleRefresh();
      }
    } catch (err) {
      console.error('Error adding player:', err);
    }
  };

  const handleUpdatePlayer = async () => {
    if (!editPlayerId || !editPlayerName.trim()) return;
    try {
      const res = await api.put(`/players/${editPlayerId}`, { name: editPlayerName });
      if (res.data.success) {
        setEditPlayerId(null);
        setEditPlayerName('');
        handleRefresh();
      }
    } catch (err) {
      console.error('Error updating player:', err);
    }
  };

  const handleDeletePlayer = async (id: string) => {
    try {
      const res = await api.delete(`/players/${id}`);
      if (res.data.success) {
        handleRefresh();
      }
    } catch (err) {
      console.error('Error deleting player:', err);
    }
  };

  const handleLoadMore = () => {
    if (page < totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPlayers(nextPage, search, true);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Input bar */}
      <View style={{ flexDirection: 'row', margin: 16, gap: 10 }}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1, margin: 0 }]}>
          <TextInput
            placeholder="Search players by name..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
        <Button 
          title={isAdding ? "Cancel" : "+ Add"} 
          onPress={() => setIsAdding(!isAdding)} 
          variant={isAdding ? "secondary" : "primary"}
          style={{ width: 80 }} 
        />
      </View>

      {isAdding && (
        <View style={{ paddingHorizontal: 16, marginBottom: 16, flexDirection: 'row', gap: 10 }}>
          <TextInput
            placeholder="New Player Name"
            placeholderTextColor={colors.textMuted}
            value={newPlayerName}
            onChangeText={setNewPlayerName}
            style={[styles.searchInput, { flex: 1, backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 16 }]}
          />
          <Button title="Save" onPress={handleAddPlayer} variant="primary" style={{ width: 80 }} />
        </View>
      )}

      {isLoading && page === 1 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={players}
          keyExtractor={(item) => item._id}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              {editPlayerId === item._id ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TextInput
                    value={editPlayerName}
                    onChangeText={setEditPlayerName}
                    style={[styles.searchInput, { flex: 1, backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 40 }]}
                  />
                  <Button title="Save" onPress={handleUpdatePlayer} variant="primary" style={{ width: 60, paddingVertical: 8 }} />
                  <Button title="Cancel" onPress={() => setEditPlayerId(null)} variant="secondary" style={{ width: 70, paddingVertical: 8 }} />
                </View>
              ) : (
                <TouchableOpacity onPress={() => router.push({ pathname: '/player-career', params: { id: item._id } })}>
                  <View style={styles.row}>
                    <Avatar name={item.name} size={42} style={styles.avatar} />
                    <View style={styles.info}>
                      <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.aliases, { color: colors.textMuted }]}>
                        Aliases: {item.aliases?.join(', ') || item.name}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, marginRight: 10 }}>
                      <TouchableOpacity onPress={() => { setEditPlayerId(item._id); setEditPlayerName(item.name); }}>
                        <Text style={{ color: colors.primary, fontWeight: '700' }}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeletePlayer(item._id)}>
                        <Text style={{ color: '#ff3b30', fontWeight: '700' }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.arrow, { color: colors.primary }]}>→</Text>
                  </View>
                </TouchableOpacity>
              )}
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: colors.textMuted }}>No players matching search criteria.</Text>
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
  searchContainer: {
    margin: 16,
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
  aliases: {
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
});
