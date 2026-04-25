import { App, cors, staticFiles } from "fresh";
import { type State } from "./utils.ts";
import { calculateElo } from "@/utils/EloCalc.ts";

export const app = new App<State>();

app.use(staticFiles());
app.use(cors({
    origin: ((Deno.env.get("NODE_ENV") === "production") ? "*3mworkshop.org" : "*")
}));
app.fsRoutes();

console.log("RUNNING ON " + ((Deno.env.get("NODE_ENV") === "production") ? "PRODUCTION" : "DEVELOPMENT"));

async function recalcElo() {
    console.log("TIME: " + (new Date()).toISOString());
    await calculateElo();
    console.log("Elo recalculation done");

    setTimeout(() => {
        recalcElo();
    }, 23*60*60*1000);
}

if (Deno.env.get("NODE_ENV") === "production") {
    recalcElo();
}
