export interface StadiumItem {
  id: string;
  name: string;
  city: string;
  country: string;
  shortName: string;
  isPopular?: boolean;
}

export const POPULAR_STADIUM_CHIPS = [
  { shortName: 'Ahmedabad', fullName: 'Narendra Modi Stadium, Ahmedabad' },
  { shortName: 'Wankhede', fullName: 'Wankhede Stadium, Mumbai' },
  { shortName: 'Dubai', fullName: 'Dubai International Cricket Stadium' },
  { shortName: 'Eden Gardens', fullName: 'Eden Gardens, Kolkata' },
  { shortName: 'Chinnaswamy', fullName: 'M. Chinnaswamy Stadium, Bengaluru' },
  { shortName: 'Chepauk', fullName: 'MA Chidambaram Stadium, Chennai' },
  { shortName: 'Sharjah', fullName: 'Sharjah Cricket Stadium' },
  { shortName: 'Ekana', fullName: 'BRSABV Ekana Stadium, Lucknow' },
  { shortName: 'Delhi', fullName: 'Arun Jaitley Stadium, Delhi' },
  { shortName: 'Dharamshala', fullName: 'HPCA Stadium, Dharamshala' },
  { shortName: 'Hyderabad', fullName: 'Rajiv Gandhi International Stadium, Hyderabad' },
];

