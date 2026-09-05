import { describe, expect, it } from "vitest";
import {
  fromApi,
  memberGraph,
  profileFor,
  readDirectory,
  sampleMembers,
  toApi,
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
  it("round-trips the member through JSON, preserving every field and the instant", () => {
    // REP-CONV-001/006: this source example does not establish reverse textual equality.
    const payload: unknown = JSON.parse(
      JSON.stringify(toApi.convert(original)),
    );
    expect(fromApi.run(payload)).toEqual(original);
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
      fromApi.run({
        ...toApi.convert(original),
        joinedAt: "2026-02-30T12:00:00Z",
      }),
    ).toThrow(/joinedAt/);
    expect(() =>
      fromApi.run({ ...toApi.convert(original), email: "missing-at-sign" }),
    ).toThrow(/email/);
  });

  it("recovers real Dates from persisted JSON and rejects duplicate member identities", () => {
    const payload: unknown = JSON.parse(
      JSON.stringify(sampleMembers.map((value) => toApi.convert(value))),
    );
    expect(readDirectory(payload)).toEqual(sampleMembers);
    expect(() =>
      readDirectory([toApi.convert(original), toApi.convert(original)]),
    ).toThrow(/unique/);
  });

  it("derives the visible graph from the application's actual conversions", () => {
    expect(memberGraph).toEqual({
      nodes: [
        { name: "Member" },
        { name: "Member API" },
        { name: "Public profile" },
      ],
      edges: [
        { name: "Serialize member", from: "Member", to: "Member API" },
        { name: "Read member", from: "Member API", to: "Member" },
        { name: "Publish profile", from: "Member API", to: "Public profile" },
      ],
    });
  });
});
