import { db } from "@/db/database.ts";
import { define, type gamePlayerData } from "../../utils.ts";
import { game, GAME_TYPE_FFA, GAME_TYPE_TEAM, gamePlayer, initialElo, lower, player, playerName, vote } from "@/db/schema.ts";
import { asc, desc, eq, inArray, like } from "drizzle-orm";

export interface PlayerStatMetadata {
    names: string[],
    factionWinRate: {[key: string]: number},
    factionPickRate: {[key: string]: number},
    totalGames: number,
    elo: number
};

export const handler = define.handlers({
    async GET(ctx) {
        try {
            const result = await db.select({ name: playerName.name })
                .from(playerName)
                .where(like(playerName.name, "%" + ((new URL(ctx.req.url)).searchParams.get("name") ?? "") + "%"))
                .orderBy(asc(playerName.name))
                .limit(7);

            return new Response(JSON.stringify(result.map(dt => dt.name)), {
                headers: { "Content-Type": "application/json" },
                status: 200,
            });
        } catch {
            return new Response("SERVER ERROR", {
                status: 500
            });
        }
    },

    async POST(ctx) {
        try {
            const payload = await ctx.req.json() as { name: string, page: number };
            const dataPerPage = 15;
            const result: {
                metaData: PlayerStatMetadata,
                games: gamePlayerData[]
            } = {
                metaData: {
                    names: [],
                    factionPickRate: {},
                    factionWinRate: {},
                    totalGames: 0,
                    elo: initialElo
                },
                games: []
            };

            const playerDt = await db.select({id: player.id, elo: player.elo})
                .from(player)
                .rightJoin(playerName, eq(player.id, playerName.playerId))
                .where(eq(lower(playerName.name), payload.name.toLowerCase()))
                .limit(1);

            if (playerDt.length == 0) {
                return new Response(JSON.stringify(result), {
                    headers: { "Content-Type": "application/json" },
                    status: 200,
                });
            }
            
            result.metaData.elo = playerDt[0]?.elo ?? initialElo;
            //-------------------------- GET PLAYER GAMES --------------------------
            const games = await db.select()
                .from(gamePlayer)
                .leftJoin(game, eq(game.id, gamePlayer.gameId))
                .where(eq(gamePlayer.playerId, playerDt[0]?.id ?? -1))
                .orderBy(desc(game.exeVerMajor), desc(game.exeVerMinor), desc(game.exeVerPatch), desc(game.id))
                .limit(dataPerPage)
                .offset(payload.page*dataPerPage)
            
            const players = await db.select()
                .from(gamePlayer)
                .leftJoin(player, eq(gamePlayer.playerId, player.id))
                .leftJoin(playerName, eq(gamePlayer.nameId, playerName.id))
                .where(inArray(gamePlayer.gameId, games.map(game => game.game?.id ?? -1)))

            const votes = await db.select()
                .from(vote)
                .where(inArray(vote.gameId, games.map(game => game.game?.id ?? -1)))

            games.forEach(game => {
                let win = false;
                const voteData = votes.filter(dt => dt.gameId == game.game?.id);
                
                const voteRes: {[key: number]: number} = {};
                voteData.forEach(dt => {
                    if (!(dt.winner in voteRes)) {
                        voteRes[dt.winner] = 0;
                    }

                    voteRes[dt.winner] += 1;
                });
                
                let winnerIdx = 0;
                for (const idx in voteRes) {
                    if (voteRes[winnerIdx] ?? -1 < voteRes[idx]) {
                        winnerIdx = Number(idx);
                    }
                }

                if (game.game?.gameType == GAME_TYPE_FFA) {
                    if (winnerIdx == game.game_player.position) {
                        win = true;
                    }
                } else if (game.game?.gameType == GAME_TYPE_TEAM) {
                    if (winnerIdx == game.game_player.team) {
                        win = true;
                    }
                }
                
                result.games.push({
                    win: win,
                    faction: game.game_player.faction,
                    factionRandom: game.game_player.randomFaction,
                    players: players.filter(e => e.game_player.gameId == game.game?.id).map(dt => ({
                        name: dt.player_name?.name ?? "",
                        faction: dt.game_player.faction,
                        randomFaction: dt.game_player.randomFaction,
                        team: dt.game_player.team ?? -1,
                        position: dt.game_player.position
                    })).sort((a, b) => a.position - b.position),
                    votes: voteData.map(dt => {
                        const name = players.find(e => (e.game_player.gameId == dt.gameId) && (e.game_player.playerId == dt.playerId))?.player_name?.name ?? "NOT FOUND"
                        if (game.game?.gameType == GAME_TYPE_FFA) {
                            const winnerName = players.find(e => 
                                    (e.game_player.gameId == dt.gameId) 
                                    && (e.game_player.playerId == dt.playerId)
                                    && (e.game_player.position == dt.winner)
                                )?.player_name?.name ?? "NOT FOUND"
                            return ({
                                winner: winnerName,
                                name: name
                            });
                        } else {
                            return ({
                                winner: "Team " + (dt.winner + 1),
                                name: name
                            });
                        }
                    }),
                    map: game.game?.map ?? "",
                    gameType: game.game?.gameType ?? "",
                    version: (game.game?.exeVerMajor ?? "") + "." + (game.game?.exeVerMinor ?? "") + "." + (game.game?.exeVerPatch ?? "")
                })
            });

            if (payload.page == 0) {
                //-------------------------- GET PLAYER ALIASES --------------------------
                const playerNames = await db.select({ name: playerName.name })
                    .from(playerName)
                    .where(eq(playerName.playerId, playerDt[0]?.id ?? -1))

                result.metaData.names = playerNames.map(dt => dt.name);

                //-------------------------- GET PLAYER STATS --------------------------
                const pickStat: {[key: string]: number} = {};
                const factionStat: {[key: string]: { win: number, lose: number }} = {};
                const pageChunkRows = 100

                for (let page = 0; page < 1000 ;page += 1) {
                    const gameChunk = await db.select()
                        .from(gamePlayer)
                        .leftJoin(game, eq(game.id, gamePlayer.gameId))
                        .where(eq(gamePlayer.playerId, playerDt[0]?.id ?? -1))
                        .orderBy(asc(game.exeVerMajor), asc(game.exeVerMinor), asc(game.exeVerPatch), asc(game.id))
                        .limit(pageChunkRows)
                        .offset(page*pageChunkRows)

                    result.metaData.totalGames += gameChunk.length;

                    if (gameChunk.length == 0) {
                        break;
                    }

                    const voteChunk = await db.select()
                        .from(vote)
                        .where(inArray(vote.gameId, gameChunk.map(game => game.game?.id ?? -1)))

                    gameChunk.forEach(game => {
                        let win = false;
                        const voteData = voteChunk.filter(dt => dt.gameId == game.game?.id);
                        
                        const voteRes: {[key: number]: number} = {};
                        voteData.forEach(dt => {
                            if (!(dt.winner in voteRes)) {
                                voteRes[dt.winner] = 0;
                            }

                            voteRes[dt.winner] += 1;
                        });
                        
                        let winnerIdx = 0;
                        for (const idx in voteRes) {
                            if (voteRes[winnerIdx] ?? -1 < voteRes[idx]) {
                                winnerIdx = Number(idx);
                            }
                        }

                        if (game.game?.gameType == GAME_TYPE_FFA) {
                            if (winnerIdx == game.game_player.position) {
                                win = true;
                            }
                        } else if (game.game?.gameType == GAME_TYPE_TEAM) {
                            if (winnerIdx == game.game_player.team) {
                                win = true;
                            }
                        }

                        if (game.game_player.randomFaction) {
                            pickStat["Random"] = (pickStat["Random"] ?? 0) + 1;
                        } else {
                            pickStat[game.game_player.faction] = (pickStat[game.game_player.faction] ?? 0) + 1;
                        }

                        if (!(game.game_player.faction in factionStat)) {
                            factionStat[game.game_player.faction] = {
                                win: 0,
                                lose: 0
                            }
                        }

                        if (win) {
                            factionStat[game.game_player.faction].win += 1;
                        } else {
                            factionStat[game.game_player.faction].lose += 1;
                        }
                    });

                    if (gameChunk.length < pageChunkRows) {
                        break;
                    }
                }

                if (result.metaData.totalGames > 0) {
                    for (const factionName in factionStat) {
                        result.metaData.factionWinRate[factionName] = Math.round(factionStat[factionName].win/(factionStat[factionName].win + factionStat[factionName].lose)*10000)/100
                    }

                    for (const factionName in pickStat) {
                        result.metaData.factionPickRate[factionName] = Math.round(pickStat[factionName]/result.metaData.totalGames*10000)/100
                    }
                }
            }
        
            return new Response(JSON.stringify(result), {
                headers: { "Content-Type": "application/json" },
                status: 200,
            });
        } catch {
            return new Response("SERVER ERROR", {
                status: 500
            });
        }
    },
});
