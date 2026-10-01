import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ViewStyle,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { useTheme } from './Theme';
import { POPULAR_STADIUM_CHIPS, FAMOUS_STADIUMS, searchStadiums } from '../constants/stadiums';
import api from '../services/api';

interface StadiumPickerProps {
  label?: string;
  value: string;
  onChange: (venueName: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
}

export const StadiumPicker: React.FC<StadiumPickerProps> = ({
  label = 'Venue / Stadium',
  value,
  onChange,
  placeholder = 'Select or type stadium...',
  containerStyle,
}) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [customVenues, setCustomVenues] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalSearch, setModalSearch] = useState('');

  // Fetch user's saved/recent venues from backend on mount
  useEffect(() => {
    let isMounted = true;
    api
      .get('/venues')
      .then((res) => {
        if (isMounted && res.data?.success && Array.isArray(res.data.data)) {
          const names = res.data.data.map((v: any) => v.name).filter(Boolean);
          setCustomVenues(names);
        }
      })
      .catch(() => {
        // Silently fallback to static stadium list if offline or error
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered inline suggestions based on current value
  const inlineSuggestions = useMemo(() => {
    if (!isFocused && !value) return [];
    return searchStadiums(value, customVenues).slice(0, 6);
  }, [value, isFocused, customVenues]);

  // Modal filtered suggestions
  const modalList = useMemo(() => {
    return searchStadiums(modalSearch, customVenues);
  }, [modalSearch, customVenues]);

  const handleSelect = (selectedName: string) => {
    onChange(selectedName);
    setIsFocused(false);
  };

  const isChipActive = (fullName: string, shortName: string) => {
    if (!value) return false;
    const v = value.toLowerCase();
    return v === fullName.toLowerCase() || v.includes(shortName.toLowerCase());
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label and Browse All Button */}
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
        <TouchableOpacity
          onPress={() => {
            setModalSearch('');
            setModalVisible(true);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.browseLink, { color: colors.primary }]}>
            🏟️ Browse All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick 1-Tap Popular Stadium Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}
      >
        {POPULAR_STADIUM_CHIPS.map((chip) => {
          const active = isChipActive(chip.fullName, chip.shortName);
          return (
            <TouchableOpacity
              key={chip.shortName}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary + '25' : colors.surfaceLighter,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => handleSelect(chip.fullName)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: active ? colors.primary : colors.text,
                    fontWeight: active ? '700' : '500',
                  },
                ]}
              >
                {active ? '✓ ' : ''}{chip.shortName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Input Field */}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.surface,
            borderColor: isFocused ? colors.primary : colors.border,
          },
        ]}
      >
        <Text style={styles.inputPrefixIcon}>📍</Text>
        <TextInput
          style={[styles.textInput, { color: colors.text }]}
          value={value}
          onChangeText={(text) => {
            onChange(text);
            setIsFocused(true);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // slight delay to allow tap on suggestion
            setTimeout(() => setIsFocused(false), 250);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
        />
        {value.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => onChange('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 16, fontWeight: '700' }}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Inline Suggestion Dropdown (when typing or focused) */}
      {isFocused && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight || colors.border,
            },
          ]}
        >
          {inlineSuggestions.map((item, index) => (
            <TouchableOpacity
              key={`${item.name}-${index}`}
              style={[
                styles.dropdownItem,
                { borderBottomColor: colors.border },
              ]}
              onPress={() => handleSelect(item.name)}
            >
              <Text style={{ fontSize: 15, marginRight: 8 }}>{item.isCustom ? '⭐' : '🏟️'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.suggestionTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.suggestionSub, { color: colors.textMuted }]}>
                  {item.subtitle}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Option to use custom typed ground */}
          {value.trim().length > 0 &&
            !inlineSuggestions.some(
              (s) => s.name.toLowerCase() === value.trim().toLowerCase()
            ) && (
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  { backgroundColor: colors.primary + '15' },
                ]}
                onPress={() => handleSelect(value.trim())}
              >
                <Text style={{ fontSize: 15, marginRight: 8 }}>➕</Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.suggestionTitle,
                      { color: colors.primary, fontWeight: '700' },
                    ]}
                    numberOfLines={1}
                  >
                    Use &quot;{value.trim()}&quot;
                  </Text>
                  <Text style={[styles.suggestionSub, { color: colors.textMuted }]}>
                    Custom Ground / Local Turf
                  </Text>
                </View>
              </TouchableOpacity>
            )}
        </View>
      )}

      {/* Full Stadium Browser Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Select Stadium
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  Famous stadiums & your saved grounds
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceLighter }]}
              >
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Search Bar */}
            <View
              style={[
                styles.modalSearchBar,
                { backgroundColor: colors.surfaceLighter, borderColor: colors.border },
              ]}
            >
              <Text style={{ marginRight: 8, fontSize: 16 }}>🔍</Text>
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text }]}
                value={modalSearch}
                onChangeText={setModalSearch}
                placeholder="Search stadium, city, or country..."
                placeholderTextColor={colors.textMuted}
                autoFocus={true}
              />
              {modalSearch.length > 0 && (
                <TouchableOpacity onPress={() => setModalSearch('')}>
                  <Text style={{ color: colors.textMuted, fontSize: 14 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Stadiums List */}
            <FlatList
              data={modalList}
              keyExtractor={(item, idx) => `${item.name}-${idx}`}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
              ListEmptyComponent={
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center' }}>
                    No standard stadiums matched &quot;{modalSearch}&quot;
                  </Text>
                  {modalSearch.trim().length > 0 && (
                    <TouchableOpacity
                      style={[
                        styles.useCustomBtn,
                        { backgroundColor: colors.primary, marginTop: 16 },
                      ]}
                      onPress={() => {
                        handleSelect(modalSearch.trim());
                        setModalVisible(false);
                      }}
                    >
                      <Text style={{ color: '#032115', fontWeight: '800', fontSize: 14 }}>
                        ✓ Use &quot;{modalSearch.trim()}&quot; as Ground
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = value.toLowerCase() === item.name.toLowerCase();
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      {
                        borderBottomColor: colors.border,
                        backgroundColor: isSelected ? colors.primary + '15' : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      handleSelect(item.name);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={{ fontSize: 20, marginRight: 12 }}>
                      {item.isCustom ? '⭐' : '🏟️'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.modalItemName,
                          {
                            color: isSelected ? colors.primary : colors.text,
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={[styles.modalItemSub, { color: colors.textMuted }]}>
                        {item.subtitle}
                      </Text>
                    </View>
                    {isSelected && (
                      <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '800' }}>
                        ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  browseLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  chipsScroll: {
    paddingVertical: 4,
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
  chipText: {
    fontSize: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  inputPrefixIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
    padding: 0,
  },
  clearBtn: {
    padding: 6,
  },
  dropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionSub: {
    fontSize: 11,
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalItemName: {
    fontSize: 14,
  },
  modalItemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  useCustomBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
});

export default StadiumPicker;
