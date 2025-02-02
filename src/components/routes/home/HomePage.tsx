import React, { useEffect, useState } from 'react';
import { Table } from '../../Table';
import { Player, PlayersRowData } from '../../../lib/player';
import playersOld from '../../../../cron/data/players-old.json';
import playersNew from '../../../../cron/data/players-new.json';
import timestamp from '../../../../cron/data/timestamp.json';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime'; // import plugin
import * as settings from '../../../../settings';
import ColoradoFlag from '../../../../images/Flag_of_Colorado.svg';
import { getAdditionalPlayerData } from '../../../../cron/fetchStats'; // Import the function

dayjs.extend(relativeTime);

const setCount = (player: Player) => {
  return player.rankedNetplayProfile.wins + player.rankedNetplayProfile.losses;
};

const sortAndPopulatePlayers = (players: Player[]) => {
  players = players.filter((p) => setCount(p)).concat(players.filter((p) => !setCount(p)));
  players.forEach((player: Player, i: number) => {
    if (setCount(player) > 0) {
      player.rankedNetplayProfile.rank = i + 1;
    }
  });
  return players;
};

export default function HomePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [updateDesc, setUpdateDesc] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const additionalData = await getAdditionalPlayerData();
      const additionalDataMap = additionalData.reduce((acc, player) => {
        acc[player.connectCode] = player;
        return acc;
      }, {} as Record<string, PlayersRowData>);

      const rankedPlayersOld = sortAndPopulatePlayers(playersOld);
      const oldPlayersMap = new Map(rankedPlayersOld.map((p) => [p.connectCode.code, p]));

      const combinedPlayers = sortAndPopulatePlayers(playersNew).map((p) => {
        const oldData = oldPlayersMap.get(p.connectCode.code);
        if (oldData) {
          p.oldRankedNetplayProfile = oldData.rankedNetplayProfile;
        }
        const additionalPlayerData = additionalDataMap[p.connectCode.code];
        if (additionalPlayerData) {
          p.databaseProfile = additionalPlayerData;
        }
        return p;
      });

      setPlayers(combinedPlayers);
    };

    fetchData();

    const updatedAt = dayjs(timestamp.updated);
    setUpdateDesc(updatedAt.fromNow());
    const interval = setInterval(() => setUpdateDesc(updatedAt.fromNow()), 1000 * 60);
    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex flex-col items-center h-screen p-8">
      <img className="h-48" src={ColoradoFlag} alt="colorado flag" />
      <h1 className="text-3xl m-4 text-center text-white">{settings.title}</h1>
      <div className="p-1 text-gray-300"> Updated {updateDesc}</div>
      <Table players={players} />
      <div className="p-4 text-gray-300 flex flex-col">
        <div>Built by blorppppp</div>
        <div>
          <a
            href="https://www.buymeacoffee.com/blorppppp"
            target="_blank"
            rel="noreferrer"
            className="text-gray-400 hover:text-indigo-700 mr-2 hover:underline"
          >
            Buy me a coffee
          </a>
          ☕
        </div>
      </div>
    </div>
  );
}
