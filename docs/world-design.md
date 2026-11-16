# The World — design

The long-term plan for turning Explore mode into a large world to explore, in the spirit of
Baldur's Gate: countries, cities, towns and villages, with wizards stationed around the world.
You meet them, they start stories, and some join your party. Battles use the existing duel
screen. Nothing here is built yet beyond Hollowmere (see "Explore mode" in `CLAUDE.md`).

Status: **vision and names agreed; steps 1, 3, 4 and 6 built; step 2 has all eight outer rings (inner rings next); interiors built; Wrenford, the University town and tutorial, built; the University Year (learning magic) planned.**

## Decisions so far

| Question | Decision |
|---|---|
| Who is the player? | A wizard you create yourself. |
| Party? | Yes: wizards you meet can join you, Baldur's Gate style. |
| Battles | On the existing duel screen (wheel, minigames, picks). Not on the map. |
| Difficulty | Rises toward the centre of the accident city: easy at the edge, very hard near the centre. |
| What the element loot buys | Deferred. |
| Names | Chosen: see "Names" below. |

## The first city: Corvanthe and the Unweaving

**Corvanthe**, a great old university city, where magic went wrong in **the Unweaving**: a magical Chernobyl. Ground zero is **the Wound**. The city is in ruins and saturated with
magical energy. The citizens were turned into elementals, the **Echoes**. They can't die: when one is destroyed it
reforms at ground zero and walks back to where it stood when the accident happened. In the game they
simply respawn after a while; the lore doesn't need to be shown.

A destroyed Echo leaves raw elemental matter behind: **quintessence** officially, **spill** on the street. It's in high demand for potions, magic
items and spells, so warbands (**gleaners**) come into the ruins to hunt Echoes for it ("spilling"), and fight each other
over it.

### Eight sectors, one per element

The duel engine has eight elements in four opposite pairs (`ELEMENTS`, `opposedElem`). The blast
split the city into eight sectors, each steeped in one element, laid out round ground zero like the
spell wheel, so opposites face each other across the centre. Each sector looks different, and its
elementals fight in its element, resist it and take extra from its opposite, which the engine
already handles. Bringing the opposite element's magic into a sector pays.

The sectors (old districts):

| Element | Sector | What it was | Look now |
|---|---|---|---|
| Fire | Cindergate | forges and foundries | scorched, embers, lava cracks |
| Water | the Drowned Quarter | the old harbour | flooded streets |
| Ice | Frostmarket | the great market, frozen mid-trade | iced over, frozen stalls |
| Lightning | Spirewatch | towers and bell-spires | lightning crawling over roofs |
| Earth | the Quarry Ward | stonemasons and mines | heaved ground, rock spires |
| Air | the Heights | the wealthy hill houses | houses and rubble floating loose |
| Arcane | the Collegium | the university, where it began | arcane-lit, warped |
| Dark | Gloamside | temples and catacombs | shadow-choked |

Each sector is a dense city map: streets, terraces of houses, alleys, squares, plus the places a
real city has (market, guildhall, temple, baths, gaol, warehouses), abandoned and part ruined.

### Difficulty rings

Each sector runs from the city wall in to ground zero. Its outer streets are fairly easy, the
middle rings harder, and the streets round ground zero very hard. Elementals scale by ring, reusing
Survival's levels (`SURVIVAL_LEVELS`: recruit, veteran, elite, champion, plus whatever is needed
beyond). A fresh wizard can clear the edges and has to grow before pushing in.

### Elementals

- New fighter types (`fighters.json`, like the Survival soldier and archer), eight kinds, one per
  element, weak and strong versions.
- Seen roaming on the map; walking into one starts a battle on the duel screen.
- Its spot refills after a while (respawn timer per spawn point).
- Each one drops that element's matter.

### Warbands

Rival crews scavenging the city: groups of fighters (the Survival soldiers and archers are a start),
sometimes with a hired wizard. They patrol, fight elementals and fight you. Later: they can be
talked to, traded with or hired.

## The player and the party

### Create your own wizard

A created wizard is just another `characters.json` entry, built from your choices.

- **Look:** a set of base figures in the house style (young / old, builds, faces, human / elf /
  dwarf), recoloured robes and trim (the recolour tool in `tools/cut_ruins_tileset.py` already does
  roof colours this way), a matching portrait, a name. Figures assembled from separate hats, robes
  and staffs were ruled out: generated art rarely lines up layer to layer.
- **Magic:** a starting element (with a matching banned element, the engine's usual balancing
  lever) and three signature spells (one Damage, one Protection, one Dispel) from a pool built from
  the existing ones, so they come pre-balanced. More are learned along the way.
- **Growth:** starts weaker than the roster wizards and levels up.

### Party

The roster wizards become people in the world, stationed in its places. Talk to them to start
their stories; some join you. Their data already holds personality (`aiStyle`) and rivals
(`rivals`): rivals in the same party bicker, or refuse to travel together.

