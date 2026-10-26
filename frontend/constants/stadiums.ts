export interface StadiumItem {
  id: string;
  name: string;
  city: string;
  country: string;
  shortName: string;
  isPopular?: boolean;
  aliases?: string[];
}

export const POPULAR_STADIUM_CHIPS = [
  { shortName: 'Ahmedabad', fullName: 'Narendra Modi Stadium, Ahmedabad' },
  { shortName: 'Wankhede', fullName: 'Wankhede Stadium, Mumbai' },
  { shortName: 'MCG', fullName: 'Melbourne Cricket Ground (MCG), Melbourne' },
  { shortName: 'Dubai', fullName: 'Dubai International Cricket Stadium' },
  { shortName: 'Eden Gardens', fullName: 'Eden Gardens, Kolkata' },
  { shortName: 'Chinnaswamy', fullName: 'M. Chinnaswamy Stadium, Bengaluru' },
  { shortName: 'Chepauk', fullName: 'MA Chidambaram Stadium, Chennai' },
  { shortName: 'Melbourne', fullName: 'Melbourne Cricket Ground, Melbourne' },
  { shortName: "Lord's", fullName: "Lord's Cricket Ground, London" },
  { shortName: 'Sharjah', fullName: 'Sharjah Cricket Stadium' },
  { shortName: 'Ekana', fullName: 'BRSABV Ekana Stadium, Lucknow' },
  { shortName: 'Delhi', fullName: 'Arun Jaitley Stadium, Delhi' },
  { shortName: 'Dharamshala', fullName: 'HPCA Stadium, Dharamshala' },
  { shortName: 'Hyderabad', fullName: 'Rajiv Gandhi International Stadium, Hyderabad' },
];

