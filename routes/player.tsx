import { define } from "@/utils.ts";
import { Head } from "fresh/runtime";
import PlayerDataWidget from "../islands/PlayerDataWidget.tsx";

export default define.page(function PlayerPage() {
    return (
        <div class="h-screen w-screen flex flex-col p-3 gap-3">
            <Head>
                <title>Player Codex</title>
            </Head>
            <div class="text-center font-bold text-2xl">Player Codex</div>
            <PlayerDataWidget/>
        </div>
    );
});
