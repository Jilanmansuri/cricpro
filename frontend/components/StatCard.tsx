import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from './Theme';
import Card from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  style?: StyleProp<ViewStyle>;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  trendType = 'neutral',
  style,
}) => {
  const { colors } = useTheme();

  const getTrendColor = () => {
    switch (trendType) {
      case 'positive':
        return colors.primary;
      case 'negative':
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  return (
    <Card style={[styles.card, style]}>
      <Text style={[styles.title, { color: colors.textMuted }]}>{title}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      {subtext && (
        <Text style={[styles.subtext, { color: getTrendColor() }]}>
          {subtext}
        </Text>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 14,
    minWidth: 100,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtext: {
    fontSize: 11,
    fontWeight: '600',
  },
});
export default StatCard;
