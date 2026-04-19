import { createDefine } from "fresh";

export interface State {
  shared: string;
}

export interface PlayerData{
    id: string,
    name: string,
    faction: string,
    randomFaction: boolean,
    team: number,
    position: number
}

export interface MetaData{
    ver: number,
    exeVer: {
        major: number,
        minor: number,
        patch: number
    },
    map: string,
    isMultiplayer: boolean,
    isFFA: boolean,
    player: PlayerData[],
    recordPlayerIdx: number,
    gameId: string
}

export interface gamePlayerData {
    win: boolean,
    faction: string,
    factionRandom: boolean,
    players: {
        name: string,
        faction: string,
        randomFaction: boolean,
        team: number,
        position: number
    }[],
    votes: {
        name: string,
        winner: string
    }[],
    map: string,
    gameType: string,
    version: string
}

export const define = createDefine<State>();
