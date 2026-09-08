import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTheme } from '../../components/Theme';
import Card from '../../components/Card';
import api from '../../services/api';
import Svg, { Path } from 'react-native-svg';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: 'match' | 'tournament' | 'system';
  timestamp: string;
  read: boolean;
}

const BellIcon = ({ color }: { color: string }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill={color} />
  </Svg>
);

export default function NotificationsScreen() {
  const { colors } = useTheme();

  // Seed default interactive notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      title: 'Match Upload Ready',
      body: 'Scorecard scanning pipeline via Tesseract OCR engine is active.',
      type: 'match',
      timestamp: 'Just now',
      read: false,
    },
    {
      id: '2',
      title: 'Leaderboards Active',
      body: 'Orange & Purple Caps live updates recalculated after match submissions.',
      type: 'tournament',
      timestamp: '1 hour ago',
      read: false,
    },
    {
      id: '3',
      title: 'System Online',
      body: 'CricStats Pro is connected with full offline sync queues.',
      type: 'system',
      timestamp: 'Today',
      read: true,
    },
  ]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        if (res.data.success && res.data.data.length > 0) {
          const fetched: NotificationItem[] = res.data.data.map((n: any) => ({
            id: n._id,
            title: n.title,
            body: n.message,
            type: 'system',
            timestamp: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: n.isRead,
          }));
          setNotifications(fetched);
        }
      } catch (err) {
        // Fallback gracefully to default items
      }
    };
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await api.put(`/notifications/${id}/read`);
    } catch {
      // ignore
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity onPress={() => handleMarkAsRead(item.id)}>
      <Card
        style={[
          styles.card,
          {
            borderColor: item.read ? colors.border : colors.primary + '60',
            opacity: item.read ? 0.75 : 1,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.iconContainer, { backgroundColor: colors.surfaceLighter }]}>
              <BellIcon color={item.read ? colors.textMuted : colors.primary} />
            </View>
            <View style={styles.titleTextCol}>
              <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.time, { color: colors.textMuted }]}>{item.timestamp}</Text>
            </View>
          </View>
          {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
        </View>
        <Text style={[styles.body, { color: colors.textMuted }]}>{item.body}</Text>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ color: colors.textMuted }}>No notifications yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleTextCol: {
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  time: {
    fontSize: 11,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
});
