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
                <div
                    class={"w-full border rounded-l-full py-2 text-center cursor-pointer font-bold tracking-widest uppercase transition-all duration-200 text-gray-500 hover:text-gray-300" + (matchLayout ? " text-white shadow-lg" : "")} 
                    style={
                        matchLayout ? {
                            background: "linear-gradient(135deg,#7c3aed,#4f46e5)"
                        } : {}
                    }
                    onClick={() => setMatchLayout(true)}
                >Matches</div>
                <div 
                    class={"w-full border rounded-r-full py-2 text-center cursor-pointer font-bold tracking-widest uppercase transition-all duration-200 text-gray-500 hover:text-gray-300" + (matchLayout ? "" : " text-white shadow-lg")} 
                    style={
                        matchLayout ? {} : {
                            background: "linear-gradient(135deg,#d97706,#b45309)"
                        }
                    }
                    onClick={() => setMatchLayout(false)}
                >Standings</div>
            </div>
            <div class="grow flex flex-row gap-2">
                {
                    matchLayout ?
                        Object.entries(groupedMatches).map(([nMatch, data], groupIdx) => 
                            <div class="w-full h-full flex flex-col" key={'col-' + nMatch}>
                                <div class="grow relative">
                                        <div class="h-full w-full flex flex-col absolute overflow-auto gap-4 pe-4">
                                            <div class="text-center font-bold text-xl uppercase">Round {groupIdx + 1}</div>
                                            {
                                                Object.entries(data).sort((a, b) => {
                                                    return (Number(b[0]) - Number(a[0]));
                                                }).map(dt => 
                                                    dt[1].map((match, idx) =>
                                                        <div
                                                            key={"col-" + nMatch + "-" + dt[0] + "-" + idx}
                                                            className="flex px-3 py-5 flex-col relative rounded-xl transition-all duration-300 shadow-md hover:-translate-y-0.5 hover:shadow-2xl"
                                                            style={{
                                                                background: "rgba(27, 21, 53, 0.85)",
                                                                border: "1px solid rgba(124,58,237,0.2)",
                                                                backdropFilter: "blur(8px)",
                                                            }}
                                                        >
                                                            <div class="text-center font-bold">{match.teams[0]}</div>
                                                            <div class="text-center text-xs">VS</div>
                                                            <div class="text-center font-bold">{match.teams[1]}</div>
                                                            <div className="px-4 pb-3">
                                                                <div
                                                                    className="flex items-center gap-2 mt-1"
                                                                    style={{ opacity: 0.3 }}
                                                                >
                                                                    <div className="flex-1 h-px bg-current" />
                                                                    <span className="text-[9px] tracking-widest font-bold text-gray-400">
                                                                        Matches
                                                                    </span>
                                                                    <div className="flex-1 h-px bg-current" />
                                                                </div>
                                                            </div>
                                                            {
                                                                match.links.map((e, idx2) =>
                                                                    <div class="flex flex-row gap-2 justify-center items-center" key={"col-" + nMatch + "-" + dt[0] + "-" + idx + "-" + idx2}>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20">
                                                                            <path fill="white" stroke="white" d="M581.7 188.1C575.5 164.4 556.9 145.8 533.4 139.5C490.9 128 320.1 128 320.1 128C320.1 128 149.3 128 106.7 139.5C83.2 145.8 64.7 164.4 58.4 188.1C47 231 47 320.4 47 320.4C47 320.4 47 409.8 58.4 452.7C64.7 476.3 83.2 494.2 106.7 500.5C149.3 512 320.1 512 320.1 512C320.1 512 490.9 512 533.5 500.5C557 494.2 575.5 476.3 581.8 452.7C593.2 409.8 593.2 320.4 593.2 320.4C593.2 320.4 593.2 231 581.8 188.1zM264.2 401.6L264.2 239.2L406.9 320.4L264.2 401.6z"/>
                                                                        </svg>
                                                                        <a class="hover:font-bold" target="_blank" href={"https://www.youtube.com/watch?v=" + e.code}>
                                                                            <span class="underline">Game {idx2 + 1}</span>
                                                                            <span> ({match.teams[e.result - 1]} Won)</span>
                                                                        </a>
                                                                        
                                                                    </div>                                                                
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
                    :   Object.entries(groupedStandings).map(([nMatch, data], groupIdx) => 
                        <div class="w-full h-full flex flex-col" key={'col-' + nMatch}>
                            <div class="grow relative">
                                    <div class="h-full w-full flex flex-col absolute overflow-auto gap-4 pe-4">
                                        <div class="text-center font-bold text-xl uppercase">Round {groupIdx + 1}</div>
                                        {
                                            Object.entries(data).sort((a, b) => {
                                                const aScore = a[0].split("-").reduce((acc, curr, idx) => acc + Number(curr)*(3 - idx*3), 0);
                                                const bScore = b[0].split("-").reduce((acc, curr, idx) => acc + Number(curr)*(3 - idx*3), 0);
                                                return (bScore - aScore);
                                            }).map(dt => 
                                                <div
                                                    key={"col-" + nMatch + "-" + dt[0]}
                                                    className="flex px-3 py-5 flex-col relative rounded-xl transition-all duration-300 shadow-md hover:-translate-y-0.5 hover:shadow-2xl"
                                                    style={{
                                                        background: "rgba(27, 21, 53, 0.85)",
                                                        border: "1px solid rgba(124,58,237,0.2)",
                                                        backdropFilter: "blur(8px)",
                                                    }}
                                                >
                                                    <div
                                                        className="px-4 py-2 flex items-center justify-between"
                                                        style={{
                                                            background: "linear-gradient(90deg,rgba(124,58,237,0.15),transparent)",
                                                            borderBottom: "1px solid rgba(124,58,237,0.12)",
                                                        }}
                                                        >
                                                        <span
                                                            className="text-mdfont-bold tracking-[0.2em] uppercase"
                                                            style={{ color: "#a78bfa" }}
                                                        >
                                                            SCORE
                                                        </span>
                                                        <span className="text-md font-semibold text-green-400 tracking-widest uppercase">
                                                            {dt[0]}
                                                        </span>
                                                    </div>
                                                    <ul class="list-disc ps-5">
                                                        {
                                                            dt[1].map((name, idx) =>
                                                                <li class="text-md" key={"col-" + nMatch + "-" + dt[0] + "-" + idx}>
                                                                    {name}
                                                                </li>
                                                            )
                                                        }
                                                    </ul>
                                                    
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