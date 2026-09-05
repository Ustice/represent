import { compose, conversion, graph, representation } from "@represent/core";
import { z } from "zod";

const fields = {
  id: z.string().min(1),
  name: z.string().trim().min(1, "Enter a name"),
  email: z.email("Enter a valid email address"),
  role: z.enum(["Member", "Organizer"]),
  status: z.enum(["Active", "Invited"]),
};

const domainSchema = z.object({ ...fields, joinedAt: z.date() }).strict();
const apiSchema = z
  .object({ ...fields, joinedAt: z.iso.datetime({ offset: true }) })
  .strict();
const publicSchema = z
  .object({
    id: fields.id,
    name: fields.name,
    role: fields.role,
    joinedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

function parser<Value>(schema: z.ZodType<Value>) {
  return (input: unknown) => {
    const result = schema.safeParse(input);
    if (!result.success) {
      throw new Error(
        result.error.issues
          .map(
            (issue) => `${issue.path.join(".") || "Member"}: ${issue.message}`,
          )
          .join("; "),
      );
    }
    return result.data;
  };
}

export const member = representation({
  name: "Member",
  parse: parser(domainSchema),
});
export const memberApi = representation({
  name: "Member API",
  parse: parser(apiSchema),
});
export const publicProfile = representation({
  name: "Public profile",
  parse: parser(publicSchema),
});
export type Member = z.infer<typeof domainSchema>;

export const toApi = conversion({
  name: "Serialize member",
  from: member,
  to: memberApi,
  map: (value) => ({ ...value, joinedAt: value.joinedAt.toISOString() }),
});

export const fromApi = conversion({
  name: "Read member",
  from: memberApi,
  to: member,
  map: (value) => ({ ...value, joinedAt: new Date(value.joinedAt) }),
});

export const toPublic = conversion({
  name: "Publish profile",
  from: memberApi,
  to: publicProfile,
  map: ({ id, name, role, joinedAt }) => ({ id, name, role, joinedAt }),
});

export const profileFor = compose(toApi, toPublic);
export const memberGraph = graph([toApi, fromApi, toPublic]);

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
].map((value) => fromApi.run(value));

export function readDirectory(input: unknown) {
  const rows = z.array(z.unknown()).parse(input);
  const members = rows.map((row) => fromApi.run(row));
  if (
    members.length === 0 ||
    new Set(members.map(({ id }) => id)).size !== members.length
  ) {
    throw new Error("A directory needs members with unique identifiers.");
  }
  return members;
}
