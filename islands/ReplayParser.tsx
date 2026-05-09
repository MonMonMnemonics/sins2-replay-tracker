import { useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import * as zipJs from "@zip-js/zip-js";
import swal from "sweetalert2";
// @ts-types="preact"
import { Fragment } from "preact";
import { type MetaData, PlayerData } from "@/utils.ts";

interface ChatMessages{
    text: string,
    fromName: string,
    toName: string,
    timeStamp: number,
    roomType: number,
    fromId: string,    
    toId: string
}

export default function ReplayParser() {    
    const fileInput = useRef<HTMLInputElement>(null);
    const fileName = useSignal("");
    const gameData = useSignal<MetaData|null>(null);
    const isFromSavedGame = useSignal<boolean>(false);
    const chats = useSignal<ChatMessages[]>([])
    const winner = useSignal(-1);
    const isLoading = useSignal<boolean>(false);

    async function submitVote() {
        if (!isLoading.value) {
            isLoading.value = true;            

            const res = await fetch("/api/vote", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    gameData,
                    winner
                })
            });

            isLoading.value = false;

            if (res.status == 200) {
                swal.fire({
                    title: "Vote submitted",
                    theme: "dark",
                    icon: "success",
                });
                
                fileName.value = "";
                winner.value = -1;
                isFromSavedGame.value = false;
                chats.value = [];
                gameData.value = null;
            } else {
                swal.fire({
                    title: "Server Error",
                    theme: "dark",
                    icon: "error",
                })
            }
        }
    }

    async function parseFile(ev: Event) {
        const targets = ev.target as HTMLInputElement;

        try {
            for (const fileTarget of (targets.files ?? [])) {
                fileName.value = fileTarget.name

                const entries = await (new zipJs.ZipReader(new zipJs.BlobReader(fileTarget))).getEntries({ filenameEncoding: 'utf-8'});
                const metaDataFile = entries.find(entry => entry.filename == "meta_data.json");
                const chatFile = entries.find(entry => entry.filename == "chat_messages");

                if ((!metaDataFile) || (!chatFile)) {
                    swal.fire({
                        title: "Unable to parse replay file",
                        icon: "warning",
                        theme: "dark"
                    });
                    return;
                }
                
                //@ts-ignore: misrecognition of type, Entry to DirectoryEntry
                let metaData = await metaDataFile.getData(new zipJs.TextWriter());
                metaData = JSON.parse(metaData);

                //@ts-ignore: misrecognition of type, Entry to DirectoryEntry
                let chatData = await chatFile.getData(new zipJs.Uint8ArrayWriter());
                chatData = chatData.slice(5);

                const parsedChat: ChatMessages[] = [];
                const textDecoder = new TextDecoder("utf-8");
                while (chatData.length > 15) {
                    const readChunk: number[] = [];
                    chatData.slice(0, 14).forEach((e: number) => readChunk.push(e))
                    chatData = chatData.slice(14);

                    if (readChunk[5] > 1) {
                        chatData = chatData.slice(2);
                        readChunk.push(...chatData.slice(0, readChunk[12] + 1).map((e: number) => e))
                        chatData = chatData.slice(readChunk[12] + 1);
                    } else {
                        readChunk.push(...chatData.slice(0, readChunk[10] + 1).map((e: number) => e))
                        chatData = chatData.slice(readChunk[10] + 1);
                    }

                    parsedChat.push({
                        text: textDecoder.decode(new Uint8Array(readChunk.slice(14, readChunk.length - ((chatData.length > 0) ? 1 : 0))).buffer),
                        timeStamp: Math.floor((readChunk[0] + readChunk[1]*256 + readChunk[2]*256*256)*2.56)*1000,
                        fromName: metaData["players"][readChunk[3]]["name"],
                        toName: ((readChunk[5] == 0) ? "All" : (readChunk[5] == 1) ? "Team" : metaData["players"][readChunk[10]]["name"]),
                        roomType: readChunk[5],
                        fromId: metaData["lobby"]["player_slots"]["slots"][metaData["players"][readChunk[3]]["player_index"]]["account_id"]["id_provider"] 
                            + "-" + metaData["lobby"]["player_slots"]["slots"][metaData["players"][readChunk[3]]["player_index"]]["account_id"]["id"],
                        toId: ((readChunk[5] == 0) ? "All" : (readChunk[5] == 1) ? "Team" : 
                            metaData["lobby"]["player_slots"]["slots"][metaData["players"][readChunk[10]]["player_index"]]["account_id"]["id_provider"] 
                            + "-" + metaData["lobby"]["player_slots"]["slots"][metaData["players"][readChunk[10]]["player_index"]]["account_id"]["id"]),

                    });
                }

                chats.value = parsedChat
                gameData.value = {
                    ver: metaData.version,
                    exeVer: {
                        major: metaData.framework.exe_version.major,
                        minor: metaData.framework.exe_version.minor,
                        patch: metaData.framework.exe_version.patch
                    },
                    map: metaData.lobby.scenario.replaceAll("_", " ").replace(/\b\w/g, (char: string) => char.toUpperCase()),
                    isMultiplayer: metaData.lobby.is_multi_player,
                    // deno-lint-ignore no-explicit-any
                    player: metaData.lobby.player_slots.slots.map((player: any, idx: number) => ({
                        id: player.account_id.id_provider + "-" + player.account_id.id,
                        name: player.name,
                        faction: player.player_pick.non_random_player_definition.replaceAll("_", " ").replace(/\b\w/g, (char: string) => char.toUpperCase()),
                        randomFaction: metaData.scenario_setup.player_slots.slots[idx].player_pick.is_random,
                        team: player.team_index,
                        position: idx
                    })),
                    isFFA: (metaData.lobby.player_slots.configuration.team_count == 0),
                    recordPlayerIdx: metaData.recorder_player_index,
                    gameId: metaData.game_id,
                    randomizedPos: metaData.lobby.scenario_info.ignore_teams_for_start_positions ?? false
                };

                winner.value = -1;
                isFromSavedGame.value = metaData.lobby.is_loading_saved_game ?? false;
            }
        } catch {
            swal.fire({
                title: "Unable to parse replay file",
                icon: "warning"
            });
            return;
        }        
    }

    return (
        <div class="flex flex-col gap-2 grow select-none">
            {
                (isLoading.value) ?
                <div class="h-screen w-screen fixed flex flex-row z-[10]">
                    <div class="h-full w-full bg-black absolute opacity-[0.6] flex flex-row z-[20]"></div>
                    <div class="flex flex-col mx-auto z-[30]">
                        <div class="my-auto h-[50%] aspect-square animate-spin">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" stroke="white" fill="white">
                                <path d="M272 112C272 85.5 293.5 64 320 64C346.5 64 368 85.5 368 112C368 138.5 346.5 160 320 160C293.5 160 272 138.5 272 112zM272 528C272 501.5 293.5 480 320 480C346.5 480 368 501.5 368 528C368 554.5 346.5 576 320 576C293.5 576 272 554.5 272 528zM112 272C138.5 272 160 293.5 160 320C160 346.5 138.5 368 112 368C85.5 368 64 346.5 64 320C64 293.5 85.5 272 112 272zM480 320C480 293.5 501.5 272 528 272C554.5 272 576 293.5 576 320C576 346.5 554.5 368 528 368C501.5 368 480 346.5 480 320zM139 433.1C157.8 414.3 188.1 414.3 206.9 433.1C225.7 451.9 225.7 482.2 206.9 501C188.1 519.8 157.8 519.8 139 501C120.2 482.2 120.2 451.9 139 433.1zM139 139C157.8 120.2 188.1 120.2 206.9 139C225.7 157.8 225.7 188.1 206.9 206.9C188.1 225.7 157.8 225.7 139 206.9C120.2 188.1 120.2 157.8 139 139zM501 433.1C519.8 451.9 519.8 482.2 501 501C482.2 519.8 451.9 519.8 433.1 501C414.3 482.2 414.3 451.9 433.1 433.1C451.9 414.3 482.2 414.3 501 433.1z"/>
                            </svg>
                        </div>
                    </div>
                </div>
                : null
            }
            <input class="hidden" ref={fileInput} type="file" onChange={parseFile} accept=".sins2_record" value=""/>
            <button type="button" class="font-bold p-2 border cursor-pointer rounded-lg px-4 py-2" onClick={() => {
                if (fileInput) {
                    fileInput.current?.click();
                }
            }}>
                { (fileName.value == "") ? "Upload a Replay File" : "FILE: " + fileName.value}
            </button>
            {
                (gameData.value != null) ?
                <Fragment>
                    <div class="h-full w-full flex flex-col overflow-auto gap-2 grow">
                        <div className="mx-auto px-6 py-3 flex flex-row justify-around gap-x-6 gap-y-1 text-lg text-gray-500 border-y border-gray-300 text-white font-bold w-full">
                            <span><span>VERSION:</span> <span>{gameData.value.exeVer.major + "." + gameData.value.exeVer.minor + "." + gameData.value.exeVer.patch + " (" + gameData.value.ver + ")"}</span></span>
                            <span><span>REPLAY OWNER:</span> <span>{gameData.value.player[gameData.value.recordPlayerIdx].name}</span></span>
                            <span><span>MAP:</span> <span>{gameData.value.map}</span></span>
                            <span><span>MODE:</span> <span>{gameData.value.isMultiplayer ? "Multiplayer" : "Singleplayer"}, {gameData.value.isFFA ? "FFA" : "Team"}, {gameData.value.randomizedPos ? "Random Position" : "Fixed Position"}</span></span>
                        </div>
                        <div class="flex flex-row grow">
                            <div class="w-[30%] flex flex-col border-r pe-3">
                                <div class="text-center font-bold text-xl pb-3">Players</div>
                                <div class="grow relative">
                                    <div class="h-full w-full flex flex-col absolute overflow-auto gap-2">
                                        {
                                            gameData.value.player.map((player: PlayerData, idx: number) => 
                                                <div key={"player-" + idx} class="flex flex-col border rounded-xl p-2 text-xl">
                                                    <div class="flex flex-row justify-between font-bold">
                                                        <div>{player.name} {(player.id == "0-") ? "(AI)" : ""}</div>
                                                        {
                                                            !gameData.value?.isFFA ? <div class="font-bold text-nowrap">Team {player.team + 1}</div> : null
                                                        }
                                                    </div>                                                
                                                    <div>{player.faction} {(player.randomFaction ? "(Random Faction)" : "")}</div>
                                                </div>
                                            )
                                        }
                                    </div>
                                </div>
                            </div>
                            <div class="w-[50%] flex flex-col px-3">
                                <div class="text-center font-bold text-xl pb-3">Chat Log</div>
                                <div class="grow relative">
                                    <div class="h-full w-full flex flex-col absolute overflow-auto gap-2">
                                        {
                                            chats.value.map((chat, idx: number) => 
                                                <Fragment key={"chat-" + idx}>
                                                    {
                                                        (idx > 0) ? <hr/> : null
                                                    }
                                                    <div class="flex flex-col">
                                                        <div>{new Date(chat.timeStamp).toISOString().substring(11, 19)}, {chat.fromName} to {chat.toName}</div>
                                                        <div>{chat.text}</div>
                                                    </div>
                                                </Fragment>
                                            )
                                        }
                                    </div>
                                </div>
                            </div>
                            <div class="w-[20%] flex flex-col relative border-l">
                                <div class="text-center font-bold text-xl pb-3">Match Result</div>
                                <div class="grow relative">
                                    <div class="h-full w-full flex flex-col absolute overflow-auto gap-2 ps-3">
                                        {
                                            gameData.value.isFFA ? 
                                            <Fragment>
                                                {
                                                    gameData.value.player.map((player, idx: number) => 
                                                        <div key={"win-ffa-" + idx} 
                                                            class={"rounded-2xl border p-2 font-bold tracking-wider uppercase transition-all duration-200 text-center cursor-pointer" + ((idx == winner.value) ? " bg-white text-black" : "")}
                                                            onClick={() => winner.value = idx}
                                                        >
                                                            {player.name} won
                                                        </div>
                                                    )
                                                }
                                            </Fragment> :
                                            <Fragment>
                                                {
                                                    [...new Set(gameData.value.player.map(player => player.team))].map(teamNumber => 
                                                        <div key={"win-team-" + teamNumber} 
                                                            class={"rounded-2xl border text-xl p-2 font-bold tracking-wider uppercase transition-all duration-200 text-center cursor-pointer" + ((teamNumber == winner.value) ? " bg-white text-black" : "")}
                                                            onClick={() => winner.value = teamNumber}
                                                        >
                                                            Team {teamNumber + 1} won
                                                        </div>
                                                    )
                                                }
                                            </Fragment>
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button type="button" class="mb-3 font-bold p-2 border rounded-xl cursor-pointer disabled:cursor-not-allowed" 
                        disabled={!gameData.value.isMultiplayer || (gameData.value.player.filter(e => e.id == "0-").length > 0) || (winner.value < 0) || isFromSavedGame.value}
                        onClick={submitVote}
                    >
                        {
                            !gameData.value.isMultiplayer ? "Game is singleplayer"
                            : (gameData.value.player.filter(e => e.id == "0-").length > 0) ? "Game has AI player"
                            : (winner.value < 0) ? "Need to identify the winner of the game"
                            : (isFromSavedGame.value) ? "Lobby loaded from a saved game"
                            : "Submit Result As " + gameData.value.player[gameData.value.recordPlayerIdx].name
                        }
                    </button>
                </Fragment>
                : null
            }
        </div>
    );
}
