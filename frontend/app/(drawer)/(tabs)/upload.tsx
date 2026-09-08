import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useTheme } from '../../../components/Theme';
import { Button } from '../../../components/Button';
import Card from '../../../components/Card';
import api from '../../../services/api';
import { uploadScorecard } from '../../../services/matchService';
import SyncManager from '../../../services/SyncManager';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Swipeable } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';

const TrashIcon = ({ color }: { color: string }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z" fill={color} />
  </Svg>
);

const CameraIcon = ({ color }: { color: string }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    
    <Path d="M12 15a3 3 0 100-6 3 3 0 000 6z" fill={color} />
    <Path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" fill={color} />
  </Svg>
);

const GalleryIcon = ({ color }: { color: string }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill={color} />
  </Svg>
);

const TABS = ['Scan OCR', 'Details', 'Batting', 'Bowling', 'Review'];

const PlayerAutocomplete = ({ value, onChangeText, players, colors, styles }: any) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const filtered = players
    .filter((p: any) => p.name.toLowerCase().includes(value.toLowerCase()) && p.name.toLowerCase() !== value.toLowerCase())
    .slice(0, 5);

  return (
    <View style={{ position: 'relative', zIndex: showSuggestions ? 999 : 1 }}>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={value}
        onChangeText={(t) => {
          onChangeText(t);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder="Player Name"
        placeholderTextColor={colors.textMuted}
      />
      {showSuggestions && filtered.length > 0 && (
        <View style={{ position: 'absolute', top: 50, left: 0, right: 0, backgroundColor: colors.surfaceLighter || '#333', borderRadius: 8, elevation: 5, zIndex: 1000, borderWidth: 1, borderColor: colors.border }}>
          {filtered.map((p: any) => (
            <TouchableOpacity key={p._id} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }} onPress={() => { onChangeText(p.name); setShowSuggestions(false); }}>
              <Text style={{ color: colors.text }}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default function ManualMatchEntry() {
  const { colors } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [extractionEngine, setExtractionEngine] = useState<string | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [teamAId, setTeamAId] = useState<string | null>(null);
  const [teamBId, setTeamBId] = useState<string | null>(null);
  const [teamALogo, setTeamALogo] = useState<string>('');
  const [teamBLogo, setTeamBLogo] = useState<string>('');
  const [teamAMasterId, setTeamAMasterId] = useState<string>('');
  const [teamBMasterId, setTeamBMasterId] = useState<string>('');
  const [teamACandidates, setTeamACandidates] = useState<any[]>([]);
  const [teamBCandidates, setTeamBCandidates] = useState<any[]>([]);
  const [teamANeedsReview, setTeamANeedsReview] = useState<boolean>(false);
  const [teamBNeedsReview, setTeamBNeedsReview] = useState<boolean>(false);
  const [missingFieldsModalVisible, setMissingFieldsModalVisible] = useState<boolean>(false);
  const [missingFields, setMissingFields] = useState<Array<{ key: string; label: string; placeholder: string; value: string }>>([]);
  const [matchMilestones, setMatchMilestones] = useState<{
    centuries?: any[];
    fifties?: any[];
    topBowlers?: any[];
    bestBatter?: string | null;
    bestBowler?: string | null;
  } | null>(null);

  const [matchInfo, setMatchInfo] = useState({
    date: new Date().toISOString().split('T')[0],
    teamName: '',
    opponentTeam: '',
    venueName: '',
    tournamentId: '',
    matchType: 'T20',
    overs: '20',
    result: '',
    mvp: '',
  });

  const initialBatting = () => Array.from({ length: 11 }).map((_, i) => ({
    id: Date.now().toString() + i, name: '', outStatus: 'out', runs: '0', balls: '0', fours: '0', sixes: '0'
  }));
  const initialBowling = () => Array.from({ length: 11 }).map((_, i) => ({
    id: Date.now().toString() + i + 100, name: '', overs: '0', maidens: '0', runs: '0', wickets: '0'
  }));

  const [batting, setBatting] = useState<any[]>(initialBatting());
  const [bowling, setBowling] = useState<any[]>(initialBowling());
  const [teamBBatting, setTeamBBatting] = useState<any[]>([]);
  const [teamABowling, setTeamABowling] = useState<any[]>([]);
  const [extrasA, setExtrasA] = useState<number>(0);
  const [extrasB, setExtrasB] = useState<number>(0);
  const [dbPlayers, setDbPlayers] = useState<any[]>([]);

  const computedMilestones = useMemo(() => {
    const allBatters = [
      ...batting.map(b => ({ ...b, team: matchInfo.teamName || 'Team 1' })),
      ...teamBBatting.map(b => ({ ...b, team: matchInfo.opponentTeam || 'Team 2' }))
    ].filter(b => b.name && b.name.trim() !== '');

    const allBowlers = [
      ...bowling.map(b => ({ ...b, team: matchInfo.opponentTeam || 'Team 2' })),
      ...teamABowling.map(b => ({ ...b, team: matchInfo.teamName || 'Team 1' }))
    ].filter(b => b.name && b.name.trim() !== '');

    const liveCenturies = allBatters.filter(b => (Number(b.runs) || 0) >= 100);
    const liveFifties = allBatters.filter(b => (Number(b.runs) || 0) >= 50 && (Number(b.runs) || 0) < 100);
    const liveTopBowlers = allBowlers.filter(b => (Number(b.wickets) || 0) >= 3);

    let topBatter: any = null;
    let maxRuns = 0;
    for (const b of allBatters) {
      const r = Number(b.runs) || 0;
      if (r > maxRuns) {
        maxRuns = r;
        topBatter = b;
      }
    }

    let topBowler: any = null;
    let maxWickets = 0;
    for (const b of allBowlers) {
      const w = Number(b.wickets) || 0;
      if (w > maxWickets) {
        maxWickets = w;
        topBowler = b;
      }
    }

    return {
      centuries: (matchMilestones?.centuries && matchMilestones.centuries.length > 0)
        ? matchMilestones.centuries
        : liveCenturies,
      fifties: (matchMilestones?.fifties && matchMilestones.fifties.length > 0)
        ? matchMilestones.fifties
        : liveFifties,
      topBowlers: (matchMilestones?.topBowlers && matchMilestones.topBowlers.length > 0)
        ? matchMilestones.topBowlers
        : liveTopBowlers,
      bestBatter: matchMilestones?.bestBatter || (topBatter ? `${topBatter.name} (${topBatter.runs} runs)` : null),
      bestBowler: matchMilestones?.bestBowler || (topBowler ? `${topBowler.name} (${topBowler.wickets} wkts)` : null),
    };
  }, [batting, teamBBatting, bowling, teamABowling, matchInfo.teamName, matchInfo.opponentTeam, matchMilestones]);

  useEffect(() => {
    api.get('/players?limit=100').then(res => {
      const players = res.data.data;
      setDbPlayers(players);
      
      if (players.length > 0) {
        setBatting(prev => prev.map((row, i) => {
          if (row.name === '' && players[i]) return { ...row, name: players[i].name };
          return row;
        }));
        
        setBowling(prev => prev.map((row, i) => {
          if (row.name === '' && players[i]) return { ...row, name: players[i].name };
          return row;
        }));
      }
    }).catch(err => console.error(err));
  }, []);

  const pickImage = async (fromCamera: boolean) => {
    try {
      let permissionResult;
      if (fromCamera) {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Permission to access camera or gallery is required.');
        return;
      }

      const remainingSlots = Math.max(1, 5 - selectedImages.length);
      if (selectedImages.length >= 5) {
        Alert.alert('Maximum Limit Reached', 'You can upload up to 5 scorecard photos at a time.');
        return;
      }

      if (fromCamera) {
        const pickerResult = await ImagePicker.launchCameraAsync({
          quality: 0.85,
        });
        if (!pickerResult.canceled && pickerResult.assets?.[0]?.uri) {
          setSelectedImages(prev => [...prev, pickerResult.assets[0].uri].slice(0, 5));
        }
      } else {
        const pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: remainingSlots,
          quality: 0.85,
        });
        if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
          const uris = pickerResult.assets.map(a => a.uri);
          setSelectedImages(prev => [...prev, ...uris].slice(0, 5));
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to select image');
    }
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllImages = () => {
    setSelectedImages([]);
    setExtractionEngine(null);
    setOcrConfidence(null);
    setValidationWarnings([]);
  };

  const handleRunOcr = async () => {
    if (selectedImages.length === 0) {
      Alert.alert('No Image', 'Please choose between 1 to 5 scorecard images from camera or gallery first.');
      return;
    }

    setIsOcrLoading(true);
    try {
      const result = await uploadScorecard(selectedImages);
      if (result.success && result.data) {
        const d = result.data;
        if (d.ocrConfidence) {
          setOcrConfidence(Math.round(d.ocrConfidence * 100));
        }
        if (d.extractionEngine) {
          setExtractionEngine(d.extractionEngine);
        }
        if (d.validation?.warnings) {
          setValidationWarnings(d.validation.warnings);
        }
        if (d.milestones) {
          setMatchMilestones(d.milestones);
        }

        // Populate matchInfo & Team Master resolution
        if (d.matchInfo) {
          setTeamAId(d.matchInfo.teamAId || null);
          setTeamBId(d.matchInfo.teamBId || null);
          setTeamALogo(d.matchInfo.teamALogo || '');
          setTeamBLogo(d.matchInfo.teamBLogo || '');
          setTeamAMasterId(d.matchInfo.teamAMasterId || '');
          setTeamBMasterId(d.matchInfo.teamBMasterId || '');
          setMatchInfo(prev => ({
            ...prev,
            teamName: d.matchInfo.teamA || d.matchInfo.teamName || prev.teamName,
            opponentTeam: d.matchInfo.teamB || d.matchInfo.opponentTeam || prev.opponentTeam,
            venueName: d.matchInfo.venue || d.matchInfo.venueName || prev.venueName,
            date: d.matchInfo.date || prev.date,
            overs: d.matchInfo.overs ? String(d.matchInfo.overs) : prev.overs,
            result: d.matchInfo.result || prev.result,
            mvp: d.matchInfo.mvp || prev.mvp,
          }));
        }

        if (d.teamAResolution) {
          setTeamANeedsReview(!!d.teamAResolution.needsReview);
          setTeamACandidates(d.teamAResolution.candidates || []);
        }

        if (d.teamBResolution) {
          setTeamBNeedsReview(!!d.teamBResolution.needsReview);
          setTeamBCandidates(d.teamBResolution.candidates || []);
        }

        // Populate Innings 1 / Team A Batting
        if (d.teamABatting && d.teamABatting.length > 0) {
          const formattedBat = d.teamABatting.map((row: any, idx: number) => ({
            id: Date.now().toString() + idx,
            name: row.name || '',
            outStatus: row.dismissalStatus || row.outStatus || 'out',
            runs: String(row.runs ?? 0),
            balls: String(row.balls ?? 0),
            fours: String(row.fours ?? 0),
            sixes: String(row.sixes ?? 0),
          }));
          setBatting(formattedBat);
        }

        // Populate Innings 1 / Team B Bowling
        if (d.teamBBowling && d.teamBBowling.length > 0) {
          const formattedBowl = d.teamBBowling.map((row: any, idx: number) => ({
            id: Date.now().toString() + idx + 100,
            name: row.name || '',
            overs: String(row.overs ?? 0),
            maidens: String(row.maidens ?? 0),
            runs: String(row.runsConceded ?? row.runs ?? 0),
            wickets: String(row.wickets ?? 0),
          }));
          setBowling(formattedBowl);
        }

        // Populate Innings 2 / Team B Batting
        if (d.teamBBatting && d.teamBBatting.length > 0) {
          const formattedTBat = d.teamBBatting.map((row: any, idx: number) => ({
            id: 'tb_' + Date.now().toString() + idx,
            name: row.name || '',
            outStatus: row.dismissalStatus || row.outStatus || 'out',
            runs: String(row.runs ?? 0),
            balls: String(row.balls ?? 0),
            fours: String(row.fours ?? 0),
            sixes: String(row.sixes ?? 0),
          }));
          setTeamBBatting(formattedTBat);
        }

        // Populate Innings 2 / Team A Bowling
        if (d.teamABowling && d.teamABowling.length > 0) {
          const formattedTBowl = d.teamABowling.map((row: any, idx: number) => ({
            id: 'ta_' + Date.now().toString() + idx + 200,
            name: row.name || '',
            overs: String(row.overs ?? 0),
            maidens: String(row.maidens ?? 0),
            runs: String(row.runsConceded ?? row.runs ?? 0),
            wickets: String(row.wickets ?? 0),
          }));
          setTeamABowling(formattedTBowl);
        }

        if (d.extrasA?.total) setExtrasA(Number(d.extrasA.total));
        if (d.extrasB?.total) setExtrasB(Number(d.extrasB.total));

        const engineLabel = d.extractionEngine === 'gemini-vision' ? 'Gemini AI Vision' : 'Optical OCR';

        // Check for essential fields that were NOT found in the scorecard image
        const missing: Array<{ key: string; label: string; placeholder: string; value: string }> = [];

        const curTeamA = d.matchInfo?.teamA || d.matchInfo?.teamName || '';
        const curTeamB = d.matchInfo?.teamB || d.matchInfo?.opponentTeam || '';
        const curVenue = d.matchInfo?.venue || d.matchInfo?.venueName || '';
        const curDate = d.matchInfo?.date || '';
        const curOvers = d.matchInfo?.overs ? String(d.matchInfo.overs) : '';
        const curResult = d.matchInfo?.result || '';

        if (!curTeamA.trim()) {
          missing.push({ key: 'teamName', label: 'Team 1 (Your Team)', placeholder: 'e.g. India', value: '' });
        }
        if (!curTeamB.trim()) {
          missing.push({ key: 'opponentTeam', label: 'Team 2 (Opponent)', placeholder: 'e.g. Australia', value: '' });
        }
        if (!curVenue.trim()) {
          missing.push({ key: 'venueName', label: 'Venue / Stadium', placeholder: 'e.g. Wankhede Stadium', value: '' });
        }
        if (!curDate.trim()) {
          missing.push({ key: 'date', label: 'Match Date (YYYY-MM-DD)', placeholder: new Date().toISOString().split('T')[0], value: new Date().toISOString().split('T')[0] });
        }
        if (!curOvers.trim()) {
          missing.push({ key: 'overs', label: 'Match Overs Limit', placeholder: '20', value: '20' });
        }
        if (!curResult.trim()) {
          missing.push({ key: 'result', label: 'Match Result', placeholder: 'e.g. India won by 6 runs', value: '' });
        }

        if (missing.length > 0) {
          setMissingFields(missing);
          setMissingFieldsModalVisible(true);
        } else {
          Alert.alert(
            `Scan Complete (${engineLabel}) 🎯`,
            `All match details, innings, and player stats were extracted successfully!\nQuality: ${Math.round((d.ocrConfidence || 0.9) * 100)}% Confidence.`,
            [
              { text: 'Review Data ➔', onPress: () => setActiveTab(4) },
              { text: 'Edit Details', onPress: () => setActiveTab(1) },
            ]
          );
        }
      } else {
        throw new Error(result.message || 'Scorecard scanning returned empty data.');
      }
    } catch (err: any) {
      console.error('Scan run error:', err);
      Alert.alert('Scan Failed', err.response?.data?.message || err.message || 'Unable to scan scorecard.');
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleUpdateMissingField = (key: string, val: string) => {
    setMissingFields(prev => prev.map(f => f.key === key ? { ...f, value: val } : f));
  };

  const handleConfirmMissingFields = async () => {
    const updatedInfo: any = { ...matchInfo };
    let newTeamA = matchInfo.teamName;
    let newTeamB = matchInfo.opponentTeam;

    for (const field of missingFields) {
      if (field.value.trim()) {
        updatedInfo[field.key] = field.value.trim();
        if (field.key === 'teamName') newTeamA = field.value.trim();
        if (field.key === 'opponentTeam') newTeamB = field.value.trim();
      }
    }

    setMatchInfo(updatedInfo);
    setMissingFieldsModalVisible(false);

    // If team names were manually filled, resolve against Team Master
    if (newTeamA && !teamAMasterId) {
      try {
        const resA = await api.post('/teams/resolve', { name: newTeamA });
        if (resA.data.success && resA.data.data?.matched) {
          setTeamAId(resA.data.data.team._id || null);
          setTeamAMasterId(resA.data.data.team.teamId || '');
          setTeamALogo(resA.data.data.team.logoUrl || resA.data.data.team.logo || '');
        }
      } catch (e) {}
    }
    if (newTeamB && !teamBMasterId) {
      try {
        const resB = await api.post('/teams/resolve', { name: newTeamB });
        if (resB.data.success && resB.data.data?.matched) {
          setTeamBId(resB.data.data.team._id || null);
          setTeamBMasterId(resB.data.data.team.teamId || '');
          setTeamBLogo(resB.data.data.team.logoUrl || resB.data.data.team.logo || '');
        }
      } catch (e) {}
    }

    // Switch to Review tab to see complete scorecard with user filled missing items
    setActiveTab(4);
  };

  const addBatsman = () => {
    setBatting([...batting, { id: Date.now().toString(), name: '', outStatus: 'out', runs: '0', balls: '0', fours: '0', sixes: '0' }]);
  };

  const updateBatsman = (id: string, field: string, value: string) => {
    setBatting(batting.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const removeBatsman = (id: string) => {
    setBatting(batting.filter(b => b.id !== id));
  };

  const addBowler = () => {
    setBowling([...bowling, { id: Date.now().toString(), name: '', overs: '0', maidens: '0', runs: '0', wickets: '0' }]);
  };

  const updateBowler = (id: string, field: string, value: string) => {
    setBowling(bowling.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const removeBowler = (id: string) => {
    setBowling(bowling.filter(b => b.id !== id));
  };

  const renderRightActions = (onDelete: () => void) => {
    return (
      <TouchableOpacity style={styles.deleteAction} onPress={onDelete}>
        <TrashIcon color="#fff" />
      </TouchableOpacity>
    );
  };

  const saveMatch = async () => {
    if (!matchInfo.teamName) {
      Alert.alert('Validation Error', 'Please enter your Team Name.');
      setActiveTab(1);
      return;
    }

    setIsSaving(true);
    const calcTeamAWickets = batting.filter(b => {
      const s = (b.outStatus || '').toLowerCase();
      return s && !['not out', 'not_out', 'dnb', 'did not bat'].includes(s);
    }).length;
    const calcTeamBWickets = teamBBatting.filter(b => {
      const s = (b.outStatus || '').toLowerCase();
      return s && !['not out', 'not_out', 'dnb', 'did not bat'].includes(s);
    }).length;

    const finalResult = matchInfo.result?.trim() || `${matchInfo.teamName || 'Team 1'} vs ${matchInfo.opponentTeam || 'Team 2'}`;

    const payload = {
      matchInfo: {
        ...matchInfo,
        result: finalResult,
        teamAId,
        teamBId,
        teamAMasterId,
        teamBMasterId,
        teamALogo,
        teamBLogo,
        teamAScore: {
          runs: batting.reduce((acc, b) => acc + (Number(b.runs) || 0), 0) + Number(extrasA || 0),
          wickets: calcTeamAWickets,
          overs: bowling.reduce((acc, b) => acc + (Number(b.overs) || 0), 0)
        },
        teamBScore: {
          runs: teamBBatting.reduce((acc, b) => acc + (Number(b.runs) || 0), 0) + Number(extrasB || 0),
          wickets: calcTeamBWickets,
          overs: teamABowling.reduce((acc, b) => acc + (Number(b.overs) || 0), 0)
        }
      },
      teamAId,
      teamBId,
      myTeamBatting: batting.filter(b => b.name.trim() !== ''),
      myTeamBowling: bowling.filter(b => b.name.trim() !== ''),
      teamABatting: batting.filter(b => b.name.trim() !== ''),
      teamBBowling: bowling.filter(b => b.name.trim() !== ''),
      teamBBatting: teamBBatting.filter(b => b.name.trim() !== ''),
      teamABowling: teamABowling.filter(b => b.name.trim() !== ''),
      extrasA: { total: extrasA },
      extrasB: { total: extrasB },
      forceNew: false
    };

    try {
      // Try /matches/save (with fallback to /manual-match/save)
      let response;
      try {
        response = await api.post('/matches/save', payload);
      } catch (firstErr: any) {
        if (firstErr.response && firstErr.response.status >= 400 && firstErr.response.status < 500 && firstErr.response.status !== 404) {
          throw firstErr;
        }
        response = await api.post('/manual-match/save', payload);
      }

      if (response.data.success) {
        Alert.alert('Success', 'Match saved successfully! Career statistics and team records updated.', [
          { 
            text: 'OK', 
            onPress: () => {
              setMatchInfo({
                date: new Date().toISOString().split('T')[0],
                teamName: '',
                opponentTeam: '',
                venueName: '',
                tournamentId: '',
                matchType: 'T20',
                overs: '20',
                result: '',
                mvp: '',
              });
              setTeamAId(null);
              setTeamBId(null);
              setTeamALogo('');
              setTeamBLogo('');
              setTeamAMasterId('');
              setTeamBMasterId('');
              setTeamACandidates([]);
              setTeamBCandidates([]);
              setTeamANeedsReview(false);
              setTeamBNeedsReview(false);
              setBatting(initialBatting());
              setBowling(initialBowling());
              setTeamBBatting([]);
              setTeamABowling([]);
              setExtrasA(0);
              setExtrasB(0);
              setSelectedImages([]);
              setOcrConfidence(null);
              setExtractionEngine(null);
              setValidationWarnings([]);
              setActiveTab(0);
              router.push('/(drawer)/(tabs)');
            }
          }
        ]);
      }
    } catch (err: any) {
      console.error('Save error:', err);
      // If the server responded with an error, the phone is ONLINE!
      if (err.response) {
        const errorMsg = err.response.data?.message || err.response.data?.error || `Server error (${err.response.status})`;
        Alert.alert('Save Failed', errorMsg);
        return;
      }

      // Only if there is genuinely no server response (network down/timeout) prompt offline queue:
      Alert.alert(
        'Device Offline',
        'Could not reach server. Would you like to queue this match locally to sync automatically when internet is restored?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Queue Offline',
            onPress: async () => {
              await SyncManager.queueOfflineMatch(payload);
              Alert.alert('Queued', 'Match queued offline. It will be synced when internet is restored.');
              router.push('/(drawer)/(tabs)');
            }
          }
        ]
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Tab Navigation */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {TABS.map((tab, idx) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === idx && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
            onPress={() => setActiveTab(idx)}
          >
            <Text style={[styles.tabText, { color: activeTab === idx ? colors.primary : colors.textMuted }]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Tab 0: Scan Scorecard */}
        {activeTab === 0 && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Scorecard Image Scanner</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 18, lineHeight: 18 }}>
              Upload or snap any cricket scorecard screenshot or printout. Our Gemini AI Vision & OCR pipeline extracts teams, innings, batting, bowling, extras, and updates player career records automatically.
            </Text>

            <Card style={styles.ocrCard}>
              {selectedImages.length > 0 ? (
                <View style={styles.previewContainer}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 10 }}>
                    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>
                      Selected Photos ({selectedImages.length}/5)
                    </Text>
                    <TouchableOpacity onPress={clearAllImages}>
                      <Text style={{ color: colors.error, fontWeight: '700', fontSize: 12 }}>Clear All</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4, gap: 10 }}>
                    {selectedImages.map((uri, idx) => (
                      <View key={uri + idx} style={{ position: 'relative', width: 130, height: 170, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceLighter }}>
                        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                        <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>#{idx + 1}</Text>
                        </View>
                        <TouchableOpacity
                          style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(255,59,48,0.9)', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}
                          onPress={() => removeSelectedImage(idx)}
                        >
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}

                    {selectedImages.length < 5 && (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={{ width: 105, height: 170, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary + '10', padding: 8 }}
                          onPress={() => pickImage(false)}
                        >
                          <GalleryIcon color={colors.primary} />
                          <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                            + Gallery
                          </Text>
                          <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: 2 }}>
                            ({5 - selectedImages.length} more)
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{ width: 105, height: 170, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary + '10', padding: 8 }}
                          onPress={() => pickImage(true)}
                        >
                          <CameraIcon color={colors.primary} />
                          <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                            + Camera
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </ScrollView>

                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 10, textAlign: 'center' }}>
                    💡 Tip: Select 2 to 5 photos (e.g. Innings 1, Innings 2, Bowling, Summary) for a complete match scan.
                  </Text>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, marginBottom: 4 }}>
                    Select 2 to 5 Scorecard Photos
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16, textAlign: 'center', maxWidth: 320 }}>
                    Snap or choose 2 to 5 screenshots of the scorecard (Innings 1, Innings 2, bowling figures, or summary)
                  </Text>
                  <View style={styles.pickerButtonsRow}>
                    <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: colors.surfaceLighter, borderColor: colors.border }]} onPress={() => pickImage(true)}>
                      <CameraIcon color={colors.primary} />
                      <Text style={[styles.pickerBtnText, { color: colors.text }]}>Take Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: colors.surfaceLighter, borderColor: colors.border }]} onPress={() => pickImage(false)}>
                      <GalleryIcon color={colors.primary} />
                      <Text style={[styles.pickerBtnText, { color: colors.text }]}>Gallery (Up to 5)</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {selectedImages.length > 0 && (
                <Button
                  title={isOcrLoading ? "Scanning Scorecard with AI..." : `Analyze & Extract ${selectedImages.length} Image${selectedImages.length > 1 ? 's' : ''} 🚀`}
                  onPress={handleRunOcr}
                  variant="primary"
                  isLoading={isOcrLoading}
                  style={{ marginTop: 16, width: '100%' }}
                />
              )}

              {ocrConfidence !== null && (
                <View style={[styles.confidenceBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
                  <Text style={{ color: colors.primary, fontWeight: '800' }}>
                    {extractionEngine === 'gemini-vision' ? '✨ Gemini AI Vision' : '⚙️ Optical OCR'}: {ocrConfidence}% Quality Score
                  </Text>
                </View>
              )}

              {validationWarnings.length > 0 && (
                <View style={{ marginTop: 14, padding: 12, backgroundColor: '#ff950020', borderRadius: 8, borderWidth: 1, borderColor: '#ff9500', width: '100%' }}>
                  <Text style={{ color: '#ff9500', fontWeight: '800', fontSize: 12, marginBottom: 4 }}>
                    ⚠️ SCORECARD INTEGRITY NOTICE
                  </Text>
                  {validationWarnings.slice(0, 2).map((warn, i) => (
                    <Text key={i} style={{ color: colors.text, fontSize: 12 }}>• {warn}</Text>
                  ))}
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
                    Please review or adjust values in the Batting/Bowling tabs before saving.
                  </Text>
                </View>
              )}

              {matchInfo.result ? (
                <View style={[styles.resultBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 18 }}>🏆</Text>
                    <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14, flex: 1 }}>
                      {matchInfo.result}
                    </Text>
                  </View>
                  {matchInfo.mvp ? (
                    <Text style={{ color: colors.text, fontSize: 12, marginTop: 4 }}>
                      ⭐ Player of the Match: <Text style={{ color: colors.primary, fontWeight: '700' }}>{matchInfo.mvp}</Text>
                    </Text>
                  ) : null}
                  {(computedMilestones.centuries.length > 0 || computedMilestones.fifties.length > 0 || computedMilestones.topBowlers.length > 0) ? (
                    <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.primary + '30' }}>
                      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                        Records Detected: {[
                          computedMilestones.centuries.length > 0 ? `💯 ${computedMilestones.centuries.length}x 100s` : '',
                          computedMilestones.fifties.length > 0 ? `🏏 ${computedMilestones.fifties.length}x 50s` : '',
                          computedMilestones.topBowlers.length > 0 ? `🎯 ${computedMilestones.topBowlers.length}x 3W+ Hauls` : ''
                        ].filter(Boolean).join(' • ')}
                      </Text>
                    </View>
                  ) : null}
                  <TouchableOpacity onPress={() => setActiveTab(4)} style={{ marginTop: 8 }}>
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                      Review Complete Scorecard & Milestones ➔
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </Card>

            <TouchableOpacity style={styles.skipToManual} onPress={() => setActiveTab(1)}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Or continue with Manual Entry ➔</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tab 1: Match Details */}
        {activeTab === 1 && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Match Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Date (YYYY-MM-DD)</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={matchInfo.date} onChangeText={t => setMatchInfo({...matchInfo, date: t})} />
            </View>

            <View style={styles.inputGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Team 1 (My Team)</Text>
                {teamAMasterId ? (
                  <View style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>Master ID: {teamAMasterId}</Text>
                  </View>
                ) : null}
              </View>
              <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: teamANeedsReview ? '#ff9500' : colors.border }]} value={matchInfo.teamName} onChangeText={t => {
                setMatchInfo({...matchInfo, teamName: t});
                setTeamANeedsReview(false);
              }} placeholder="e.g. India" placeholderTextColor={colors.textMuted} />

              {teamANeedsReview && teamACandidates.length > 0 && (
                <View style={{ marginTop: 6 }}>
                  <Text style={{ color: '#ff9500', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>Did you mean one of these Team Master records?</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {teamACandidates.map((c: any) => (
                      <TouchableOpacity
                        key={c.id}
                        style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.surfaceLighter, borderRadius: 6, borderWidth: 1, borderColor: colors.primary, marginRight: 6, marginBottom: 4 }}
                        onPress={() => {
                          setMatchInfo(prev => ({ ...prev, teamName: c.name }));
                          setTeamAId(c.id);
                          setTeamAMasterId(c.teamId);
                          setTeamALogo(c.logo || '');
                          setTeamANeedsReview(false);
                        }}
                      >
                        <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>
                          ✓ {c.name} {c.teamId ? `(${c.teamId})` : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Team 2 (Opponent Team)</Text>
                {teamBMasterId ? (
                  <View style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>Master ID: {teamBMasterId}</Text>
                  </View>
                ) : null}
              </View>
              <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: teamBNeedsReview ? '#ff9500' : colors.border }]} value={matchInfo.opponentTeam} onChangeText={t => {
                setMatchInfo({...matchInfo, opponentTeam: t});
                setTeamBNeedsReview(false);
              }} placeholder="e.g. Australia" placeholderTextColor={colors.textMuted} />

              {teamBNeedsReview && teamBCandidates.length > 0 && (
                <View style={{ marginTop: 6 }}>
                  <Text style={{ color: '#ff9500', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>Did you mean one of these Team Master records?</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {teamBCandidates.map((c: any) => (
                      <TouchableOpacity
                        key={c.id}
                        style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.surfaceLighter, borderRadius: 6, borderWidth: 1, borderColor: colors.primary, marginRight: 6, marginBottom: 4 }}
                        onPress={() => {
                          setMatchInfo(prev => ({ ...prev, opponentTeam: c.name }));
                          setTeamBId(c.id);
                          setTeamBMasterId(c.teamId);
                          setTeamBLogo(c.logo || '');
                          setTeamBNeedsReview(false);
                        }}
                      >
                        <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>
                          ✓ {c.name} {c.teamId ? `(${c.teamId})` : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Venue</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={matchInfo.venueName} onChangeText={t => setMatchInfo({...matchInfo, venueName: t})} />
            </View>
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Match Type</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={matchInfo.matchType} onChangeText={t => setMatchInfo({...matchInfo, matchType: t})} />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Overs</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={matchInfo.overs} onChangeText={t => setMatchInfo({...matchInfo, overs: t})} keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Result</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={matchInfo.result} onChangeText={t => setMatchInfo({...matchInfo, result: t})} placeholder="e.g. India won by 15 runs" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Player of the Match (MVP)</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={matchInfo.mvp} onChangeText={t => setMatchInfo({...matchInfo, mvp: t})} placeholder="e.g. Virat Kohli" placeholderTextColor={colors.textMuted} />
            </View>

            <Button title="Next: Batting ➔" onPress={() => setActiveTab(2)} variant="secondary" style={{ marginTop: 12 }} />
          </View>
        )}

        {/* Tab 2: Batting Tab */}
        {activeTab === 2 && (
          <View style={styles.tabContent}>
            <View style={styles.headerRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>My Team Batting</Text>
              <TouchableOpacity onPress={addBatsman}>
                <Text style={[styles.addText, { color: colors.primary }]}>+ Add Batsman</Text>
              </TouchableOpacity>
            </View>

            {batting.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No batsmen added. Tap "+ Add Batsman" to begin.</Text>
            ) : (
              batting.map((b, idx) => (
                <Swipeable key={b.id} renderRightActions={() => renderRightActions(() => removeBatsman(b.id))}>
                  <Card style={styles.rowCard}>
                    <View style={styles.rowInputs}>
                      <View style={[styles.inputGroup, { flex: 2, zIndex: 10 }]}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Player Name</Text>
                        <PlayerAutocomplete value={b.name} onChangeText={(t: string) => updateBatsman(b.id, 'name', t)} players={dbPlayers} colors={colors} styles={styles} />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Status</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={b.outStatus} onChangeText={t => updateBatsman(b.id, 'outStatus', t)} placeholder="out/not_out/DNB" placeholderTextColor={colors.textMuted} />
                      </View>
                    </View>
                    <View style={styles.rowInputs}>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>R</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={b.runs} onChangeText={t => updateBatsman(b.id, 'runs', t)} keyboardType="numeric" />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>B</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={b.balls} onChangeText={t => updateBatsman(b.id, 'balls', t)} keyboardType="numeric" />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>4s</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={b.fours} onChangeText={t => updateBatsman(b.id, 'fours', t)} keyboardType="numeric" />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>6s</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={b.sixes} onChangeText={t => updateBatsman(b.id, 'sixes', t)} keyboardType="numeric" />
                      </View>
                    </View>
                  </Card>
                </Swipeable>
              ))
            )}

            <Button title="Next: Bowling ➔" onPress={() => setActiveTab(3)} variant="secondary" style={{ marginTop: 12 }} />
          </View>
        )}

        {/* Tab 3: Bowling Tab */}
        {activeTab === 3 && (
          <View style={styles.tabContent}>
            <View style={styles.headerRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>My Team Bowling</Text>
              <TouchableOpacity onPress={addBowler}>
                <Text style={[styles.addText, { color: colors.primary }]}>+ Add Bowler</Text>
              </TouchableOpacity>
            </View>

            {bowling.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No bowlers added. Tap "+ Add Bowler" to begin.</Text>
            ) : (
              bowling.map((b, idx) => (
                <Swipeable key={b.id} renderRightActions={() => renderRightActions(() => removeBowler(b.id))}>
                  <Card style={styles.rowCard}>
                    <View style={[styles.inputGroup, { zIndex: 10 }]}>
                      <Text style={[styles.label, { color: colors.textMuted }]}>Bowler Name</Text>
                      <PlayerAutocomplete value={b.name} onChangeText={(t: string) => updateBowler(b.id, 'name', t)} players={dbPlayers} colors={colors} styles={styles} />
                    </View>
                    <View style={styles.rowInputs}>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>O</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={b.overs} onChangeText={t => updateBowler(b.id, 'overs', t)} keyboardType="numeric" />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>M</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={b.maidens} onChangeText={t => updateBowler(b.id, 'maidens', t)} keyboardType="numeric" />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>R</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={b.runs} onChangeText={t => updateBowler(b.id, 'runs', t)} keyboardType="numeric" />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>W</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={b.wickets} onChangeText={t => updateBowler(b.id, 'wickets', t)} keyboardType="numeric" />
                      </View>
                    </View>
                  </Card>
                </Swipeable>
              ))
            )}

            <Button title="Next: Review Match ➔" onPress={() => setActiveTab(4)} variant="secondary" style={{ marginTop: 12 }} />
          </View>
        )}

        {/* Tab 4: Review Tab */}
        {activeTab === 4 && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Review Match & Career Sync</Text>
            <Card style={styles.summaryCard}>
              <Text style={[styles.summaryTitle, { color: colors.text }]}>{matchInfo.teamName || 'Team 1'} vs {matchInfo.opponentTeam || 'Team 2'}</Text>
              <Text style={{ color: colors.textMuted }}>Date: {matchInfo.date} | Venue: {matchInfo.venueName || 'N/A'}</Text>
              <Text style={{ color: colors.textMuted }}>Result: {matchInfo.result || 'In progress'}</Text>
              {matchInfo.mvp ? (
                <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 4 }}>Player of Match: {matchInfo.mvp}</Text>
              ) : null}
              
              <View style={styles.divider} />
              
              <Text style={[styles.summarySubtitle, { color: colors.text }]}>Innings 1 ({matchInfo.teamName || 'Team 1'})</Text>
              <Text style={{ color: colors.textMuted }}>Batsmen: {batting.filter(b => b.name.trim()).length} players</Text>
              <Text style={{ color: colors.textMuted }}>Batting Runs: {batting.reduce((s, b) => s + (Number(b.runs) || 0), 0)} | Extras: {extrasA}</Text>
              <Text style={{ color: colors.text, fontWeight: '700', marginTop: 2 }}>
                Total Score: {batting.reduce((s, b) => s + (Number(b.runs) || 0), 0) + extrasA} runs
              </Text>
              
              {teamBBatting.length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={[styles.summarySubtitle, { color: colors.text }]}>Innings 2 ({matchInfo.opponentTeam || 'Team 2'})</Text>
                  <Text style={{ color: colors.textMuted }}>Batsmen: {teamBBatting.filter(b => b.name.trim()).length} players</Text>
                  <Text style={{ color: colors.textMuted }}>Batting Runs: {teamBBatting.reduce((s, b) => s + (Number(b.runs) || 0), 0)} | Extras: {extrasB}</Text>
                  <Text style={{ color: colors.text, fontWeight: '700', marginTop: 2 }}>
                    Total Score: {teamBBatting.reduce((s, b) => s + (Number(b.runs) || 0), 0) + extrasB} runs
                  </Text>
                </>
              )}

              <View style={styles.divider} />
              
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={[styles.summarySubtitle, { color: colors.text, marginBottom: 0 }]}>
                  🌟 Match Records & Milestones
                </Text>
                <View style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}>AI ANALYZED</Text>
                </View>
              </View>

              {/* Match Result & Margin Box */}
              <View style={[styles.milestoneCard, { backgroundColor: colors.surfaceLighter || '#252525', borderColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 20 }}>🏆</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>MATCH OUTCOME</Text>
                    <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '900', marginTop: 1 }}>
                      {matchInfo.result || 'Result pending'}
                    </Text>
                  </View>
                </View>

                {matchInfo.mvp ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Text style={{ fontSize: 18 }}>⭐</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>PLAYER OF THE MATCH</Text>
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 1 }}>{matchInfo.mvp}</Text>
                    </View>
                  </View>
                ) : null}
              </View>

              {/* Batting Milestones: 100s & 50s */}
              <View style={{ marginTop: 12 }}>
                <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Batting Highlights (100s & 50s)
                </Text>

                {computedMilestones.centuries.length > 0 && (
                  <View style={{ marginBottom: 6 }}>
                    {computedMilestones.centuries.map((c: any, i: number) => (
                      <View key={'cen_' + i} style={[styles.milestoneBadgeRow, { backgroundColor: '#ffd70018', borderColor: '#ffd70060' }]}>
                        <Text style={{ fontSize: 16 }}>💯</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#ffd700', fontWeight: '800', fontSize: 13 }}>
                            {c.name} - {c.runs} Runs {c.balls ? `(${c.balls}b)` : ''}
                          </Text>
                          <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                            {c.team ? `${c.team} • ` : ''}{c.fours || 0} Fours, {c.sixes || 0} Sixes
                          </Text>
                        </View>
                        <View style={[styles.pillBadge, { backgroundColor: '#ffd700' }]}>
                          <Text style={{ color: '#000', fontSize: 10, fontWeight: '900' }}>CENTURY</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {computedMilestones.fifties.length > 0 && (
                  <View style={{ marginBottom: 6 }}>
                    {computedMilestones.fifties.map((f: any, i: number) => (
                      <View key={'fif_' + i} style={[styles.milestoneBadgeRow, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '50' }]}>
                        <Text style={{ fontSize: 16 }}>🏏</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>
                            {f.name} - {f.runs} Runs {f.balls ? `(${f.balls}b)` : ''}
                          </Text>
                          <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                            {f.team ? `${f.team} • ` : ''}{f.fours || 0} Fours, {f.sixes || 0} Sixes
                          </Text>
                        </View>
                        <View style={[styles.pillBadge, { backgroundColor: colors.primary }]}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>FIFTY (50)</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {computedMilestones.centuries.length === 0 && computedMilestones.fifties.length === 0 && (
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontStyle: 'italic', marginBottom: 4 }}>
                    No 50s or 100s scored in this match.
                  </Text>
                )}
              </View>

              {/* Bowling Milestones: 3W+ Hauls */}
              <View style={{ marginTop: 10 }}>
                <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Bowling Highlights (3+ Wickets)
                </Text>

                {computedMilestones.topBowlers.length > 0 ? (
                  <View style={{ marginBottom: 6 }}>
                    {computedMilestones.topBowlers.map((bw: any, i: number) => (
                      <View key={'bw_' + i} style={[styles.milestoneBadgeRow, { backgroundColor: '#34c75918', borderColor: '#34c75950' }]}>
                        <Text style={{ fontSize: 16 }}>🎯</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#34c759', fontWeight: '800', fontSize: 13 }}>
                            {bw.name} - {bw.wickets} Wickets
                          </Text>
                          <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                            {bw.team ? `${bw.team} • ` : ''}{bw.runsConceded ?? bw.runs ?? 0} runs ({bw.overs} ov)
                          </Text>
                        </View>
                        <View style={[styles.pillBadge, { backgroundColor: '#34c759' }]}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>{bw.wickets}W HAUL</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontStyle: 'italic', marginBottom: 4 }}>
                    No 3+ wicket hauls recorded in this match.
                  </Text>
                )}
              </View>

              {/* Top Performers */}
              {(computedMilestones.bestBatter || computedMilestones.bestBowler) && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  {computedMilestones.bestBatter ? (
                    <View style={[styles.topPerformerBox, { backgroundColor: colors.surfaceLighter || '#252525', borderColor: colors.border }]}>
                      <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800' }}>⚡ TOP BATTER</Text>
                      <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>{computedMilestones.bestBatter}</Text>
                    </View>
                  ) : null}
                  {computedMilestones.bestBowler ? (
                    <View style={[styles.topPerformerBox, { backgroundColor: colors.surfaceLighter || '#252525', borderColor: colors.border }]}>
                      <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800' }}>⚡ TOP BOWLER</Text>
                      <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>{computedMilestones.bestBowler}</Text>
                    </View>
                  ) : null}
                </View>
              )}

              <View style={styles.divider} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                  Career Mode Sync:
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                  Both teams and all player career stats will update
                </Text>
              </View>
            </Card>

            <Button
              title={isSaving ? "Saving to Career Mode..." : "Save Match to Career Mode 🚀"}
              onPress={saveMatch}
              variant="primary"
              style={styles.saveBtn}
              disabled={isSaving}
            />
          </View>
        )}
      </ScrollView>

      {/* Missing Fields Modal - prompts ONLY for fields not found in the scorecard */}
      <Modal
        visible={missingFieldsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMissingFieldsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface || '#1e1e1e', borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  📝 Enter Missing Details
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Scorecard scanned! Only {missingFields.length} field{missingFields.length > 1 ? 's were' : ' was'} not found on the image:
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setMissingFieldsModalVisible(false)}
                style={styles.closeBtn}
              >
                <Text style={{ color: colors.textMuted, fontSize: 18, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380, marginVertical: 12 }}>
              {missingFields.map((field, idx) => (
                <View key={field.key} style={styles.missingFieldRow}>
                  <View style={styles.missingBadgeRow}>
                    <Text style={[styles.missingFieldBadge, { backgroundColor: colors.primary + '25', color: colors.primary }]}>
                      MISSING #{idx + 1}
                    </Text>
                    <Text style={[styles.missingFieldLabel, { color: colors.text }]}>
                      {field.label}
                    </Text>
                  </View>
                  <TextInput
                    style={[styles.missingInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.textMuted}
                    value={field.value}
                    onChangeText={(val) => handleUpdateMissingField(field.key, val)}
                    autoCapitalize={field.key === 'teamName' || field.key === 'opponentTeam' || field.key === 'venueName' ? 'words' : 'none'}
                    keyboardType={field.key === 'overs' ? 'numeric' : 'default'}
                  />
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.skipBtn, { borderColor: colors.border }]}
                onPress={() => {
                  setMissingFieldsModalVisible(false);
                  setActiveTab(1);
                }}
              >
                <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>Edit in Tabs</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleConfirmMissingFields}
              >
                <Text style={styles.confirmBtnText}>Save & Proceed to Review ➔</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  tabContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addText: {
    fontWeight: '700',
    fontSize: 15,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  rowCard: {
    padding: 16,
    marginBottom: 16,
  },
  deleteAction: {
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    height: '90%',
    borderRadius: 12,
    marginLeft: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
  summaryCard: {
    padding: 20,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  summarySubtitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 12,
  },
  saveBtn: {
    marginTop: 10,
  },
  ocrCard: {
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePlaceholder: {
    width: '100%',
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  pickerBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  previewContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePreview: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    marginBottom: 8,
  },
  repickBtn: {
    paddingVertical: 6,
  },
  confidenceBadge: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  skipToManual: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 6,
  },
  missingFieldRow: {
    marginBottom: 14,
  },
  missingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  missingFieldBadge: {
    fontSize: 10,
    fontWeight: '800',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    overflow: 'hidden',
  },
  missingFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  missingInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  skipBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  confirmBtn: {
    flex: 2,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  resultBanner: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    width: '100%',
  },
  milestoneCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
  },
  milestoneBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginBottom: 6,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  topPerformerBox: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
});
