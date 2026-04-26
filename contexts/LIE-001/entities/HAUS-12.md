# Entity Context: HAUS-12

Generated: 2026-04-26T08:50:55.132Z

This is a generated scoped materialized view. Source of truth remains source-registry, entity-index, observations, fact-index, and patch log.

## Profile

- ID: HAUS-12
- Type: building
- Name: Haus 12
- Property: LIE-001

## Canonical Fields

| Field | Value |
| --- | --- |
| id | HAUS-12 |
| hausnr | 12 |
| einheiten | 18 |
| etagen | 5 |
| fahrstuhl | true |
| baujahr | 1928 |

## Related Entities

| ID | Type | Name |
| --- | --- | --- |
| LIE-001 | property | WEG Immanuelkirchstraße 26 |
| EH-001 | unit | WE 01 HAUS-12 |
| EH-002 | unit | WE 02 HAUS-12 |
| EH-003 | unit | WE 03 HAUS-12 |
| EH-004 | unit | WE 04 HAUS-12 |
| EH-005 | unit | WE 05 HAUS-12 |
| EH-006 | unit | WE 06 HAUS-12 |
| EH-007 | unit | WE 07 HAUS-12 |
| EH-008 | unit | WE 08 HAUS-12 |
| EH-009 | unit | WE 09 HAUS-12 |
| EH-010 | unit | WE 10 HAUS-12 |
| EH-011 | unit | WE 11 HAUS-12 |
| EH-012 | unit | WE 12 HAUS-12 |
| EH-013 | unit | WE 13 HAUS-12 |
| EH-014 | unit | WE 14 HAUS-12 |
| EH-015 | unit | WE 15 HAUS-12 |
| EH-016 | unit | WE 16 HAUS-12 |
| EH-017 | unit | WE 17 HAUS-12 |
| EH-018 | unit | TG 18 HAUS-12 |

## Active / Needs Review

_No facts available yet._

## Related Facts

| Fact | Kind | Date | Statement | Evidence | Sources |
| --- | --- | --- | --- | --- | --- |
| FACT-0632F4BA14DAC773 | building |  | building HAUS-12 (HAUS-12) is present in canonical master data. |  | [MASTER-STAMMDATEN] |
| FACT-0D578A89EDB919BB | relationship |  | Relationship unit_in_building: EH-016 -> HAUS-12. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-0E40CB67189DD706 | relationship |  | Relationship unit_in_building: EH-017 -> HAUS-12. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-1697EA6A09B70B63 | unit |  | unit EH-002 (EH-002) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-1D4CA04FE1404DF6 | relationship |  | Relationship unit_in_building: EH-015 -> HAUS-12. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-2EEA4C2252CF6B64 | relationship |  | Relationship property_has_building: LIE-001 -> HAUS-12. |  | [MASTER-STAMMDATEN] |
| FACT-3C5DB307A87E6B82 | relationship |  | Relationship unit_in_building: EH-003 -> HAUS-12. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-3CC60719EB6E69BF | relationship |  | Relationship unit_in_building: EH-004 -> HAUS-12. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-3D83B09B42E47C64 | relationship |  | Relationship unit_in_building: EH-008 -> HAUS-12. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-3F55BB4DA2BEFE1D | unit |  | unit EH-016 (EH-016) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-4924F060A8A42471 | unit |  | unit EH-013 (EH-013) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-4E60658648357882 | unit |  | unit EH-003 (EH-003) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-4FE5327A02886322 | unit |  | unit EH-006 (EH-006) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-5444947801E026A1 | unit |  | unit EH-009 (EH-009) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-62A80411B56B0AE3 | relationship |  | Relationship unit_in_building: EH-009 -> HAUS-12. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-6C9DB12C25C5911D | unit |  | unit EH-017 (EH-017) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-723D41C5BE7877A6 | relationship |  | Relationship unit_in_building: EH-006 -> HAUS-12. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-748F6A635DD1DFEC | relationship |  | Relationship unit_in_building: EH-013 -> HAUS-12. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-787D229BBE90C7D5 | relationship |  | Relationship unit_in_building: EH-011 -> HAUS-12. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-7C9FD8306BF2870C | unit |  | unit EH-015 (EH-015) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-83B7B2FD70FE5BE2 | unit |  | unit EH-005 (EH-005) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-85CDA61D97894EF9 | relationship |  | Relationship unit_in_building: EH-002 -> HAUS-12. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-8B1F7FD330E0CC29 | unit |  | unit EH-001 (EH-001) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-8B94CC51CEE87384 | unit |  | unit EH-012 (EH-012) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-9EBA729AD2E31FF6 | relationship |  | Relationship unit_in_building: EH-007 -> HAUS-12. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-A3081FDFD870646C | unit |  | unit EH-018 (EH-018) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-A5D70FD23286BC37 | relationship |  | Relationship unit_in_building: EH-005 -> HAUS-12. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-AB22F1D4CE9AB989 | unit |  | unit EH-011 (EH-011) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-B91E299D315EF54B | unit |  | unit EH-010 (EH-010) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-BA516423A2B2D06B | relationship |  | Relationship unit_in_building: EH-001 -> HAUS-12. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-CEECA5C860EB408D | unit |  | unit EH-008 (EH-008) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-DCFE812DAF72EA47 | relationship |  | Relationship unit_in_building: EH-014 -> HAUS-12. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-E42CF1B1F902C778 | unit |  | unit EH-007 (EH-007) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-F2F7D082B3616256 | unit |  | unit EH-004 (EH-004) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-FC6ED7D78D8A2A80 | relationship |  | Relationship unit_in_building: EH-012 -> HAUS-12. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-FE0C24E2CF65C601 | relationship |  | Relationship unit_in_building: EH-018 -> HAUS-12. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-FEDBCFEBA8438035 | unit |  | unit EH-014 (EH-014) is present in canonical master data. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| FACT-FF88FB2324C903BE | relationship |  | Relationship unit_in_building: EH-010 -> HAUS-12. |  | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
