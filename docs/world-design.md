# The World — design

The long-term plan for turning Explore mode into a large world to explore, in the spirit of
Baldur's Gate: countries, cities, towns and villages, with wizards stationed around the world.
You meet them, they start stories, and some join your party. Battles use the existing duel
screen. Nothing here is built yet beyond Hollowmere (see "Explore mode" in `CLAUDE.md`).

Status: **vision and names agreed; steps 1, 3, 4 and 6 built; step 2 has all eight outer rings and all eight inner districts (the centre, the Wound, waits); interiors built; Wrenford, the University town and tutorial, built; the University Year (learning magic): built end to end, awaiting a playthrough.**

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
   each sector now has its own pieces from four sheets (`tools/mapgen/own.js`). *Done:* the eight inner
   districts (`tools/mapgen/inner.js`), joined by the Inner Circuit, from sheets 14–23. Next: the Wound itself (its sheet is cut).
3. **Elementals on the map:** roaming, battle on contact, loot, respawn. *Done for Cindergate* (see
   "Echoes" in `CLAUDE.md`); balancing the Echo numbers against created wizards waits for step 7.
4. **Inventory and save game**, per profile. *Done:* one Explore save per profile (Guest too), the satchel (pack, companions, journal with lore to reread), Start over, and a Corvanthe section on the profile page. What quintessence buys is still deferred.
5. **Characters, dialogue and quests:** wizards in places, conversations, quest state.
6. **Warbands.** *Done:* 17 named crews (`js/explore_bands.js`) walk the streets, hunt Echoes for spill, take tolls or attack, and can be robbed or rob you; the halberdier joins the soldiers and archers. Talking, trading and hiring them waits for step 5.
7. **Character creation and the party** (needs the 6-seat battle work) can start any time after 1. *Started:* the look (see "Character creation" below); the magic (a starting element's spells, the barred opposite, growth) and the party come next.

8. **The Moriquende (after Wrenford):** a hex-map strategy year in the forest west of Wrenford, where you meet Sylvara: limited watch, goblins, Varg (wolfmen) and incoming orcs kept in check against each other, while Sylvara tends four ancient trees. *Step 1 built* (the strategy layer on its own screen): `docs/forest-design.md`.

1 and 3 are the backbone.

## The wider world (sketch, not built)

The user's outline (November 2026), so the world feels like you could go anywhere. Everything built so
far (Wrenford, the Moriquende, Hollowmere, Corvanthe) is one region, **the Vale of the Hollow**, on a
home **island**. Names with "?" are placeholders. A tappable sketch was published as an artifact
("The Known World Sketch"). **It stays a design map for now:** the game keeps its own world map of the
Vale (`maps/world.json`); later this chart could become the top level (long roads, sea voyages and
airships between regions), each region with its own walking map at today's scale.

**Decided:** home is an island, across **the Narrows** from the Mainland (a ferry from Ferryhythe?
lands in Hallowmark?). The Hollow was reversed (see "The Hollow"). The snakemen are **the Sythrae**,
Gnash's hyena people **the Hrakka**.

**Scale and geography (the second sketch):** the home isle is half its first size and the Mainland
about twice, roughly Britain beside Europe, so most of the world is the Mainland. Drawn by real
geography: rivers rise in high ground (the Hammerfells, the Greatspine, the Sunwall?, the isle's
western uplands), join into trees and end in estuaries or deltas; the Greatspine is the Mainland's
watershed (north to the Narrows, the Wolf Sea and the inland **Salt Sea?**, south to the Middle Sea),
crossed by two passes (the Deepgate on the western one); capitals sit on rivers, harbours and passes,
and roads follow valleys and coasts; the west is wet and wooded, the north-east dry steppe, the Middle
Sea coast scrub and olives, the Southlands' desert in the rain shadow of **the Sunwall?** (its Atlas).
New on it: **Westholm?** (an island west of the home isle, its Ireland), **the Westmarch?** (the
Mainland's rainy west coast, open), **the Free Ports?** (a peninsula into the Middle Sea, open), three
peninsulas (Hierarchy, Free Ports, Wyrmreach), lakes at the Greatspine's feet, and a Nile-like river
with a delta in the Southlands. Rivers named so far: the Hale? (Hallowmark), the Brass? (the
Dominion), the Holy River? (the Hierarchy), the Mourne? (the Gravemarches).

**Third sketch: coastline, the Inner Sea, towns and a day's travel.** Zoomed out so the Mainland
sits in open sea, with a varied coast: a north-western peninsula (Wavecrest?) and gulf (Gulfhaven?),
a western bay (Baymouth?), the Gravemarches as a great south-western block, the Hierarchy's long
peninsula, the Free Ports' peninsula, Wyrmreach's, an Eastern Ocean coast (Dawnport?), and **the Inner
Sea?** in the south: a sea reached from the Middle Sea only through a narrow channel, like the Black Sea
and the Bosporus, with the Free Ports' twin cities **Narrowgate?** and **Eastgate?** on either bank.
Borders wander and neighbours share them.
- **Travel rule:** a day by cart is about thirty miles. On the sketch Wrenford to Corvanthe is three
  days. Every road has a named town or an unnamed inn or hamlet at least every day's ride (283 stops
  in all; the longest leg is 1.08 days), and ferries link Ferryhythe to Halemouth, Narrowgate to
  Eastgate, Bleakhaven to Straitwatch and the Hierarchy's delta to the Southlands'.
- **83 named places**, each where towns really grow (a ford, a bridge, a harbour, where rivers meet, a
  lakeshore, a pass or the foot of one, canal locks, an oasis, a border fort, a market crossroads);
  every name with a "?" is a placeholder. Tapping one on the sketch shows why it's there and the days
  to its neighbours. The main roads: Halemouth up the Hale to Lakemere, over **the Deepgate**, down to
  Lumen and the delta; Hale east to Varrow, the Tuskholds and Dawnport; Varrow over **Highwatch** to
  Brassgate, its canal (Lockford) and Sunquay; the Inner Sea's shores to Narrowgate; Lumen west through
  Velumbra to Barrowcourt and Mournmouth; Barrowcourt north through Gimbal to the Westmarch; Wyrmreach
  north over **Ashpass**; and the Southlands' caravan road from Straitwatch, oasis to oasis, to Sunmouth.

### The home isle and its seas

| Where | Who lives there | Notes |
|---|---|---|
| **The Wildwood?** (west of the Moriquende) | tribes of Varg, goblins, orcs and elves | more forest with no Warden; the West Road runs through it |
| **Saltreach?** (the West Road's end) | fisherfolk and traders | a port on **the Sunset Ocean?**; ships come from the west, from whoever lives over the water (not yet known) |
| **The Hammerfells?** (north of Wrenford) | dwarves in closed holds; humans and Varg in mining towns below | the dwarves trade with the towns and don't welcome outsiders |
| **The Harrow** (lowlands between Wrenford and the mountains) | roving orc bands | the lowlands are plagued with orcs |
| **The Grey Sea? and the Skerries?** (north of the mountains) | hardy humans, Varg and dwarves on small islands | a cold sea; not meant for travel beyond it |
| **The Wolf Sea?** (east of Corvanthe) | Varg pirates | cold; the Hollow reaches it east of the city (**Wolfmouth?** at the mouth); **the Reaver Isles?** to its north |

### The Mainland (south, across the Narrows)

Deep, since a lot is planned to happen there. Like Europe, a different shape. North to south:

| Country | Who | The idea |
|---|---|---|
| **Hallowmark?** (just across the Narrows; capital Hale?) | humans | **magic is illegal** as too dangerous; witch-finders watch the ferries, so your first step onto the Mainland is as a criminal |
| **The Brazen Dominion?** (east of it; Varrow?) | humans, soldiers, battle-mages | **warlike; hires and drafts wizards** into its armies; at war with Hallowmark |
| **The Tuskholds?** (the north-east arm, across the Wolf Sea; Grukmoot?) | **orcs who have settled down** | farms, herds, walled towns; they call the Harrow's orcs savages |
| **Gimbaldry?** (western foothills; the skyport Gimbal?) | **gnomes** | **magical airships** that fly all over the world (routes on the sketch) |
| **The Greatspine? and the Deepholds?** (the great central range; the Deepgate) | **deep dwarves** | live deep under the mountains, **loathe daylight**, come up only to trade |
| **The Gravemarches?** (south-west; Barrowcourt?) | **necromancer-lords** like Daveron, the dead, tithe-paying peasants | the dead work the fields and guard the roads |
| **Velumbra?** (beside them, by the Middle Sea; Umbral Hollow?) | **drow**: dark elves, purple skin, pale hair | a twilight forest over deep caverns |
| **The Lumen Hierarchy?** (the central river plain; holy city Lumen?) | priest-mages, pilgrims | **a theocracy that worships magic**; its priests are mages |
| **The Concord?** (south-east of the range; Brassgate?) | ruling wizards, engineers, clerks | **very orderly; magiscience and industry** (canals that run uphill, rune-mills, lightning lamps) |
| **Wyrmreach?** (the volcanic south-east; the Ember Throne?) | **a dragon king**, **half-dragon lizardmen nobles** like Korvath, human subjects | the nobles all do magic |
| The southern coast | not decided | free ports, a trade league or pirates? |

### The Southlands (over **the Middle Sea?**)

Desert along the north coast, savannah in the middle, jungle in the south: **the Sythrae** (snakemen,
temple-cities in the jungle), humans, and **the Hrakka** (hyenamen like Gnash, clans on the savannah).

**Still open:** the countries' names; who trades with Saltreach from the west; the southern coast;
whether the gnome airships become the way to travel between regions.

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
and its survivors had founded the next university somewhere quiet; Oxford-coded throughout, with the names bent a little so they aren't the real ones (the
Hythe, Carrefax, Wide Street, quads behind gate towers, Bulldogs and Proctors, the Meadow and punts).
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
5. *Trinity.* Aurelia's Foresight shows Radwell Square on fire on the night of the Encaenia (the
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

1. *Done.* **`magic` on the hero and the battle locks** (sectors, categories, rings, glyphs on the keyboard),
   the debug grant, and **Sit Finals now** (at first as a plain grant from the Tutor, the exam once step 4
   exists), so playtesting can skip the Year from day one. Matriculation rewires to grant the first unlocks.
2. *Done.* **Library flash-cards** and **Laboratory practicals** (glyphs and elements become learnable).
3–8. *Done* (all in `js/explore_year.js` and `js/explore_pub.js`; see "As built" below): the Boxing Club,
   the partner, lectures, exams, every plot beat, incidents, the Undercroft, the Proctors' licence, the
   finale, Finals and the viva, and winks at the Wren's Nest. Next: the user's playthrough and bug list.

### As built (where it differs from the plan above)

- **Lectures are played live** in the Examination Schools' lecture theatre (`js/explore_lecture.js`): the
  students file in and sit on seven tiers of benches either side of a stepped aisle, you take your seat
  (Wil / Nell beside you once met), and the lecturer walks the stage talking in timed speech bubbles,
  chalks the board, traces the element's four glyphs in the air and casts it at a straw dummy (each
  element its own effect; Dr Crowe puts the lamps out). Students mutter, gasp, laugh and take notes;
  your partner whispers. Then the lecturer asks the two questions. Tap to hurry a line; Skip jumps to
  the questions. About a minute and a half each.
