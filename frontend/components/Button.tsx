import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from './Theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const { colors } = useTheme();

  const getStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: colors.primary,
          border: 'transparent',
          text: colors.background,
        };
      case 'secondary':
        return {
          bg: colors.surfaceLighter,
          border: 'transparent',
          text: colors.text,
        };
      case 'outline':
        return {
          bg: 'transparent',
          border: colors.primary,
          text: colors.primary,
        };
      case 'danger':
        return {
          bg: colors.error,
          border: 'transparent',
          text: '#FFFFFF',
        };
      default:
        return {
          bg: colors.primary,
          border: 'transparent',
          text: colors.background,
        };
    }
  };

  const buttonStyle = getStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      style={[
        styles.button,
        {
          backgroundColor: buttonStyle.bg,
          borderColor: buttonStyle.border,
          borderWidth: variant === 'outline' ? 1 : 0,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={buttonStyle.text} />
      ) : (
        <Text style={[styles.text, { color: buttonStyle.text }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
export default Button;
