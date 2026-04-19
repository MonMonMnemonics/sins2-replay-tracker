import { useEffect, useState } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { gamePlayerData } from "@/utils.ts";
import { Fragment } from "preact";
import { GAME_TYPE_FFA } from "@/db/schema.ts";
import Swal from "sweetalert2";

export default function PlayerDataWidget() {
    const [searchName, setSearchName] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [suggestions, setSuggestion] = useState<string[]>([]);

    const pageNumber = useSignal(0);
    const playerGames = useSignal<gamePlayerData[]>([]);
    const playerAliases = useSignal<string[]>([]);
    const disableLoadMore = useSignal(false);
    const fetchSuggestionTimeout = useSignal<number | null>(null);

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
            playerAliases.value = body.metaData.names ?? [];
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
            <div class="relative w-full" onMouseLeave={() => setShowDropdown(false)}>
                <div class="flex flex-row items-center py-2 px-3 border rounded-xl">
                    <input placeholder="Player name..." class="px-2 w-full" value={searchName} 
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
                    <button type="button" class="cursor-pointer text-nowrap" onClick={() => getData(searchName)}>Search Player</button>
                </div>
                {
                    showDropdown ?
                    <div class="absolute w-full overflow-y-auto">
                        {
                            suggestions.filter(name => name.toLowerCase().includes(searchName.toLowerCase())).map(name => 
                                <div key={"suggestion-" + name} onClick={() => {setSearchName(name); setShowDropdown(false); getData(name);}} class="w-full bg-black text-white px-2 py-1 font-bold hover:text-black hover:bg-white cursor-pointer z-10">
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
                    <div class="font-bold text-sm">Aliases: {playerAliases.value.join(", ")}</div>
                    <div class="grow relative">
                        <div class="h-full w-full flex flex-col absolute overflow-auto gap-2">
                            {
                                playerGames.value.map((game, idx: number) => 
                                    <div class={"flex flex-col p-2 border-2 rounded-2xl " + (game.win ? "border-green-500" : "border-red-500")} key={"game-" + idx}>
                                        <div class="p-2 flex flex-row gap-3">
                                            <button type="button" class="font-bold cursor-pointer hover:text-blue-500" onClick={() => popupVotes(game.votes)}>
                                                See votes
                                            </button>
                                            <div>{game.map}, {game.gameType}, Version: {game.version}</div>
                                            <div class={"ms-auto font-bold " + (game.win ? "text-green-500" : "text-red-500")}>{(game.win) ? "VICTORY" : "DEFEAT"}</div>
                                        </div>
                                        <div class="grid grid-cols-5 gap-3">
                                            {
                                                game.players.map((player, idx2: number) => 
                                                    <div key={"player-" + idx2} class="flex flex-col border rounded-xl p-2">
                                                        <div class="flex flex-row justify-between font-bold">
                                                            <div>{player.name}</div>
                                                            {
                                                                !(game.gameType == GAME_TYPE_FFA) ? <div class="font-bold text-nowrap">Team {player.team + 1}</div> : null
                                                            }
                                                        </div>                                                
                                                        <div class="mt-auto">{player.faction} {(player.randomFaction ? "(Random Faction)" : "")}</div>
                                                    </div>
                                                )
                                            }
                                        </div>
                                    </div>
                                )
                            }
                        </div>
                    </div>
                    <button type="button" class="mb-3 font-bold p-2 border rounded-xl cursor-pointer disabled:cursor-not-allowed" onClick={() => getData(searchName, pageNumber.value)} disabled={disableLoadMore}>
                        Load more
                    </button>
                </Fragment>
                : null
            }
        </div>        
    )
}