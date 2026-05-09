import { useState } from "preact/hooks";
import { useSignal } from "@preact/signals";

export default function SearchBarHome() {
    const [searchName, setSearchName] = useState("");
    const [suggestions, setSuggestion] = useState<string[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const fetchSuggestionTimeout = useSignal<number | null>(null);

    async function getSuggestions(name: string) {
        if (name.length > 0) {
            const res = await fetch("/api/player?" + (new URLSearchParams({ name: name })).toString(), {
                method: "GET",
            });

            const body = await res.json() as string[];
            setSuggestion(body ?? []);
        } else {
            setSuggestion([]);
        }        
    }

    return(
        <div class="flex items-center overflow-hidden mb-6 transition-colors focus-within:border-[rgba(124,109,250,0.5)]">
            <div class="relative w-full z-20" onMouseLeave={() => setShowDropdown(false)}>
                <div class="flex items-center overflow-hidden border rounded-4xl transition-colors focus-within:border-[rgba(124,109,250,0.5)]">
                    <input
                        type="text"
                        class="flex-1 bg-transparent border-none outline-none px-[14px] py-3 text-accent-dim placeholder:text-white/50 font-[system-ui]"
                        placeholder="Player name..." value={searchName}
                        onKeyDown={(e) => {
                            if (e.key == 'Enter') {
                                globalThis.location.href = "/player?name=" + encodeURIComponent(e.currentTarget.value);
                            }
                        }}
                        onInput={(e) => {
                            const searchTarget = e.currentTarget.value;
                            setSearchName(searchTarget);
                            setShowDropdown(true);

                            if (fetchSuggestionTimeout.value != null) {
                                clearTimeout(fetchSuggestionTimeout.value);
                            }
                            fetchSuggestionTimeout.value = setTimeout(() => {
                                getSuggestions(searchTarget);
                            }, 500);
                        }}
                        onFocus={() => setShowDropdown(true)}
                    />
                    <button type="button" class="flex items-center gap-[6px] bg-white/5 border-l border-faint text-white/60 font-medium px-4 py-3 whitespace-nowrap transition-colors hover:bg-[rgba(124,109,250,0.15)] hover:text-accent-light cursor-pointer"
                        onClick={() => globalThis.location.href = "/player?name=" + encodeURIComponent(searchName)}
                    >
                        <svg class="w-[13px] h-[13px] fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="M21 21l-4.35-4.35"/>
                        </svg>
                        Search Player
                    </button>
                </div>
                {
                    showDropdown ?
                    <div class="fixed w-full overflow-y-auto z-30 rounded" style={{ width: "40ch"}}>
                        {
                            suggestions.filter(name => name.toLowerCase().includes(searchName.toLowerCase())).map(name => 
                                <div key={"suggestion-" + name} onClick={() => globalThis.location.href = "/player?name=" + encodeURIComponent(name)} class="w-full bg-black text-white px-2 py-1 font-bold hover:text-black hover:bg-white cursor-pointer z-30">
                                    {name}
                                </div>
                            )
                        }
                    </div>
                    : null
                }
            </div>
        </div>
    )
}