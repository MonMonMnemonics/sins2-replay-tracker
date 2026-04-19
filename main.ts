import { App, cors, staticFiles } from "fresh";
import { type State } from "./utils.ts";

export const app = new App<State>();

app.use(staticFiles());
app.use(cors({
    origin: ((Deno.env.get("NODE_ENV") === "production") ? "*3mworkshop.org" : "*")
}));
app.fsRoutes();

console.log("RUNNING ON " + ((Deno.env.get("NODE_ENV") === "production") ? "PRODUCTION" : "DEVELOPMENT"));