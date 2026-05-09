import { type MatchData } from "@/utils/4p2b.ts";
import { Fragment } from "preact/jsx-dev-runtime";
import { useState } from "preact/hooks";

export default function Tourney4P2B({ groupedStandings, groupedMatches} : {
    groupedStandings: {[key: number]: {[key: string]: string[]}},
    groupedMatches: {[key:number]: {[key: number]: MatchData[]}}
}) {
    const [matchLayout, setMatchLayout] = useState(true);

    return(
        <Fragment>
            <div class="flex flex-row items-center px-7">
                <div class={"w-full border rounded-l-full text-center cursor-pointer" + (matchLayout ? " bg-accent-purple" : "")} onClick={() => setMatchLayout(true)}>Matches</div>
                <div class={"w-full border rounded-r-full text-center cursor-pointer" + (matchLayout ? "" : " bg-accent-purple")} onClick={() => setMatchLayout(false)}>Standings</div>
            </div>
            <div class="grow flex flex-row gap-2">
                {
                    matchLayout ?
                        Object.entries(groupedMatches).map(([nMatch, data]) => 
                            <div class="w-full h-full flex flex-col" key={'col-' + nMatch}>
                                <div class="grow relative">
                                        <div class="h-full w-full flex flex-col absolute overflow-auto gap-4 pe-4">
                                            {
                                                Object.entries(data).sort((a, b) => {
                                                    return (Number(b[0]) - Number(a[0]));
                                                }).map(dt => 
                                                    dt[1].map((match, idx) =>
                                                        <div class="flex flex-col gap-2 border p-3 rounded-xl" key={"col-" + nMatch + "-" + dt[0] + "-" + idx}>
                                                            <div>{match.teams[0]} vs {match.teams[1]}</div>
                                                            {
                                                                match.links.map((e, idx2) =>
                                                                    <span key={"col-" + nMatch + "-" + dt[0] + "-" + idx + "-" + idx2}>
                                                                        <a
                                                                            class="underline"
                                                                            target="_blank" href={"https://www.youtube.com/watch?v=" + e.code}
                                                                        >Game {idx2 + 1}</a>
                                                                        <span> ({match.teams[e.result - 1]} Won)</span>
                                                                    </span>                                                                
                                                                )
                                                            }
                                                        </div>
                                                    )                                                
                                                )
                                            }
                                        </div>
                                </div>
                            </div>
                        )
                    :   Object.entries(groupedStandings).map(([nMatch, data]) => 
                        <div class="w-full h-full flex flex-col" key={'col-' + nMatch}>
                            <div class="grow relative">
                                    <div class="h-full w-full flex flex-col absolute overflow-auto gap-4 pe-4">
                                        {
                                            Object.entries(data).sort((a, b) => {
                                                const aScore = a[0].split("-").reduce((acc, curr, idx) => acc + Number(curr)*(3 - idx*3), 0);
                                                const bScore = b[0].split("-").reduce((acc, curr, idx) => acc + Number(curr)*(3 - idx*3), 0);
                                                return (bScore - aScore);
                                            }).map(dt => 
                                                <div class="flex flex-col gap-2 border p-3 rounded-xl" key={"col-" + nMatch + "-" + dt[0]}>
                                                    <div>{dt[0]}</div>
                                                    {
                                                        dt[1].map((name, idx) =>
                                                            <span key={"col-" + nMatch + "-" + dt[0] + "-" + idx}>
                                                                {name}
                                                            </span>                                                                
                                                        )
                                                    }
                                                </div>
                                            )
                                        }
                                    </div>
                            </div>
                        </div>
                    )
                }
            </div>
        </Fragment>        
    )
}