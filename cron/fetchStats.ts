import { getPlayerData, getPlayerDataThrottled } from './slippi'
import * as syncFs from 'fs';
import * as path from 'path';
import util from 'util';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import * as settings from '../settings'
import { PlayersRowData } from 'src/lib/player';
import { exec } from 'child_process';
console.log('GOOGLE_CREDS length:', process.env.GOOGLE_CREDS?.length);
console.log('GOOGLE_CREDS snippet:', process.env.GOOGLE_CREDS?.slice(0, 100));

const rawCreds = process.env.GOOGLE_CREDS!;             
const creds = JSON.parse(rawCreds);                      
creds.private_key = creds.private_key.replace(/\\n/g, '\n');  



const fs = syncFs.promises;
const execPromise = util.promisify(exec);

// type PlayersRowData = {
//   rank: number;
//   connectCode: string;
//   name: string;
//   rating: number;
//   gamesPlayed: number;
//   wins: number;
//   ladderPoints: number;
//   monthlyWins: number;
// }

const getPlayerConnectCodes: string[] = ['MACK#891', 'PENN#0', 'SHAD#749', 'BAGG#730', 'TOMB#572', 'ISLE#369', 'AUX#397', 'DOL#101', 'PIXZ#154', 'LORD#522', 'ERIC#108', 'KEFO#405', 'DERE#250', 'TIME#343', 'SOMA#385', 'TRSK#673', 'DOUGH#04'];



const getPlayers = async () => {
  const codes = getPlayerConnectCodes;
  console.log(`Found ${codes.length} player codes`)
  const allData = codes.map(code => getPlayerDataThrottled(code))
  // console.log("allData: ----- ", allData);
  const results = await Promise.all(allData.map(p => p.catch(e => e)));
  // console.log("results: ----- ", results[0]);
  const validResults = results.filter(result => !(result instanceof Error));
  // console.log('validResults', validResults);
  const unsortedPlayers = validResults
    .filter((data: any) => data?.data?.getUser)
    .map((data: any) => data.data.getUser);
  // console.log('unsortedPlayers', unsortedPlayers);
  return unsortedPlayers.sort((p1, p2) =>
    p2.rankedNetplayProfile.ratingOrdinal - p1.rankedNetplayProfile.ratingOrdinal)
}

const getAdditionalPlayerData = async (): Promise<PlayersRowData[]> => {
  const doc = new GoogleSpreadsheet( '15a_z0DVqGQnvhRiacbm4xWuwrHgBlgtMn0OAk8NJmGU');
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0]; // Assuming the data is in the first sheet
  const rows = await sheet.getRows<PlayersRowData>();
  return rows.map(row => ({
    rank: row.rank,
    connectCode: row.connectCode,
    name: row.name,
    rating: row.rating,
    gamesPlayed: row.gamesPlayed,
    wins: row.wins,
    ladderPoints: row.ladderPoints,
    monthlyWins: row.monthlyWins,
  }));
};

