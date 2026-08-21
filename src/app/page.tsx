import { Library } from "@/components/library";
import { PlayerBar } from "@/components/player-bar";
import { PlayerProvider } from "@/components/player-provider";

export default function Home() {
  return (
    <PlayerProvider>
      <main className="flex min-h-full flex-1 flex-col bg-gradient-to-b from-neutral-900 to-black text-neutral-100">
        <Library />
        <PlayerBar />
      </main>
    </PlayerProvider>
  );
}
