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

  public static exportBulkMatchesToCsv(matchesData: Array<{ match: any; playerStats: any[] }>): string {
    let csv = `CRICSTATS PRO - BULK MATCHES EXPORT (${matchesData.length} MATCHES)\n`;
    csv += `Export Date,${new Date().toLocaleDateString()}\n\n`;

    matchesData.forEach((item, index) => {
      csv += `====================================================\n`;
      csv += `MATCH ${index + 1}: ${item.match.teamA?.name} vs ${item.match.teamB?.name}\n`;
      csv += `====================================================\n`;
      csv += ExportHelper.exportMatchToCsv(item.match, item.playerStats);
      csv += `\n\n`;
    });

    return csv;
  }

  public static exportBulkMatchesToHtml(matchesData: Array<{ match: any; playerStats: any[] }>): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>CricStats Pro - Bulk Matches Report</title>
        <style>
          @media print {
            .match-container { page-break-after: always; }
          }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; margin: 0; }
          .header-banner { max-width: 900px; margin: 0 auto 24px; background: #1e293b; padding: 20px 24px; border-radius: 12px; border: 1px solid #334155; }
          .header-banner h1 { margin: 0 0 6px; color: #38bdf8; font-size: 24px; }
          .header-banner p { margin: 0; color: #94a3b8; font-size: 13px; }
          .match-container { max-width: 900px; margin: 0 auto 28px; background: #1e293b; padding: 24px; border-radius: 12px; border: 1px solid #334155; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); }
          .match-header { border-bottom: 2px solid #334155; padding-bottom: 14px; margin-bottom: 18px; }
          .match-title { font-size: 20px; font-weight: 800; color: #f8fafc; margin: 0 0 6px; }
          .match-meta { font-size: 12px; color: #94a3b8; margin: 0 0 10px; }
          .scores-bar { display: flex; justify-content: space-between; align-items: center; background: #0f172a; padding: 12px 16px; border-radius: 8px; font-weight: 700; font-size: 15px; }
          .scores-team { color: #38bdf8; }
          .result-badge { background: #065f46; color: #34d399; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
          h3 { margin: 20px 0 10px; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
          th { background: #0f172a; color: #94a3b8; text-transform: uppercase; font-size: 11px; padding: 8px 10px; text-align: left; }
          td { padding: 9px 10px; border-bottom: 1px solid #334155; }
          tr:nth-child(even) { background: rgba(255,255,255,0.02); }
          .highlight { font-weight: 700; color: #38bdf8; }
          .num { text-align: right; }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <h1>🏏 CricStats Pro - Match Scorecard Report</h1>
          <p>Exported ${matchesData.length} Matches • Generated on ${new Date().toLocaleDateString(undefined, { dateStyle: 'full' })}</p>
        </div>
        ${matchesData.map((item, idx) => {
          const { match, playerStats } = item;
          const teamAId = (match.teamA?._id || match.teamA)?.toString();
          const teamBId = (match.teamB?._id || match.teamB)?.toString();

          const teamABat = (playerStats || []).filter(s => s.teamId?.toString() === teamAId && !s.batting?.didNotBat);
          const teamBBowl = (playerStats || []).filter(s => s.teamId?.toString() === teamBId && !s.bowling?.didNotBowl);
          const teamBBat = (playerStats || []).filter(s => s.teamId?.toString() === teamBId && !s.batting?.didNotBat);
          const teamABowl = (playerStats || []).filter(s => s.teamId?.toString() === teamAId && !s.bowling?.didNotBowl);

          return `
            <div class="match-container">
              <div class="match-header">
                <div class="match-title">Match ${idx + 1}: ${match.teamA?.name} vs ${match.teamB?.name}</div>
                <div class="match-meta">Date: ${match.date ? new Date(match.date).toLocaleDateString() : 'N/A'} | Venue: ${match.venueId?.name || match.venueName || 'N/A'} | Overs: ${match.overs}</div>
                <div class="scores-bar">
                  <div>
                    <span class="scores-team">${match.teamA?.name}:</span> ${match.teamAScore?.runs ?? '-'}/${match.teamAScore?.wickets ?? '-'} (${match.teamAScore?.overs ?? '-'} ov)
                    &nbsp;&nbsp;vs&nbsp;&nbsp;
                    <span class="scores-team">${match.teamB?.name}:</span> ${match.teamBScore?.runs ?? '-'}/${match.teamBScore?.wickets ?? '-'} (${match.teamBScore?.overs ?? '-'} ov)
                  </div>
                  <div class="result-badge">${match.result || 'Match Completed'}</div>
                </div>
              </div>

              <h3>${match.teamA?.name} Batting</h3>
              <table>
                <thead>
                  <tr>
                    <th>Batsman</th><th>Dismissal</th><th class="num">Runs</th><th class="num">Balls</th><th class="num">4s</th><th class="num">6s</th><th class="num">SR</th>
                  </tr>
                </thead>
                <tbody>
                  ${teamABat.map(r => `
                    <tr>
                      <td class="highlight">${r.playerName || r.playerId?.name}</td>
                      <td>${(r.batting?.outStatus || 'not out').replace(/_/g, ' ')}</td>
                      <td class="num highlight">${r.batting?.runs ?? 0}</td>
                      <td class="num">${r.batting?.balls ?? 0}</td>
                      <td class="num">${r.batting?.fours ?? 0}</td>
                      <td class="num">${r.batting?.sixes ?? 0}</td>
                      <td class="num">${r.batting?.balls > 0 ? ((r.batting.runs / r.batting.balls) * 100).toFixed(1) : '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <h3>${match.teamB?.name} Bowling</h3>
              <table>
                <thead>
                  <tr>
                    <th>Bowler</th><th class="num">Overs</th><th class="num">Maidens</th><th class="num">Runs</th><th class="num">Wickets</th><th class="num">Econ</th>
                  </tr>
                </thead>
                <tbody>
                  ${teamBBowl.map(r => `
                    <tr>
                      <td class="highlight">${r.playerName || r.playerId?.name}</td>
                      <td class="num">${r.bowling?.overs ?? 0}</td>
                      <td class="num">${r.bowling?.maidens ?? 0}</td>
                      <td class="num">${r.bowling?.runsConceded ?? r.bowling?.runs ?? 0}</td>
                      <td class="num highlight" style="color: #34d399;">${r.bowling?.wickets ?? 0}</td>
                      <td class="num">${r.bowling?.overs > 0 ? ((r.bowling.runsConceded ?? r.bowling.runs ?? 0) / r.bowling.overs).toFixed(2) : '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <h3>${match.teamB?.name} Batting</h3>
              <table>
                <thead>
                  <tr>
                    <th>Batsman</th><th>Dismissal</th><th class="num">Runs</th><th class="num">Balls</th><th class="num">4s</th><th class="num">6s</th><th class="num">SR</th>
                  </tr>
                </thead>
                <tbody>
                  ${teamBBat.map(r => `
                    <tr>
                      <td class="highlight">${r.playerName || r.playerId?.name}</td>
                      <td>${(r.batting?.outStatus || 'not out').replace(/_/g, ' ')}</td>
                      <td class="num highlight">${r.batting?.runs ?? 0}</td>
                      <td class="num">${r.batting?.balls ?? 0}</td>
                      <td class="num">${r.batting?.fours ?? 0}</td>
                      <td class="num">${r.batting?.sixes ?? 0}</td>
                      <td class="num">${r.batting?.balls > 0 ? ((r.batting.runs / r.batting.balls) * 100).toFixed(1) : '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <h3>${match.teamA?.name} Bowling</h3>
              <table>
                <thead>
                  <tr>
                    <th>Bowler</th><th class="num">Overs</th><th class="num">Maidens</th><th class="num">Runs</th><th class="num">Wickets</th><th class="num">Econ</th>
                  </tr>
                </thead>
                <tbody>
                  ${teamABowl.map(r => `
                    <tr>
                      <td class="highlight">${r.playerName || r.playerId?.name}</td>
                      <td class="num">${r.bowling?.overs ?? 0}</td>
                      <td class="num">${r.bowling?.maidens ?? 0}</td>
                      <td class="num">${r.bowling?.runsConceded ?? r.bowling?.runs ?? 0}</td>
                      <td class="num highlight" style="color: #34d399;">${r.bowling?.wickets ?? 0}</td>
                      <td class="num">${r.bowling?.overs > 0 ? ((r.bowling.runsConceded ?? r.bowling.runs ?? 0) / r.bowling.overs).toFixed(2) : '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }).join('')}
      </body>
      </html>
    `;
  }
}
export default ExportHelper;
