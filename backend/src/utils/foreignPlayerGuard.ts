/**
 * Strict Foreign Player Guard Utility
 * Prevents non-Indian / opponent players from ever being created or assigned to Team India stats.
 */

export const KNOWN_FOREIGN_PLAYERS: string[] = [
  // --- Australia WCC2 / Game Names & Abbreviations ---
  'd bull', 's smudge', 'm bison', 'c greeny', 'm show', 'p cummo',
  'm wadey', 'm starcy', 'j hoff', 'a zamps', 't ashford',
  'd warner', 's smith', 'm marsh', 'c green', 'g maxwell',
  'p cummins', 'm wade', 'm starc', 'j hazlewood', 'a zampa',
  't head', 'm labuschagne', 'm stoinis', 'j inglis', 't david', 'a carey',
  'n ellis', 's abbott', 'x bartlett', 'j fraser-mcgurk', 'm swepson',
  'david warner', 'steve smith', 'mitchell marsh', 'cameron green',
  'glenn maxwell', 'pat cummins', 'matthew wade', 'mitchell starc',
  'josh hazlewood', 'adam zampa', 'travis head', 'marnus labuschagne',
  'marcus stoinis', 'josh inglis', 'tim david', 'alex carey',

  // --- Pakistan ---
  'b azam', 'm rizwan', 's afridi', 'n shah', 'h rauf', 'f zaman',
  's khan', 'i ahmed', 'a ali', 'm amir', 'i wasim',
  'babar azam', 'mohammad rizwan', 'shaheen afridi', 'naseem shah',
  'haris rauf', 'fakhar zaman', 'shadab khan', 'iftikhar ahmed',

  // --- England ---
  'j buttler', 'j root', 'b stokes', 'j bairstow', 'h brook', 'j archer',
  'm wood', 'l livingstone', 's curran', 'c woakes', 'a rashid', 'm ali',
  'jos buttler', 'joe root', 'ben stokes', 'jonny bairstow', 'harry brook',
  'jofra archer', 'mark wood', 'liam livingstone', 'sam curran', 'adil rashid',

  // --- South Africa ---
  'q de kock', 'k rabada', 'h klaasen', 'd miller', 'a markram', 'a nortje',
  'k maharaj', 'l ngidi', 'm jansen', 't bavuma', 't shamsi',
  'quinton de kock', 'kagiso rabada', 'heinrich klaasen', 'david miller',
  'aiden markram', 'anrich nortje', 'keshav maharaj', 'marco jansen',

  // --- New Zealand ---
  'k williamson', 't boult', 't southee', 'd conway', 'd mitchell',
  'g phillips', 'm santner', 'l ferguson', 'r ravindra', 'm chapman',
  'kane williamson', 'trent boult', 'tim southee', 'devon conway',
  'daryl mitchell', 'glenn phillips', 'mitchell santner', 'rachin ravindra',

  // --- West Indies ---
  'n pooran', 'a russell', 's hetmyer', 's hope', 'r powell', 'a joseph',
  'a hosein', 'b king', 'k mayers', 'r shepherd',
  'nicholas pooran', 'andre russell', 'shimron hetmyer', 'shai hope', 'rovman powell',

  // --- Sri Lanka & Afghanistan ---
  'w hasaranga', 'm theekshana', 'c asalanka', 'k mendis', 'p nissanka',
  'r khan', 'm nabi', 'f farooqi', 'r gurbaz', 'n zadran',
  'rashid khan', 'mohammad nabi', 'wanindu hasaranga', 'fazalhaq farooqi'
];

const FOREIGN_SET = new Set(KNOWN_FOREIGN_PLAYERS.map(n => n.toLowerCase().trim()));

/**
 * Returns true if the player name matches a known non-Indian / foreign player.
 */
export function isKnownForeignPlayer(rawName: string): boolean {
  if (!rawName || typeof rawName !== 'string') return false;
  const clean = rawName.trim().toLowerCase().replace(/[.]/g, '');
  if (FOREIGN_SET.has(clean)) return true;

  // Partial / Substring checks against exact word boundaries
  for (const f of KNOWN_FOREIGN_PLAYERS) {
    const cleanF = f.replace(/[.]/g, '');
    if (clean === cleanF) return true;
    // e.g. "C Greeny" or "D Bull"
    if (clean.length >= 4 && cleanF.length >= 4 && (clean.startsWith(cleanF) || cleanF.startsWith(clean))) {
      return true;
    }
  }

  return false;
}