**Engine limit:** battles hold up to four seats today (3–4 wizard games, Survival). A party of
three against three elementals needs six, so the battle screen and seat code must grow. Companions
in battle: you pick for each, or set one to AI.

## Build order

1. **Maps as data, and travel.** *Done.* Maps are files (`maps/`, built by `tools/build_maps.js`
   from `tools/mapgen/`), with exits to other maps or the world map (`maps/world.json`).
   Hollowmere is the last town outside Corvanthe; the Corvanthe Road leads from it to the city's
   barred gate. See "Explore mode" in `CLAUDE.md`.
2. **City-block generator** for the sectors: streets, blocks filled with terraces (fronts, backs and
   sides of houses face the right way), squares, then hand-placed landmarks. *Started:*
   `tools/mapgen/city.js` and Cindergate's outer ring (`tools/mapgen/cindergate.js`), built from
   burnt recolours of the existing art. *All eight outer rings done* (`tools/mapgen/sector.js`), joined in a
   ring along Wallside in the wheel's order, each from recolours of the existing art plus its own
   weather. Next: the inner rings beyond each sector's north barrier, and sector-specific art
   (ice spires, floating rubble, rock spires, drowned streets) where recolours fall short. *Done:*
   each sector now has its own pieces from four sheets (`tools/mapgen/own.js`).
3. **Elementals on the map:** roaming, battle on contact, loot, respawn. *Done for Cindergate* (see
   "Echoes" in `CLAUDE.md`); balancing the Echo numbers against created wizards waits for step 7.
4. **Inventory and save game**, per profile. *Done:* one Explore save per profile (Guest too), the satchel (pack, companions, journal with lore to reread), Start over, and a Corvanthe section on the profile page. What quintessence buys is still deferred.
5. **Characters, dialogue and quests:** wizards in places, conversations, quest state.
6. **Warbands.** *Done:* 17 named crews (`js/explore_bands.js`) walk the streets, hunt Echoes for spill, take tolls or attack, and can be robbed or rob you; the halberdier joins the soldiers and archers. Talking, trading and hiring them waits for step 5.
7. **Character creation and the party** (needs the 6-seat battle work) can start any time after 1. *Started:* the look (see "Character creation" below); the magic (a starting element's spells, the barred opposite, growth) and the party come next.

1 and 3 are the backbone.

## Art needed

- City pieces: terraced and two-storey houses, a city wall and gate, alleys, a market square, a
  guildhall, a temple; each also in ruined form.
- Eight elemental creatures as battle sprites (stills like the character sprites, facing right,
  feet on the bottom edge), weak and strong versions.
- Each sector's look. The recolour tool can make frosted or scorched versions of every building,
  and night lighting and map effects can add embers, frost mist and sparks; some sectors want their
  own pieces (ice formations, lava cracks, floating rocks, drowned streets).
- Base wizard figures and portraits for character creation.
- From the earlier labelled sheet, not yet cut: cemetery, market stalls, well, rune circles,
  campfire, tent, cage, portal, braziers, mill and waterwheel, rowing boat, fog. Several suit warband
  camps and ground zero, so they wait for the city.

Prompt rules that worked for generated sheets are in `CLAUDE.md` (Explore mode, Art).

## Names

Chosen (all from the earlier candidates). Keep names our own: the idea of warbands scavenging a
ruined city is generic, but nothing should be borrowed from an existing setting.

| Thing | Name |
|---|---|
| The city | Corvanthe |
| The accident | the Unweaving (survivors also say "the Bright Hour") |
| Ground zero | the Wound |
| The elementals | Echoes |
| The element matter | quintessence; "spill" on the street, "spilling" for the hunt |
| Per element | cinderglass (Fire), tideglass (Water), rimeheart (Ice), stormglass (Lightning), lodestone (Earth), galesilk (Air), aether (Arcane), nightglass (Dark) |
| The warbands | gleaners |
| The sectors | Cindergate, the Drowned Quarter, Frostmarket, Spirewatch, the Quarry Ward, the Heights, the Collegium, Gloamside (table above) |

## Echo art brief

An Echo is a citizen remade in one element, still roughly human-shaped and carrying traces of who
they were (an apron, a guard's helmet, a lamplighter's pole). The weak kind is an ordinary citizen;
the strong kind is bigger and more monstrous, someone who was powerful or near the Wound. Battle
sprites in the same format as the character stills: full body, facing right, feet on the bottom
edge, about 512 × 768 for the weak kind (taller for the strong kind), detailed pixel art like
`sprites/eldrin.png` and `sprites/gretch.png`.

## Wrenford, the University town

Far west of Corvanthe (as far as two English cities apart), on the river Wren: the new University,
founded by the scholars of Corvanthe who weren't in the city on the day. As if Oxford had blown up
and its survivors had founded the next university somewhere quiet; Oxford-coded throughout (the
High, Carfax, Broad Street, quads behind gate towers, Bulldogs and Proctors, the Meadow and punts).
It is not ruined, and it is chastened: the Statutes of Caution (no working larger than its maker,
none without a witness, none that can't be undone, none in the street, no Word not understood; "VI.
Don't be clever" in pencil), a memorial to Magister Orrin (the one councillor who voted against the
Word), All Absent College (Fellows who keep the work of the lost), a bell rung nightly for the dead.

It is the safe zone and the giant tutorial: a new game starts here, the dons (roster wizards) teach
the basics through the Matriculation quest, and later it is where you make spells (a workshop at
Lantern College, not built yet). Built: see "Wrenford" in `CLAUDE.md`. Next: more quests and
colourful characters, the spell workshop, and a road map between Wrenford and Hollowmere.

## The University Year: learning magic

**Brief from the user:** at the start you can't do any magic; learning it is why you're at the University.
A series of quests like university life (the Library to learn glyphs before you can pick them, sparring
with a tutorial partner, lectures on the elements, practising in the Laboratory, a club with fighters
whose patterns you learn, a pub game, a final exam where spells are called out, retakes without limit),
and every one unlocks part of your wheel. The worry: it could feel like school. So there is a mystery
running underneath, real fights, incidents that break into the timetable, the sewers, and the country
round the town once you can defend yourself.

### The rule that keeps it from being school

**Nothing is taught that you don't use in a real fight within the next quarter of an hour.** Every
lesson ends in a reason to use it: the boxing club ends in a brawl in the street, the Fire lecture ends
in a bin fire in the Covered Market that turns out to be an Echo, the ward lecture comes the week the
sewers open. And **the plot interrupts the timetable**, never the other way round: about every second
lesson, something happens.

Second rule: **you can skip it.** Every exam can be sat early, with as many retakes as you like, so a
player can test out of one term's lessons. And on day one, like telling Gorion you're ready to leave
Candlekeep, the Senior Tutor offers the whole Year:

> "You've the look of someone who's done this before. If you like, you can sit Finals this afternoon."

- **Sit Finals now:** the Finals exam and viva straight away (retakes without limit). Pass and you
  graduate with the standard knowledge (home + 3 electives you pick on the spot, all glyphs, all three
  wheels, every ring), your BA hood, and the starting kit only. The Proctors' licence comes with it, so
  the country and the road east are open. Good for returning players and for playtesting.
- **A debug grant** (Test menu / `Explore.knowAll()`) does the same with no exam, for testing only.
- **What skipping costs:** the Year's quests are where the loot is. Every lesson, club rung, incident and
  plot beat pays (table below), and a skipper misses all of it, plus the Boxing Club's prize and
  the tutorial partner as an ally. The mystery doesn't vanish: a skipper hears rumours of the Echo in
  the market, and All Absent's plot can still be played after graduating (the Undercroft grate stays
  there), as a side story with its rewards. The Tutor's offer says so plainly ("you'll miss a good deal,
  mind"), so nobody skips by accident.

