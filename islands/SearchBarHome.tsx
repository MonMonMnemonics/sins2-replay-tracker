import { useSignal } from "@preact/signals";

export default function SearchBarHome() {
    const searchName = useSignal('')

    return(
        <div class="flex flex-row items-center py-1 px-2 border rounded-xl">
            <input placeholder="Player name..." class="px-2" value={searchName.value} onChange={(e) => searchName.value = e.currentTarget.value}
                onKeyDown={(e) => {
                    if (e.key == 'Enter') {
                        globalThis.location.href = "/player?name=" + encodeURIComponent(e.currentTarget.value);
                    }
                }}
            />
            <button type="button" class="cursor-pointer" onClick={() => globalThis.location.href = "/player?name=" + encodeURIComponent(searchName.value)}>Search Player</button>
        </div>
    )
}