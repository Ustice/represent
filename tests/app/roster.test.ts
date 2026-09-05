import { describe, expect, it } from "vitest";
import {
  memberExchange,
  toRoster,
} from "../../examples/member-desk/src/model.js";
import { exportRoster } from "../../examples/member-desk/src/roster.js";

const member = {
  id: "member-17",
  name: 'Zoë "Z", Rivera\nJr.',
  email: "zoe@example.test",
  role: "Organizer",
  status: "Invited",
  joinedAt: new Date("2026-08-12T14:30:12.123Z"),
} as const;

describe("roster CSV export", () => {
  it("exports all rows in column order, preserving Unicode and quoting delimiters", () => {
    const result = exportRoster([
      member,
      { ...member, id: "member-18", status: "Active" },
    ]);
    expect(result.csv).toBe(
      '"Member ID","Full name","Email","Role","Membership","Joined (UTC)"\r\n' +
        '"member-17","Zoë ""Z"", Rivera\nJr.","zoe@example.test","Organizer","Invitation pending","2026-08-12"\r\n' +
        '"member-18","Zoë ""Z"", Rivera\nJr.","zoe@example.test","Organizer","Current member","2026-08-12"\r\n',
    );
    expect(result.rows[0]).toEqual({
      "Member ID": "member-17",
      "Full name": member.name,
      Email: member.email,
      Role: "Organizer",
      Membership: "Invitation pending",
      "Joined (UTC)": "2026-08-12",
    });
  });

  it("uses the UTC date after decoding an offset and intentionally collapses times", () => {
    const early = memberExchange.decode.run({
      ...member,
      joinedAt: "2026-08-11T22:30:12.123-04:00",
    });
    expect(early.joinedAt).not.toEqual(member.joinedAt);
    expect(toRoster.convert(early)).toEqual(toRoster.convert(member));
  });

  it("prefixes formula-like fields without modifying the underlying member", () => {
    for (const id of [
      "=1+1",
      "+1",
      "-1",
      "@SUM(A1)",
      "\t=1",
      "\r=1",
      "\n=1",
      "  =1",
      "＝1",
      "＋1",
      "－1",
      "＠SUM(A1)",
    ]) {
      expect(exportRoster([{ ...member, id }]).csv).toContain(`"'${id}",`);
    }
    const name = '=HYPERLINK("https://example.test"),extra';
    const value = { ...member, name };
    const result = exportRoster([value]);
    expect(result.csv).toContain(
      '"\'=HYPERLINK(""https://example.test""),extra"',
    );
    expect(result.rows[0]?.["Full name"]).toBe(name);
    expect(value.name).toBe(name);
  });

  it("refuses invalid member data instead of exporting an invalid row", () => {
    expect(() =>
      exportRoster([{ ...member, joinedAt: new Date("invalid") }]),
    ).toThrow(/Prepare roster row: input at Member/);
    expect(() => exportRoster([{ ...member, email: "invalid" }])).toThrow(
      /email/,
    );
  });
});