**What the Year pays** (rough targets, to be tuned; a full Year should leave you clearly better off than
a skipper, about 250 gold, 12–15 potions and 20 spill all told):

| Source | Pays |
|---|---|
| Each Library primer passed | 5 gold (the Keeper's "book prize") |
| Each lecture's questions right | a potion |
| Each Laboratory practical | 2 spill of that element (Fizzwick's leftovers) |
| Each Boxing Club rung | 10 gold purse; the champion: a title and the club's prize (+1 Attack) |
| Each spar won against your tutorial partner | 5 gold (a wager); they join you in Trinity |
| Collections (each) | 30 gold, 2 potions; a First (no retakes) adds a trinket |
| Incidents | 5–20 gold, spill from the Echo, sometimes a clue |
| Plot beats | the smugglers' cache: spill of every kind, potions, gold |
| Winks at the pub | stakes (small, rising with the rule set) |
| Finals passed the long way | 50 gold, and the College's gift (a choice of a staff or a charm, once items exist) |

### What you know (the hero's magic)

A made wizard starts knowing **only the Actions** (Attack, Guard, Grapple): fists and a staff. The hero
record gets `magic`, saved with it:

| Field | Starts | Unlocked by |
|---|---|---|
| `glyphs` | none | the Library: each primer teaches 2–3 of the 12 |
| `elems` | none | a lecture on that element **and** its 4 glyphs **and** a Laboratory practical |
| `cats` | none | Damage (Michaelmas), Protection (Hilary), Dispel (Trinity); Seal Ward and Cleanse Self come with their category |
| `rings` | 1 (inner) | middle ring: Collections (end of Michaelmas); outer ring: Finals |
| `skin` | no | Hilary, with Protection: the Master of the Schools' practical on blows (wards stop magic; Ironskin stops fists and blades). Core, not optional |

**In battle** (`js/game.js`): a seat's `cfg.known` (only the hero has one; the roster is unaffected).
An unknown element's sector draws like a forbidden one but with a 📖 instead of ⛔, and its hover says
where it's taught; an unknown category's whole wheel is locked; unknown rings don't take taps. The
minigame keyboard blanks glyphs you haven't learnt (the hard-mode "nothing greyed out" still only shows
the ones you know). Dispel needs ∞ ⊕ ∇ θ, glyphs from three other elements' sets, so it's naturally
last.

**Elements and the ban.** Your **home element** (picked at creation) is your first lecture, and its
opposite is **barred** for good, as the engine's bans already work: Fire ↔ Water, Air ↔ Earth,
Lightning ↔ Ice, Arcane ↔ Dark. So there's no compulsory element: a Dark student can never cast Arcane,
and an Arcane student never Dark. A graduate knows **home + 3 electives**, chosen from the six elements
that are neither home nor barred (the lecture list offers exactly those; the barred one's lecture hall
door says why: "Not for you, I'm afraid. Your gift runs the other way."). The other three of the six come
later, from teachers out in the world.

**Glyphs are never barred.** A glyph isn't owned by one element (∇ is in five sets), and Dispel needs
∞ ⊕ ∇ θ whatever your element, so every student can learn all 12. The ban stops the element's *sector*,
not its runes.

### The three terms

Oxford-coded, like the rest of Wrenford: **Michaelmas, Hilary, Trinity.** Each term has the same shape,
so players learn the rhythm: **lessons → a club rung → an incident → a plot beat → an exam.** Days move
with the existing clock; lectures happen at set hours (the timetable in the satchel's Journal), but a
missed lecture just comes round again the next day, so nothing is lost by exploring.

**Michaelmas: "Fists, then fire."** You can't cast. Matriculation (built) becomes its first week.
- Boxing Club (Actions only) and the first sparring partner.
- Library: primers for your home element's 4 glyphs.
- Lecture: your home element. Laboratory practical: cast it at a dummy 3 times. **Damage unlocked, inner ring, one element.**
- Incident: the market fire (a weak Echo, in Wrenford, which should be impossible). Plot starts.
- Collections (the term exam): middle ring.

**Hilary: "Walls."** Protection, a second element, Seal Ward.
- Lecture on wards (and on opposites: why the opposite element unravels a ward).
- The Duelling Society opens (wizard spars, a ladder).
- The **Proctors' licence**: once you can ward, you're allowed out of bounds — the countryside round Wrenford opens.
- The Undercroft (sewers) opens through the plot.

**Trinity: "Unmaking."** Dispel, Cleanse, the third element, Arcane; then Finals.
- Finals: graduation, the outer ring, and the field trips to Corvanthe (Weizan and Fizzwick, already planned).

### The activities

- **The Library (glyphs).** The Remnant Library's primers each teach glyphs. Reading isn't enough:
  Mr Quill tests you at the desk with a short flash-card round (a glyph is shown, pick its name or the
  element it belongs to; or the reverse). Pass and the glyphs are yours. Uses the glyph glow colours and
  the keyboard from the minigames, so it's practice for them. Lore books stay optional.
- **Lectures (elements).** In the lecture theatre (a new room type: tiered benches, a lectern, a
  demonstration bench). Short: the lecturer gives four or five lines with a live demonstration (the
  element's strike VFX on a dummy), then asks two questions (its opposite; what its rider does). Right
  answers give a small bonus (a potion, a better grade), wrong ones cost nothing. Each lecturer is a
  character: the Fire lecturer singes the front row, the Ice one lectures in a fur hat, the Air one
  never stops pacing. Lecturers can be the dons who are still to be invented.
- **The Laboratory (practicals).** Fizzwick's Warded Laboratory, inside: cast the new element's
  minigame at a target dummy until you've succeeded 3 times (retakes free, on the difficulty you play).
  This is where people learn the minigames without a fight on. Later practicals: hold a ward against a
  bottled Echo for 3 rounds; dispel a ward off a dummy.
- **Your tutorial partner.** A fellow first-year (invented; a rival-friend, Ron to your Harry or Draco
  to it, picked by your element), sparred at the end of each term's lessons. They learn as you do:
  their wheel unlocks on the same schedule, so each spar shows what the new thing is for. They turn up
  in the plot and fight beside you in it (the first ally you get).
- **A club: the Boxing Club** (the Schools, evenings). Actions only, a ladder of named boxers, each with
  a **pattern** you can learn to read: one always Guards after two Attacks, one Grapples whenever you
  Guarded last, one mirrors your last pick, the champion changes pattern when hurt. These are fighters
  (`fighters.json`) with a scripted `pattern` instead of `fighterAIChoose`'s reading; the ring is the
  duel screen with only Actions. Beating the ladder: a title and **+1 Attack** for good (`phys.atk`), the one
  thing only the club gives; clubs are optional, so nothing core is locked behind one. Later clubs (one is enough
  to start): the **Duelling Society** (wizard spars, Hilary) and the **Boat Club** (a rowing timing
  minigame on the Wren; optional, for the rhythm crowd).
- **The pub game: Winks at the Wren's Nest.** The regulars play the Tabletop version of Wizard's Duel
  with tiddlywinks for small stakes. It's `js/tabletop.js`, already written with its own AI, played
  Beginner rules first; the regulars get tougher (Normal, then Advanced rules) as you win. Teaches the
  rules of the table game by playing it, earns gold, and the pub is where you overhear plot clues.
- **Exams.** In the Examination Schools (a big hall room). An examiner calls a spell ("Lesser ward,
  Ice." "Greater strike, Fire." "Cleanse."), you cast it through its minigame against the clock, 6 to 10
  calls, pass mark 70%. Fail and you may sit again at once, as often as you like; each retake reshuffles
  the calls. Collections (Michaelmas, Hilary) are short; Finals cover everything and end with a viva:
  a spar against an examiner. Gowns: Commoner, then Scholar, then a BA hood on graduation.

### The mystery: All Absent

The plot that runs under the timetable, tied to lore that already exists (All Absent College, the
Statutes of Caution, the Orrin Memorial, Ponder's lost satchel).

**What's really happening:** a Fellow of All Absent College, who lost everyone on the day of the
Unweaving, has been smuggling spill into Wrenford to finish a Word that would **undo** the Unweaving
and bring the Echoes back as people. Sympathetic, and wrong: the Word is the same kind of working that
caused the disaster. The spill is cached in the Undercroft, and it's leaking: that's why Echoes keep
turning up in a town that should have none.

**The beats** (one per half-term or so, each with a fight):
1. *Michaelmas.* The market fire is an Echo. The Bulldogs call it a prank. Ponder's satchel (built)
   holds a receipt for spill bought in bulk, not by him. Someone breaks into the Laboratory's spill store.
2. *Michaelmas end.* A night-time chase over the rooftops of Founders' Quad (walk the map at night with
   the Bulldogs after you: being out after the bell is against the Statutes); you lose them at the Memorial.
3. *Hilary.* The Library's slips show a forbidden book borrowed under a dead Fellow's name. Mr Quill helps.
   The Undercroft is found under the Covered Market: the sewers open.
4. *Hilary end.* Smugglers (a gleaner crew with Wrenford connections) in the Undercroft: a real fight.
5. *Trinity.* Aurelia's Foresight shows Radcliffe Square on fire on the night of the Encaenia (the
   graduation feast). The Proctors don't believe a student.
6. *Trinity end.* The night before Finals: the Word is spoken in the Undercroft beneath the Orrery.
   The final fight, with your tutorial partner beside you; stop it (or, later, an ending where you
   don't quite). Then Finals, for real, the morning after.

### Incidents (things that happen)

Small events on the clock, a few a term, none of them required: a loose Echo in a quad (any element:
fight it with what you know, Actions if that's all you have); a Town v Gown brawl outside the pub (Actions
only, and a Bulldog fines you if you cast in the street — the Statutes again); a student's familiar
escaped up the University Church; a ward on a college gate failing (hold it with your own ward, once you
have one); a punt adrift in the flood. Each pays a little and some carry plot clues. They get stronger
and more frequent as the plot builds. Engine: a timed `incidents` table per map, rolled by the clock like
`rollEvent` rolls rooms.

### Places to build

- **The Undercroft** (Wrenford's sewers and the old culverts of the Wren): a dungeon below the town,
  entered from a grate in the Covered Market (and later from All Absent's cellar). Interior maps built
  with the rooms code, a new `sewer` type (water channels, walkways, grates, side vaults), rats and
  leaking Echoes, the smugglers' cache. **Needs art:** a sewer tileset sheet (brick tunnel floors and
  walls, water channel, iron grates, ladders, rat sprites).
- **Out of bounds** (Hilary on): the countryside round Wrenford, opened by the Proctors' licence once
  you can ward: Wrenford Meadow and the river path, a chalk down with an old barrow (a crypt room), a
  wood with poachers (soldiers and archers), the road toward Hollowmere (already planned). Fights here
  are bandits and strays, the step between town and Corvanthe.
- **New rooms in town:** the lecture theatre, the Examination Schools hall, the boxing ring (the Schools'
  court already exists outside), the Wren's Nest's winks table.

### Pacing target

About 45–60 minutes a term, 2½–3 hours to graduation, with a fight (real or sparring) at least every
10 minutes and a plot beat every 20. If testing shows long stretches of lessons, cut lessons, not plot.

### Build order for the Year

1. **`magic` on the hero and the battle locks** (sectors, categories, rings, glyphs on the keyboard),
   the debug grant, and **Sit Finals now** (at first as a plain grant from the Tutor, the exam once step 4
   exists), so playtesting can skip the Year from day one. Matriculation rewires to grant the first unlocks.
2. **Library flash-cards** and **Laboratory practicals** (glyphs and elements become learnable).
3. **The Boxing Club** (pattern fighters) and the tutorial partner (a fighter-wizard who levels with you).
4. **Lectures** (a lecture-theatre room, the lecturers) and **exams** (call-outs through the minigames).
5. **Plot beats 1–2 and incidents**, so Michaelmas is playable end to end. Play it; check it's fun.
6. Hilary: Protection, Undercroft (needs the sewer art), the Proctors' licence and out of bounds.
7. Trinity: Dispel, the finale, Finals, graduation into the field trips.
8. Winks at the Wren's Nest (can go in any time: the engine exists).

Decided: a graduate knows home + 3 electives (never the barred opposite; glyphs are never barred);
anyone can skip the Year on day one by sitting Finals, missing its rewards but not the plot; Ironskin is
a core Hilary lesson, the Boxing Club gives +1 Attack.

### When it happened

The intro never fixed a date. **The Unweaving was 15 years ago.** Long enough for the gleaner trade to
be an industry and for Wrenford to have grown a University in an old river town's buildings; recent
enough that its founders (the scholars who were away on the day) still teach there, the bell is still
rung for the dead every night, and the grief is still raw, which is what the villain runs on. Mages
live long (the intro says so), so the Fellows haven't aged much since.

### The cast of the Year

**Your tutorial partner: Wil Ashby** if you're playing a woman, **Nell Ashby** if a man (same
story, same lines). About 19, from a gleaner family on the Corvanthe Road. Their older sister **Clemency
Ashby** was a first-year at Corvanthe on the day, when Wil / Nell was four; she's an Echo now (Water,
the Drowned Quarter) and the family turned to gleaning to look for her. Practical, cheerful, a
scrapper who can't sit still in lectures. **Their home element is your barred one** (you're Fire,
they're Water), so each can cast what the other never can, and in spars their strikes unravel your
wards and yours theirs. Wil / Nell are the reason the plot matters: Ashgrove's promise to bring the
Echoes back as people is aimed at them, they're tempted in Trinity, and the finale is talking them down
as much as stopping him. Won back, they're your first companion. (If your barred element is Water,
Clemency is still Water: she's their sister, not yours; only their own element changes.)

**The villain: Dr Edwin Ashgrove, Sub-Warden of All Absent College.** Kindly; gives you tea and good
advice in Michaelmas. The forbidden book was borrowed in the name of **Dr Margery Ashgrove**, a
Fellow lost on the day: his wife.

**Names:** nobody in the cast shares a name with the creator's name lists (`NAMES` in
`js/explore_hero.js`), so your wizard is never mistaken for one of them; check new characters against it.

**Lecturers** (each student meets their home element's and their three electives'):

| Element | Lecturer | Quirk |
|---|---|---|
| Fire | Dr Ignatius Pyle | no eyebrows; the front row is always empty |
| Water | Miss Perpetua Wells | everything's damp; teaches from the punt stage in summer |
| Air | Professor Halcyon Drift | never stops pacing; his notes blow away mid-sentence |
| Earth | Dr Agnes Barrow | an archaeologist; lectures among crates of rocks she won't let you touch |
| Lightning | Dr Erasmus Fulmer | hair on end (*fulmen*, lightning) |
| Ice | Professor Ingrid Rime | fur hat indoors; the inkwells freeze |
| Arcane | Dr Oriel Nightingale | speaks almost entirely in footnotes |
| Dark | Dr Lavinia Crowe | lectures with the lights off; the only Fellow who went into Corvanthe after the Unweaving and came back |

**The Wrenford Fancy** (the Boxing Club), coached by the Head Porter: Two-Step Tolley (Attack, Attack,
Guard, again), Mirror Meg (copies your last pick), Horace "the Clinch" Webb (Grapples when you Guarded
last), Gentleman Jem, the champion (changes pattern below half HP).

**Others:** Mrs Dorcas Pegg, landlady of the Wren's Nest; Old Bartholomew "Squop" Hale, undefeated at
winks; Mr Ravel, the Senior Proctor (chases you over the rooftops, later grants the licence).

### Art brief: the cast of the Year

Townsfolk sprites (`sprites/folk/<role>.png`, drawn by `drawNpc`), painted in their **final colours**
(unlike the hero bases, nothing is recoloured). Same format as the battle stills: full body, three-quarter
view facing right, feet on the bottom edge, about 768 px tall. Put the files in `sprites/folk/source/`
named by role (`lect_fire.png`, `wil.png`, `ashgrove.png`, …); a cutter (green keyed out, cropped, sized,
like `tools/cut_hero_figures.py`) is still to write. Faces for dialogue are cropped from the sprites.

Prompt for ChatGPT (one figure at a time; attach `sprites/folk/source/old_eldrin.png` and
`old_witch.png` as style references):

> Pixel-art full-body sprite in exactly the same style, scale, pose conventions and level of detail as
> the attached two wizards: three-quarter view facing right, feet flat at the bottom of the image. This
> is [DESCRIPTION]. A human, ordinary proportions. Hard pixel edges, no glow halo around the figure.
> Plain flat pure green (#00FF00) background, nothing else in the picture, no text, no shadow on the
> ground. No green anywhere on the figure. Portrait image, the figure about 768 pixels tall.

The descriptions (all wear a black academic gown over their own clothes unless said; keep green off
the figures, so Earth's lecturer is in browns):

| File | [DESCRIPTION] |
|---|---|
| `lect_fire.png` | Dr Ignatius Pyle, the Fire lecturer: a stout middle-aged man, bald, no eyebrows, soot smudges on his face, a scorched black gown with singed hem over a red waistcoat, holding a pair of long iron tongs with a small flame at their tip, cheerful |
| `lect_water.png` | Miss Perpetua Wells, the Water lecturer: a tall thin woman in her forties, damp hair plastered flat in a bun, a sea-blue gown dripping at the hem, rolled-up sleeves, a punt pole over her shoulder, a small swirl of water above her other palm |
| `lect_air.png` | Professor Halcyon Drift, the Air lecturer: a lanky old man mid-stride, long white hair and gown swept sideways by wind, loose papers flying from his hand, a pale grey-white waistcoat, a small whirl of wind at his fingertips |
| `lect_earth.png` | Dr Agnes Barrow, the Earth lecturer: a sturdy middle-aged woman, sun-browned, short practical hair under a wide-brimmed brown field hat, a brown canvas coat with many pockets over her gown, a geologist's hammer in one hand and a rough stone in the other, dusty boots |
| `lect_lightning.png` | Dr Erasmus Fulmer, the Lightning lecturer: a wiry young-looking man, wild hair standing straight up on end, round spectacles, a yellow-and-black waistcoat, small blue-white sparks crackling between his raised fingers, an eager grin |
| `lect_ice.png` | Professor Ingrid Rime, the Ice lecturer: a tall stern woman in her fifties, a big white fur hat and fur-collared pale blue coat over her gown, frost on her shoulders, a slim staff tipped with an ice crystal, breath misting |
| `lect_arcane.png` | Dr Oriel Nightingale, the Arcane lecturer: a slight elderly scholar of indeterminate age, neat silver hair, a deep violet gown embroidered with tiny stars, half-moon spectacles, an open book in one hand with glowing violet runes floating off its pages |
| `lect_dark.png` | Dr Lavinia Crowe, the Dark lecturer: a gaunt woman in her sixties, white streak in black hair, a high-collared black gown, a faint scar over one eye, a hooded shuttered lantern held low giving almost no light, purple shadow curling at her feet, calm and unsettling |
| `wil.png` | Wil Ashby, a tutorial partner: a wiry young man about 19, tousled brown hair, freckles, a student's short black commoner's gown thrown over a patched gleaner's leather jerkin and boots, a satchel, a knife at his belt, a cocky grin, fists half-raised |
| `nell.png` | Nell Ashby, a tutorial partner: a wiry young woman about 19, cropped brown hair, freckles, a student's short black commoner's gown thrown over a patched gleaner's leather jerkin and boots, a satchel, a knife at her belt, a cocky grin, fists half-raised |
| `ashgrove.png` | Dr Edwin Ashgrove, Sub-Warden of All Absent College: a kindly grey-haired man in his sixties, neat beard, a full black doctor's gown with a dove-grey hood, a mourning band on one sleeve, holding a teacup and saucer, gentle smile, tired eyes |
| `proctor.png` | Mr Ravel, the Senior Proctor: a severe thin man, black gown with velvet bands, white bands at the throat, a tall black hat, a short black staff of office |
| `landlady.png` | Mrs Dorcas Pegg, landlady of the Wren's Nest: a broad rosy-cheeked woman, apron over a brown dress, sleeves rolled, a tankard in each hand (no gown) |
| `squop.png` | Old Bartholomew "Squop" Hale, pub regular: a little old man in a shabby tweed coat and flat cap, a small cup and a handful of coloured tiddlywinks counters (no gown) |
| `boxer_tolley.png` … `boxer_jem.png` | the four boxers, bare-knuckle in shirtsleeves and braces, no gowns: Two-Step Tolley (light, quick, on his toes), Mirror Meg (a lean woman boxer, hair tied back, watchful), Horace Webb (a huge bald grappler, arms wide), Gentleman Jem (tall, moustached, elegant, fists up in a classic stance) |

## Wrenford's people

About half of Wrenford is roster wizards; the rest are its own people, who stay there so the town
feels the same each time you come back. Roster wizards here follow one of two threads.

| Person | Who | Thread |
|---|---|---|
| The Head Porter | local (an old Wardgate soldier) | stays |
| The Bulldogs | local (the Proctors' constables) | stay |
| Dr Penhallow, Senior Tutor | local (invented) | stays; runs Matriculation, later the spell workshop |
| Mr Quill, Keeper of the Library | local (invented) | stays |
| Canon Marrow, Chaplain | local (invented) | stays; heals |
| Widow Coyle, licensed dealer | local (invented) | stays; buys spill, sells potions |
| Weizan, Master of the Schools | roster | **field trip**: stays, joins you on a University quest (a Schools party walking the Corvanthe Road) |
| Fizzwick, Master of the Laboratory | roster | **field trip**: stays, joins you on a University quest (collecting samples in Cindergate) |
| Aurelia, doctoral student | roster | **met at uni**: met again later, further east (her reading says so) |
| Ponder, third-year student | roster | **met at uni**: met again later elsewhere |

Still to do: their own art for the four invented dons (for now, recolours of Eldrin's old sprite and a female wizard in the same style: Dr Penhallow in a black gown and Widow Coyle in bottle green on the female figure, Mr Quill in russet and Canon Marrow in crimson on Eldrin's; `tools/make_folk_sprites.py`); the field
trip quests (the party work, step 7, lets these two fight beside you); the later meetings, which can
check `ExploreFolk.metAtUni(key)` to say "we met at uni"; and more townsfolk, not yet invented
(students, a rival, the landlady of the Wren's Nest, the Proctors themselves).

## The Hollow

The river of Hollowmere rises north of Corvanthe and runs through the city: in under the harbour wall
in the Drowned Quarter, through the Wound, and out of Cindergate boiling, then south-west to
Hollowmere. That is why Hollowmere's folk say it runs the other way at night. Only those two sectors
(opposites, Water and Fire) carry it; the inner rings will carry it on to the Wound.

## Interiors

Houses can be entered; each room is generated from its seed and holds one encounter, rolled by how
near the Wound it is: nothing, treasure, spill, Echoes, a rival gleaner crew (sometimes led by a
wizard; they always fight), or wounded gleaners who won't fight (one may join you, one may ask you to
fetch help from the safe house). Lore books, short stories, turn up anywhere. Fixed places: the
Gleaners' Rest safe house (Cindergate), the Drowned Crow (Hollowmere), the Collegium Library, and the
homes of named Echoes you can talk and trade with (Wenna the Baker in Cindergate, the Lamplighter in
Gloamside). Built (see "Interiors" in `CLAUDE.md`); floors, walls, furniture and loot art in; the
character art is still to come: gleaner adventurers, wounded gleaners, the safe-house keeper, a
trader, and the named Echoes (sheets 5–10 of the interior brief).

## Character creation

Built so far (`js/explore_hero.js`): a new game asks who you are. Name, man or woman, young / middle-aged
/ old (humans only for now), a figure, robes (10 colours), trim (8), hair (7), skin (7 tones) and an element, whose colour
your magic takes. The look is a recolour of a base figure, done in the browser. A new wizard fights with
the plain wheel and the Actions; their element's first spells, the barred opposite and levelling up are
the next part of step 7.

### Base figures (the art brief, delivered)

All twelve are in: eleven from the brief below plus the old witch (`tools/cut_hero_figures.py`).

Twelve figures, two for each sex and age, so the Figure choice has something to choose between:

| Slot | Figure 1 | Figure 2 |
|---|---|---|
| Young man | slim, clean-shaven, short hair, pointed hat | broader, different skin tone, hair tied back, hood instead of a hat |
| Young woman | long loose hair, pointed hat | darker skin, a braid over one shoulder, hood |
| Middle-aged man | short beard, pointed hat | balding, moustache, no hat |
| Middle-aged woman | hair in a bun, wide-brimmed hat | shoulder-length hair, a circlet, no hat |
| Old man | long beard, pointed hat (a human, not Eldrin's elf) | short beard, stooped, hood |
| Old woman | (have: the old witch) | hunched, shawl over the head, walking stick |

The game recolours three things, so they must be painted in **key colours**: robes and hat in purple
(only), the magic in blue (only), and hair and beard in silver-grey (only), even on the young figures.
No other purple, blue or grey anywhere on them. The trim must be gold (it is recoloured too, as gold on the robe), and skin can be any natural tone (it is recoloured inside face and hand boxes set per figure). Put
each file in `sprites/hero/source/` and they get cut, sized and added to `BASES` with their hair and
face boxes.

Prompt for ChatGPT (one figure at a time; attach `sprites/folk/source/old_eldrin.png` and
`old_witch.png` as references):

> Pixel-art full-body wizard sprite in exactly the same style, scale, pose and level of detail as the
> attached two wizards: three-quarter view facing right, holding a gnarled wooden staff in the hand on
> the left of the picture with a small magic flame at its top, the other hand raised with a swirl of
> magic above the palm, feet flat at the bottom of the image. This one is a [YOUNG MAN: slim,
> clean-shaven, short hair, pointed wizard hat]. A human, ordinary proportions. Colour rules, very
> important: the robes, sleeves and hat (or hood) are purple and only purple, in its light and dark
> shades, with gold trim; the magic (staff flame and hand swirl) is bright blue and only blue; the hair
> and any beard are silver-grey and only silver-grey, even though the character is young. Use no other
> purple, blue or grey anywhere. Leather belt and pouches brown, skin natural. Hard pixel edges, no glow
> halo around the figure or the magic. Plain flat pure green (#00FF00) background, nothing else in the
> picture, no text, no shadow on the ground. Portrait image, the figure about 768 pixels tall.

Change the bracketed part for each slot in the table.
