"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { usePlayer } from "@/components/player-provider";
import { acceptFriendRequest, fetchFriendActivity, fetchFriendships, fetchListeningPreference, findPeople, removeFriendship, sendFriendRequest, setListeningActivity, type FriendActivity, type Friendship, type Person } from "@/lib/social";

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth();
  const { playQueue } = usePlayer();
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [activity, setActivity] = useState<FriendActivity[]>([]);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!user) return;
    try {
      const [nextFriendships, nextActivity, preference] = await Promise.all([fetchFriendships(user.id), fetchFriendActivity(), fetchListeningPreference(user.id)]);
      setFriendships(nextFriendships); setActivity(nextActivity); setSharing(preference);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load friends."); }
  };
  useEffect(() => { void refresh(); }, [user]);
  useEffect(() => {
    if (!user || query.trim().length < 2) { setPeople([]); return; }
    const timer = window.setTimeout(() => { void findPeople(query, user.id).then(setPeople).catch(() => setPeople([])); }, 250);
    return () => window.clearTimeout(timer);
  }, [query, user]);

  if (authLoading) return <p className="px-6 py-10 text-sm text-neutral-400">Loading…</p>;
  if (!user) return <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center"><h1 className="text-2xl font-semibold">Friends are for members</h1><p className="text-sm text-neutral-400">Sign in to add friends and optionally share what you’re listening to.</p><Link href="/login" className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black">Sign in</Link></div>;

  const accepted = friendships.filter((friendship) => friendship.status === "accepted");
  const incoming = friendships.filter((friendship) => friendship.status === "pending" && !friendship.outgoing);

  return <div className="flex flex-1 flex-col gap-8 px-6 py-8 sm:px-10">
    <header><h1 className="text-3xl font-bold tracking-tight">Friends</h1><p className="mt-1 text-sm text-neutral-400">Connect with people you know and see their shared listening activity.</p></header>
    {error ? <p className="text-sm text-red-400">{error}</p> : null}
    <section className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-semibold">Share listening activity</h2><p className="mt-1 text-sm text-neutral-400">Only accepted friends can see your currently playing track.</p></div>
      <button type="button" onClick={() => void setListeningActivity(user.id, null, !sharing).then(() => setSharing(!sharing)).catch((caught: Error) => setError(caught.message))} className={`rounded-full border px-4 py-2 text-sm ${sharing ? "border-emerald-600 text-emerald-400" : "border-neutral-700 text-neutral-300"}`}>{sharing ? "Sharing on" : "Sharing off"}</button></div>
    </section>
    <section className="flex flex-col gap-3"><h2 className="text-lg font-semibold">Add friends</h2><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by display name" className="max-w-md rounded-full border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm outline-none focus:border-emerald-500" />
      {people.map((person) => <div key={person.id} className="flex max-w-md items-center justify-between rounded-xl border border-neutral-900 px-4 py-3"><span>{person.displayName}</span><button type="button" onClick={() => void sendFriendRequest(user.id, person.id).then(() => { setQuery(""); setPeople([]); void refresh(); }).catch((caught: Error) => setError(caught.message))} className="rounded-full border border-neutral-700 px-3 py-1 text-sm hover:border-emerald-500">Add</button></div>)}
    </section>
    {incoming.length ? <section className="flex flex-col gap-3"><h2 className="text-lg font-semibold">Requests</h2>{incoming.map((friendship) => <div key={friendship.id} className="flex max-w-md items-center justify-between rounded-xl border border-neutral-900 px-4 py-3"><span>{friendship.other.displayName}</span><button type="button" onClick={() => void acceptFriendRequest(friendship.id).then(refresh).catch((caught: Error) => setError(caught.message))} className="rounded-full bg-emerald-500 px-3 py-1 text-sm font-medium text-black">Accept</button></div>)}</section> : null}
    <section className="flex flex-col gap-3"><h2 className="text-lg font-semibold">Listening now</h2>{activity.length ? activity.map((item) => <button key={`${item.user.id}-${item.track.id}`} type="button" onClick={() => playQueue([item.track], 0)} className="flex max-w-xl items-center justify-between rounded-xl border border-neutral-900 px-4 py-3 text-left hover:border-neutral-700"><span><span className="font-medium">{item.user.displayName}</span><span className="text-neutral-400"> is listening to </span><span>{item.track.title}</span><span className="text-neutral-400"> · {item.track.artist}</span></span><span className="text-xs text-emerald-400">Play</span></button>) : <p className="text-sm text-neutral-500">No friends are sharing music right now.</p>}</section>
    <section className="flex flex-col gap-3"><h2 className="text-lg font-semibold">Your friends</h2>{accepted.length ? accepted.map((friendship) => <div key={friendship.id} className="flex max-w-md items-center justify-between rounded-xl border border-neutral-900 px-4 py-3"><span>{friendship.other.displayName}</span><button type="button" onClick={() => void removeFriendship(friendship.id).then(refresh).catch((caught: Error) => setError(caught.message))} className="text-sm text-neutral-400 hover:text-red-400">Remove</button></div>) : <p className="text-sm text-neutral-500">No friends yet.</p>}</section>
  </div>;
}
