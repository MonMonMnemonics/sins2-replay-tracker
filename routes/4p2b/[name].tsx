import { Head } from "fresh/runtime";
import { page } from "fresh";
import { getData, type MatchData } from "@/utils/4p2b.ts";
import { define } from "@/utils.ts";
import Tourney4p2b from "@/islands/Tourney4p2b.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const { name } = ctx.params;
    const data = (await getData())[name.replaceAll("_", " ")] ?? [];

    //-------------------------- MATCH ENUMERATOR --------------------------
    let matches: MatchData[] = [];
    
    for (const dt of data) {
        const idx = matches.findIndex(e => e.teams.includes(dt.team1) && e.teams.includes(dt.team2));
        if (idx == -1) {
            matches.push({
                teams: [dt.team1, dt.team2],
                result: 0,
                links: [{
                    code: dt.link,
                    result: dt.result
                }],
                latestDate: dt.date
            })
        } else {
            if (matches[idx].teams[0] == dt.team1) {
                matches[idx].links.push( {
                    code: dt.link,
                    result: dt.result
                });
            } else {
                matches[idx].links.push( {
                    code: dt.link,
                    result: (dt.result > 0) ? ((dt.result == 1) ? 2 : 1) : 0
                });
            }
            
            if ((new Date(matches[idx].latestDate).getTime() < (new Date(dt.date)).getTime())) {
                matches[idx].latestDate = dt.date;
            }
        }
    }

    matches = matches.sort((a, b) => {
        return ((new Date(a.latestDate).getTime() - (new Date(b.latestDate)).getTime()));
    });

    matches = matches.map(dt => {
        const winTally: {[key: number] : number} = {};

        for (const match of dt.links) {
            winTally[match.result] = (winTally[match.result] ?? 0) + 1;
        }

        dt.result = Object.entries(winTally).reduce((acc, curr) => {
            return (curr[1] > winTally[acc]) ? Number(curr[0]) : acc;
        }, Number(Object.keys(winTally)[0]));

        return dt;
    })

    //-------------------------- STANDING AND GROUPING ENUMERATOR --------------------------
    const standings: {[key:string] : {
        win: number,
        lose: number,
        matchNum: number
    }} = {}

    const groupedStandings: {[key: number]: {[key: string]: string[]}} = {};
    const groupedMatches: {[key:number]: {[key: number]: MatchData[]}} = {};

    for (const match of matches) {
        for (const name of match.teams) {
            if (!(name in standings)) {
                standings[name] = {
                    win: 0,
                    lose: 0,
                    matchNum: 0
                }
            }
        }
    }

    groupedStandings[0] = {
        "0-0": []
    };

    for (const name in standings) {
        groupedStandings[0]["0-0"].push(name);
    }

    for (const match of matches) {
        const scoreTeam1 = standings[match.teams[0]].win - standings[match.teams[0]].lose;
        const scoreTeam2 = standings[match.teams[1]].win - standings[match.teams[1]].lose;

        const largestScore = (scoreTeam1 > scoreTeam2) ? scoreTeam1 : scoreTeam2;
        const smallesNMatch = (standings[match.teams[0]].matchNum > standings[match.teams[0]].matchNum) ? 
            standings[match.teams[0]].matchNum : standings[match.teams[0]].matchNum;

        if (!(smallesNMatch in groupedMatches)) {
            groupedMatches[smallesNMatch] = {};
        }

        if (!(largestScore in groupedMatches[smallesNMatch])) {
            groupedMatches[smallesNMatch][largestScore] = [];
        }

        groupedMatches[smallesNMatch][largestScore].push(match);

        if (match.result === 1) {
            standings[match.teams[0]].win += 1;
            standings[match.teams[0]].matchNum += 1;
            standings[match.teams[1]].lose += 1;
            standings[match.teams[1]].matchNum += 1;
        } else if (match.result === 2) {
            standings[match.teams[0]].lose += 1;
            standings[match.teams[0]].matchNum += 1;
            standings[match.teams[1]].win += 1;
            standings[match.teams[1]].matchNum += 1;
        }

        for (const name of match.teams) {
            if (!(standings[name].matchNum in groupedStandings)) {
                groupedStandings[standings[name].matchNum] = {};
            }

            const key = standings[name].win + "-" + standings[name].lose;
            if (!(key in groupedStandings[standings[name].matchNum])) {
                groupedStandings[standings[name].matchNum][key] = [];
            }

            groupedStandings[standings[name].matchNum][key].push(name);
        }
    }

    for (const nMatch in groupedMatches) {
        groupedMatches[nMatch] = Object.fromEntries(Object.entries(groupedMatches[nMatch]).sort((a, b) => {
            return (Number(b[0]) - Number(a[0]));
        }))
    }

    for (const nMatch in groupedStandings) {
        groupedStandings[nMatch] = Object.fromEntries(Object.entries(groupedStandings[nMatch]).sort((a, b) => {
            const aScore = a[0].split("-").reduce((acc, curr, idx) => acc + Number(curr)*(3 - idx*3), 0);
            const bScore = b[0].split("-").reduce((acc, curr, idx) => acc + Number(curr)*(3 - idx*3), 0);
            return (bScore - aScore);
        }))
    }

    return page({ groupedMatch: groupedMatches, groupedStandings: groupedStandings, name: name.replaceAll("_", " ") });
  },
});

export default define.page<typeof handler>(({ data }) => {
    return (
        <div class="h-screen w-screen flex flex-col px-8 pt-8 pb-4 gap-3 text-white">
            <Head>
                <title>4p2b {data.name}</title>
            </Head>
            <div className="mb-2 text-center">
                <h1 className="text-2xl font-black tracking-[0.3em] uppercase text-gray-100 mb-1">
                    4 Power 2 Balance: {data.name}
                </h1>
                <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
            </div>
            <Tourney4p2b groupedStandings={data.groupedStandings} groupedMatches={data.groupedMatch}/>
        </div>
    );
});
