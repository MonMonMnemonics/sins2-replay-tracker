import { useEffect, useState } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { gamePlayerData } from "@/utils.ts";
import { Fragment } from "preact";
import { GAME_TYPE_FFA } from "@/db/schema.ts";
import Swal from "sweetalert2";
import { PlayerStatMetadata } from "@/routes/api/player.tsx";

export default function PlayerDataWidget() {
    const [searchName, setSearchName] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [suggestions, setSuggestion] = useState<string[]>([]);

    const pageNumber = useSignal(0);
    const playerGames = useSignal<gamePlayerData[]>([]);
    const disableLoadMore = useSignal(false);
    const fetchSuggestionTimeout = useSignal<number | null>(null);

    const playerMetaData = useSignal<PlayerStatMetadata>({
        names: [],
        factionPickRate: {},
        factionWinRate: {},
        totalGames: 0,
        elo: 0
    });

    useEffect(() => {
        const queryParam =  new URLSearchParams(globalThis.location.search);
        setSearchName(queryParam.get("name") ?? "");
        if ((queryParam.get("name") ?? "") != "") {
            getData(queryParam.get("name") ?? "");
        }
    }, []);
    
    async function getSuggestions(name: string) {
        if (name.length > 0) {
            const res = await fetch("/api/player?" + (new URLSearchParams({ name: name })).toString(), {
                method: "GET",
            });

            const body = await res.json() as string[];
            setSuggestion(body ?? []);
        } else {
            setSuggestion([]);
        }        
    }

    async function getData(name: string, page: number = 0) {
        const res = await fetch("/api/player", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: name,
                page: page,
            })
        });

        const body = await res.json()
        
        if (page == 0) {
            playerMetaData.value = {
                names: [],
                factionPickRate: {},
                factionWinRate: {},
                totalGames: 0,
                elo: 0,
                ...(body.metaData ?? {})
            };

            playerGames.value = body.games ?? [];
            disableLoadMore.value = false;
        } else {
            playerGames.value = [...playerGames.value, ...(body.games ?? [])];
        }

        if ((body.games ?? []).length > 0) {
            pageNumber.value = page + 1;
        } else {
            disableLoadMore.value = true;
        }
    }

    function popupVotes(votes: { name: string, winner: string }[]) {
        Swal.fire({
            title: "Winner Votes",
            theme: "dark",
            html:`
                <table class="table-auto w-full">
                    <thead>
                        <tr>
                            <th>Player</th>
                            <th>Voted for</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${
                            votes.map(vote => `
                                <tr>
                                    <td>${vote.name}</td>
                                    <td>${vote.winner}</td>
                                </tr>
                            `)
                        }
                    </tbody>
                </table>
            `
        });
    }

    return(
        <div class="flex flex-col gap-2 grow select-none">
            <div class="relative w-full z-20" onMouseLeave={() => setShowDropdown(false)}>
                <div class="flex items-center overflow-hidden border rounded-4xl transition-colors focus-within:border-[rgba(124,109,250,0.5)]">
                    <input
                        type="text"
                        class="flex-1 bg-transparent border-none outline-none px-[14px] py-3 text-accent-dim placeholder:text-white/25 font-[system-ui]"
                        placeholder="Player name..." value={searchName} 
                        onInput={(e) => {
                            const searchTarget = e.currentTarget.value;
                            setSearchName(searchTarget);
                            setShowDropdown(true);

                            if (fetchSuggestionTimeout.value != null) {
                                clearTimeout(fetchSuggestionTimeout.value);
                            }
                            fetchSuggestionTimeout.value = setTimeout(() => {
                                getSuggestions(searchTarget);
                            }, 1000);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        onKeyDown={(e) => {
                            if (e.key == 'Enter') {
                                getData(e.currentTarget.value);
                            }
                        }}
                    />
                    <button type="button" class="flex items-center gap-[6px] bg-white/5 border-l border-faint text-white/60 font-medium px-4 py-3 whitespace-nowrap transition-colors hover:bg-[rgba(124,109,250,0.15)] hover:text-accent-light cursor-pointer"
                        onClick={() => getData(searchName)}
                    >
                        Search Player
                    </button>
                </div>
                {
                    showDropdown ?
                    <div class="absolute w-full overflow-y-auto">
                        {
                            suggestions.filter(name => name.toLowerCase().includes(searchName.toLowerCase())).map(name => 
                                <div key={"suggestion-" + name} onClick={() => {setSearchName(name); setShowDropdown(false); getData(name);}} class="w-full bg-black text-white px-2 py-1 font-bold hover:text-black hover:bg-white cursor-pointer z-30">
                                    {name}
                                </div>
                            )
                        }
                    </div>
                    : null
                }
            </div>
            {
                (playerGames.value.length > 0) ?
                <Fragment>
                    <div class={`
                        relative rounded-2xl border border-gray-600
                        flex flex-col p-3 gap-3
                        bg-card backdrop-blur-sm
                    `}>
                        <div class="flex flex-row items-center gap-7">
                            <div class="w-[33%] max-w-[40ch] aspect-3/2 flex flex-col font-mono">
                                <div class="my-auto text-center font-bold text-3xl">
                                    <span>Elo Score</span><br/>
                                    <span>{ playerMetaData.value.elo }</span>
                                </div>
                                <div class="mb-3 text-center">Games: {playerMetaData.value.totalGames}</div>
                            </div>
                            <div class="w-full flex flex-col gap-4 h-full text-zinc-300 font-mono uppercase">
                                <div class="text-center tracking-widest text-xl">Faction Pick</div>
                                <div class="grow relative">
                                    <div class="absolute flex flex-col gap-1 w-full h-full flex-wrap">
                                        {
                                            Object.entries(playerMetaData.value.factionPickRate).map(([factionName, pickRate]) => 
                                                <div key={'pick-rate-' + factionName} class="flex flex-row items-center justify-between w-[25ch]">
                                                    <div>{factionName}</div>
                                                    <div class="font-bold">{pickRate}%</div>
                                                </div>
                                            )
                                        }
                                    </div>
                                </div>
                            </div>
                            <div class="w-full flex flex-col gap-4 h-full text-zinc-300 font-mono uppercase">
                                <div class="text-center tracking-widest text-xl">Faction Win Rate</div>
                                <div class="grow relative">
                                    <div class="absolute flex flex-col gap-1 w-full h-full flex-wrap">
                                        {
                                            Object.entries(playerMetaData.value.factionWinRate).map(([factionName, winRate]) => 
                                                <div key={'win-rate-' + factionName} class="flex flex-row items-center justify-between w-[25ch]">
                                                    <div>{factionName}</div>
                                                    <div class="font-bold">{winRate}%</div>
                                                </div>
                                            )
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="px-6 flex items-center gap-2 text-sm font-bold">
                            <span class="text-gray-300 uppercase tracking-widest font-mono">Aliases</span>
                            <span class="text-gray-300">·</span>
                            {playerMetaData.value.names.map((alias) => (
                                <span
                                    key={alias}
                                    class="bg-gray-800/80 border border-gray-700/50 text-gray-200 rounded px-2 py-0.5 font-mono rounded"
                                >
                                {alias}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div class="grow relative">
                        <div class="h-full w-full flex flex-col absolute overflow-auto gap-4 pe-4">
                            {
                                playerGames.value.map((game, idx: number) => 
                                    <div class={`
                                        relative rounded-xl border
                                        flex flex-col p-3
                                        bg-card backdrop-blur-sm
                                        ${game.win ? "border-emerald-100/30" : "border-red-100/30"}
                                        transition-all duration-300 hover:shadow-lg
                                        ${game.win ? "hover:shadow-emerald-500/20" : "hover:shadow-red-500/20"}
                                    `} key={"game-" + idx}>
                                        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-300/60">
                                            <div class="flex items-center gap-3">
                                                <button type="button" onClick={() => popupVotes(game.votes)}
                                                    class="text-gray-400 hover:text-gray-200 transition-colors underline underline-offset-2 font-mono cursor-pointer"
                                                >
                                                    See votes
                                                </button>
                                                <span class="text-gray-400 text-xs">·</span>
                                                <span class="text-gray-200 font-mono">{game.map}</span>
                                                <span class="text-gray-400 text-xs">·</span>
                                                <span class="text-gray-200 font-mono">{game.gameType}</span>
                                                <span class="text-gray-400 text-xs">·</span>
                                                <span class="text-gray-200 font-mono">v{game.version}</span>
                                            </div>
                                            <span
                                                class={`font-black tracking-[0.2em] uppercase 
                                                    ${game.win ? "text-emerald-400" : "text-red-400"}
                                                `}>
                                                {(game.win) ? "VICTORY" : "DEFEAT"}
                                            </span>
                                        </div>
                                        <div class="grid grid-cols-5 gap-3 pt-4">
                                            {
                                                game.players.map((player, idx2: number) => 
                                                    <div class={`
                                                            relative rounded-lg border p-3 transition-all duration-200
                                                            bg-violet-500/10 border-violet-200/20
                                                            hover:brightness-125
                                                            flex flex-col
                                                        `} key={"player-" + idx2} 
                                                    >
                                                        <div class="flex flex-row justify-between font-bold items-center mb-1.5 gap-4">
                                                            <div class="truncate">{player.name}</div>
                                                            {
                                                                !(game.gameType == GAME_TYPE_FFA) ? <div class="font-bold text-gray-200 font-mono text-nowrap">T{player.team + 1}</div> : null
                                                            }
                                                        </div>
                                                        <div class="flex flex-row items-center gap-1.5 text-xs mt-auto">
                                                            <span class="font-bold tracking-wide">
                                                                {player.faction.toUpperCase().split(" ")[0]}
                                                            </span>
                                                            <span class="text-gray-400">·</span>
                                                            <span class="text-gray-200">{player.faction.toUpperCase().split(" ")[1]}</span>
                                                            {(player.randomFaction) ? 
                                                                <span class="ml-auto bg-gray-600 text-gray-300 rounded px-1 py-0.5 border border-gray-500">
                                                                    RANDOM
                                                                </span>
                                                                : null
                                                            }
                                                        </div>
                                                    </div>
                                                )
                                            }
                                        </div>
                                    </div>
                                )
                            }
                            <button type="button" className="w-full py-3 rounded-xl border border-gray-600 text-gray-400 hover:text-gray-200 hover:border-gray-500 tracking-[0.2em] uppercase font-mono transition-all hover:bg-gray-700/40 cursor-pointer disabled:cursor-not-allowed"
                                onClick={() => getData(searchName, pageNumber.value)} disabled={disableLoadMore.value}
                            >
                                {disableLoadMore.value ? "No more record" : "Load more"}
                            </button>
                        </div>
                    </div>
                </Fragment>
                : null
            }
        </div>        
    )
}