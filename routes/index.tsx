import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import SearchBarHome from "@/islands/SearchBarHome.tsx";

export default define.page(function Home() {
    return (
        <div class="h-screen w-screen flex flex-col">
            <Head>
                <title>Home</title>
            </Head>
            <div class="flex flex-row my-auto">
                <div class="flex flex-col mx-auto p-3 border-2 rounded-2xl gap-4">
                    <div class="text-2xl font-bold text-center">Sins2 Record Nexus</div>
                    <hr/>
                    <a class="border rounded-xl font-bold p-1 cursor-pointer text-center" href="replay-parser">Submit Replay</a>
                    <SearchBarHome/>
                </div>
            </div>
        </div>
    );
});
