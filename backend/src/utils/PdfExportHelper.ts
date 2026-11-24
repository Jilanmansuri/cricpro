import PDFDocument from 'pdfkit';

interface MatchExportData {
  match: any;
  playerStats: any[];
}

export class PdfExportHelper {
  public static async generateBulkMatchesPdf(matchesData: MatchExportData[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 36,
          bufferPages: true,
          info: {
            Title: 'CricStats Pro - Matches Export Report',
            Author: 'CricStats Pro',
            Subject: 'Cricket Match Scorecards',
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        const pageWidth = doc.page.width;
        const pageMargin = 36;
        const contentWidth = pageWidth - pageMargin * 2; // 523pt

        // Cover / Document Header
        doc
          .rect(pageMargin, doc.y, contentWidth, 54)
          .fill('#0F172A');

        doc
          .fillColor('#FFFFFF')
          .fontSize(16)
          .font('Helvetica-Bold')
          .text('CRICSTATS PRO', pageMargin + 16, 48, { characterSpacing: 1 });

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#94A3B8')
          .text('OFFICIAL MATCH SCORECARD EXPORT REPORT', pageMargin + 16, 68);

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#38BDF8')
          .text(
            `TOTAL MATCHES: ${matchesData.length}   |   EXPORT DATE: ${new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}`,
            pageMargin,
            104,
            { align: 'right', width: contentWidth }
          );

        doc.y = 120;
        doc.strokeColor('#CBD5E1').lineWidth(0.75).moveTo(pageMargin, doc.y).lineTo(pageMargin + contentWidth, doc.y).stroke();
        doc.y += 12;

        // Render each match
        matchesData.forEach((item, index) => {
          const { match, playerStats } = item;
          const matchNum = index + 1;

          // If not first match and remaining height is tight, start fresh page
          if (index > 0) {
            doc.addPage();
          }

          // Match Banner
          const teamAName = match.teamA?.name || match.teamA?.displayName || 'Team A';
          const teamBName = match.teamB?.name || match.teamB?.displayName || 'Team B';
          const matchDate = match.date ? new Date(match.date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A';
          const venue = match.venueId?.name || match.venueName || 'Unknown Venue';
          const format = match.format || `${match.overs || 20} Overs`;
          const result = match.result || 'Match Completed';

          // Match Card Header Box
          const bannerY = doc.y;
          doc
            .roundedRect(pageMargin, bannerY, contentWidth, 74, 6)
            .fillAndStroke('#F8FAFC', '#E2E8F0');

          // Match badge
          doc
            .roundedRect(pageMargin + 12, bannerY + 10, 80, 18, 4)
            .fill('#0284C7');
          doc
            .fillColor('#FFFFFF')
            .fontSize(8.5)
            .font('Helvetica-Bold')
            .text(`MATCH ${matchNum} OF ${matchesData.length}`, pageMargin + 12, bannerY + 14, { width: 80, align: 'center' });

          // Date & Venue
          doc
            .fillColor('#64748B')
            .fontSize(8.5)
            .font('Helvetica')
            .text(`📅 ${matchDate}   📍 ${venue}   ⏱️ ${format}`, pageMargin + 100, bannerY + 14);

          // Teams Title
          doc
            .fillColor('#0F172A')
            .fontSize(14)
            .font('Helvetica-Bold')
            .text(`${teamAName}   vs   ${teamBName}`, pageMargin + 12, bannerY + 34);

          // Scores summary
          const runsA = match.teamAScore?.runs ?? '-';
          const wktsA = match.teamAScore?.wickets ?? '-';
          const ovsA = match.teamAScore?.overs ? `(${match.teamAScore.overs} ov)` : '';

          const runsB = match.teamBScore?.runs ?? '-';
          const wktsB = match.teamBScore?.wickets ?? '-';
          const ovsB = match.teamBScore?.overs ? `(${match.teamBScore.overs} ov)` : '';

          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#1E293B')
            .text(`${teamAName}: `, pageMargin + 12, bannerY + 54, { continued: true })
            .fillColor('#0284C7')
            .text(`${runsA}/${wktsA} ${ovsA}    `, { continued: true })
            .fillColor('#1E293B')
            .text(`${teamBName}: `, { continued: true })
            .fillColor('#0284C7')
            .text(`${runsB}/${wktsB} ${ovsB}`);

          // Result Pill
          doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .fillColor('#059669')
            .text(`🏆 ${result}`, pageMargin + 12, bannerY + 54, { align: 'right', width: contentWidth - 24 });

          doc.y = bannerY + 86;

          // Filter players for Innings 1 and Innings 2
          const teamAId = (match.teamA?._id || match.teamA)?.toString();
          const teamBId = (match.teamB?._id || match.teamB)?.toString();

          const teamABat = (playerStats || []).filter(
            (s) => s.teamId?.toString() === teamAId && !s.batting?.didNotBat
          );
          const teamBBowl = (playerStats || []).filter(
            (s) => s.teamId?.toString() === teamBId && !s.bowling?.didNotBowl
          );
          const teamBBat = (playerStats || []).filter(
            (s) => s.teamId?.toString() === teamBId && !s.batting?.didNotBat
          );
          const teamABowl = (playerStats || []).filter(
            (s) => s.teamId?.toString() === teamAId && !s.bowling?.didNotBowl
          );

          // Helper: Check Page Overflow
          const ensureSpace = (neededHeight: number) => {
            if (doc.y + neededHeight > doc.page.height - 40) {
              doc.addPage();
            }
          };

          // Helper: Draw Batting Table
          const drawBattingTable = (teamName: string, batters: any[], scoreObj: any) => {
            ensureSpace(45 + batters.length * 18);

            // Subheader
            doc
              .fillColor('#0F172A')
              .fontSize(11)
              .font('Helvetica-Bold')
              .text(`${teamName.toUpperCase()} BATTING INNINGS`, pageMargin, doc.y);
            doc.y += 4;

            const tableY = doc.y;
            // Table Header Bar
            doc
              .rect(pageMargin, tableY, contentWidth, 18)
              .fill('#0F172A');

            doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
            doc.text('BATSMAN', pageMargin + 6, tableY + 5, { width: 140 });
            doc.text('DISMISSAL', pageMargin + 150, tableY + 5, { width: 150 });
            doc.text('RUNS', pageMargin + 305, tableY + 5, { width: 40, align: 'right' });
            doc.text('BALLS', pageMargin + 350, tableY + 5, { width: 40, align: 'right' });
            doc.text('4s', pageMargin + 395, tableY + 5, { width: 30, align: 'right' });
            doc.text('6s', pageMargin + 430, tableY + 5, { width: 30, align: 'right' });
            doc.text('SR', pageMargin + 465, tableY + 5, { width: 50, align: 'right' });

            let currY = tableY + 18;

            if (batters.length === 0) {
              doc
                .rect(pageMargin, currY, contentWidth, 20)
                .fillAndStroke('#FFFFFF', '#E2E8F0');
              doc
                .fillColor('#64748B')
                .fontSize(8.5)
                .font('Helvetica-Oblique')
                .text('No individual batting entries recorded', pageMargin + 10, currY + 6);
              currY += 20;
            } else {
              batters.forEach((row, rIdx) => {
                const bg = rIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
                doc.rect(pageMargin, currY, contentWidth, 18).fillAndStroke(bg, '#E2E8F0');

                const name = row.playerName || row.playerId?.name || 'Batsman';
                const status = (row.batting?.outStatus || 'not_out').replace(/_/g, ' ');
                const runs = row.batting?.runs ?? 0;
                const balls = row.batting?.balls ?? 0;
                const fours = row.batting?.fours ?? 0;
                const sixes = row.batting?.sixes ?? 0;
                const sr = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '-';

                doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold');
                doc.text(name, pageMargin + 6, currY + 5, { width: 140, ellipsis: true });

                doc.fillColor('#64748B').fontSize(8).font('Helvetica');
                doc.text(status, pageMargin + 150, currY + 5, { width: 150, ellipsis: true });

                doc.fillColor('#0284C7').fontSize(8.5).font('Helvetica-Bold');
                doc.text(String(runs), pageMargin + 305, currY + 5, { width: 40, align: 'right' });

                doc.fillColor('#475569').fontSize(8).font('Helvetica');
                doc.text(String(balls), pageMargin + 350, currY + 5, { width: 40, align: 'right' });
                doc.text(String(fours), pageMargin + 395, currY + 5, { width: 30, align: 'right' });
                doc.text(String(sixes), pageMargin + 430, currY + 5, { width: 30, align: 'right' });
                doc.text(String(sr), pageMargin + 465, currY + 5, { width: 50, align: 'right' });

                currY += 18;
              });
            }

            // Total Bar
            doc.rect(pageMargin, currY, contentWidth, 18).fillAndStroke('#E2E8F0', '#CBD5E1');
            doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold');
            doc.text('TOTAL', pageMargin + 6, currY + 5);
            doc.text(
              `${scoreObj?.runs ?? '-'} / ${scoreObj?.wickets ?? '-'} (${scoreObj?.overs ?? '-'} Overs)`,
              pageMargin,
              currY + 5,
              { width: contentWidth - 8, align: 'right' }
            );

            doc.y = currY + 26;
          };

          // Helper: Draw Bowling Table
          const drawBowlingTable = (teamName: string, bowlers: any[]) => {
            ensureSpace(45 + bowlers.length * 18);

            // Subheader
            doc
              .fillColor('#0F172A')
              .fontSize(11)
              .font('Helvetica-Bold')
              .text(`${teamName.toUpperCase()} BOWLING INNINGS`, pageMargin, doc.y);
            doc.y += 4;

            const tableY = doc.y;
            // Table Header Bar
            doc
              .rect(pageMargin, tableY, contentWidth, 18)
              .fill('#1E293B');

            doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
            doc.text('BOWLER', pageMargin + 6, tableY + 5, { width: 170 });
            doc.text('OVERS', pageMargin + 180, tableY + 5, { width: 60, align: 'right' });
            doc.text('MAIDENS', pageMargin + 245, tableY + 5, { width: 60, align: 'right' });
            doc.text('RUNS', pageMargin + 310, tableY + 5, { width: 60, align: 'right' });
            doc.text('WICKETS', pageMargin + 375, tableY + 5, { width: 65, align: 'right' });
            doc.text('ECONOMY', pageMargin + 445, tableY + 5, { width: 70, align: 'right' });

            let currY = tableY + 18;

            if (bowlers.length === 0) {
              doc
                .rect(pageMargin, currY, contentWidth, 20)
                .fillAndStroke('#FFFFFF', '#E2E8F0');
              doc
                .fillColor('#64748B')
                .fontSize(8.5)
                .font('Helvetica-Oblique')
                .text('No individual bowling entries recorded', pageMargin + 10, currY + 6);
              currY += 20;
            } else {
              bowlers.forEach((row, rIdx) => {
                const bg = rIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
                doc.rect(pageMargin, currY, contentWidth, 18).fillAndStroke(bg, '#E2E8F0');

                const name = row.playerName || row.playerId?.name || 'Bowler';
                const overs = row.bowling?.overs ?? 0;
                const maidens = row.bowling?.maidens ?? 0;
                const runs = row.bowling?.runsConceded ?? row.bowling?.runs ?? 0;
                const wkts = row.bowling?.wickets ?? 0;
                const econ = overs > 0 ? (runs / overs).toFixed(2) : '-';

                doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold');
                doc.text(name, pageMargin + 6, currY + 5, { width: 170, ellipsis: true });

                doc.fillColor('#475569').fontSize(8).font('Helvetica');
                doc.text(String(overs), pageMargin + 180, currY + 5, { width: 60, align: 'right' });
                doc.text(String(maidens), pageMargin + 245, currY + 5, { width: 60, align: 'right' });
                doc.text(String(runs), pageMargin + 310, currY + 5, { width: 60, align: 'right' });

                doc.fillColor('#059669').fontSize(8.5).font('Helvetica-Bold');
                doc.text(String(wkts), pageMargin + 375, currY + 5, { width: 65, align: 'right' });

                doc.fillColor('#475569').fontSize(8).font('Helvetica');
                doc.text(String(econ), pageMargin + 445, currY + 5, { width: 70, align: 'right' });

                currY += 18;
              });
            }

            doc.y = currY + 16;
          };

          // Render Innings 1
          drawBattingTable(teamAName, teamABat, match.teamAScore);
          drawBowlingTable(teamBName, teamBBowl);

          // Render Innings 2
          drawBattingTable(teamBName, teamBBat, match.teamBScore);
          drawBowlingTable(teamAName, teamABowl);

          // Match Footer Rule
          doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(pageMargin, doc.y).lineTo(pageMargin + contentWidth, doc.y).stroke();
          doc.y += 14;
        });

        // Add page numbers
        const pageRange = doc.bufferedPageRange();
        for (let i = 0; i < pageRange.count; i++) {
          doc.switchToPage(i);
          doc
            .fontSize(7.5)
            .fillColor('#94A3B8')
            .font('Helvetica')
            .text(
              `CricStats Pro • Match Scorecard Report • Page ${i + 1} of ${pageRange.count}`,
              pageMargin,
              doc.page.height - 24,
              { align: 'center', width: contentWidth }
            );
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

export default PdfExportHelper;
