# Issue tracker: GitHub

Issues and PRDs for this repository live as GitHub Issues. Use the `gh` CLI for
all operations and infer the repository from `git remote -v`.

## Conventions

- Create an issue with `gh issue create --title "..." --body "..."`. Use a
  heredoc for multiline bodies.
- Read an issue and its discussion with `gh issue view <number> --comments`.
- List issues with `gh issue list`, requesting structured JSON fields when a
  workflow needs to inspect labels, bodies, or comments.
- Add a comment with `gh issue comment <number> --body "..."`.
- Apply or remove labels with `gh issue edit <number> --add-label "..."` or
  `gh issue edit <number> --remove-label "..."`.
- Close an issue with `gh issue close <number> --comment "..."` only when the
  governing workflow authorizes closure.

## Skill operations

When a skill says to publish to the issue tracker, create a GitHub Issue using
the repository's applicable issue form and workflow requirements.

When a skill says to fetch a ticket, run `gh issue view <number> --comments` and
inspect its labels.

GitHub Issues are the durable public record. Do not create a parallel local
Markdown issue tracker.