const updateAdditionalPlayerData = async () => {
  const doc = new GoogleSpreadsheet( '15a_z0DVqGQnvhRiacbm4xWuwrHgBlgtMn0OAk8NJmGU');
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows<PlayersRowData>();
  const newPlayerData = await getPlayers();
  if (rows.length === 0) {

    console.log('Spreadsheet is empty. Adding header row and populating with initial data.');

    // Add header row
    await sheet.setHeaderRow(['rank', 'connectCode', 'name', 'rating', 'gamesPlayed', 'wins', 'ladderPoints', 'monthlyWins']);

    for (const player of newPlayerData) {

      await sheet.addRow({
        rank: player.rankedNetplayProfile.rank,
        connectCode: player.connectCode.code,
        name: player.displayName,
        rating: player.rankedNetplayProfile.ratingOrdinal,
        gamesPlayed: player.rankedNetplayProfile.wins + player.rankedNetplayProfile.losses,
        wins: player.rankedNetplayProfile.wins,
        ladderPoints: 0,
        monthlyWins: 0,
      });
    }
    console.log('Initial player data populated.');
    return;
  } else {
    console.log('Spreadsheet currently contains data - skipping initialization...');
 
    const players = rows.reduce((acc, row) => {
      acc[row.connectCode] = row;
      return acc;
    }, {} as Record<string, PlayersRowData>);

    for (const player of newPlayerData) {
      const existingPlayer = players[player.connectCode.code];

      if (existingPlayer) {
        // Compare and update fields if necessary
        if (existingPlayer.name !== player.rankedNetplayProfile.displayName) {
          existingPlayer.name = player.rankedNetplayProfile.displayName;
        }
        if (existingPlayer.rating !== player.rankedNetplayProfile.ratingOrdinal) {
          existingPlayer.rating = player.rankedNetplayProfile.ratingOrdinal;
        }
        if (existingPlayer.gamesPlayed !== player.rankedNetplayProfile.wins + player.rankedNetplayProfile.losses) {
          existingPlayer.gamesPlayed = player.rankedNetplayProfile.wins + player.rankedNetplayProfile.losses;
        }

        const addedWins = player.rankedNetplayProfile.wins - existingPlayer.wins;
        const oldPoints: number = Number(existingPlayer.ladderPoints);
        const oldWins: number = Number(existingPlayer.monthlyWins);



        if (existingPlayer.wins !== player.rankedNetplayProfile.wins) {
          existingPlayer.wins = player.rankedNetplayProfile.wins;
        }
        existingPlayer.ladderPoints = Math.trunc(Number(oldPoints + ((addedWins * existingPlayer.rating) / 10)));
        existingPlayer.monthlyWins = Number(oldWins + addedWins);

        // Save the updated row
        await existingPlayer.save();
      } else {
        // Add new player if not already in the sheet
        await sheet.addRow({
          rank: player.rankedNetplayProfile.rank || 19,
          connectCode: player.connectCode.code || 'UNKNOWN',
          name: player.displayName || 'Unknown Player',
          rating: player.rankedNetplayProfile.ratingOrdinal || 0,
          gamesPlayed: player.rankedNetplayProfile.wins + player.rankedNetplayProfile.losses || 0,
          wins: player.rankedNetplayProfile.wins || 0,
          ladderPoints: player.rankedNetplayProfile.ladderPoints || 0,
          monthlyWins: 0,
        });
      }

    }

  }
}

async function main() {
  console.log('Starting player fetch.');
  const players = await getPlayers();

  if(!players.length) {
    console.log('Error fetching player data. Terminating.')
    return
  }
  console.log('Player fetch complete.');

  await updateAdditionalPlayerData();

  const additionalData = await getAdditionalPlayerData();
  const additionalDataMap = additionalData.reduce((acc, player) => {
    acc[player.connectCode] = player;
    return acc;
  }, {} as Record<string, PlayersRowData>);

  // Merge additional data with player data
  // rename original to players-old
  const newFile = path.join(__dirname, 'data/players-new.json')
  const oldFile = path.join(__dirname, 'data/players-old.json')
  const dbFile = path.join(__dirname, 'data/players-database.json')
  const timestamp = path.join(__dirname, 'data/timestamp.json')

  await fs.rename(newFile, oldFile)
  console.log('Renamed existing data file.');
  await fs.writeFile(newFile, JSON.stringify(players));
  players.forEach(player => {
    const playerData = additionalDataMap[player.connectCode.code];
    if (playerData) {
      player.databaseProfile = playerData;
    }
  });
  await fs.writeFile(dbFile, JSON.stringify(players));

  await fs.writeFile(timestamp, JSON.stringify({updated: Date.now()}));
  console.log('Wrote new data file and timestamp.');
  const rootDir = path.normalize(path.join(__dirname, '..'))
  console.log(rootDir)
  // if no current git changes
  const { stdout, stderr } = await execPromise(`git -C ${rootDir} status --porcelain`);
  if(stdout || stderr) {
    console.log('Pending git changes... aborting deploy');
    return
  }
  console.log('Deploying.');
  const { stdout: stdout2, stderr: stderr2 } = await execPromise(`npm run --prefix ${rootDir} deploy`);
  console.log(stdout2);
  if(stderr2) {
    console.error(stderr2);
  }
  console.log('Deploy complete.');
}

main();
