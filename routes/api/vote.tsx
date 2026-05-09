import { db } from "@/db/database.ts";
import { define, type MetaData } from "../../utils.ts";
import { game, GAME_TYPE_FFA, GAME_TYPE_TEAM, gamePlayer, player, playerName, vote, voteHistory } from "@/db/schema.ts";
import { v3 } from "@std/uuid";
import { NAMESPACE_DNS } from "@std/uuid/constants";
import { sql } from "drizzle-orm";

export const handler = define.handlers({
    async POST(ctx) {
        try {
            const payload = await ctx.req.json() as { gameData: MetaData, winner: number };
            const forwarded = ctx.req.headers.get("x-forwarded-for");
            const direct = (ctx.info.remoteAddr as Deno.NetAddr).hostname;
            const clientIP = forwarded ? forwarded.split(",")[0] : direct;

            const gameData = await db.insert(game).values({
                    gameId: payload.gameData.gameId,
                    saveVer: payload.gameData.ver,
                    exeVerMajor: payload.gameData.exeVer.major,
                    exeVerMinor: payload.gameData.exeVer.minor,
                    exeVerPatch: payload.gameData.exeVer.patch,
                    gameType: payload.gameData.isFFA ? GAME_TYPE_FFA : GAME_TYPE_TEAM,
                    map: payload.gameData.map,
                    randomizedPos: payload.gameData.randomizedPos
                }).onConflictDoUpdate({
                    target: game.gameId,
                    set: { gameId: payload.gameData.gameId }
                }).returning();

            const uuids: string[] = [];
            const uintEncoder = new TextEncoder();
            for (const playerDt of payload.gameData.player) {
                const newUuid = await v3.generate(NAMESPACE_DNS, uintEncoder.encode(playerDt.id + " " + Deno.env.get("APP_ID")));
                uuids.push(newUuid);
            }

            const playerDataRaw = await db.insert(player).values(payload.gameData.player.map((playerDt, idx:number) => ({
                uuid: uuids[idx],
                sinsId: playerDt.id
            }))).onConflictDoUpdate({
                target: player.sinsId,
                set: {
                    sinsId: sql.raw(`excluded.${player.sinsId.name}`)
                }
            }).returning();
            const playerData = payload.gameData.player.map(playerDt => playerDataRaw.find(dt => dt.sinsId == playerDt.id));

            const playerNames = await db.insert(playerName).values(payload.gameData.player.map((playerDt, idx:number) => ({
                name: playerDt.name,
                playerId: playerData[idx]?.id
            }))).onConflictDoUpdate({
                target: [playerName.name, playerName.playerId],
                set: {
                    name: sql.raw(`excluded.${playerName.name.name}`)
                }
            }).returning();

            await db.insert(gamePlayer).values(payload.gameData.player.map((playerDt, idx:number) => ({
                gameId: gameData[0].id,
                playerId: playerData[idx]?.id,
                nameId: playerNames.find(dt => dt.name == playerDt.name)?.id,
                team: payload.gameData.isFFA ? null : playerDt.team,
                faction: playerDt.faction,
                randomFaction: playerDt.randomFaction,
                position: playerDt.position
            }))).onConflictDoNothing({
                target: [gamePlayer.gameId, gamePlayer.playerId],
            });

            const voteDt = await db.insert(vote).values({
                gameId: gameData[0].id,
                playerId: playerData[payload.gameData.recordPlayerIdx]?.id,
                winner: payload.winner
            }).onConflictDoUpdate({
                target: [vote.playerId, vote.gameId],
                set: {
                    winner: payload.winner
                }
            }).returning();

            await db.insert(voteHistory).values({
                voteId: voteDt[0].id,
                ip: clientIP,
                date: Math.floor((new Date().valueOf())/1000)
            });
        
            return new Response("OK", {
                status: 200,
            });
        } catch (err) {
            console.log(err);
            return new Response("BAD REQUEST", {
                status: 400
            });
        }
    },
});
