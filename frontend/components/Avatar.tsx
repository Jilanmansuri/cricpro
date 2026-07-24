import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from './Theme';

interface AvatarProps {
  name: string;
  size?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 40, style, textStyle }) => {
  const { colors } = useTheme();
  
  const initials = name
    .trim()
    .split(/\s+/)
    .map(token => token[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surfaceLighter,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: colors.primary,
            fontSize: size * 0.42,
          },
          textStyle,
        ]}
      >
        {initials || 'P'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '800',
  },
});
export default Avatar;
