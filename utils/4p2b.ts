import { parse as csvParse } from "@std/csv";
import { parse as dateParse, difference as dateDifference } from "@std/datetime";

interface DataFormat4P2B {
    team1: string,
    team2: string,
    game: number,
    date: string,
    tourney: string,
    result: number,
    link: string
}

export interface MatchData {
    teams: string[],
    result: number,
    links: {code: string, result: number}[],
    latestDate: string
}

export async function getData() {
    const csvData = await Deno.readTextFile("./assets/4p2b.csv");

    const parsedData = csvParse(csvData, {
        skipFirstRow: true,
        strip: true
    });

    const data: {[key: string]: DataFormat4P2B[]} = {};
    for (const dt of parsedData) {
       if (!(dt.tourney in data))  {
            data[dt.tourney] = [];
       }

       data[dt.tourney].push({
            team1: dt.team1,
            team2: dt.team2,
            game: Number(dt.game),
            date: dt.date,
            tourney: dt.tourney,
            result: Number(dt.result),
            link: dt.link
       });
    }

    for (const tourneyName in data) {
        data[tourneyName] = data[tourneyName].sort((a, b) => {
            return (dateDifference(
                dateParse(a.date, "yyyy-MM-dd"),
                dateParse(b.date, "yyyy-MM-dd"),
                {
                    units: ["days"]
                }
            ).days ?? 0);
        })
    }

    const orderedData: {[key: string]: DataFormat4P2B[]} = Object.entries(data).map(([key, dtList]) => {
        return([key, dtList[0].date]);
    }).sort((a, b) => {
        return (dateDifference(
            dateParse(a[1], "yyyy-MM-dd"),
            dateParse(b[1], "yyyy-MM-dd"),
            {
                units: ["days"]
            }
        ).days ?? 0);
    }).reduce((acc, curr) => {
        acc[curr[0]] = data[curr[0]];
        return acc;
    }, {});

    return orderedData;
}