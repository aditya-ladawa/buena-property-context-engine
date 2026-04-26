# Entity Context: INV-DUP-00192

Generated: 2026-04-26T08:50:55.132Z

This is a generated scoped materialized view. Source of truth remains source-registry, entity-index, observations, fact-index, and patch log.

## Profile

- ID: INV-DUP-00192
- Type: invoice
- Name: 20251118_DL-012_INV-DUP-00192.pdf
- Property: LIE-001

## Canonical Fields

| Field | Value |
| --- | --- |
| sourceId | INV-DUP-00192 |
| rawPath | data/rechnungen/2025-11/20251118_DL-012_INV-DUP-00192.pdf |
| sourceDate | 2025-11-18 |

## Related Entities

| ID | Type | Name |
| --- | --- | --- |
| DL-012 | contractor | Elektro Schmidt e.K. |

## Active / Needs Review

| Fact | Kind | Date | Decision | Statement | Sources |
| --- | --- | --- | --- | --- | --- |
| FACT-AB6F0F48906AD2B1 | invoice | 2025-11-18 | needs_review | Invoice INV-DUP-00192 (R76250191) is dated 2025-11-18 for DL-012 with gross amount 569.42, net 478.50, VAT 90.92. | [INV-DUP-00192] |

## Related Facts

| Fact | Kind | Date | Statement | Evidence | Sources |
| --- | --- | --- | --- | --- | --- |
| FACT-6989CE6E7698B417 | payment | 2025-11-30 | Payment TX-01551 is DEBIT 569.42 on 2025-11-30 with Elektro Schmidt e.K. for Rechnung R76250191 Elektro Schmidt e.K.. |  | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| FACT-AB6F0F48906AD2B1 | invoice | 2025-11-18 | Invoice INV-DUP-00192 (R76250191) is dated 2025-11-18 for DL-012 with gross amount 569.42, net 478.50, VAT 90.92. |  | [INV-DUP-00192] |