- **Timetable:** lectures can be heard any time, not at set hours; a term just limits how many electives
  you may have heard (one by Michaelmas, two by Hilary, three by Trinity). Your own element's lecture is
  a bonus (a potion for answering well), since Matriculation already taught it.
- **The terms' work** (what Professor Thorley wants before the exam, `termNeeds`): Michaelmas, an
  elective and beat 2; Hilary, wards (On Wards, then Fizzwick's practical), Ironskin (the Master of the
  Schools' practical), a second elective and beat 4; Trinity, dispels (Dispel's primer, On Unmaking, then
  Fizzwick's practical), a third elective and the finale. Collections: 6 calls, 5 to pass; Finals: 10
  calls, 7 to pass, then a viva against the Master holding back nothing you've been taught. Collections I
  unlock the middle ring, Finals the outer ring. A pass at the first sitting (a First) pays 20 extra gold.
- **Beat 2** is a night scene, not a rooftop chase (Wil / Nell offers to keep watch, which moves the clock
  to 22:00, so it never waits on the clock): after dark a hooded figure in Founders' Quad runs, and
  two Bulldogs take you for the culprit (a fists fight). Win or lose, you end up with the key stamped
  UNDERCROFT (losing costs a 5 gold fine).
- **Beat 3** gives the Undercroft door (a trapdoor by the Covered Market); **beat 4** is a smugglers' crew
  in it (a room fight), paying spill of every kind and potions and finding the A.A. ledger.
- **The finale** (beneath the Orrery, a trapdoor in Radwell Square, at 22:00 once Trinity's work is
  done and Aurelia has spoken): you have two things to say to Wil / Nell from four; two good ones turn
  them, and they fight beside you (a wizard ally, team A) against Ashgrove and Clemency's Echo, then join
  your party. Otherwise they fight for Ashgrove, and leave Wrenford after.
- **Incidents** (never two at once): a loose Echo in a quad, a Town v Gown brawl outside the Bird and
  Bell (fists), a failing college gate ward (cast a ward). Each happens once on a trigger, so nobody misses
  it (`FIRST`: your first elective, Collections I passed, learning to ward); after all three, more come
  on the clock as extras, at least 6 game hours apart.
- **Out of bounds:** a new wizard can't leave Wrenford until they can ward (the Proctors' licence).
- **The pub:** Old Squop plays the tabletop duel (`js/tabletop.js`): you pick one of four wizard cards,
  pick a spell each round and flick for it (a marker sweeps over a cup; tap in time); Beginner rules for
  5 gold, Normal rules for 10 once you've beaten him twice.
