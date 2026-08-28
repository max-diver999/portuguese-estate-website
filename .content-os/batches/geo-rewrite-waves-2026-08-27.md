# Rewrite waves — portuguese-estate.com, planned 27 August 2026

Diagnosis: `.content-os/reports/GEO-DIAGNOSTIC-2026-08-27.md`.
Method and rejected signals: `docs/GEO-SCORING.md`.

**Status: P0 fixed and R0 executed on 27 August (approved). R1–R10 awaiting the go-ahead.**

## What the waves are actually fixing

Not writing quality. The reward components are flat across the corpus — worst 18
pages score openers 15.4 and structure 12.4 against the best 18 at 16.2 and 13.3.
Every page is written to the same standard, and 80% of all penalty mass is
template-family plus duplicated-text plus duplicated-volume.

So each wave has exactly one job: **give every page a topic no neighbouring page
holds.** The realistic target per page is 45–60. The sister site's equivalent
waves moved area pages from 0–27 to 46–69.

The theses below were produced by eight readers, one per cluster, each having read
every page in it; then attacked by eight adversaries instructed to find collisions
and pasteable theses. Where an adversary killed a thesis, the replacement is used
and marked **[revised]**. Several of the first-pass theses asserted exclusivity
that a corpus grep disproved — those are the ones that would have rebuilt the
template in new words.

---

## R0 — give every shared block one owner (7 guides, enabling wave)

Found by the planning pass and verified against the corpus. **This wave must run
first**, because the cluster waves below are supposed to *link* to canonical
explanations rather than restate them, and right now there is nothing to link to.

The corpus has a spine: the 2025 INE paragraph (169,812 transactions, €41.2bn,
+17.6%, 8,471 non-resident, −13.3%) prints on **67 of 141 files** — verified by
grep, not estimated. AIMI mechanics, the AL regime, the CPCV document list, the
condominium reserve-fund explanation and the IMT arithmetic table are each
restated across 20–25 more.

| page | job |
|---|---|
| guides/portugal-property-market-record-2025-ine-data | Sole publisher of the 2025 INE series, with release date and revision status. No other page prints these five numbers. |
| guides/imt-tax-non-resident-portugal-2026 | Sole owner of every IMT arithmetic table and of DL 97/2026 commencement and the 24-month refund route |
| guides/aimi-wealth-tax-portugal-property | Sole owner of AIMI mechanics; comparison pages may state only the single clause their argument needs |
| guides/alojamento-local-license-portugal | Sole owner of the national AL regime. Lisbon and Porto containment stay in their own guides |
| guides/condominium-fees-portugal | Sole owner of assembly mechanics and recurring charges — already the strongest version in the corpus |
| guides/due-diligence-portugal-property | Sole owner of the document workflow; absorbs the scattered checklists as one canonical sequence |
| guides/portugal-rental-yield-guide | Separates yield figures that have a nameable publisher from broker commentary; the bands that fail that test come out site-wide rather than moving |

**Risk, and it is a publishing risk rather than an editorial one.** Deleting the
shared blocks leaves dozens of pages short and argument-less until their own
cluster wave lands. Nothing from R0 ships on its own. The second risk is that
seven canonical guides written in one sitting become the next template family, and
that a guide absorbing six pages' material simply concatenates them — which
converts a duplicated-text penalty into a duplicated-volume one on a single file.

---

## R0 — executed 27 August. What it did, and what it did not

### The honesty pass was far larger than the two items reported

The plan listed two fabricated first-hand claims. A systematic sweep found **an
entire family** of them that the August "fabricated data" pass had missed:

| claim family | pages | disposition |
|---|---|---|
| "Portuguese Estate ranks *‹PLACE›* as/within *‹TIER›* … using INE data, not promotional developer brochures" | 23 | deleted — no such ranking exists, and the sentence also stuffed the page's own slug |
| "…the Portuguese Estate desk, which stress-tests deals … before clients sign CPCV deposits" | 23 | deleted — no such desk service |
| "When municipal AL rules change, we update guidance against Câmara sources" | 22 | deleted — unverifiable process claim, identical across pages |
| "Portuguese Estate Field Note(s)" sections, each resting on client files, transactions or tracking | ~20 | headings renamed to their actual subject, each differently; every first-hand claim inside rewritten |
| a fabricated survey: "Q2 2026 sample (n=37): 54% prioritised Lisbon primary home…" | 1 | deleted |
| "internal median winter occupancy … across 28 reviewed files" | 1 | deleted |
| "Portuguese Estate tracking suggests roughly 30% of Lisbon resale transactions…" | 1 | deleted |
| "in our files", "our clients", "we routinely see", "in our modelling", "across our transactions" | 9 | rewritten to the mechanism, keeping the substance |

