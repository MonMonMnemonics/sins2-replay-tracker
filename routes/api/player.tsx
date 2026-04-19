import { db } from "@/db/database.ts";
import { define, type gamePlayerData } from "../../utils.ts";
import { game, GAME_TYPE_FFA, GAME_TYPE_TEAM, gamePlayer, lower, player, playerName, vote } from "@/db/schema.ts";
import { asc, desc, eq, inArray, like } from "drizzle-orm";

const dataPerPage = 15;

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
            const result: {
                metaData: {
                    names: string[]
                },
                games: gamePlayerData[]
            } = {
                metaData: {
                    names: []
                },
                games: []
            };

            const playerDt = await db.select({id: player.id})
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

            const playerNames = await db.select({ name: playerName.name })
                .from(playerName)
                .where(eq(playerName.playerId, playerDt[0]?.id ?? -1))

            result.metaData.names = playerNames.map(dt => dt.name);

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
