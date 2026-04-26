# Entity Context: INV-FAKE-00193

Generated: 2026-04-26T08:50:55.132Z

This is a generated scoped materialized view. Source of truth remains source-registry, entity-index, observations, fact-index, and patch log.

## Profile

- ID: INV-FAKE-00193
- Type: invoice
- Name: 20240516_DL-FAKE-188_INV-FAKE-00193.pdf
- Property: LIE-001

## Canonical Fields

| Field | Value |
| --- | --- |
| sourceId | INV-FAKE-00193 |
| rawPath | data/rechnungen/2024-05/20240516_DL-FAKE-188_INV-FAKE-00193.pdf |
| sourceDate | 2024-05-16 |

## Related Entities

_No facts available yet._

## Active / Needs Review

| Fact | Kind | Date | Decision | Statement | Sources |
| --- | --- | --- | --- | --- | --- |
| FACT-F37917CB590D30FD | invoice | 2024-05-16 | needs_review | Invoice INV-FAKE-00193 (RE-2024-0192) is dated 2024-05-16 for DL-FAKE-188 with gross amount 571.20, net 480.00, VAT 91.20. | [INV-FAKE-00193] |

## Related Facts

| Fact | Kind | Date | Statement | Evidence | Sources |
| --- | --- | --- | --- | --- | --- |
| FACT-88E030984DB5E2A3 | payment | 2024-06-04 | Payment TX-00382 is DEBIT 571.20 on 2024-06-04 with Allianz Versicherungs-AG Service GmbH for Rechnung RE-2024-0192 Allianz Versicherungs-AG Service GmbH. |  | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| FACT-F37917CB590D30FD | invoice | 2024-05-16 | Invoice INV-FAKE-00193 (RE-2024-0192) is dated 2024-05-16 for DL-FAKE-188 with gross amount 571.20, net 480.00, VAT 91.20. |  | [INV-FAKE-00193] |
