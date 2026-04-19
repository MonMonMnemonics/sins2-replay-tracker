import { Head } from "fresh/runtime";
import { define } from "@/utils.ts";
import ReplayParser from "@/islands/ReplayParser.tsx";

export default define.page(function ReplayparserIndex() {
  return (
    <div class="w-screen h-screen overflow-hidden relative">
      <Head>
        <title>Replay parser</title>
      </Head>
      <div class="h-full w-full flex flex-col absolute overflow-auto p-2 pt-4 gap-2">
        <div class="text-2xl font-bold text-center">
          Replay Parser
        </div>
        <ReplayParser/>
      </div>
    </div>
  );
});
