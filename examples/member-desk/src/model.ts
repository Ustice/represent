import {
  recordCodec,
  compose,
  conversion,
  graph,
  representation,
} from "@represent/core";
import { z } from "zod";
import { dateTime, field, parser } from "./fields.js";

const fields = {
  id: z.string().min(1),
  name: z.string().trim().min(1, "Enter a name"),
  email: z.email("Enter a valid email address"),
  role: z.enum(["Member", "Organizer"]),
  status: z.enum(["Active", "Invited"]),
};

export const memberExchange = recordCodec({
  name: "Member exchange",
  from: "Member",
  to: "Member API",
  fields: {
    id: field("Member ID", fields.id),
    name: field("Member name", fields.name),
    email: field("Email", fields.email),
    role: field("Role", fields.role),
    status: field("Membership", fields.status),
    joinedAt: dateTime,
  },
});
export const member = memberExchange.encode.from;
export const memberApi = memberExchange.encode.to;
export type Member = ReturnType<typeof member.parse>;

const publicSchema = z
  .object({
    id: fields.id,
    name: fields.name,
    role: fields.role,
    joinedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const publicProfile = representation({
  name: "Public profile",
  parse: parser(publicSchema),
});
export const toPublic = conversion({
  name: "Publish profile",
  from: memberApi,
  to: publicProfile,
  map: ({ id, name, role, joinedAt }) => ({ id, name, role, joinedAt }),
});

export const profileFor = compose(memberExchange.encode, toPublic);

const rosterSchema = z
  .object({
    "Member ID": z.string(),
    "Full name": z.string(),
    Email: z.string(),
    Role: z.string(),
    Membership: z.string(),
    "Joined (UTC)": z.iso.date(),
  })
  .strict();

export const rosterRow = representation({
  name: "Roster row",
  parse: parser(rosterSchema),
});

export const toRoster = conversion({
  name: "Prepare roster row",
  from: member,
  to: rosterRow,
  map: ({ id, name, email, role, status, joinedAt }) => ({
    "Member ID": id,
    "Full name": name,
    Email: email,
    Role: role,
    Membership: status === "Active" ? "Current member" : "Invitation pending",
    "Joined (UTC)": joinedAt.toISOString().slice(0, 10),
  }),
});

export const rosterColumns = rosterSchema.keyof().options;
export const memberGraph = graph([
  memberExchange.encode,
  memberExchange.decode,
  toPublic,
  toRoster,
]);

export const representationDescriptions = new Map([
  [member.name, "Working record · Date"],
  [memberApi.name, "Exchange record · ISO string"],
  [publicProfile.name, "Shared profile · selected fields"],
  [rosterRow.name, "Directory export · UTC day"],
]);

export const sampleMembers = [
  {
    id: "mem_01",
    name: "Maya Chen",
    email: "maya@example.test",
    role: "Organizer",
    status: "Active",
    joinedAt: "2026-08-12T14:30:00.000Z",
  },
  {
    id: "mem_02",
    name: "Leo Martins",
    email: "leo@example.test",
    role: "Member",
    status: "Active",
    joinedAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "mem_03",
    name: "Amara Okafor",
    email: "amara@example.test",
    role: "Member",
    status: "Invited",
    joinedAt: "2026-09-01T16:15:00.000Z",
  },
].map((value) => memberExchange.decode.run(value));

export function readDirectory(input: unknown) {
  const rows = z.array(z.unknown()).parse(input);
  const members = rows.map((row) => memberExchange.decode.run(row));
  if (
    members.length === 0 ||
    new Set(members.map(({ id }) => id)).size !== members.length
  ) {
    throw new Error("A directory needs members with unique identifiers.");
  }
  return members;
}