Two pages also published **a double taxation convention that does not exist**
("the 2026 UK–Portugal convention"). The instrument in force is the 1968 one,
correctly stated on the site's own treaty guide, so the corpus contradicted
itself. Both corrected.

Kept deliberately: offers of service ("send your brief, we reply within one
business day") and editorial positions ("Portuguese Estate treats X as…"). The
line drawn is claims about **data we hold or work we have done** versus **what we
offer to do**.

### The spine pass moved less than hoped

The 2025 INE paragraph was removed from the pages that restated it verbatim, and
57 pages that cited the series without one were given a route to the canonical
guide. The pointer is deliberately six words long, so it cannot itself contain a
nine-word sequence and become the next template family.

Measured, before and after:

| | before | after |
|---|---|---|
| corpus mean | 19.2 | 19.1 |
| pages scoring zero | 45 | 46 |
| template-family penalty mass | 7,023 | 6,816 |
| duplicated-volume | 4,225 | 3,981 |
| duplicated-text | 3,791 | 3,654 |
| cannibal pairs | 201 | 200 |

**That is the honest result: the spine was worth about 5% of the duplication
mass.** A shared paragraph of 60–90 words is small against pages of 3,000–5,000
words whose seventeen H2 headings are themselves one skeleton with the town name
substituted. The template families are the mass, and they are R1–R5 work. R0's
value is that the cluster waves now have canonical pages to link to, and that the
corpus no longer publishes claims about work nobody did.

### Two self-inflicted errors, recorded because they cost real time

1. A regex written as `Portugal recorded 169,812[^.]*?\.` stopped at the decimal
   point inside "€41.2 billion", truncating sentences on 58 pages and leaving
   fragments like "2 billion and national residential prices rose 17.6%".
2. The repair for that then deleted whole paragraphs beginning with a digit —
   which inside YAML frontmatter, where there are no blank lines, took out FAQ
   entries, `relatedSlugs` and `heroImage` on three compare pages.

Both were caught by gates and diffing against HEAD, and both were repaired: 6
files of truncation, 3 of frontmatter, 2 pages that had fallen under the
word-count minimum. The lesson for R1–R5 is that this corpus's figures contain
decimal points and its frontmatter contains prose, so sentence-level edits must be
made by reading, not by regex.

### Also corrected in the diagnostic report

Two of my own earlier claims were wrong and are struck: there is **no leftover
South African rand** in the corpus (a `R[0-9]` search was matching the R in
`EUR500,000`), and the worked example is **not** identical across 22 towns (the
sentence-frequency script stripped digits from its comparison key; each town
carries its own figures). The real defects behind both are recorded in their place.

---

## R1 — Algarve area pages (6)

The tightest template family in the corpus: Lagos and Albufeira share 1,550 of
3,829 nine-word sequences, Lagos and Portimão 35%, Albufeira and Portimão 32%.
One article, town name swapped, seventeen headings deep.

| page | now | cause | the topic it will hold |
|---|---|---|---|
| albufeira-property-investment | 0 | template-family 336 | **[revised]** On the Strip the exposure is the operating licence attached to the address, not the neighbours' condominium vote |
| lagos-property-investment | 0 | template-family 333 | Lagos drinks from one reservoir inside its own municipality; when Bravura drops, the restrictions land on pools, gardens and new connections — supply is hydrological before it is planning |
| portimao-property-investment | 0 | template-family 252 | Much of Praia da Rocha is classified tourist development: Portuguese law requires a single operating entity, so the buyer gets a share of a pooled business and a capped right to occupy their own flat |
| tavira-property-investment | 0 | template-family 300 | **[revised]** The cluster's only market with beaches but no beachfront — the sea sits behind barrier islands, which governs every micro-market on the page |
| faro-property-investment | 0 | template-family 252 | Faro airport casts a legal shadow — aeronautical easement plus municipal acoustic zoning — across exactly the corridors sold as cheap entry |
| vilamoura-property-investment | 0 | template-family 222 | **[revised]** Remaining supply is a number written into an approved urbanisation plan, so future competition is readable from a public document |

**Risk.** The adversary found four of the six converging on one shape — "a mapped
line drawn by a public body decides what may exist here" — which would rebuild the
template with better nouns. Albufeira, Tavira and Vilamoura were revised off that
axis for exactly this reason. Faro and Lagos are the two that legitimately remain
mapped-constraint pages, and they must not be written in the same order: Faro is
about a corridor being sold to buyers, Lagos about a resource running out.

---

## R2 — the 47% segment pair and its family (6)

`american-buyers × uk-buyers` share 2,131 of 4,522 sequences — the single worst
pair on the site. `french × german` share 42%. Portugal applies the same rules
whatever passport the buyer holds, so these pages have nothing of their own unless
they carry **what the buyer's own country does to them**.

| page | now | cause | the topic it will hold |
|---|---|---|---|
| american-buyers-portugal-property | 0 | 47% overlap with uk | The US–Portugal treaty's saving clause switches the treaty off for US citizens: an American never stops filing at home and must build relief from credits that IMT and IMI do not qualify for |
| uk-buyers-portugal-property-brexit | 0 | 47% overlap with american | Brexit changed not what a Briton may own but how long he may sit in it, and under the EU Entry/Exit System the 90-in-180 count is machine-kept rather than stamped |
| french-buyers-portugal-property | 0 | 42% overlap with german | Taxed by two annual wealth taxes at once — French IFI on market value, Portuguese AIMI on VPT — and the SCI wrapper French families reach for by reflex forfeits the individual AIMI allowance |
| german-buyers-portugal-property | 0 | 42% overlap with french | Portugal charges close family nothing at death, Germany taxes the worldwide estate, and there is no German–Portuguese inheritance treaty: the Algarve house is taxed once, entirely in Germany |
| canadian-buyers-portugal-property | 0 | shared skeleton | The CRA treats one villa as two assets: kept for the family it is excluded from T1135; let once it becomes specified foreign property and compromises the principal-residence claim |
| uae-buyers-portugal-property | 0 | shared skeleton | No home income tax to credit against, so 28% on rent and the tax on the gain are the entire and final bill — the only buyer here who recovers none of it |

**Risk, and it is the serious one.** The adversary's verdict was that distinct
theses do not by themselves prevent the shared skeleton that produced 47%: eight
of the thirteen segment pages currently recite the same Schengen 90-in-180 count
and the same foreign-asset-reporting paragraph. Each page must own a distinct
mechanism *class* — treaty override, immigration time, annual wealth tax, death
tax, reporting status, credit availability — and the national mechanics must be
linked out, not restated. If two of these pages end up with the same section
order, the wave has failed regardless of the theses.

---

## R3 — Greater Lisbon area pages (8)

| page | now | cause | the topic it will hold |
|---|---|---|---|
| cascais-property-investment | 0 | template-family 264 | **[revised]** On front-line stock the premium sits on an asset whose downside is insurability and the right to rebuild |
| oeiras-property-investment | 0 | template-family 312 | **[revised]** The only page here whose municipality abuts Lisboa across continuously built-up fabric — Algés and Miraflores run into the city with a tax boundary through the middle |
| alcantara-property-investment | 0 | 17% vs marvila | **[revised]** A valley with a motorway in the air above it: the 25 de Abril approach, the Eixo Norte-Sul viaduct, a rail line and the port road |
| marvila-property-investment | 0 | 17% vs alcantara | Two housing markets split by the railway — Gebalis municipal estates above, riverside warehouse conversions below — so any freguesia average describes neither |
| chiado-principe-real-property | 0 | template-family | **[revised]** In the Chiado the façade and the structure are frequently not the same age: the blocks rebuilt after the 1988 fire under the Plano de Recuperação |
| parque-das-nacoes-property | 0 | template-family | Flats plugged into Expo-era infrastructure concessions — district heating and cooling, pneumatic waste — so the monthly charge is a utility contract inherited with the deed |
| sintra-property-investment | 0 | template-family | **[revised]** Moved off geography onto the parishes that actually supply the cheap stock — Algueirão-Mem Martins, Rio de Mouro — rather than the classified landscape |
| setubal-peninsula-property-investment | 0 | template-family | **[revised]** On the Palmela–Setúbal side tenant demand has a published calendar: Autoeuropa model allocation, with the page's geography cut to match |

**Risk.** Sintra collided with three siblings at once in the first pass and had to
be moved off the natural-park axis entirely. Cascais and Sintra remain the two
pages most likely to drift back together, because both can be written as
"a protected overlay manufactures scarcity". Cascais must stay on insurance and
rebuild rights; Sintra must stay on the commuter parishes.

---

## R4 — Porto and the north (5)

| page | now | cause | the topic it will hold |
|---|---|---|---|
| matosinhos-property-investment | 0 | 31% vs gaia | **[revised]** The sea frontage is not a view but a working facility with a legal status — the Leixões port estate |
| vila-nova-de-gaia-property-investment | 0 | 31% vs matosinhos | The prime Cais frontage is held by port wine houses as bonded lodges, a footprint left by the historic Gaia-only export rule |
| braga-property-investment | 0 | 21% vs gaia | **[revised]** Supply elasticity: the only city in the cluster that can still answer a rent rise by building |
| aveiro-property-investment | 0 | template-family | **[revised]** The waterfront premium sits inside a nationally designated significant-flood-risk area on the Ria — instrument kept, unmeasurable causality dropped |
| coimbra-property-investment | 0 | template-family | A nine-month academic let is a legal category, not a habit: lawful only where the contract states the tenant's transitory study purpose |

**Risk.** Matosinhos and Gaia both began as "one owner holds the best land", which
is also Comporta's thesis — a three-way collision the cluster adversary caught by
grepping outside its own cluster. Matosinhos was moved to port legal status.
Braga's first thesis was a borrowed chiasmus from the sister site and was cut.

---

## R5 — Silver Coast, Comporta and Madeira (7)

| page | now | cause | the topic it will hold |
|---|---|---|---|
| caldas-da-rainha-property-investment | 0 | 24% vs nazaré | **[revised]** A treatment town laid out around the thermal hospital: the page is about length of stay, not employment |
| nazare-property-investment | 0 | 24% vs caldas | A submarine canyon reaching almost to the shore gives two beaches with opposite seasons, and the Sítio headland is the wall between two property markets |
| lourinha-property-investment | 0 | 23% vs caldas | The dinosaurs and the shrinking clifftop plots are one geological fact: the soft Jurassic cliff that keeps exposing fossils is the cliff retreating under the plot |
| ericeira-property-investment | 0 | 19% vs nazaré | **[revised]** Ericeira is not a municipality: it is one freguesia inside Mafra, and every lever that prices a flat is pulled there |
| obidos-property-investment | 0 | template-family | Inside the walls the renovation counterparty is DGPC, not the câmara, and that timetable is the real cost of the address |
| comporta-property-investment | 0 | template-family | **[revised]** The empty horizon is held open by agricultural law, not by an estate's design taste or phase calendar |
| madeira-property-investment-guide | 0 | template-family | An autonomous region legislates its own letting rules, so the mainland RNAL regime this site cites everywhere else is not the rulebook for a Funchal apartment |

**Risk.** The adversary called this cluster structurally worst: three of seven —
Óbidos, Ericeira and Madeira — were the same move at different altitudes ("a legal
instrument, not the place's reputation, governs here"). Ericeira and Comporta were
revised off it. Nazaré and Lourinhã additionally cited the *same two source
documents*, which is the hardest collision to unpick after drafting, so they must
not be written in the same sitting.

---

## R6–R10 (outline; detail on approval)

| wave | pages | now | cause |
|---|---|---|---|
| R6 — international comparisons | 9 (`portugal-vs-` france, greece, italy, spain, turkey, dubai, malta, uk, cyprus) | 0–24 | italy × spain 29%, greece × italy 26%. Theses are strong and already distinct: tax base vs tax rate (IT), regional wealth tax (ES), letting ban on visa property (GR), non-transferable citizenship premium (TR), auditable service charge (AE), Special Designated Areas (MT), IHT following residence (GB), title issued vs title promised (CY) |
| R7 — domestic comparisons | 5 | 0–28 | Four of five collided with existing guides in the first pass; all four revised |
| R8 — remaining segments | 7 (chinese, indian, australian, angolan, israeli, south african, brazilian) | 0–27 | Same skeleton problem as R2. Distinct classes assigned: FX legality, remittance caps shaping deed quotas, order of disposal, AML gate, acquisition-tax parity, allowance calendar, residence choice under CPLP |
| R9 — developers | 3 | 0, 1, 36 | vanguard: the SPV on your CPCV can change owner while the marketing does not. farinvest: mediador vs trader on own account decides who signs the mediation contract. vic: your plot is mortgaged to the construction lender until the fraction is released at escritura |
| R10 — the guides that score 0, and Wave 1 | ~6 | 0–52 | The three Wave 1 articles at 52 are the corpus's `good.min` and the reason calibration fails; rewriting them is the cleanest test of whether 52 is three weak articles or the ceiling of formula-composed prose |

`projects/` (7 pages, 46–53) is the best collection on the site and is **not**
scheduled. It was de-templated by hand in an earlier wave, which is the same
result read from the other end.

---

## P0 — factual defects verified in the corpus, needing a decision now

These are not scoring artefacts and not stylistic. Each was checked by grep before
being written down.

1. **A double taxation convention that does not exist.** Two pages state "the 2026
   UK–Portugal double taxation convention"
   (`segments/uk-buyers-portugal-property-brexit`,
   `compare/portugal-vs-uk-property-investment`). The convention in force is the
   one signed in **1968**, which is what `guides/uk-portugal-double-taxation-treaty`
   correctly says — so the site currently contradicts itself and publishes a
   non-existent instrument on two pages.
2. **Two fabricated first-hand claims survived the August honesty pass.** I
   reported that class of claim as eliminated; it was not, and these two are still
   live:
   - "Portuguese Estate tracking suggests roughly 30% of Lisbon resale transactions
     with claimed AL involve non-transferable licences"
     (`compare/new-build-vs-resale-property-portugal`)
   - "internal median winter occupancy for beach-only units was 41% across 28
     reviewed files (2024-2025 operator statements)"
     (`guides/algarve-airbnb-investment-guide`)

   There is no such tracking and no such file review. Both must be deleted, not
   softened.
3. **A worked-example skeleton on 18–22 area pages**, with per-town numbers
   substituted into identical sentences. The numbers are each town's own — an
   earlier draft of this plan wrongly called them identical — so this is a template
   family to break, not an arithmetic error to correct.
4. **The noun-swap sentence on 21 pages**: "The following conservative scenario
   illustrates how national tax reform and *‹PLACE›* yields interact over a medium
   hold."
5. **`compare/portugal-vs-turkey-property-investment` writes `EUR500,000`** rather
   than `€500,000`, 28 times, which makes all 28 figures invisible to the scorer.
6. Minor, same pass: `guides/renovation-costs-portugal-per-m2` calls Article 1225
   liability "the decennial exposure … five years", contradicting itself inside one
   sentence. Both pages that cite Art. 1225 say five years, so there is no
   cross-page conflict — only this wording.

Items 1 and 2 are wrong on a live site and are the only things in this document
that arguably should not wait for wave approval.

## Working rules for every wave

1. Written by hand, page by page. No shared section order between pages of one
   wave, including closing paragraphs and source lines.
2. Score and validate after each page, not at the end.
3. After the wave, re-run `npm run geo:cannibals` **against the wave's own pages**.
   The sister project reproduced the original failure in miniature by writing three
   pages in one sitting.
4. Never invent a figure to escape a collision. If a number is not sourceable,
   name the source class instead.
5. Any figure that ends up on five or more pages goes into `.content-os/facts.json`
   with a source, or comes out of the text.
