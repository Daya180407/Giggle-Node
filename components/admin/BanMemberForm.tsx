"use client";

import { useState } from "react";
import { banCommunityUserAction } from "@/app/actions";

/**
 * Direct ban form on the reports page. The admin can block a member from one
 * room, from every room of one AI, or from every community, for a number of
 * days or permanently. Room options only ever list rooms of the chosen AI.
 */
export default function BanMemberForm({
  users,
  ais,
  rooms,
}: {
  users: { id: string; name: string; email: string }[];
  ais: { id: string; name: string }[];
  rooms: { id: string; aiId: string; title: string }[];
}) {
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [scope, setScope] = useState<"room" | "ai" | "all">("room");
  const [aiId, setAiId] = useState(ais[0]?.id ?? "");
  const [roomId, setRoomId] = useState("");
  const aiRooms = rooms.filter((room) => room.aiId === aiId);

  return (
    <form action={banCommunityUserAction} className="grid gap-2 sm:grid-cols-2">
      <input type="hidden" name="back" value="/admin/community/reports" />
      <div className="sm:col-span-2">
        <label className="label !text-[10px]" htmlFor="banUser">
          Member
        </label>
        <select
          id="banUser"
          name="userId"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          className="field !py-1.5 text-xs"
          required
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} · {user.email}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label !text-[10px]" htmlFor="banScope">
          Where
        </label>
        <select
          id="banScope"
          name="scope"
          value={scope}
          onChange={(event) => setScope(event.target.value as "room" | "ai" | "all")}
          className="field !py-1.5 text-xs"
        >
          <option value="room">One room</option>
          <option value="ai">Every room of one AI</option>
          <option value="all">Every community</option>
        </select>
      </div>
      <div>
        <label className="label !text-[10px]" htmlFor="banDays">
          Duration (0 = permanent)
        </label>
        <input
          id="banDays"
          name="days"
          type="number"
          min={0}
          max={3650}
          defaultValue={0}
          className="field !py-1.5 text-xs"
        />
      </div>
      {scope !== "all" ? (
        <div>
          <label className="label !text-[10px]" htmlFor="banAi">
            AI
          </label>
          <select
            id="banAi"
            name="aiId"
            value={aiId}
            onChange={(event) => {
              setAiId(event.target.value);
              setRoomId("");
            }}
            className="field !py-1.5 text-xs"
          >
            {ais.map((ai) => (
              <option key={ai.id} value={ai.id}>
                {ai.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {scope === "room" ? (
        <div>
          <label className="label !text-[10px]" htmlFor="banRoom">
            Room
          </label>
          <select
            id="banRoom"
            name="roomId"
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            className="field !py-1.5 text-xs"
          >
            <option value="">Default room</option>
            {aiRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <label className="label !text-[10px]" htmlFor="banReason">
          Reason (shown to the member)
        </label>
        <input
          id="banReason"
          name="reason"
          maxLength={240}
          className="field !py-1.5 text-xs"
          placeholder="Spam links after two warnings"
        />
      </div>
      <div className="sm:col-span-2">
        <button className="btn btn-primary !py-1.5 text-xs" disabled={!userId}>
          Ban member
        </button>
      </div>
    </form>
  );
}
