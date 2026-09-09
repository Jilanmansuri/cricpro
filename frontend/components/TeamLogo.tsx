import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { Image } from 'expo-image';

// Map of local IPL Franchise Logos (PNG)
const IPL_LOGOS: Record<string, any> = {
  CSK: require('../assets/logos/CSK.png'),
  DC: require('../assets/logos/DC.png'),
  GT: require('../assets/logos/GT.png'),
  KKR: require('../assets/logos/KKR.png'),
  LSG: require('../assets/logos/LSG.png'),
  MI: require('../assets/logos/MI.png'),
  PBKS: require('../assets/logos/PBKS.png'),
  RCB: require('../assets/logos/RCB.png'),
  RR: require('../assets/logos/RR.png'),
  SRH: require('../assets/logos/SRH.png'),
};

// Map of local International Country Flags (SVG)
const INT_FLAGS: Record<string, any> = {
  IND: require('../assets/international/in.svg'),
  AUS: require('../assets/international/au.svg'),
  ENG: require('../assets/international/gb-eng.svg'),
  PAK: require('../assets/international/pk.svg'),
  SA: require('../assets/international/za.svg'),
  RSA: require('../assets/international/za.svg'),
  NZ: require('../assets/international/nz.svg'),
  NZL: require('../assets/international/nz.svg'),
  BAN: require('../assets/international/bd.svg'),
  SL: require('../assets/international/lk.svg'),
  SRI: require('../assets/international/lk.svg'),
  AFG: require('../assets/international/af.svg'),
  IRE: require('../assets/international/ie.svg'),
  ZIM: require('../assets/international/zw.svg'),
  NED: require('../assets/international/nl.svg'),
  SCO: require('../assets/international/gb-sct.svg'),
  NEP: require('../assets/international/np.svg'),
  USA: require('../assets/international/us.svg'),
  CAN: require('../assets/international/ca.svg'),
  UAE: require('../assets/international/ae.svg'),
  OMA: require('../assets/international/om.svg'),
  NAM: require('../assets/international/na.svg'),
  PNG: require('../assets/international/pg.svg'),
};

