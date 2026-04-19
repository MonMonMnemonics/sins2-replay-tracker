import { define } from "@/utils.ts";
import { Head } from "fresh/runtime";
import PlayerDataWidget from "../islands/PlayerDataWidget.tsx";

export default define.page(function PlayerPage() {
    return (
        <div class="h-screen w-screen flex flex-col px-8 pt-8 pb-4 gap-3 text-white">
            <Head>
                <title>Player Codex</title>
            </Head>
            <div className="mb-2 text-center">
                <h1 className="text-2xl font-black tracking-[0.3em] uppercase text-gray-100 mb-1">
                    Player Codex
                </h1>
                <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
            </div>
            <PlayerDataWidget/>
        </div>
    );
});
