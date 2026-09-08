export class ExportHelper {
  public static exportMatchToCsv(match: any, playerStats: any[]): string {
    let csv = 'CRICSTATS PRO MATCH SCORECARD EXPORT\n';
    csv += `Match,${match.teamA?.name} vs ${match.teamB?.name}\n`;
    csv += `Date,${new Date(match.date).toLocaleDateString()}\n`;
    csv += `Venue,${match.venueId?.name || 'N/A'}\n`;
    csv += `Overs,${match.overs}\n`;
    csv += `Result,${match.result}\n\n`;

    const teamAId = (match.teamA?._id || match.teamA)?.toString();
    const teamBId = (match.teamB?._id || match.teamB)?.toString();

    // Team A Batting
    csv += `${match.teamA?.name} Batting Scorecard\n`;
    csv += 'Batsman,Runs,Balls,4s,6s,Status\n';
    const teamABat = playerStats.filter(s => s.teamId?.toString() === teamAId && !s.batting?.didNotBat);
    for (const row of teamABat) {
      csv += `"${row.playerId?.name}",${row.batting?.runs},${row.batting?.balls},${row.batting?.fours},${row.batting?.sixes},${row.batting?.outStatus}\n`;
    }
    csv += '\n';

    // Team B Bowling (Bowling against Team A)
    csv += `${match.teamB?.name} Bowling Scorecard\n`;
    csv += 'Bowler,Overs,Maidens,Runs Conceded,Wickets\n';
    const teamBBowl = playerStats.filter(s => s.teamId?.toString() === teamBId && !s.bowling?.didNotBowl);
    for (const row of teamBBowl) {
      csv += `"${row.playerId?.name}",${row.bowling?.overs},${row.bowling?.maidens},${row.bowling?.runsConceded},${row.bowling?.wickets}\n`;
    }
    csv += '\n';

    // Team B Batting
    csv += `${match.teamB?.name} Batting Scorecard\n`;
    csv += 'Batsman,Runs,Balls,4s,6s,Status\n';
    const teamBBat = playerStats.filter(s => s.teamId?.toString() === teamBId && !s.batting?.didNotBat);
    for (const row of teamBBat) {
      csv += `"${row.playerId?.name}",${row.batting?.runs},${row.batting?.balls},${row.batting?.fours},${row.batting?.sixes},${row.batting?.outStatus}\n`;
    }
    csv += '\n';

    // Team A Bowling (Bowling against Team B)
    csv += `${match.teamA?.name} Bowling Scorecard\n`;
    csv += 'Bowler,Overs,Maidens,Runs Conceded,Wickets\n';
    const teamABowl = playerStats.filter(s => s.teamId?.toString() === teamAId && !s.bowling?.didNotBowl);
    for (const row of teamABowl) {
      csv += `"${row.playerId?.name}",${row.bowling?.overs},${row.bowling?.maidens},${row.bowling?.runsConceded},${row.bowling?.wickets}\n`;
    }

    return csv;
  }

  public static exportMatchToHtml(match: any, playerStats: any[]): string {
    const teamAId = (match.teamA?._id || match.teamA)?.toString();
    const teamBId = (match.teamB?._id || match.teamB)?.toString();

    const teamABat = playerStats.filter(s => s.teamId?.toString() === teamAId && !s.batting?.didNotBat);
    const teamBBowl = playerStats.filter(s => s.teamId?.toString() === teamBId && !s.bowling?.didNotBowl);
    const teamBBat = playerStats.filter(s => s.teamId?.toString() === teamBId && !s.batting?.didNotBat);
    const teamABowl = playerStats.filter(s => s.teamId?.toString() === teamAId && !s.bowling?.didNotBowl);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${match.teamA?.name} vs ${match.teamB?.name} Scorecard</title>
        <style>
          body { font-family: sans-serif; background: #121212; color: #ffffff; padding: 20px; }
          .container { max-width: 800px; margin: 0 auto; background: #1e1e1e; padding: 24px; border-radius: 12px; border: 1px solid #333; }
          h1 { margin-bottom: 4px; color: #00ff88; }
          h2 { border-bottom: 2px solid #333; padding-bottom: 8px; margin-top: 24px; color: #00ff88; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #2a2a2a; }
          th { background: #252525; color: #888; text-transform: uppercase; font-size: 11px; }
          .highlight { font-weight: bold; color: #00ff88; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${match.teamA?.name} vs ${match.teamB?.name}</h1>
          <p>Date: ${new Date(match.date).toLocaleDateString()} | Venue: ${match.venueId?.name || 'N/A'}</p>
          <p>Overs Limit: ${match.overs} | Result: <span class="highlight">${match.result}</span></p>

          <h2>${match.teamA?.name} Batting</h2>
          <table>
            <thead>
              <tr>
                <th>Batsman</th>
                <th>Runs</th>
                <th>Balls</th>
                <th>4s</th>
                <th>6s</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${teamABat.map(r => `
                <tr>
                  <td>${r.playerId?.name}</td>
                  <td class="highlight">${r.batting?.runs}</td>
                  <td>${r.batting?.balls}</td>
                  <td>${r.batting?.fours}</td>
                  <td>${r.batting?.sixes}</td>
                  <td>${r.batting?.outStatus}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h2>${match.teamB?.name} Bowling</h2>
          <table>
            <thead>
              <tr>
                <th>Bowler</th>
                <th>Overs</th>
                <th>Maidens</th>
                <th>Runs Conceded</th>
                <th>Wickets</th>
              </tr>
            </thead>
            <tbody>
              ${teamBBowl.map(r => `
                <tr>
                  <td>${r.playerId?.name}</td>
                  <td>${r.bowling?.overs}</td>
                  <td>${r.bowling?.maidens}</td>
                  <td>${r.bowling?.runsConceded}</td>
                  <td class="highlight">${r.bowling?.wickets}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h2>${match.teamB?.name} Batting</h2>
          <table>
            <thead>
              <tr>
                <th>Batsman</th>
                <th>Runs</th>
                <th>Balls</th>
                <th>4s</th>
                <th>6s</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${teamBBat.map(r => `
                <tr>
                  <td>${r.playerId?.name}</td>
                  <td class="highlight">${r.batting?.runs}</td>
                  <td>${r.batting?.balls}</td>
                  <td>${r.batting?.fours}</td>
                  <td>${r.batting?.sixes}</td>
                  <td>${r.batting?.outStatus}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h2>${match.teamA?.name} Bowling</h2>
          <table>
            <thead>
              <tr>
                <th>Bowler</th>
                <th>Overs</th>
                <th>Maidens</th>
                <th>Runs Conceded</th>
                <th>Wickets</th>
              </tr>
            </thead>
            <tbody>
              ${teamABowl.map(r => `
                <tr>
                  <td>${r.playerId?.name}</td>
                  <td>${r.bowling?.overs}</td>
                  <td>${r.bowling?.maidens}</td>
                  <td>${r.bowling?.runsConceded}</td>
                  <td class="highlight">${r.bowling?.wickets}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;
  }
}
export default ExportHelper;