export const FAMOUS_STADIUMS: StadiumItem[] = [
  // Top International & Famous
  {
    id: 'aus_mcg',
    name: 'Melbourne Cricket Ground (MCG)',
    city: 'Melbourne',
    country: 'Australia',
    shortName: 'MCG',
    isPopular: true,
    aliases: [
      'mcg',
      'melbourne',
      'melbourne cricket ground',
      'melbourne ground',
      'melboarne',
      'mabourne',
      'melborne',
      'melbourn',
      'melbourne stadium',
      'melboarne crciket ground',
      'mabourne crciket ground',
    ],
  },
  {
    id: 'aus_mcg_plain',
    name: 'Melbourne Cricket Ground',
    city: 'Melbourne',
    country: 'Australia',
    shortName: 'MCG',
    isPopular: true,
    aliases: ['mcg', 'melbourne', 'melbourne cricket ground', 'melboarne', 'mabourne', 'melborne'],
  },

  // India
  { id: 'ind_ahmedabad', name: 'Narendra Modi Stadium', city: 'Ahmedabad', country: 'India', shortName: 'Ahmedabad', isPopular: true, aliases: ['motera', 'ahmedabad'] },
  { id: 'ind_wankhede', name: 'Wankhede Stadium', city: 'Mumbai', country: 'India', shortName: 'Wankhede', isPopular: true, aliases: ['mumbai', 'wankhede'] },
  { id: 'ind_eden', name: 'Eden Gardens', city: 'Kolkata', country: 'India', shortName: 'Eden Gardens', isPopular: true, aliases: ['kolkata', 'eden'] },
  { id: 'ind_chinnaswamy', name: 'M. Chinnaswamy Stadium', city: 'Bengaluru', country: 'India', shortName: 'Chinnaswamy', isPopular: true, aliases: ['bangalore', 'bengaluru', 'chinnaswamy'] },
  { id: 'ind_chepauk', name: 'MA Chidambaram Stadium (Chepauk)', city: 'Chennai', country: 'India', shortName: 'Chepauk', isPopular: true, aliases: ['chennai', 'chepauk'] },
  { id: 'ind_delhi', name: 'Arun Jaitley Stadium', city: 'Delhi', country: 'India', shortName: 'Arun Jaitley', isPopular: true, aliases: ['feroz shah kotla', 'delhi'] },
  { id: 'ind_hyderabad', name: 'Rajiv Gandhi International Cricket Stadium', city: 'Hyderabad', country: 'India', shortName: 'Hyderabad', isPopular: true, aliases: ['hyderabad', 'uppal'] },
  { id: 'ind_ekana', name: 'BRSABV Ekana Cricket Stadium', city: 'Lucknow', country: 'India', shortName: 'Ekana', isPopular: true, aliases: ['lucknow', 'ekana'] },
  { id: 'ind_dharamshala', name: 'HPCA Stadium', city: 'Dharamshala', country: 'India', shortName: 'Dharamshala', isPopular: true, aliases: ['dharamshala', 'hpca'] },
  { id: 'ind_mohali', name: 'PCA Stadium', city: 'Mohali', country: 'India', shortName: 'Mohali', aliases: ['mohali', 'pca'] },
  { id: 'ind_indore', name: 'Holkar Cricket Stadium', city: 'Indore', country: 'India', shortName: 'Holkar', aliases: ['indore', 'holkar'] },
  { id: 'ind_jaipur', name: 'Sawai Mansingh Stadium', city: 'Jaipur', country: 'India', shortName: 'Jaipur', aliases: ['jaipur', 'sms'] },
  { id: 'ind_ranchi', name: 'JSCA International Stadium Complex', city: 'Ranchi', country: 'India', shortName: 'JSCA Ranchi', aliases: ['ranchi', 'jsca'] },
  { id: 'ind_guwahati', name: 'Barsapara Cricket Stadium', city: 'Guwahati', country: 'India', shortName: 'Barsapara', aliases: ['guwahati', 'barsapara'] },
  { id: 'ind_vizag', name: 'Dr. Y.S. Rajasekhara Reddy ACA-VDCA Stadium', city: 'Visakhapatnam', country: 'India', shortName: 'Vizag', aliases: ['vizag', 'visakhapatnam'] },
  { id: 'ind_rajkot', name: 'Saurashtra Cricket Association Stadium', city: 'Rajkot', country: 'India', shortName: 'Rajkot', aliases: ['rajkot', 'sca'] },
  { id: 'ind_brabourne', name: 'Brabourne Stadium', city: 'Mumbai', country: 'India', shortName: 'Brabourne', aliases: ['brabourne', 'cci'] },
  { id: 'ind_dypatil', name: 'DY Patil Stadium', city: 'Navi Mumbai', country: 'India', shortName: 'DY Patil', aliases: ['dy patil', 'navi mumbai'] },
  { id: 'ind_trivandrum', name: 'Greenfield International Stadium', city: 'Thiruvananthapuram', country: 'India', shortName: 'Greenfield', aliases: ['trivandrum', 'greenfield'] },
  { id: 'ind_cuttack', name: 'Barabati Stadium', city: 'Cuttack', country: 'India', shortName: 'Barabati', aliases: ['cuttack', 'barabati'] },

  // UAE / Middle East
  { id: 'uae_dubai', name: 'Dubai International Cricket Stadium', city: 'Dubai', country: 'UAE', shortName: 'Dubai', isPopular: true, aliases: ['dubai', 'ring of fire'] },
  { id: 'uae_sharjah', name: 'Sharjah Cricket Stadium', city: 'Sharjah', country: 'UAE', shortName: 'Sharjah', isPopular: true, aliases: ['sharjah'] },
  { id: 'uae_abudhabi', name: 'Sheikh Zayed Cricket Stadium', city: 'Abu Dhabi', country: 'UAE', shortName: 'Abu Dhabi', aliases: ['abu dhabi', 'zayed'] },

  // International
  { id: 'eng_lords', name: "Lord's Cricket Ground", city: 'London', country: 'England', shortName: "Lord's", isPopular: true, aliases: ["lord's", 'lords', 'london'] },
  { id: 'eng_oval', name: 'The Oval', city: 'London', country: 'England', shortName: 'The Oval', aliases: ['the oval', 'oval', 'kennington'] },
  { id: 'eng_edgbaston', name: 'Edgbaston', city: 'Birmingham', country: 'England', shortName: 'Edgbaston', aliases: ['edgbaston', 'birmingham'] },
  { id: 'aus_scg', name: 'Sydney Cricket Ground (SCG)', city: 'Sydney', country: 'Australia', shortName: 'SCG', aliases: ['scg', 'sydney'] },
  { id: 'aus_adelaide', name: 'Adelaide Oval', city: 'Adelaide', country: 'Australia', shortName: 'Adelaide Oval', aliases: ['adelaide', 'adelaide oval'] },
  { id: 'aus_perth', name: 'Optus Stadium (Perth)', city: 'Perth', country: 'Australia', shortName: 'Perth', aliases: ['perth', 'optus', 'waca'] },
  { id: 'aus_gabba', name: 'The Gabba', city: 'Brisbane', country: 'Australia', shortName: 'Gabba', aliases: ['gabba', 'brisbane'] },
  { id: 'nz_edenpark', name: 'Eden Park', city: 'Auckland', country: 'New Zealand', shortName: 'Eden Park', aliases: ['eden park', 'auckland'] },
  { id: 'sl_premadasa', name: 'R. Premadasa Stadium', city: 'Colombo', country: 'Sri Lanka', shortName: 'Premadasa', aliases: ['premadasa', 'colombo', 'rps'] },
  { id: 'sa_wanderers', name: 'Wanderers Stadium', city: 'Johannesburg', country: 'South Africa', shortName: 'Wanderers', aliases: ['wanderers', 'bullring', 'johannesburg'] },
  { id: 'sa_newlands', name: 'Newlands', city: 'Cape Town', country: 'South Africa', shortName: 'Newlands', aliases: ['newlands', 'cape town'] },
  { id: 'wi_kensington', name: 'Kensington Oval', city: 'Bridgetown', country: 'Barbados', shortName: 'Kensington Oval', aliases: ['kensington', 'barbados'] },
];