export const FAMOUS_STADIUMS: StadiumItem[] = [
  // India
  { id: 'ind_ahmedabad', name: 'Narendra Modi Stadium', city: 'Ahmedabad', country: 'India', shortName: 'Ahmedabad', isPopular: true },
  { id: 'ind_wankhede', name: 'Wankhede Stadium', city: 'Mumbai', country: 'India', shortName: 'Wankhede', isPopular: true },
  { id: 'ind_eden', name: 'Eden Gardens', city: 'Kolkata', country: 'India', shortName: 'Eden Gardens', isPopular: true },
  { id: 'ind_chinnaswamy', name: 'M. Chinnaswamy Stadium', city: 'Bengaluru', country: 'India', shortName: 'Chinnaswamy', isPopular: true },
  { id: 'ind_chepauk', name: 'MA Chidambaram Stadium (Chepauk)', city: 'Chennai', country: 'India', shortName: 'Chepauk', isPopular: true },
  { id: 'ind_delhi', name: 'Arun Jaitley Stadium', city: 'Delhi', country: 'India', shortName: 'Arun Jaitley', isPopular: true },
  { id: 'ind_hyderabad', name: 'Rajiv Gandhi International Cricket Stadium', city: 'Hyderabad', country: 'India', shortName: 'Hyderabad', isPopular: true },
  { id: 'ind_ekana', name: 'BRSABV Ekana Cricket Stadium', city: 'Lucknow', country: 'India', shortName: 'Ekana', isPopular: true },
  { id: 'ind_dharamshala', name: 'HPCA Stadium', city: 'Dharamshala', country: 'India', shortName: 'Dharamshala', isPopular: true },
  { id: 'ind_mohali', name: 'PCA Stadium', city: 'Mohali', country: 'India', shortName: 'Mohali' },
  { id: 'ind_indore', name: 'Holkar Cricket Stadium', city: 'Indore', country: 'India', shortName: 'Holkar' },
  { id: 'ind_jaipur', name: 'Sawai Mansingh Stadium', city: 'Jaipur', country: 'India', shortName: 'Jaipur' },
  { id: 'ind_ranchi', name: 'JSCA International Stadium Complex', city: 'Ranchi', country: 'India', shortName: 'JSCA Ranchi' },
  { id: 'ind_guwahati', name: 'Barsapara Cricket Stadium', city: 'Guwahati', country: 'India', shortName: 'Barsapara' },
  { id: 'ind_vizag', name: 'Dr. Y.S. Rajasekhara Reddy ACA-VDCA Stadium', city: 'Visakhapatnam', country: 'India', shortName: 'Vizag' },
  { id: 'ind_rajkot', name: 'Saurashtra Cricket Association Stadium', city: 'Rajkot', country: 'India', shortName: 'Rajkot' },
  { id: 'ind_brabourne', name: 'Brabourne Stadium', city: 'Mumbai', country: 'India', shortName: 'Brabourne' },
  { id: 'ind_dypatil', name: 'DY Patil Stadium', city: 'Navi Mumbai', country: 'India', shortName: 'DY Patil' },
  { id: 'ind_trivandrum', name: 'Greenfield International Stadium', city: 'Thiruvananthapuram', country: 'India', shortName: 'Greenfield' },
  { id: 'ind_cuttack', name: 'Barabati Stadium', city: 'Cuttack', country: 'India', shortName: 'Barabati' },

  // UAE / Middle East
  { id: 'uae_dubai', name: 'Dubai International Cricket Stadium', city: 'Dubai', country: 'UAE', shortName: 'Dubai', isPopular: true },
  { id: 'uae_sharjah', name: 'Sharjah Cricket Stadium', city: 'Sharjah', country: 'UAE', shortName: 'Sharjah', isPopular: true },
  { id: 'uae_abudhabi', name: 'Sheikh Zayed Cricket Stadium', city: 'Abu Dhabi', country: 'UAE', shortName: 'Abu Dhabi' },

  // International
  { id: 'eng_lords', name: "Lord's Cricket Ground", city: 'London', country: 'England', shortName: "Lord's", isPopular: true },
  { id: 'eng_oval', name: 'The Oval', city: 'London', country: 'England', shortName: 'The Oval' },
  { id: 'eng_edgbaston', name: 'Edgbaston', city: 'Birmingham', country: 'England', shortName: 'Edgbaston' },
  { id: 'aus_mcg', name: 'Melbourne Cricket Ground (MCG)', city: 'Melbourne', country: 'Australia', shortName: 'MCG', isPopular: true },
  { id: 'aus_scg', name: 'Sydney Cricket Ground (SCG)', city: 'Sydney', country: 'Australia', shortName: 'SCG' },
  { id: 'aus_adelaide', name: 'Adelaide Oval', city: 'Adelaide', country: 'Australia', shortName: 'Adelaide Oval' },
  { id: 'aus_perth', name: 'Optus Stadium (Perth)', city: 'Perth', country: 'Australia', shortName: 'Perth' },
  { id: 'aus_gabba', name: 'The Gabba', city: 'Brisbane', country: 'Australia', shortName: 'Gabba' },
  { id: 'nz_edenpark', name: 'Eden Park', city: 'Auckland', country: 'New Zealand', shortName: 'Eden Park' },
  { id: 'sl_premadasa', name: 'R. Premadasa Stadium', city: 'Colombo', country: 'Sri Lanka', shortName: 'Premadasa' },
  { id: 'sa_wanderers', name: 'Wanderers Stadium', city: 'Johannesburg', country: 'South Africa', shortName: 'Wanderers' },
  { id: 'sa_newlands', name: 'Newlands', city: 'Cape Town', country: 'South Africa', shortName: 'Newlands' },
  { id: 'wi_kensington', name: 'Kensington Oval', city: 'Bridgetown', country: 'Barbados', shortName: 'Kensington Oval' },
];

/**
 * Filter stadiums by query string (checks name, city, shortName, country)
 */
export function searchStadiums(query: string, customVenues: string[] = []): Array<{ name: string; subtitle: string; isCustom?: boolean }> {
  const trimmed = (query || '').trim().toLowerCase();
  
  const results: Array<{ name: string; subtitle: string; isCustom?: boolean }> = [];
  const seen = new Set<string>();

  // 1. Check user custom venues first
  for (const cv of customVenues) {
    if (!cv) continue;
    const key = cv.toLowerCase();
    if (!seen.has(key) && (!trimmed || key.includes(trimmed))) {
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

    if (
      !seen.has(key) &&
      !seen.has(shortKey) &&
      (!trimmed ||
        s.name.toLowerCase().includes(trimmed) ||
        s.city.toLowerCase().includes(trimmed) ||
        s.shortName.toLowerCase().includes(trimmed) ||
        s.country.toLowerCase().includes(trimmed))
    ) {
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
