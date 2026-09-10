import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../components/Theme';
import { getPlayerCareer, getPlayerHistory } from '../services/playerService';
import { Card } from '../components/Card';
import { LineChart } from '../components/Charts';
import TeamLogo from '../components/TeamLogo';

type FormatFilter = 'ALL' | 'T20' | 'ODI';

interface AchievementBadge {
  id: string;
  icon: string;
  title: string;
  desc: string;
  unlocked: boolean;
  color: string;
  progress?: string;
}

export default function PlayerCareerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();

  const [playerData, setPlayerData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState<FormatFilter>('ALL');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [careerRes, historyRes] = await Promise.all([
          getPlayerCareer(id),
          getPlayerHistory(id),
        ]);

        if (careerRes.success) setPlayerData(careerRes.data);
        if (historyRes.success) setHistory(historyRes.data);
      } catch (err) {
        console.error('Failed to load profile details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchProfile();
  }, [id]);

  // Filter history based on selected format tab
  const filteredHistory = useMemo(() => {
    if (selectedFormat === 'ALL') return history;
    return history.filter((h) => {
      const f = (h.format || '').toUpperCase();
      if (selectedFormat === 'T20') return f === 'T20' || f === 'T10';
      if (selectedFormat === 'ODI') return f === 'ODI' || f === 'CUSTOM';
      return true;
    });
  }, [history, selectedFormat]);

  // Dynamic stats calculation (respects format filter)
  const displayStats = useMemo(() => {
    if (!playerData) return null;
    const baseCareer = playerData.career || {};

    if (selectedFormat === 'ALL') {
      const b = baseCareer.batting || {};
      const bw = baseCareer.bowling || {};
      const fld = baseCareer.fielding || {};

      const outs = Math.max(0, (b.matches || 0) - (b.notOuts || 0));
      const avg = outs > 0 ? parseFloat(((b.runs || 0) / outs).toFixed(2)) : b.runs || 0;
      const sr = b.balls > 0 ? parseFloat((((b.runs || 0) / b.balls) * 100).toFixed(2)) : 0;

      const oversToBalls = (o: number) => Math.floor(o) * 6 + Math.round((o % 1) * 10);
      const totalBallsBowled = oversToBalls(bw.overs || 0);
      const econ = totalBallsBowled > 0 ? parseFloat((((bw.runsConceded || 0) / totalBallsBowled) * 6).toFixed(2)) : 0;

      return {
        matches: b.matches || baseCareer.matches || 0,
        wins: baseCareer.wins || 0,
        losses: baseCareer.losses || 0,
        mvps: baseCareer.mvps || 0,
        batting: {
          runs: b.runs || 0,
          balls: b.balls || 0,
          avg,
          sr,
          highestScore: b.highestScore || 0,
          fifties: b.fifties || 0,
          hundreds: b.hundreds || 0,
          fours: b.fours || 0,
          sixes: b.sixes || 0,
          ducks: b.ducks || 0,
          notOuts: b.notOuts || 0,
        },
        bowling: {
          wickets: bw.wickets || 0,
          overs: bw.overs || 0,
          econ,
          maidens: bw.maidens || 0,
          runsConceded: bw.runsConceded || 0,
          bestBowling: bw.bestBowling || { wickets: 0, runs: 0 },
        },
        fielding: {
          catches: fld.catches || 0,
          stumpings: fld.stumpings || 0,
          runOuts: fld.runOuts || 0,
        },
      };
    }

    // Compute format-specific stats directly from filtered match history
    let runs = 0;
    let balls = 0;
    let fours = 0;
    let sixes = 0;
    let highestScore = 0;
    let fifties = 0;
    let hundreds = 0;
    let ducks = 0;
    let notOuts = 0;

    let wickets = 0;
    let overs = 0;
    let runsConceded = 0;
    let maidens = 0;
    let bestWickets = 0;
    let bestRuns = 999;

    let catches = 0;
    let stumpings = 0;
    let runOuts = 0;
    let mvps = 0;

    filteredHistory.forEach((h) => {
      const bat = h.batting || {};
      const bowl = h.bowling || {};
      const fld = h.fielding || {};

      runs += bat.runs || 0;
      balls += bat.balls || 0;
      fours += bat.fours || 0;
      sixes += bat.sixes || 0;

      if ((bat.runs || 0) > highestScore) highestScore = bat.runs;
      if ((bat.runs || 0) >= 100) hundreds += 1;
      else if ((bat.runs || 0) >= 50) fifties += 1;

      const st = (bat.outStatus || '').toLowerCase();
      if (st.includes('not out') || st === 'not_out') notOuts += 1;
      if (bat.runs === 0 && !bat.didNotBat && (st.includes('out') || st.includes('bowled') || st.includes('caught') || st.includes('lbw'))) {
        ducks += 1;
      }

      wickets += bowl.wickets || 0;
      overs += bowl.overs || 0;
      runsConceded += bowl.runsConceded || 0;
      maidens += bowl.maidens || 0;

      if (bowl.wickets > bestWickets || (bowl.wickets === bestWickets && bowl.runsConceded < bestRuns)) {
        bestWickets = bowl.wickets;
        bestRuns = bowl.runsConceded;
      }

      catches += fld.catches || 0;
      stumpings += fld.stumpings || 0;
      runOuts += fld.runOuts || 0;

      if (h.isMvp) mvps += 1;
    });

    const outs = Math.max(0, filteredHistory.length - notOuts);
    const avg = outs > 0 ? parseFloat((runs / outs).toFixed(2)) : runs;
    const sr = balls > 0 ? parseFloat(((runs / balls) * 100).toFixed(2)) : 0;
    const econ = overs > 0 ? parseFloat((runsConceded / overs).toFixed(2)) : 0;

    return {
      matches: filteredHistory.length,
      wins: 0,
      losses: 0,
      mvps,
      batting: {
        runs,
        balls,
        avg,
        sr,
        highestScore,
        fifties,
        hundreds,
        fours,
        sixes,
        ducks,
        notOuts,
      },
      bowling: {
        wickets,
        overs: parseFloat(overs.toFixed(1)),
        econ,
        maidens,
        runsConceded,
        bestBowling: { wickets: bestWickets, runs: bestRuns === 999 ? 0 : bestRuns },
      },
      fielding: { catches, stumpings, runOuts },
    };
  }, [playerData, filteredHistory, selectedFormat]);

  // Achievement Badges derivation
  const badges: AchievementBadge[] = useMemo(() => {
    if (!playerData?.career) return [];
    const c = playerData.career;
    const bat = c.batting || {};
    const bowl = c.bowling || {};
    const fld = c.fielding || {};

    const outs = Math.max(0, (bat.matches || 0) - (bat.notOuts || 0));
    const sr = bat.balls > 0 ? (bat.runs / bat.balls) * 100 : 0;

    return [
      {
        id: 'mvp_king',
        icon: '👑',
        title: 'MVP King',
        desc: 'Awarded for match-winning performances',
        unlocked: (c.mvps || 0) > 0,
        color: '#F59E0B',
        progress: `${c.mvps || 0} MVPs`,
      },
      {
        id: 'century_club',
        icon: '💯',
        title: 'Century Club',
        desc: 'Scored a majestic 100 in an innings',
        unlocked: (bat.hundreds || 0) > 0,
        color: '#10B981',
        progress: `${bat.hundreds || 0} Centuries`,
      },
      {
        id: 'fifty_machine',
        icon: '🎖️',
        title: 'Half-Century Machine',
        desc: 'Scored 50+ runs in a match',
        unlocked: (bat.fifties || 0) > 0,
        color: '#38BDF8',
        progress: `${bat.fifties || 0} Fifties`,
      },
      {
        id: 'fire_striker',
        icon: '⚡',
        title: 'Power Striker',
        desc: 'Career Strike Rate 150+ (min 15 balls)',
        unlocked: sr >= 150 && (bat.balls || 0) >= 15,
        color: '#EC4899',
        progress: `SR: ${sr.toFixed(1)}`,
      },
      {
        id: 'deadly_spell',
        icon: '🎯',
        title: 'Deadly Spell',
        desc: 'Took 3 or more wickets in an innings',
        unlocked: (bowl.bestBowling?.wickets || 0) >= 3,
        color: '#8B5CF6',
        progress: `BBI: ${bowl.bestBowling?.wickets || 0}/${bowl.bestBowling?.runs || 0}`,
      },
      {
        id: 'sixer_king',
        icon: '💥',
        title: 'Sixer Monarch',
        desc: 'Cracked 5 or more career sixes',
        unlocked: (bat.sixes || 0) >= 5,
        color: '#F97316',
        progress: `${bat.sixes || 0} Sixes`,
      },
      {
        id: 'iron_wall',
        icon: '🛡️',
        title: 'The Finisher',
        desc: 'Remained not-out 2 or more times',
        unlocked: (bat.notOuts || 0) >= 2,
        color: '#14B8A6',
        progress: `${bat.notOuts || 0} Not Outs`,
      },
      {
        id: 'golden_gloves',
        icon: '🧤',
        title: 'Safe Hands',
        desc: 'Completed 2+ catches or stumpings',
        unlocked: ((fld.catches || 0) + (fld.stumpings || 0)) >= 2,
        color: '#EAB308',
        progress: `${(fld.catches || 0) + (fld.stumpings || 0)} Dismissals`,
      },
    ];
  }, [playerData]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!playerData) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Player profile not found.</Text>
      </View>
    );
  }

  const emptyStats = {
    matches: 0,
    wins: 0,
    losses: 0,
    mvps: 0,
    batting: {
      runs: 0,
      balls: 0,
      avg: 0,
      sr: 0,
      highestScore: 0,
      fifties: 0,
      hundreds: 0,
      fours: 0,
      sixes: 0,
      ducks: 0,
      notOuts: 0,
    },
    bowling: {
      wickets: 0,
      overs: 0,
      econ: 0,
      maidens: 0,
      runsConceded: 0,
      bestBowling: { wickets: 0, runs: 0 },
    },
    fielding: {
      catches: 0,
      stumpings: 0,
      runOuts: 0,
    },
  };

  const { player, insights } = playerData;
  const stats = displayStats || emptyStats;
  const batting = stats.batting;
  const bowling = stats.bowling;
  const fielding = stats.fielding;

  // Prepare chart datasets for the filtered subset
  const runsChartData = filteredHistory.map((h) => ({ date: h.date, value: h.batting?.runs || h.runs || 0 }));
  const wicketsChartData = filteredHistory.map((h) => ({ date: h.date, value: h.bowling?.wickets || h.wickets || 0 }));
  const srChartData = filteredHistory.map((h) => ({ date: h.date, value: h.batting?.strikeRate || h.strikeRate || 0 }));
  const econChartData = filteredHistory.map((h) => ({ date: h.date, value: h.bowling?.economy || h.economy || 0 }));

  const winRate =
    stats.matches > 0 && stats.wins + stats.losses > 0
      ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
      : null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* 1. Header Profile Card with National Flag & IPL Franchise Logo */}
      <Card style={[styles.profileHeaderCard, { borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          {/* Avatar / Profile Initials */}
          <View style={[styles.largeAvatar, { backgroundColor: colors.surfaceLighter, borderColor: colors.primary + '55', borderWidth: 2 }]}>
            <Text style={[styles.largeAvatarText, { color: colors.primary }]}>
              {player.name ? player.name[0].toUpperCase() : 'P'}
            </Text>
          </View>

          {/* Name & Country / Team Badges */}
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.playerName, { color: colors.text }]}>{player.name}</Text>
              {/* Authentic Country Flag Badge */}
              <View style={styles.flagBadge}>
                <TeamLogo
                  playerName={player.name}
                  teamId={player.nationalTeamId}
                  country={player.country}
                  size={24}
                  borderRadius={12}
                />
                <Text style={[styles.flagLabel, { color: colors.secondary || '#38BDF8' }]}>
                  {player.country || (player.nationalTeamId ? player.nationalTeamId.replace('INT_', '') : 'IND')}
                </Text>
              </View>
            </View>

            {/* Franchise Team / Aliases */}
            <View style={styles.tagsRow}>
              {player.iplTeamId && (
                <View style={[styles.franchiseBadge, { backgroundColor: colors.surfaceLighter, borderColor: colors.borderLight }]}>
                  <TeamLogo teamId={player.iplTeamId} size={18} borderRadius={9} />
                  <Text style={[styles.franchiseText, { color: colors.text }]}>
                    {player.iplTeamId.replace('IPL_', '')}
                  </Text>
                </View>
              )}
              {player.aliases?.length > 1 && (
                <Text style={[styles.aliasesLabel, { color: colors.textMuted }]} numberOfLines={1}>
                  aka {player.aliases.filter((a: string) => a.toLowerCase() !== player.name.toLowerCase()).slice(0, 2).join(', ')}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Quick Career Summary Row */}
        <View style={[styles.recordsRow, { borderTopColor: colors.border }]}>
          <View style={styles.recordStat}>
            <Text style={[styles.recordValue, { color: colors.text }]}>{stats.matches || 0}</Text>
            <Text style={[styles.recordLabel, { color: colors.textMuted }]}>Matches</Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={[styles.recordValue, { color: colors.primary }]}>{stats.wins || 0}</Text>
            <Text style={[styles.recordLabel, { color: colors.textMuted }]}>Wins</Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={[styles.recordValue, { color: '#F59E0B' }]}>{stats.mvps || 0}</Text>
            <Text style={[styles.recordLabel, { color: colors.textMuted }]}>👑 MVPs</Text>
          </View>
          {winRate !== null && (
            <View style={styles.recordStat}>
              <Text style={[styles.recordValue, { color: colors.secondary || '#38BDF8' }]}>{winRate}%</Text>
              <Text style={[styles.recordLabel, { color: colors.textMuted }]}>Win Rate</Text>
            </View>
          )}
        </View>
      </Card>

      {/* 2. Format Selector Tabs (All Formats / T20 / ODI) */}
      <View style={[styles.formatTabsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.formatTabsLabel, { color: colors.textMuted }]}>FORMAT DIVISION:</Text>
        <View style={styles.formatTabsRow}>
          {(['ALL', 'T20', 'ODI'] as FormatFilter[]).map((fmt) => {
            const isSelected = selectedFormat === fmt;
            return (
              <TouchableOpacity
                key={fmt}
                activeOpacity={0.8}
                onPress={() => setSelectedFormat(fmt)}
                style={[
                  styles.formatTabBtn,
                  isSelected && { backgroundColor: colors.primary },
                  !isSelected && { backgroundColor: colors.surfaceLighter, borderColor: colors.border, borderWidth: 1 },
                ]}
              >
                <Text
                  style={[
                    styles.formatTabBtnText,
                    { color: isSelected ? '#FFF' : colors.text },
                  ]}
                >
                  {fmt === 'ALL' ? '🌐 All Formats' : fmt === 'T20' ? '🏏 T20 / T10' : '🏆 ODI / Custom'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3. Milestones & Trophy Cabinet (Achievement Badges) */}
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>🏆 Career Milestones & Badges</Text>
          <Text style={[styles.sectionBadgeCount, { color: colors.primary, backgroundColor: colors.primary + '20' }]}>
            {badges.filter((b) => b.unlocked).length}/{badges.length} Unlocked
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgesScroll}
        >
          {badges.map((badge) => (
            <View
              key={badge.id}
              style={[
                styles.badgeCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: badge.unlocked ? badge.color : colors.border,
                  opacity: badge.unlocked ? 1 : 0.6,
                },
              ]}
            >
              <View
                style={[
                  styles.badgeIconWrap,
                  { backgroundColor: badge.unlocked ? badge.color + '25' : colors.surfaceLighter },
                ]}
              >
                <Text style={styles.badgeIcon}>{badge.icon}</Text>
              </View>
              <Text style={[styles.badgeTitle, { color: colors.text }]} numberOfLines={1}>
                {badge.title}
              </Text>
              <Text style={[styles.badgeDesc, { color: colors.textMuted }]} numberOfLines={2}>
                {badge.desc}
              </Text>
              <View
                style={[
                  styles.badgeStatusPill,
                  { backgroundColor: badge.unlocked ? badge.color + '20' : colors.surfaceLighter },
                ]}
              >
                <Text
                  style={[
                    styles.badgeStatusText,
                    { color: badge.unlocked ? badge.color : colors.textMuted },
                  ]}
                >
                  {badge.unlocked ? `✓ ${badge.progress || 'Unlocked'}` : '🔒 Locked'}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 4. AI Career Intelligence Section */}
      {insights && (
        <View style={styles.insightsSection}>
          <Text style={[styles.sectionHeading, { color: colors.primary }]}>⚡ AI Career Intelligence</Text>
          <Card style={[styles.insightsCard, { borderColor: colors.primary + '40', backgroundColor: colors.surface }]}>
            {insights.summary ? (
              <Text style={[styles.insightsSummary, { color: colors.text }]}>{insights.summary}</Text>
            ) : null}

            {insights.strengths && insights.strengths.length > 0 && (
              <View style={styles.insightGroup}>
                <Text style={[styles.insightGroupLabel, { color: '#00ff88' }]}>Key Strengths</Text>
                {insights.strengths.map((s: string, idx: number) => (
                  <View key={idx} style={styles.bulletRow}>
                    <Text style={{ color: '#00ff88', marginRight: 6 }}>✓</Text>
                    <Text style={[styles.bulletText, { color: colors.text }]}>{s}</Text>
                  </View>
                ))}
              </View>
            )}

            {insights.weaknesses && insights.weaknesses.length > 0 && (
              <View style={styles.insightGroup}>
                <Text style={[styles.insightGroupLabel, { color: '#ffaa00' }]}>Areas to Watch</Text>
                {insights.weaknesses.map((w: string, idx: number) => (
                  <View key={idx} style={styles.bulletRow}>
                    <Text style={{ color: '#ffaa00', marginRight: 6 }}>!</Text>
                    <Text style={[styles.bulletText, { color: colors.text }]}>{w}</Text>
                  </View>
                ))}
              </View>
            )}

            {insights.suggestions && insights.suggestions.length > 0 && (
              <View style={styles.insightGroup}>
                <Text style={[styles.insightGroupLabel, { color: colors.secondary || '#38bdf8' }]}>Coaching Recommendations</Text>
                {insights.suggestions.map((sg: string, idx: number) => (
                  <View key={idx} style={styles.bulletRow}>
                    <Text style={{ color: colors.secondary || '#38bdf8', marginRight: 6 }}>➔</Text>
                    <Text style={[styles.bulletText, { color: colors.textMuted }]}>{sg}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </View>
      )}

      {/* 5. Batting Statistics Card */}
      <Text style={[styles.sectionHeading, { color: colors.text }]}>Batting Statistics ({selectedFormat})</Text>
      <Card style={styles.statsGridCard}>
        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{batting.runs || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Runs</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{batting.avg}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Average</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{batting.sr}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Strike Rate</Text>
          </View>
        </View>
        <View style={[styles.gridRow, { marginTop: 16 }]}>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{batting.highestScore || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Highest Score</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{batting.fifties || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>50s</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{batting.hundreds || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>100s</Text>
          </View>
        </View>
        <View style={[styles.gridRow, { marginTop: 16 }]}>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{batting.fours || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Fours (4s)</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{batting.sixes || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Sixes (6s)</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{batting.ducks || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Ducks</Text>
          </View>
        </View>
      </Card>

      {/* 6. Bowling Statistics Card */}
      <Text style={[styles.sectionHeading, { color: colors.text }]}>Bowling Statistics ({selectedFormat})</Text>
      <Card style={styles.statsGridCard}>
        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{bowling.wickets || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Wickets</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{bowling.overs || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Overs</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{bowling.econ}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Economy</Text>
          </View>
        </View>
        <View style={[styles.gridRow, { marginTop: 16 }]}>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>
              {bowling.bestBowling?.wickets || 0}/{bowling.bestBowling?.runs || 0}
            </Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Best Bowling</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{bowling.maidens || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Maidens</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{bowling.runsConceded || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Runs Conceded</Text>
          </View>
        </View>
      </Card>

      {/* 7. Fielding Statistics Card */}
      <Text style={[styles.sectionHeading, { color: colors.text }]}>Fielding Statistics</Text>
      <Card style={styles.statsGridCard}>
        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{fielding.catches || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Catches</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{fielding.stumpings || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Stumpings</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={[styles.gridVal, { color: colors.text }]}>{fielding.runOuts || 0}</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Run Outs</Text>
          </View>
        </View>
      </Card>

      {/* 8. Innings-by-Innings Match Log Table */}
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>
            📋 Innings Match Log ({filteredHistory.length} Matches)
          </Text>
        </View>

        {filteredHistory.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
              No matches found for {selectedFormat} format.
            </Text>
          </Card>
        ) : (
          <View style={styles.matchLogList}>
            {filteredHistory.map((m: any, idx: number) => {
              const dateStr = m.date ? new Date(m.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Match ' + (idx + 1);
              const bat = m.batting || {};
              const bowl = m.bowling || {};
              const isNotOut = (bat.outStatus || '').toLowerCase().includes('not out') || (bat.outStatus || '').toLowerCase() === 'not_out';

              return (
                <Card
                  key={m.matchId || idx}
                  style={[
                    styles.matchLogCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: m.isMvp ? '#F59E0B66' : colors.border,
                    },
                  ]}
                >
                  {/* Match Log Header */}
                  <View style={styles.matchLogHeader}>
                    <View style={styles.matchLogHeaderLeft}>
                      <View style={[styles.formatBadge, { backgroundColor: colors.surfaceLighter }]}>
                        <Text style={[styles.formatBadgeText, { color: colors.primary }]}>
                          {m.format || 'T20'}
                        </Text>
                      </View>
                      <Text style={[styles.matchDateText, { color: colors.textMuted }]}>{dateStr}</Text>
                    </View>

                    {m.isMvp && (
                      <View style={styles.mvpPill}>
                        <Text style={styles.mvpPillText}>👑 MVP</Text>
                      </View>
                    )}
                  </View>

                  {/* Opponent & Match Title */}
                  <View style={styles.opponentRow}>
                    <Text style={[styles.vsLabel, { color: colors.textMuted }]}>vs</Text>
                    <TeamLogo
                      teamName={m.opponentTeam?.name}
                      teamId={m.opponentTeam?.teamId}
                      country={m.opponentTeam?.name}
                      size={20}
                      borderRadius={10}
                    />
                    <Text style={[styles.opponentName, { color: colors.text }]} numberOfLines={1}>
                      {m.opponentTeam?.name || 'Opponent'}
                    </Text>
                    {m.result ? (
                      <Text style={[styles.resultSnippet, { color: colors.textMuted }]} numberOfLines={1}>
                        • {m.result}
                      </Text>
                    ) : null}
                  </View>

                  {/* Player's Innings Contribution Box */}
                  <View style={[styles.contributionGrid, { backgroundColor: colors.surfaceLighter, borderColor: colors.borderLight }]}>
                    {/* Batting Box */}
                    <View style={styles.contribCol}>
                      <Text style={[styles.contribLabel, { color: colors.textMuted }]}>BATTING</Text>
                      {bat.didNotBat ? (
                        <Text style={[styles.dnbText, { color: colors.textMuted }]}>Did Not Bat</Text>
                      ) : (
                        <View style={styles.statLine}>
                          <Text style={[styles.contribScore, { color: colors.text }]}>
                            {bat.runs || 0}
                            <Text style={{ fontSize: 12, fontWeight: '400', color: colors.textMuted }}>
                              ({bat.balls || 0}b)
                            </Text>
                          </Text>
                          <Text
                            style={[
                              styles.dismissalStatus,
                              { color: isNotOut ? '#10B981' : colors.textMuted },
                            ]}
                          >
                            {isNotOut ? 'NOT OUT' : bat.outStatus ? bat.outStatus.toUpperCase() : 'OUT'}
                          </Text>
                          <Text style={[styles.subStat, { color: colors.textMuted }]}>
                            4s: {bat.fours || 0} | 6s: {bat.sixes || 0} | SR: {bat.strikeRate || 0}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Bowling Box */}
                    <View style={styles.contribCol}>
                      <Text style={[styles.contribLabel, { color: colors.textMuted }]}>BOWLING</Text>
                      {bowl.didNotBowl || (bowl.overs === 0 && bowl.wickets === 0) ? (
                        <Text style={[styles.dnbText, { color: colors.textMuted }]}>Did Not Bowl</Text>
                      ) : (
                        <View style={styles.statLine}>
                          <Text style={[styles.contribScore, { color: colors.primary }]}>
                            {bowl.wickets || 0} - {bowl.runsConceded || 0}
                          </Text>
                          <Text style={[styles.dismissalStatus, { color: colors.textMuted }]}>
                            {bowl.overs || 0} OVERS
                          </Text>
                          <Text style={[styles.subStat, { color: colors.textMuted }]}>
                            Econ: {bowl.economy || 0} | M: {bowl.maidens || 0}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Link to Full Match Details */}
                  {m.matchId && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => router.push({ pathname: '/match-details', params: { id: m.matchId } })}
                      style={styles.viewMatchBtn}
                    >
                      <Text style={[styles.viewMatchText, { color: colors.primary }]}>
                        View Full Scorecard ➔
                      </Text>
                    </TouchableOpacity>
                  )}
                </Card>
              );
            })}
          </View>
        )}
      </View>

      {/* 9. Performance Trends (Graphs) */}
      <Text style={[styles.sectionHeading, { color: colors.text }]}>Career Performance Trends</Text>
      <LineChart data={runsChartData} title="Runs Per Match" colorType="primary" />
      <LineChart data={srChartData} title="Batting Strike Rate" colorType="secondary" />
      <LineChart data={wicketsChartData} title="Wickets Per Match" colorType="primary" />
      <LineChart data={econChartData} title="Bowling Economy Rate" colorType="warning" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 60,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeaderCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  largeAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  largeAvatarText: {
    fontSize: 28,
    fontWeight: '900',
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  flagLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  franchiseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  franchiseText: {
    fontSize: 11,
    fontWeight: '800',
  },
  aliasesLabel: {
    fontSize: 12,
  },
  recordsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 4,
  },
  recordStat: {
    alignItems: 'center',
  },
  recordValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  recordLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  formatTabsCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  formatTabsLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  formatTabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  formatTabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatTabBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionWrap: {
    marginTop: 4,
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sectionBadgeCount: {
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgesScroll: {
    paddingVertical: 4,
    gap: 12,
  },
  badgeCard: {
    width: 155,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  badgeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  badgeIcon: {
    fontSize: 22,
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  badgeDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  badgeStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  badgeStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  insightsSection: {
    gap: 8,
  },
  insightsCard: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 14,
  },
  insightsSummary: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 12,
  },
  insightGroup: {
    marginTop: 8,
  },
  insightGroupLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  statsGridCard: {
    padding: 16,
    borderRadius: 14,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCol: {
    flex: 1,
    alignItems: 'center',
  },
  gridVal: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  matchLogList: {
    gap: 12,
  },
  matchLogCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10,
  },
  matchLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchLogHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  formatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  formatBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  matchDateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  mvpPill: {
    backgroundColor: '#F59E0B25',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  mvpPillText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
  },
  opponentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vsLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  opponentName: {
    fontSize: 14,
    fontWeight: '800',
  },
  resultSnippet: {
    fontSize: 12,
    flex: 1,
  },
  contributionGrid: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 12,
  },
  contribCol: {
    flex: 1,
    gap: 3,
  },
  contribLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statLine: {
    gap: 2,
  },
  contribScore: {
    fontSize: 16,
    fontWeight: '800',
  },
  dismissalStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  subStat: {
    fontSize: 10,
    marginTop: 2,
  },
  dnbText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  viewMatchBtn: {
    alignSelf: 'flex-end',
    paddingTop: 2,
  },
  viewMatchText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
