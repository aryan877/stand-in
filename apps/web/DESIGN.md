# Visual Design Contract

Stand-in should feel calm and trustworthy: someone is attending a meeting on
your behalf, so the interface stays plain, exact and quiet.

## Type

- Headings use Outfit at normal weight with tight tracking: page titles 30/36,
  section and form group headings 20/28.
- Everything else uses Geist: body 15/24, hints and row detail 14/22, small
  labels 13.

## Color

- Near-black ink on white, hairline borders, very light gray bands for notices.
- Magenta (`brand`) is only for Stand-in itself: its name in transcripts, and
  the rule beside each line it may say or has said.
- Green (`live`) only means "in the call now": the live banner and live rows.
- Warnings are neutral gray bands with ink text. Destructive actions use the
  `outline-destructive` button.

## Layout

- Pages sit in a 960px column with 24px side padding, 16px under 640px wide.
  Blocks respond to the width of that column, not the window, so they still fit
  when the agent panel is open beside them.
- The schedule form is two bordered groups, the call and what Stand-in can
  say, side by side when the column is wide enough and stacked otherwise.
- A scheduled call is three bordered sections: when Stand-in joins, what it
  can say, and the call details. Each prepared answer is a line with a magenta
  rule.
- The live page pairs the transcript with a 340px questions column when the
  column is wide enough.
- A finished call opens with three numbers in one bordered row, then underline
  tabs 44px tall, in the order Summary, To-dos, Questions for you, Transcript.
  Tabs wrap on narrow screens instead of hiding.
- Lists of calls are flat rows. Bordered blocks have a 12px radius and are
  never nested.
- The landing page follows the same tokens, with one dark product panel.

## Controls

- Use the shared `Button`. One `default` button per screen is the primary
  action, and the rest are `outline` or `ghost`. Each row of to-dos stays
  `outline`.
- Heights are 36px for ordinary actions and 40px for page-level and form
  actions, with `sm` (32px) inside rows and toolbars. Under 640px, action rows
  stack full width.
- Every control says the whole action in words. No icon-only controls and no
  "more" menus.