// Fuzzy/Alias Resolver to canonical key
export const getTeamAsset = (teamIdentifier?: string | null): any => {
  if (!teamIdentifier) return null;
  const clean = teamIdentifier.toUpperCase().trim();

  // 1. Direct key match (e.g. "CSK", "IND")
  if (IPL_LOGOS[clean]) return IPL_LOGOS[clean];
  if (INT_FLAGS[clean]) return INT_FLAGS[clean];

  // 2. Prefix strip (e.g. "IPL_CSK" -> "CSK", "INT_IND" -> "IND")
  if (clean.startsWith('IPL_')) {
    const key = clean.replace('IPL_', '');
    if (IPL_LOGOS[key]) return IPL_LOGOS[key];
  }
  if (clean.startsWith('INT_')) {
    const key = clean.replace('INT_', '');
    if (INT_FLAGS[key]) return INT_FLAGS[key];
  }

  // 3. Name-based match for IPL
  if (clean.includes('CHENNAI') || clean.includes('SUPER KINGS')) return IPL_LOGOS.CSK;
  if (clean.includes('DELHI') || clean.includes('DAREDEVILS')) return IPL_LOGOS.DC;
  if (clean.includes('GUJARAT') || clean.includes('TITANS')) return IPL_LOGOS.GT;
  if (clean.includes('KOLKATA') || clean.includes('KNIGHT RIDERS')) return IPL_LOGOS.KKR;
  if (clean.includes('LUCKNOW') || clean.includes('SUPER GIANTS')) return IPL_LOGOS.LSG;
  if (clean.includes('MUMBAI') || clean.includes('INDIANS')) return IPL_LOGOS.MI;
  if (clean.includes('PUNJAB') || clean.includes('KINGS XI')) return IPL_LOGOS.PBKS;
  if (clean.includes('BANGALORE') || clean.includes('BENGALURU') || clean.includes('CHALLENGERS')) return IPL_LOGOS.RCB;
  if (clean.includes('RAJASTHAN') || clean.includes('ROYALS')) return IPL_LOGOS.RR;
  if (clean.includes('HYDERABAD') || clean.includes('SUNRISERS')) return IPL_LOGOS.SRH;

  // 4. Name-based match for International
  if (clean.includes('INDIA') || clean.includes('BHARAT')) return INT_FLAGS.IND;
  if (clean.includes('AUSTRALIA')) return INT_FLAGS.AUS;
  if (clean.includes('ENGLAND')) return INT_FLAGS.ENG;
  if (clean.includes('PAKISTAN')) return INT_FLAGS.PAK;
  if (clean.includes('SOUTH AFRICA')) return INT_FLAGS.SA;
  if (clean.includes('NEW ZEALAND')) return INT_FLAGS.NZ;
  if (clean.includes('BANGLADESH')) return INT_FLAGS.BAN;
  if (clean.includes('SRI LANKA')) return INT_FLAGS.SL;
  if (clean.includes('AFGHANISTAN')) return INT_FLAGS.AFG;
  if (clean.includes('IRELAND')) return INT_FLAGS.IRE;
  if (clean.includes('ZIMBABWE')) return INT_FLAGS.ZIM;
  if (clean.includes('NETHERLANDS') || clean.includes('HOLLAND')) return INT_FLAGS.NED;
  if (clean.includes('SCOTLAND')) return INT_FLAGS.SCO;
  if (clean.includes('NEPAL')) return INT_FLAGS.NEP;
  if (clean.includes('AMERICA') || clean.includes('UNITED STATES')) return INT_FLAGS.USA;
  if (clean.includes('CANADA')) return INT_FLAGS.CAN;
  if (clean.includes('EMIRATES')) return INT_FLAGS.UAE;
  if (clean.includes('OMAN')) return INT_FLAGS.OMA;
  if (clean.includes('NAMIBIA')) return INT_FLAGS.NAM;

  return null;
};

interface TeamLogoProps {
  teamName?: string | null;
  shortName?: string | null;
  teamId?: string | null;
  logoUrl?: string | null;
  fallbackEmoji?: string | null;
  size?: number;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  borderRadius?: number;
}

export const TeamLogo: React.FC<TeamLogoProps> = ({
  teamName,
  shortName,
  teamId,
  logoUrl,
  fallbackEmoji,
  size = 24,
  style,
  containerStyle,
  borderRadius,
}) => {
  // Check local assets in priority order
  const localAsset =
    getTeamAsset(shortName) ||
    getTeamAsset(teamId) ||
    getTeamAsset(teamName);

  const radius = borderRadius !== undefined ? borderRadius : size / 2;

  if (localAsset) {
    return (
      <View style={[{ width: size, height: size, borderRadius: radius, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }, containerStyle]}>
        <Image
          source={localAsset}
          style={[{ width: size, height: size }, style]}
          contentFit="contain"
          transition={100}
        />
      </View>
    );
  }

  // Fallback to remote logo URL if valid
  if (logoUrl && typeof logoUrl === 'string' && (logoUrl.startsWith('http') || logoUrl.startsWith('/'))) {
    return (
      <View style={[{ width: size, height: size, borderRadius: radius, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }, containerStyle]}>
        <Image
          source={{ uri: logoUrl }}
          style={[{ width: size, height: size }, style]}
          contentFit="contain"
          transition={100}
        />
      </View>
    );
  }

  // Fallback to emoji or first letter
  const emoji = fallbackEmoji || '🏏';
  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, containerStyle]}>
      <Text style={{ fontSize: Math.max(12, Math.round(size * 0.6)) }}>{emoji}</Text>
    </View>
  );
};

export default TeamLogo;
