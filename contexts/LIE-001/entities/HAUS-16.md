# Entity Context: HAUS-16

Generated: 2026-04-26T08:50:55.132Z

This is a generated scoped materialized view. Source of truth remains source-registry, entity-index, observations, fact-index, and patch log.

## Profile

- ID: HAUS-16
- Type: building
- Name: Haus 16
- Property: LIE-001

## Canonical Fields

| Field | Value |
| --- | --- |
| id | HAUS-16 |
| hausnr | 16 |
| einheiten | 14 |
| etagen | 4 |
| fahrstuhl | false |
| baujahr | 1926 |

## Related Entities

| ID | Type | Name |
| --- | --- | --- |
| LIE-001 | property | WEG Immanuelkirchstraße 26 |
| EH-039 | unit | WE 39 HAUS-16 |
| EH-040 | unit | WE 40 HAUS-16 |
| EH-041 | unit | WE 41 HAUS-16 |
| EH-042 | unit | WE 42 HAUS-16 |
| EH-043 | unit | WE 43 HAUS-16 |
| EH-044 | unit | WE 44 HAUS-16 |
| EH-045 | unit | WE 45 HAUS-16 |
| EH-046 | unit | WE 46 HAUS-16 |
| EH-047 | unit | WE 47 HAUS-16 |
| EH-048 | unit | WE 48 HAUS-16 |
| EH-049 | unit | WE 49 HAUS-16 |
| EH-050 | unit | WE 50 HAUS-16 |
| EH-051 | unit | WE 51 HAUS-16 |
| EH-052 | unit | TG 52 HAUS-16 |

## Active / Needs Review

_No facts available yet._

## Related Facts

| Fact | Kind | Date | Statement | Evidence | Sources |
| --- | --- | --- | --- | --- | --- |
| FACT-0887F8E546E3F1D4 | unit |  | unit EH-051 (EH-051) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-0AC2C5C526490872 | building |  | building HAUS-16 (HAUS-16) is present in canonical master data. |  | [MASTER-STAMMDATEN] |
| FACT-12CD86D70CD639A8 | relationship |  | Relationship unit_in_building: EH-052 -> HAUS-16. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-239D8BE40DECBB7E | relationship |  | Relationship property_has_building: LIE-001 -> HAUS-16. |  | [MASTER-STAMMDATEN] |
| FACT-2CDBF367C466DB24 | unit |  | unit EH-052 (EH-052) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-4789A1262B794A49 | unit |  | unit EH-044 (EH-044) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-50752367B3095487 | unit |  | unit EH-045 (EH-045) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-52FB793223B0E8C1 | unit |  | unit EH-047 (EH-047) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-58C01D82D5AFB3F3 | unit |  | unit EH-041 (EH-041) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-651E9735E5914278 | unit |  | unit EH-049 (EH-049) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-660B5069C4B870C3 | relationship |  | Relationship unit_in_building: EH-048 -> HAUS-16. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-67878608ED60BE01 | relationship |  | Relationship unit_in_building: EH-045 -> HAUS-16. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-6CCB54A2D5F45F53 | unit |  | unit EH-050 (EH-050) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-750632102E837A69 | relationship |  | Relationship unit_in_building: EH-047 -> HAUS-16. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-770F9E65D6D90D4E | unit |  | unit EH-039 (EH-039) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-859174687C331585 | relationship |  | Relationship unit_in_building: EH-050 -> HAUS-16. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-880F19672D37DD1C | relationship |  | Relationship unit_in_building: EH-042 -> HAUS-16. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-98106D146B5D4E5D | relationship |  | Relationship unit_in_building: EH-046 -> HAUS-16. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-98D511978AEB851F | unit |  | unit EH-046 (EH-046) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-9D7C7DE8F21BDC89 | relationship |  | Relationship unit_in_building: EH-049 -> HAUS-16. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-9DDDEC3A5200F74E | relationship |  | Relationship unit_in_building: EH-044 -> HAUS-16. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-B3880047A2AC87C2 | unit |  | unit EH-043 (EH-043) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-BC35DC466BAFD7C3 | unit |  | unit EH-040 (EH-040) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-CE6A7A23998321F7 | relationship |  | Relationship unit_in_building: EH-051 -> HAUS-16. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-D363B8F04D38BEEE | relationship |  | Relationship unit_in_building: EH-039 -> HAUS-16. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-D56343BDAA1725B1 | unit |  | unit EH-048 (EH-048) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-E0299658FC386D6E | unit |  | unit EH-042 (EH-042) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-EF560EEAA249F66E | relationship |  | Relationship unit_in_building: EH-043 -> HAUS-16. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-FB93FE455E275B92 | relationship |  | Relationship unit_in_building: EH-040 -> HAUS-16. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-FCB5077100808B60 | relationship |  | Relationship unit_in_building: EH-041 -> HAUS-16. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