- **Rewards** come to about 350 gold, 15 potions and 20 spill over a full Year, against the starting
  kit for someone who sits Finals on day one.

Decided: a graduate knows home + 3 electives (never the barred opposite; glyphs are never barred);
anyone can skip the Year on day one by sitting Finals, missing its rewards but not the plot; Ironskin is
a core Hilary lesson, the Boxing Club gives +1 Attack.

### When it happened

**The Unweaving was 15 years ago,** on Midsummer's Eve; the intro scroll says so (`js/explore_intro.js`), and that Wrenford's University was founded twelve years ago. Long enough for the gleaner trade to
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

**Others:** Mrs Dorcas Pegg, landlady of the Wren's Nest; Old Bartholomew "Squop" Finch, undefeated at
winks; Mr Ravel, the Senior Proctor (chases you over the rooftops, later grants the licence).

### Art brief: the cast of the Year

Moved to `docs/art-prompts.md`, with every other placeholder and a ready-to-paste prompt for each.

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
| Ponder, a student who keeps putting off Finals | roster | **met at uni**: met again later elsewhere |

Still to do: their own art for the four invented dons (for now, recolours of Eldrin's old sprite and a female wizard in the same style: Dr Penhallow in a black gown and Widow Coyle in bottle green on the female figure, Mr Quill in russet and Canon Marrow in crimson on Eldrin's; `tools/make_folk_sprites.py`); the field
trip quests (the party work, step 7, lets these two fight beside you); the later meetings, which can
check `ExploreFolk.metAtUni(key)` to say "we met at uni"; and more townsfolk, not yet invented
(students, a rival, the landlady of the Wren's Nest, the Proctors themselves).

## The Hollow

The river of Hollowmere rises in the western uplands, runs east past Wrenford (where the Wren joins
it) and Hollowmere (just outside the walls), and through the city: in under the wall in Cindergate, boiling by the next bridge, through
the Wound, and out through the Drowned Quarter, the old harbour, then east to the Wolf Sea. Hollowmere's
folk say it runs the other way at night. (Until November 2026 it ran the other way, from the north,
out of Cindergate to Hollowmere; the user reversed it so the river reaches the sea east of the city.)
Only those two sectors (opposites, Fire and Water) and their inner districts carry it.

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

### Base figures, round 2 (more variety)

Four figures per slot, so the Figure choice is a real choice; the middle-aged man first (the user
plays one, and had only a bearded man in a hat and a bald man with a moustache). New figures vary
the **head and face**, not the body: same pose, staff hand, robe cut and key colours as round 1.

Use the round 1 prompt above, with two changes:

- Attach two of round 1's figures as the style references instead of the old sprites:
  `sprites/hero/source/mid_man_1.png` and `sprites/hero/source/old_man_2.png` (the hooded one).
- Add this after the colour rules: *A hood, hat, scarf or shawl is part of the robe: purple only.
  Jewellery, circlets, buckles and spectacle frames are gold. No grey metal, no blue gems, no
  coloured headwear.*

Name the files `<slot>_<n>.png`, carrying on from the numbers already used (`old_woman_1` is the
witch, so the old woman's new ones are 3 and 4). Then run `python3 tools/cut_hero_figures.py` and check
`--preview`.

| File | Bracketed part |
|---|---|
| `mid_man_3.png` | MIDDLE-AGED MAN: hood up and shadowing the brow, short full beard, weathered face, a small scar across one cheek |
| `mid_man_4.png` | MIDDLE-AGED MAN: no hat, long hair tied back, a forked beard, sharp features |
| `mid_man_5.png` | MIDDLE-AGED MAN: wide-brimmed wizard hat, a neat goatee, lean face, high cheekbones |
| `mid_man_6.png` | MIDDLE-AGED MAN: stocky and broad-shouldered, no hat, close-cropped hair, a thick full beard, a battle-mage look |
| `young_man_3.png` | YOUNG MAN: no hat, messy curly hair, light stubble, cheerful face |
| `young_man_4.png` | YOUNG MAN: wide-brimmed wizard hat, long straight hair to the shoulders, clean-shaven |
| `young_woman_3.png` | YOUNG WOMAN: no hat, short cropped hair, freckles, determined face |
| `young_woman_4.png` | YOUNG WOMAN: wide-brimmed wizard hat, hair in a high ponytail |
| `mid_woman_3.png` | MIDDLE-AGED WOMAN: hood up, hair in a long braid over the shoulder, stern face |
| `mid_woman_4.png` | MIDDLE-AGED WOMAN: pointed wizard hat, hair in two braids, laugh lines |
| `old_man_3.png` | OLD MAN: bald, no hat, a very long beard to the belt, bushy eyebrows |
| `old_man_4.png` | OLD MAN: wide-brimmed wizard hat, a big drooping moustache, no beard, upright and wiry |
| `old_woman_3.png` | OLD WOMAN: no hat, hair in a bun, small round gold-framed spectacles, kindly face |
| `old_woman_4.png` | OLD WOMAN: pointed wizard hat, long loose hair, tall and upright, sharp-eyed |

**Delivered (round 2):** all fourteen are in: 14 male figures, 12 female (the old witch counts as old
woman 1). **Equal for both sexes** (the user's rule): the next two figures are middle-aged women, which evens it at 14 each.
Prompts for them:

| File | Bracketed part |
|---|---|
| `mid_woman_5.png` | MIDDLE-AGED WOMAN: no hat, short practical hair swept back, a strong jaw, a battle-mage look, broad-shouldered |
| `mid_woman_6.png` | MIDDLE-AGED WOMAN: wide-brimmed wizard hat, long hair tied in a low knot, a sharp knowing smile |

Old man 4 and old woman 4's hat brims (gold-orange underneath) fooled the skin finder, so their face
and neck boxes are set by hand (`FIX` in `tools/cut_hero_figures.py`).

### Base figures, round 3: bandit wizards (eyepatch)

Rough hedge-mages and gleaner bosses, so the figures can also serve as bandit and warband wizards.
They come as pairs, one man and one woman, so the sexes stay even. Same round 1 prompt and the round 2 colour lines,
plus: *A bandit wizard: the robe is worn and patched, with ragged hems and a frayed hood or hat, but
still purple. The eyepatch and its strap are dark brown leather. No knives, swords or steel.*

| File | Bracketed part |
|---|---|
| `mid_man_7.png` | MIDDLE-AGED MAN: a leather eyepatch over his right eye, hood down on his shoulders, shaved head, a short rough beard, a scar running out from under the patch, a sly sneer |
| `mid_woman_7.png` | MIDDLE-AGED WOMAN: a leather eyepatch over her left eye, a frayed hood up, a long braid down the front, a cold stare, a thin scar on the chin |
| `old_man_5.png` | OLD MAN: a leather eyepatch, a battered pointed hat with a torn brim, a long unkempt beard with a few small gold rings tied in it, a missing tooth in a crooked grin |
| `old_woman_5.png` | OLD WOMAN: a leather eyepatch, wild tangled hair, a tattered shawl over the head and shoulders, gold hoop earrings, a hard and cunning face |

**Delivered (round 3):** six. `mid_man_7` (bald, scarred), `mid_man_8` (grey hair, patched hood),
`old_man_5` (torn hat, ringed beard), `mid_woman_7` (hooded, braid, robe whole), `mid_woman_8` (the
same look, tattered and patched) and `old_woman_5` (wild hair, hoops, in rags). Then `mid_woman_5` (short swept-back hair, scar, hoops) and
`mid_woman_6` (wide-brimmed hat with a buckled band, loose hair) evened the sexes at 17 each. The staff hand of
`mid_woman_8` is boxed by hand (`FIX`): a brown robe patch passed for skin. Patches and eyepatches are
brown leather and fall inside the skin boxes, so they take a darker shade of the chosen skin.

All six eyepatched bandits (`mid_man_7`, `mid_man_8`, `old_man_5`, `mid_woman_7`, `mid_woman_8`, `old_woman_5`) are for NPCs only
(`NPC_ONLY` in the cutter, `npc` in `figures.json`): the creator doesn't offer them, which leaves 14 figures of each
sex there (the old witch included).

Idea (not built): the base figures, recoloured, as Explore's NPC wizards (gleaner bosses, townsfolk),
leaving out the figure and colours the player picked so no NPC looks like you.

### Staff toppers (built: all five sheets in, the creator's Topper row)

Alternative heads for the hero's staff. The plan is that a topper replaces the painted head: the staff
mask hides the original above the hand, and the topper is drawn at an anchor point and angle per
figure, found from the masks. Toppers are recoloured like the figures: glow in blue → the element's
colour, metal in gold → the Trim colour, wood in the staff's orange-brown → the Staff wood.

One ChatGPT chat per sheet, four toppers a sheet. Attach `sprites/hero/source/mid_man_1.png` and
`sprites/hero/source/old_woman_3.png` as style references. Save as `sprites/hero/toppers/source/sheet_<n>.png`.

> Pixel-art sprite sheet of four wizard staff heads (toppers) in exactly the same style, pixel scale,
> shading and outline as the staffs held by the attached wizards. Each topper stands upright, seen
> from the front, about 130 pixels tall, with a short plain section of staff (a "neck") at its
> bottom, about 14 pixels wide and 20 pixels long, ending in a straight horizontal cut so it can join
> a staff. The four toppers sit in a row, well apart, none touching. They are: [LIST]. Colour rules,
> very important: anything that glows (orbs, crystals, flames, eyes, sparks) is bright blue and only
> blue; all metal (rings, claws, bands, cages, caps) is gold and only gold; wood is the same
> orange-brown as the attached staffs. No other blue, no grey or silver metal, no gems of other
> colours. Bone and feathers may be off-white or brown. Hard pixel edges, no glow halo spilling past
> the topper. Plain flat pure green (#00FF00) background, nothing else in the picture, no text, no
> shadows. Landscape image.

| Sheet | [LIST] |
|---|---|
| 1 Classic | a raw blue crystal gripped by four gold claws; a blue glass orb floating inside an upright gold hoop; a gold crescent moon cupping a small blue orb; a wooden shepherd's crook with a small gold lantern hanging from it, blue flame inside |
| 2 The world | a jagged blue quintessence shard bound to the wood with gold wire; a small gold orrery, three thin rings around a blue glowing core; a cage of bent gold bars with a blue wisp trapped inside; a gold lantern with a blue flame, like a Finder's |
| 3 Glyphs | the glyph Ω cut in gold with a blue flame behind it; the glyph Ψ as a gold trident with blue sparks on its tines; the glyph ⊕ as a gold ring and cross with a blue orb at the centre; the glyph ✸ as an eight-pointed gold star with a blue core |
| 4 Bandit | an off-white skull with blue light in its eye sockets; a broken sword stump lashed on with brown rope, a blue glow along the break; a pair of brown antlers with blue sparks between them; a bundle of brown feathers and small bones on leather thongs around a blue orb |
| 5 Scholar | a gold hourglass with blue glowing sand; a gold hand with closed fingers holding a blue orb; a small brown wren perched on a gold ring around a blue spark; an ornate gold key-head with a blue light in its bow |

Checks when a sheet comes back: every glow blue, every metal gold, no grey, flat green background,
and each topper has its straight-cut neck at the bottom. Regenerate a sheet that breaks a rule.

### Familiars (art brief, not built)

A small companion that follows your wizard round Explore and sits at their feet in battle, like
Nerissa's Fathom. Four to choose in the creator, later more as rewards. One ChatGPT chat per sheet;
attach `sprites/fathom.png` and `sprites/hero/source/mid_man_1.png` as style references. Save as
`sprites/familiars/source/sheet_<n>.png`.

> Pixel-art sprite sheet of a small magical familiar in exactly the same style, pixel scale, shading and
> outline as the attached shark familiar and wizard. The familiar is [FAMILIAR]. Draw it four times in a
> row, well apart: sitting, walking (two frames, legs or wings in different positions) and a
> "casting" pose with its eyes and markings glowing. Facing right, three-quarter view, feet (or lowest
> point) at the same baseline in every pose. About 200 pixels tall. Colour rules, very important: any
> glow, eyes and magical markings are bright blue and only blue (the game recolours them to the
> wizard's element); no other blue anywhere. Natural fur, feather or skin colours otherwise. Hard pixel
> edges, no glow halo past the outline. Plain flat pure green (#00FF00) background, nothing else, no
> text, no shadow. Landscape image.

| Sheet | [FAMILIAR] |
|---|---|
| 1 | a tawny owl with tufted ears and wise, glowing eyes, faint rune markings on its wing feathers |
| 2 | a sleek black cat with a long tail, glowing eyes and a small rune-shaped mark on its forehead |
| 3 | a warty toad, fat and pleased with itself, with glowing spots down its back and glowing eyes |
| 4 | a raven with ragged feathers, glowing eyes and glowing runes along its beak |

Checks: blue only where it glows, flat green, the same baseline and size in all four poses.
