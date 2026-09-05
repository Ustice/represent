import { describe, expect, it } from "vitest";
import {
  memberExchange,
  memberGraph,
  profileFor,
  readDirectory,
  sampleMembers,
} from "../../examples/member-desk/src/model.js";

const original = {
  id: "asymmetric-17",
  name: "Casey Rivera",
  email: "private@example.test",
  role: "Organizer",
  status: "Invited",
  joinedAt: new Date("2026-08-12T14:30:12.123Z"),
} as const;

describe("member directory consuming Represent", () => {
  it("normalizes incoming timestamp spelling through the codec", () => {
    const input = {
      ...memberExchange.encode.convert(original),
      joinedAt: "2026-08-12T10:30:12.123-04:00",
    };
    const decoded = memberExchange.decode.run(input);
    expect(decoded).toEqual(original);
    expect(memberExchange.encode.convert(decoded).joinedAt).toBe(
      "2026-08-12T14:30:12.123Z",
    );
  });
  it("round-trips the member through JSON, preserving every field and the instant", () => {
    // REP-CONV-001/006: this source example does not establish reverse textual equality.
    const payload: unknown = JSON.parse(
      JSON.stringify(memberExchange.encode.convert(original)),
    );
    expect(memberExchange.decode.run(payload)).toEqual(original);
  });

  it("publishes an explicit field allowlist and exposes a private-email collision", () => {
    // REP-CONV-003/004: distinct private emails produce the same public observation.
    const publicValue = profileFor.convert(original);
    expect(publicValue).toEqual({
      id: original.id,
      name: original.name,
      role: original.role,
      joinedAt: "2026-08-12T14:30:12.123Z",
    });
    expect(
      profileFor.convert({ ...original, email: "different@example.test" }),
    ).toEqual(publicValue);
    expect(JSON.stringify(publicValue)).not.toContain(original.email);
  });

  it("rejects bad dates and email at the incoming representation boundary", () => {
    expect(() =>
      memberExchange.decode.run({
        ...memberExchange.encode.convert(original),
        joinedAt: "2026-02-30T12:00:00Z",
      }),
    ).toThrow(/joinedAt/);
    expect(() =>
      memberExchange.decode.run({
        ...memberExchange.encode.convert(original),
        email: "missing-at-sign",
      }),
    ).toThrow(/email/);
  });

  it("recovers real Dates from persisted JSON and rejects duplicate member identities", () => {
    const payload: unknown = JSON.parse(
      JSON.stringify(
        sampleMembers.map((value) => memberExchange.encode.convert(value)),
      ),
    );
    expect(readDirectory(payload)).toEqual(sampleMembers);
    expect(() =>
      readDirectory([
        memberExchange.encode.convert(original),
        memberExchange.encode.convert(original),
      ]),
    ).toThrow(/unique/);
  });

  it("includes the member field codec alongside the record routes", () => {
    expect(memberGraph.nodes.map(({ name }) => name)).toEqual([
      "Member",
      "Member ID",
      "Member name",
      "Email",
      "Role",
      "Membership",
      "Date",
      "Member API",
      "ISO timestamp",
      "Public profile",
      "Roster row",
    ]);
    expect(memberGraph.edges).toEqual([
      { name: "Member exchange: encode", from: "Member", to: "Member API" },
      {
        name: "Date and ISO timestamp: encode",
        from: "Date",
        to: "ISO timestamp",
      },
      { name: "Member exchange: decode", from: "Member API", to: "Member" },
      {
        name: "Date and ISO timestamp: decode",
        from: "ISO timestamp",
        to: "Date",
      },
      { name: "Publish profile", from: "Member API", to: "Public profile" },
      { name: "Prepare roster row", from: "Member", to: "Roster row" },
    ]);
    expect(memberGraph.dependencies).toEqual([
      {
        parent: "Member exchange: encode",
        field: "joinedAt",
        conversion: "Date and ISO timestamp: encode",
      },
      {
        parent: "Member exchange: decode",
        field: "joinedAt",
        conversion: "Date and ISO timestamp: decode",
      },
    ]);
  });
});
