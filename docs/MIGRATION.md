# Prototype migration report

The Claude Design prototype (`prototype/Main.dc.html`, a single Design
Component file on a React-based runtime) was migrated to Vite + React +
TypeScript in `apps/web`.

## Method

1. Rendered the original with its runtime and drove it through every screen,
   sheet and state (receptionist, doctor, admin and Arabic flows) with a
   Playwright click-path harness, capturing full-page screenshots at
   1440×900 (55 states) and 390×844 (57 states, including two phone-only
   sheets): 112 images.
2. Ported each screen, copying the stylesheet verbatim and mirroring the
   markup element for element.
3. Ran the same click paths on the migrated app and compared pixel by pixel
   (threshold 40/255 per channel).

## Result

- All 112 screenshots have identical page dimensions.
- 62 are pixel-identical as they are. The other 50 differ **only** where a
  seeded phone number changed (see below): with the five new numbers swapped
  back to the originals, all 112 are pixel-identical.
- The new demo footer (Demo badge, fictional-data note, Reset demo button) is
  the only added UI; it appends one row at the end of each page (about 70 px
  on desktop, 100 px on phone where it wraps) and sits at the bottom of the
  login screen. The comparison above was made with the footer hidden.
- No horizontal scrolling at 390 px on any screen, for any role, in either language.

## Differences from the prototype

Visual:

1. **Demo footer** added (requested): Demo badge, "All names and data are
   fictional", Reset demo.
2. **Phone numbers** of five seed patients now start with 010 (requested):
   Ahmed Samir 01023456789, Nourhan Adel 01034567890, Hossam Tarek
   01055667788, Mahmoud Gaber 01077889900, Yara Waleed 01044332211. Same length,
   so layout is unchanged.

Behaviour (not visible in the recorded paths unless noted):

3. **24-hour rule.** The prototype skipped the automatic reminder only for
   appointments booked for _today_. The app applies the spec rule (RC-3):
   anything booked less than 24 hours ahead skips it, so booking tomorrow
   09:00 at 10:15 today now says "Booked less than 24 hours ahead…".
4. **Prescription delivery status is stored.** The prototype forgot the
   Sent/Delivered status when you left and reopened the visit record; the app
   keeps it in the message log. Sending a prescription also saves the visit as
   a draft, so reopening shows the notes.
5. **Arabic grammar in the audit log.** Entries by a female user use feminine
   verbs (عدّلت، أنشأت) for every entry; the prototype did this only in its
   hardcoded seed rows. Arabic audit dates now use Arabic-Indic digits like the
   rest of the Arabic UI ("Edited by" also shows "د. كريم" instead of "Dr. Karim").
6. **Package-created audit text** formats the price ("8,000 EGP") for new
   entries too; the prototype printed "8000 EGP" for entries it created.
7. **Login and clinic-profile fields** that were static in the prototype are
   now editable (no effect; nothing is submitted).

## Prototype quirks kept on purpose (please confirm)

These are how the prototype _renders_, which may not be what was designed.
They are reproduced exactly; each is a one-line change if you want it fixed.

- **Stat numbers render small and grey.** On Today (9 / 2 / 7) and in the
  daily cash summary, `.stat b` asks for 34 px (24 px) bold, but the
  prototype's runtime wraps the value in a `<span>` that the `.stat span`
  rule turns into 14 px muted text. Reproduced with an explicit `<span>`
  (`features/home/HomeScreen.tsx`, `features/payments/PaymentsScreen.tsx`).
- **Labels with a suffix wrap onto two lines**, e.g. "Phone" / "*",
  "Amount (EGP)" / "(EGP)" in the payment sheet, "Total price" / "(EGP)",
  "Address" / "(optional)": `.lbl` is a flex column, so the suffix lands on
  its own line. The payment sheet also repeats "(EGP)".
- **Payment method and adjustment type appear as raw codes** in the
  appointment log ("Payment recorded: 400 EGP (cash)"), payment card
  ("400 EGP · cash") and audit log ("add", "remove", "extend"), in both languages.
- A reminder for an appointment booked for tomorrow is listed as "sent" with
  its future send time.