/**
 * Filter stadiums by query string (checks name, city, shortName, country, and aliases)
 */
export function searchStadiums(query: string, customVenues: string[] = []): Array<{ name: string; subtitle: string; isCustom?: boolean }> {
  const trimmed = (query || '').trim().toLowerCase();
  
  // Clean query of noise words to handle phrases like "melboarne crciket ground"
  const cleanedQuery = trimmed
    .replace(/\b(crciket|cricket|ground|stadium|oval)\b/g, '')
    .trim();

  const results: Array<{ name: string; subtitle: string; isCustom?: boolean }> = [];
  const seen = new Set<string>();

  // 1. Check user custom venues first
  for (const cv of customVenues) {
    if (!cv) continue;
    const key = cv.toLowerCase();
    const matchesQuery = !trimmed || key.includes(trimmed) || (cleanedQuery && key.includes(cleanedQuery));
    if (!seen.has(key) && matchesQuery) {
      seen.add(key);
      results.push({
        name: cv,
        subtitle: '⭐ Your Recent Venue',
        isCustom: true,
      });
    }
  }

  // 2. Check famous stadiums
  for (const s of FAMOUS_STADIUMS) {
    const fullDisplayName = `${s.name}, ${s.city}`;
    const key = fullDisplayName.toLowerCase();
    const shortKey = s.name.toLowerCase();

    const matchesDirect =
      !trimmed ||
      s.name.toLowerCase().includes(trimmed) ||
      s.city.toLowerCase().includes(trimmed) ||
      s.shortName.toLowerCase().includes(trimmed) ||
      s.country.toLowerCase().includes(trimmed);

    const matchesCleaned =
      Boolean(cleanedQuery) &&
      (s.name.toLowerCase().includes(cleanedQuery) ||
        s.city.toLowerCase().includes(cleanedQuery) ||
        s.shortName.toLowerCase().includes(cleanedQuery));

    const matchesAlias =
      s.aliases &&
      s.aliases.some(
        (alias) =>
          (trimmed && alias.toLowerCase().includes(trimmed)) ||
          (trimmed && trimmed.includes(alias.toLowerCase())) ||
          (cleanedQuery && alias.toLowerCase().includes(cleanedQuery)) ||
          (cleanedQuery && cleanedQuery.includes(alias.toLowerCase()))
      );

    if (!seen.has(key) && !seen.has(shortKey) && (matchesDirect || matchesCleaned || matchesAlias)) {
      seen.add(key);
      results.push({
        name: `${s.name}, ${s.city}`,
        subtitle: `${s.city}, ${s.country}`,
        isCustom: false,
      });
    }
  }

  return results.slice(0, 15);
}
