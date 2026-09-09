import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from './Theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  const { colors, isDarkMode } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderColor: colors.border,
          shadowColor: isDarkMode ? '#000000' : '#64748B',
          shadowOpacity: isDarkMode ? 0.35 : 0.08,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: isDarkMode ? 10 : 8,
          elevation: isDarkMode ? 4 : 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
});
export default Card;
