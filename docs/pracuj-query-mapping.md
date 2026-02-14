# Pracuj Query Mapping Notes

This file is a working mapping dictionary built from real URLs and UI HTML sent by product owner.
It is intentionally incremental and should be extended with each new query sample.
Scope: all mappings here apply to `it.pracuj.pl` (IT jobs section), not generic `pracuj.pl`.

## Confirmed Params

- `wm`: work mode (`tryb pracy`)
  - values seen: `full-office`, `hybrid`, `home-office`, `mobile`
- `sal`: minimum salary
  - example: `sal=500`
- `its`: specializations (string slugs)
- `ap`: only with project description
  - example: `ap=true`
- `et`: position level (`poziom stanowiska`) IDs

## Specializations (`its`) Seen

`backend`, `frontend`, `fullstack`, `mobile`, `architecture`, `devops`, `gamedev`, `data-analytics-and-bi`, `big-data-science`, `embedded`, `testing`, `security`, `helpdesk`, `product-management`, `project-management`, `agile`, `ux-ui`, `business-analytics`, `system-analytics`, `sap-erp`, `it-admin`, `ai-ml`

## Technologies Mapping (`itth`)

Source URL:

`https://it.pracuj.pl/praca?itth=226%2C89%2C77%2C73%2C75%2C76%2C62%2C55%2C54%2C50%2C40%2C41%2C42%2C39%2C38%2C37%2C33%2C34%2C36%2C213%2C212%2C86`

The mapping below is derived from UI active filters HTML in the same order as IDs in `itth`.

| `itth` ID | Technology |
|---|---|
| `226` | iOS |
| `89` | Hibernate |
| `77` | Angular |
| `73` | Node.js |
| `75` | .NET |
| `76` | React.js |
| `62` | R |
| `55` | Rust |
| `54` | C |
| `50` | Go |
| `40` | PHP |
| `41` | C++ |
| `42` | TypeScript |
| `39` | C# |
| `38` | Java |
| `37` | Python |
| `33` | JavaScript |
| `34` | HTML |
| `36` | SQL |
| `213` | AWS |
| `212` | Android |
| `86` | Ruby on Rails |

## Params Still To Verify Semantics

- `rd` (relative date / recency)

## Position Levels Mapping (`et`)

Source URL:

`https://it.pracuj.pl/praca?et=1%2C3%2C17%2C4%2C18%2C19%2C5%2C20%2C6%2C21`

The mapping below is derived from UI active filters HTML in the same order as IDs in `et`.

| `et` ID | Position Level |
|---|---|
| `1` | starszy specjalista (Senior) |
| `3` | ekspert |
| `17` | kierownik / koordynator |
| `4` | menedżer |
| `18` | dyrektor |
| `19` | prezes |
| `5` | praktykant / stażysta |
| `20` | asystent |
| `6` | młodszy specjalista (Junior) |
| `21` | specjalista (Mid / Regular) |

## Contract Type Mapping (`tc`)

Source URL:

`https://it.pracuj.pl/praca?tc=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7`

The mapping below is derived from UI active filters HTML in the same order as IDs in `tc`.

| `tc` ID | Contract Type |
|---|---|
| `0` | umowa o pracę |
| `1` | umowa o dzieło |
| `2` | umowa zlecenie |
| `3` | kontrakt B2B |
| `4` | umowa na zastępstwo |
| `5` | umowa agencyjna |
| `6` | umowa o pracę tymczasową |
| `7` | umowa o staż / praktyki |

## Work Dimension Mapping (`ws`)

Source URL:

`https://it.pracuj.pl/praca?ws=1%2C2%2C0`

The mapping below is derived from UI active filters HTML in the same order as IDs in `ws`.

| `ws` ID | Work Dimension |
|---|---|
| `1` | część etatu |
| `2` | dodatkowa / tymczasowa |
| `0` | pełny etat |

## Publish Time Filter (Path Segment)

Observed path pattern:

`/praca/ostatnich <N> dni;p,<N>`

Observed values:
- `p,1` -> ostatnich 24h
- `p,3` -> ostatnich 3 dni
- `p,7` -> ostatnich 7 dni
- `p,14` -> ostatnich 14 dni
- `p,30` -> ostatnich 30 dni

Examples:
- `https://it.pracuj.pl/praca/ostatnich%2024h;p,1`
- `https://it.pracuj.pl/praca/ostatnich%203%20dni;p,3`
- `https://it.pracuj.pl/praca/ostatnich%207%20dni;p,7`
- `https://it.pracuj.pl/praca/ostatnich%2014%20dni;p,14`
- `https://it.pracuj.pl/praca/ostatnich%2030%20dni;p,30`

## Boolean Marker Filters

- `ao=false`: oferty od pracodawcy
- `ua=true`: ukrainians welcome
- `wpl=true`: no polish

