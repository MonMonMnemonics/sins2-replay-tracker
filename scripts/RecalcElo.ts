import { calculateElo } from "@/utils/EloCalc.ts";

async function main() {
    console.log("Calculating Elo");
    await calculateElo();
    console.log("Elo recalculation done");
}

main();