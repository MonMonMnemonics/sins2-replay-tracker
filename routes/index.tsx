import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import SearchBarHome from "@/islands/SearchBarHome.tsx";
import { page } from "fresh";
import { getData } from "@/utils/4p2b.ts";

export const handler = define.handlers({
  async GET() {
    const data = await getData();
    return page({ tourney4P2B: Object.keys(data) });
  },
});

export default define.page<typeof handler>(({ data }) => {
    return (
        <div class="h-screen w-screen flex flex-col bg-page">
            <Head>
                <title>Home {}</title>
            </Head>
            <div class="flex flex-row my-auto">
                <div class="border border-gray-200 rounded-[20px] px-8 pt-8 pb-6 flex flex-col mx-auto bg-card">
                    <div class="text-center mb-7 pb-6 border-b border-faint">
                        <div class="text-2xl font-semibold text-accent-fg tracking-tight">Sins2 Record Nexus</div>
                    </div>

                    <hr/>
                    <a
                        class="w-full py-[13px] bg-accent-purple rounded-xl text-white text-xl font-semibold flex items-center justify-center gap-2 mb-5 transition-opacity hover:opacity-[0.88]"
                        href="replay-parser"                        
                    >
                        <svg class="w-4 h-4 fill-white/85" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                        </svg>
                        Submit Replay
                    </a>
                    <SearchBarHome/>

                    <hr/>
                    <div class="text-white font-bold text-center text-xl my-1">4P2B Tourneys 
                        <span> <a class="text-white font-bold text-center text-xs underline hover:text-blue-400" href="https://fourpower2balance.onrender.com/" target="_blank">(Official site)</a></span>
                    </div>
                    {
                        data.tourney4P2B.map(tourneyName => 
                            <a key={'4p2b-' + tourneyName} class="text-white hover:text-gray-400" href={"4p2b/" + tourneyName.replaceAll(" ", "_")}>
                                {tourneyName} videos
                            </a>
                        )
                    }                    
                    
                    <hr class="my-4"/>
                    <div class="flex items-center justify-between">
                        <span class="text-gray-300 text-xs">Disclaimer: This project is a fan-made project<br/> and is not affiliated with Ironclad Games.</span>
                        <a class="flex items-center gap-[6px] text-white no-underline transition-colors hover:text-white/70 cursor-pointer" href="https://github.com/MonMonMnemonics/sins2-replay-tracker" target="_blank">
                            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/>
                            </svg>
                            GitHub
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
});
