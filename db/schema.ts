import { sqliteTable, integer, text, unique, uniqueIndex, AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { sql, SQL } from "drizzle-orm";

export const initialElo = 1000;

export const game = sqliteTable("game", {
    id: integer("id").primaryKey(),
    gameId: text("game_id").notNull().unique(),
    saveVer: text("save_ver").notNull(),
    exeVerMajor: integer("exe_ver_major").notNull(),
    exeVerMinor: integer("exe_ver_minor").notNull(),
    exeVerPatch: integer("exe_ver_patch").notNull(),
    gameType: text("game_type").notNull(),
    randomizedPos: integer("randomized_pos", {mode: "boolean"}).notNull().default(false),
    map: text("map").notNull()
});

export const gamePlayer = sqliteTable("game_player", {
    id: integer("id").primaryKey(),
    gameId: integer("game_id").references(() => game.id, { onDelete: "cascade" }),
    playerId: integer("player_id").references(() => player.id, { onDelete: "cascade" }),
    nameId: integer("name_id").references(() => playerName.id),
    faction: text("faction").notNull(),
    randomFaction: integer("random_faction", { mode: "boolean" }).notNull(),
    team: integer("team"),
    position: integer("pos").notNull()
}, (table) => [
    unique().on(table.gameId, table.playerId)
]);

export const player = sqliteTable("player", {
    id: integer("id").primaryKey(),
    uuid: text("uuid").notNull(),
    sinsId: text("sins2_id").notNull().unique(),
    elo: integer('elo').notNull().default(initialElo)
});

export const playerName = sqliteTable("player_name", {
    id: integer("id").primaryKey(),
    playerId: integer("player_id").references(() => player.id, { onDelete: "cascade" }),
    name: text("name").notNull()
}, (table) => [
    unique().on(table.playerId, table.name),
]);

export const vote = sqliteTable("vote", {
    id: integer("id").primaryKey(),
    gameId: integer("game_id").references(() => game.id, { onDelete: "cascade" }),
    playerId: integer("player_id").references(() => player.id, { onDelete: "cascade" }),
    winner: integer("winner").notNull(),
}, (table) => [
    unique().on(table.gameId, table.playerId)
]);

export const voteHistory = sqliteTable("vote_history", {
    id: integer("id").primaryKey(),
    voteId: integer("vote_id").references(() => vote.id, { onDelete: "cascade" }),
    ip: text("ip").notNull(),
    date: integer("date").notNull()
});

export function lower(name: AnySQLiteColumn): SQL {
  return sql`lower(${name})`;
}

export const GAME_TYPE_FFA = "FFA";
export const GAME_TYPE_TEAM = "TEAM";