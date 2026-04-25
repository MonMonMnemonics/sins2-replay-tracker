import { db } from "@/db/database.ts";
import { game, GAME_TYPE_FFA, GAME_TYPE_TEAM, gamePlayer, initialElo, player, vote } from "@/db/schema.ts";
import { asc, eq, inArray } from "drizzle-orm";

const pageChunkRows = 100;

function kVal(eloVal : number): number {
    if (eloVal > 2400) {
        return(16);
    } else if (eloVal > 2100) {
        return(24);
    } else {
        return(32);
    }
}

export async function calculateElo() {
    await db.update(player).set({ elo: initialElo });

    for (let page = 0; page < 1000 ;page += 1) {
        const playerElos: {[key: number]: number} = {};
        const gameChunk: {[key: number]: {
            id: number,
            gameType: string,
            team: {[key: number]: number[]},
            position: {[key: number]: number[]},
            vote: number[]
        }} = {};

        (await db.select({ id: game.id, gameType: game.gameType })
            .from(game)
            .orderBy(asc(game.exeVerMajor), asc(game.exeVerMinor), asc(game.exeVerPatch), asc(game.id))
            .limit(pageChunkRows)
            .offset(page*pageChunkRows)
        ).forEach(gameDt => {
            gameChunk[gameDt.id] = {
                team: {},
                position: {},
                vote: [],
                ...gameDt
            };
        })

        if (Object.keys(gameChunk).length == 0) {
            break;
        }
        
        (await db.select({ 
                playerId: gamePlayer.playerId,  
                gameId: gamePlayer.gameId,
                team: gamePlayer.team,
                position: gamePlayer.position
            })
            .from(gamePlayer)
            .where(inArray(gamePlayer.gameId, Object.keys(gameChunk).map(e => Number(e))))
        ).forEach(playerDt => {
            if ((playerDt.playerId !== null) && (playerDt.gameId !== null) && (playerDt.team !== null)) {
                if (!(playerDt.playerId in playerElos)) {
                    playerElos[playerDt.playerId] = initialElo;
                }

                if (!(playerDt.position in gameChunk[playerDt.gameId].position)) {
                    gameChunk[playerDt.gameId].position[playerDt.position] = [];
                }
                gameChunk[playerDt.gameId].position[playerDt.position].push(playerDt.playerId);

                if (!((playerDt.team) in gameChunk[playerDt.gameId].team)) {
                    gameChunk[playerDt.gameId].team[playerDt.team] = [];
                }
                gameChunk[playerDt.gameId].team[playerDt.team].push(playerDt.playerId);
            }
        });

        (await db.select({ id: player.id, elo: player.elo})
            .from(player)
            .where(inArray(player.id, Object.keys(playerElos).map(e => Number(e))))
        ).forEach(playerDt => {
            playerElos[playerDt.id] = playerDt.elo;
        });

        (await db.select({ gameId: vote.gameId, winner: vote.winner })
            .from(vote)
            .where(inArray(vote.gameId, Object.keys(gameChunk).map(e => Number(e))))
        ).forEach(voteDt => {
            if ((voteDt.gameId !== null) && (voteDt.winner !== null)) {
                gameChunk[voteDt.gameId].vote.push(voteDt.winner);
            }            
        });

        for (const gameId in gameChunk) {
            const voteRes: {[key:number]: number} = {};

            if (gameChunk[gameId].vote.length == 0) {
                continue;
            }

            gameChunk[gameId].vote.forEach(dt => {
                if (!(dt in voteRes)) {
                    voteRes[dt] = 0;
                }

                voteRes[dt] += 1;
            });

            let winnerIdx = 0;
            for (const idx in voteRes) {
                if (voteRes[winnerIdx] ?? -1 < voteRes[idx]) {
                    winnerIdx = Number(idx);
                }
            }

            const eloChange: {[key: number]: number} = {};
            let totalElo = 0;
            if (gameChunk[gameId].gameType == GAME_TYPE_FFA) {
                Object.values(gameChunk[gameId].position).flat().forEach(playerId => {
                    totalElo += playerElos[playerId];
                });

                for (const posIdx in gameChunk[gameId].position) {
                    eloChange[posIdx] = playerElos[gameChunk[gameId].position[posIdx][0]]/totalElo;
                }

                for (const posIdx in gameChunk[gameId].position) {
                    if (Number(posIdx) == winnerIdx) {
                        gameChunk[gameId].position[posIdx].forEach(playerId => {
                            playerElos[playerId] = playerElos[playerId] + kVal(playerElos[playerId])*(1 - eloChange[posIdx]);
                        });
                    } else  {
                        gameChunk[gameId].position[posIdx].forEach(playerId => {
                            playerElos[playerId] = playerElos[playerId] + kVal(playerElos[playerId])*(0 - eloChange[posIdx]);
                        });
                    }
                }
            } else if (gameChunk[gameId].gameType == GAME_TYPE_TEAM) {
                for (const teamIdx in gameChunk[gameId].team) {
                    eloChange[teamIdx] = 1;

                    gameChunk[gameId].team[teamIdx].forEach(playerId => {
                        eloChange[teamIdx] *= playerElos[playerId];
                    });

                    totalElo += eloChange[teamIdx];
                }

                for (const teamIdx in eloChange) {
                    eloChange[teamIdx] /= totalElo;
                }

                for (const teamIdx in gameChunk[gameId].team) {
                    if (Number(teamIdx) == winnerIdx) {
                        gameChunk[gameId].team[teamIdx].forEach(playerId => {
                            playerElos[playerId] = playerElos[playerId] + kVal(playerElos[playerId])*(1 - eloChange[teamIdx]);
                        });
                    } else  {
                        gameChunk[gameId].team[teamIdx].forEach(playerId => {
                            playerElos[playerId] = playerElos[playerId] + kVal(playerElos[playerId])*(0 - eloChange[teamIdx]);
                        });
                    }
                }
            }
        }

        for (const playerId in playerElos) {
            await db.update(player)
                .set({ elo: Math.round(playerElos[playerId]) })
                .where(eq(player.id, Number(playerId)));
        }

        if (Object.keys(gameChunk).length < pageChunkRows) {
            break;
        }
    }
}
