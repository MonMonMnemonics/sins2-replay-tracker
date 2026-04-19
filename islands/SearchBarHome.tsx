import { useSignal } from "@preact/signals";

export default function SearchBarHome() {
    const searchName = useSignal('')

    return(
        <div class="flex items-center overflow-hidden mb-6 transition-colors focus-within:border-[rgba(124,109,250,0.5)]">
            <input
                type="text"
                class="flex-1 bg-transparent border-none outline-none px-[14px] py-3 text-accent-dim placeholder:text-white/50 font-[system-ui]"
                placeholder="Player name..." value={searchName.value} onChange={(e) => searchName.value = e.currentTarget.value}
                onKeyDown={(e) => {
                    if (e.key == 'Enter') {
                        globalThis.location.href = "/player?name=" + encodeURIComponent(e.currentTarget.value);
                    }
                }}                
            />
            <button type="button" class="flex items-center gap-[6px] bg-white/5 border-l border-faint text-white/60 font-medium px-4 py-3 whitespace-nowrap transition-colors hover:bg-[rgba(124,109,250,0.15)] hover:text-accent-light cursor-pointer"
                onClick={() => globalThis.location.href = "/player?name=" + encodeURIComponent(searchName.value)}
            >
                <svg class="w-[13px] h-[13px] fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35"/>
                </svg>
                Search Player
            </button>
        </div>
    )
}