## Location Filter (Path Segment)

Observed pattern:

`/praca/<city>;wp`

Example:
- `https://it.pracuj.pl/praca/gdynia;wp?rd=10`

Interpretation:
- `<city>` is selected city/location.
- `;wp` indicates location mode in path form.
- `rd` appears to represent distance/radius from selected location (e.g. `rd=10` => +10 km).

## Keyword Search (Path Segment)

Observed pattern:

`/praca/<keyword phrase>;kw`

Examples:
- `https://it.pracuj.pl/praca/frontend%20developer;kw`
- `https://it.pracuj.pl/praca/something%20here%20will%20be%20f;kw`

Interpretation:
- `<keyword phrase>` is free-text search query.
- `;kw` marks keyword-search mode.

Keyword search can be combined with query filters:
- `https://it.pracuj.pl/praca/something;kw?its=gamedev`

---

## Generic `pracuj.pl` Mapping (Non-IT)

The section below covers generic `www.pracuj.pl` filters and is separate from `it.pracuj.pl`.

### Categories Mapping (`cc`)

Source URL:

`https://www.pracuj.pl/praca?cc=5001%2C5002%2C5003%2C5004%2C5006%2C5005%2C5036%2C5037%2C5007%2C5009%2C5011%2C5010%2C5008%2C5013%2C5014%2C5015%2C5016%2C5034%2C5012%2C5035%2C5032%2C5033%2C5031%2C5028%2C5027%2C5026%2C5025%2C5024%2C5023%2C5022%2C5021%2C5020%2C5019%2C5018%2C5017`

Mapping (as provided, same order as IDs in `cc`):

| `cc` ID | Category |
|---|---|
| `5001` | Badania i rozwój |
| `5002` | Bankowość |
| `5003` | BHP / Ochrona środowiska |
| `5004` | Call Center |
| `5006` | Budownictwo |
| `5005` | Energetyka |
| `5036` | Doradztwo / Konsulting |
| `5037` | Edukacja / Szkolenia |
| `5007` | Franczyza / Własny biznes |
| `5009` | Human Resources / Zasoby ludzkie |
| `5011` | Hotelarstwo / Gastronomia / Turystyka |
| `5010` | Finanse / Ekonomia |
| `5008` | Internet / e-Commerce / Nowe media |
| `5013` | Inżynieria |
| `5014` | IT - Administracja |
| `5015` | IT - Rozwój oprogramowania |
| `5016` | Kontrola jakości |
| `5034` | Inne |
| `5012` | Zdrowie / Uroda / Rekreacja |
| `5035` | Ubezpieczenia |
| `5032` | Zakupy |
| `5033` | Transport / Spedycja / Logistyka |
| `5031` | Sprzedaż |
| `5028` | Sektor publiczny |
| `5027` | Reklama / Grafika / Kreacja / Fotografia |
| `5026` | Public Relations |
| `5025` | Produkcja |
| `5024` | Prawo |
| `5023` | Praca fizyczna |
| `5022` | Obsługa klienta |
| `5021` | Nieruchomości |
| `5020` | Media / Sztuka / Rozrywka |
| `5019` | Marketing |
| `5018` | Łańcuch dostaw |
| `5017` | Administracja biurowa |

### Position Levels Mapping (`et`) for `www.pracuj.pl`

Source URL:

`https://www.pracuj.pl/praca?et=1%2C3%2C17%2C4%2C18%2C19%2C5%2C20%2C6%2C21%2C2`

Mapping from provided HTML (`data-test="section-position-level"`):

| `et` ID | Position Level (`www.pracuj.pl`) |
|---|---|
| `1` | praktykant / stażysta |
| `3` | asystent |
| `17` | młodszy specjalista (Junior) |
| `4` | specjalista (Mid / Regular) |
| `18` | starszy specjalista (Senior) |
| `19` | ekspert |
| `5` | kierownik / koordynator |
| `20` | menedżer |
| `6` | dyrektor |
| `21` | prezes |
| `2` | pracownik fizyczny |

Note:
- `et` IDs are not guaranteed to map identically between `it.pracuj.pl` and `www.pracuj.pl`.
- Treat mappings as source-specific dictionaries.

### Cross-Source Compatibility Notes (`www.pracuj.pl` vs `it.pracuj.pl`)

Confirmed by product owner:
- `tc` (contract type / rodzaj umowy) uses the same IDs in both sources.
- `sal` is the same filter concept in both sources (`www.pracuj.pl` example: `?sal=1`).
- Other filters are functionally aligned across sources:
  - work dimension (`ws` / etat),
  - work mode (`wm` / tryb),
  - publish time,
  - additional markers.

Recommendation:
- Keep shared dictionaries where IDs are confirmed equal (`tc`),
- keep source-specific dictionaries where divergence is known (`et`).
