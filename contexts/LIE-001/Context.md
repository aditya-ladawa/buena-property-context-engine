# Context: LIE-001

Generated: 2026-04-26T08:50:55.132Z

This file is a dense materialized view for agents. The source of truth is the structured artifact chain: source registry, entity index, observations, fact index, and patch log.

Human notes can be added outside BCE managed sections. Managed sections are bounded by BCE markers and carry content hashes for surgical updates.

## Human And Agent Notes

<user id="USEREDIT-20260426105735-1" author="frontend-user" created_at="2026-04-26T10:57:35.193Z" action="insert">
Please make sure that Haus 12 gets dow
</user>
- 2026-04-26T09:42:53.914Z agent note: INV-DUP-00192 should stay blocked until the duplicate/fake contractor issue is resolved.
  Reason: User explicitly requested to update the context to reflect that this invoice must remain blocked.

- 2026-04-26T09:42:20.467Z agent note: Correction CORR-8358AE44025A4AC1 proposed: Keep INV-DUP-00192 blocked until the duplicate/fake contractor issue is resolved.
  Reason: Recorded from chat thread c223ef. Targets: section Active / Needs Review; entities INV-DUP-00192.

- 2026-04-26T09:31:49.530Z agent note: Correction CORR-3764A1D3BF50534A proposed: Link the Dachabdichtung offer thread to HAUS-12 as the focus building.
  Reason: Recorded from chat thread c223ef. Targets: section Related Facts; entities HAUS-12.

- 2026-04-26T09:30:48.003Z agent note: Correction CORR-5140FBB2F989BDEC proposed: Change contractor link for INV-00196 from DL-012 to DL-013.
  Reason: Recorded from chat thread c223ef. Targets: section Related Entities; entities INV-00196, DL-012, DL-013.

<!-- BCE:SECTION property-profile START hash=51678cd9a6d4e70acae47a9381bf5fcc9ecdb8c34df4b86aca8b1a3e72158969 -->
## Property Profile

- Property ID: LIE-001. Sources: [MASTER-STAMMDATEN]
- Name: WEG Immanuelkirchstraße 26
- Address: Immanuelkirchstraße 26, 10405, Berlin
- Built / renovated: 1928 / 2008
- Manager: Huber & Partner Immobilienverwaltung GmbH (info@huber-partner-verwaltung.de, +49 30 12345-0)
- Operating account: DE02 1001 0010 0123 4567 89 Postbank Berlin
- Reserve account: DE12 1203 0000 0098 7654 32
<!-- BCE:SECTION property-profile END -->
<!-- BCE:SECTION buildings START hash=98c37436c5f30db2a11b21c8134ae872dbb86164e3bf03da422f1c13c8296d3d -->
## Buildings

| ID | Building | Units | Floors | Elevator | Built | Sources |
| --- | --- | --- | --- | --- | --- | --- |
| HAUS-12 | Haus 12 | 18 | 5 | yes | 1928 | [MASTER-STAMMDATEN] |
| HAUS-14 | Haus 14 | 20 | 5 | yes | 1928 | [MASTER-STAMMDATEN] |
| HAUS-16 | Haus 16 | 14 | 4 | no | 1926 | [MASTER-STAMMDATEN] |
<!-- BCE:SECTION buildings END -->
<!-- BCE:SECTION units START hash=01d133b9dd20f36a01939aef4ea3067c0e719bdcec6b4bf457db279498509068 -->
## Units

| ID | Building | Unit | Location | sqm | Rooms | MEA | Sources |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EH-001 | HAUS-12 | WE 01 | 1. OG links | 103 | 4 | 241 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-002 | HAUS-12 | WE 02 | 1. OG mitte | 49 | 1.5 | 114 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-003 | HAUS-12 | WE 03 | 1. OG rechts | 62 | 2 | 144 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-004 | HAUS-12 | WE 04 | 2. OG links | 60 | 2 | 139 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-005 | HAUS-12 | WE 05 | 2. OG mitte | 110 | 4 | 255 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-006 | HAUS-12 | WE 06 | 2. OG rechts | 51 | 1.5 | 118 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-007 | HAUS-12 | WE 07 | 3. OG links | 45 | 1.5 | 104 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-008 | HAUS-12 | WE 08 | 3. OG mitte | 48 | 1.5 | 111 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-009 | HAUS-12 | WE 09 | 3. OG rechts | 67 | 2 | 156 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-010 | HAUS-12 | WE 10 | 4. OG links | 92 | 3.5 | 214 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-011 | HAUS-12 | WE 11 | 4. OG mitte | 95 | 3.5 | 221 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-012 | HAUS-12 | WE 12 | 4. OG rechts | 110 | 4 | 255 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-013 | HAUS-12 | WE 13 | 5. OG links | 84 | 3 | 195 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-014 | HAUS-12 | WE 14 | 5. OG mitte | 85 | 3 | 197 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-015 | HAUS-12 | WE 15 | 5. OG rechts | 115 | 4.5 | 267 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-016 | HAUS-12 | WE 16 | 5. OG links | 108 | 4 | 251 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-017 | HAUS-12 | WE 17 | 5. OG rechts | 72 | 2.5 | 167 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-018 | HAUS-12 | TG 18 | Tiefgarage | 12.5 | 0 | 23 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-019 | HAUS-14 | WE 19 | 1. OG links | 64 | 2 | 149 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-020 | HAUS-14 | WE 20 | 1. OG mitte | 46 | 1.5 | 107 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-021 | HAUS-14 | WE 21 | 1. OG rechts | 82 | 3 | 190 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-022 | HAUS-14 | WE 22 | 2. OG links | 75 | 2.5 | 174 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-023 | HAUS-14 | WE 23 | 2. OG mitte | 96 | 3.5 | 223 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-024 | HAUS-14 | WE 24 | 2. OG rechts | 115 | 4.5 | 267 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-025 | HAUS-14 | WE 25 | 3. OG links | 109 | 4 | 253 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-026 | HAUS-14 | WE 26 | 3. OG mitte | 93 | 3.5 | 216 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-027 | HAUS-14 | WE 27 | 3. OG rechts | 82 | 3 | 190 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-028 | HAUS-14 | WE 28 | 4. OG links | 96 | 3.5 | 223 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-029 | HAUS-14 | WE 29 | 4. OG mitte | 120 | 4.5 | 279 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-030 | HAUS-14 | WE 30 | 4. OG rechts | 95 | 3.5 | 221 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-031 | HAUS-14 | WE 31 | 5. OG links | 103 | 4 | 239 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-032 | HAUS-14 | WE 32 | 5. OG mitte | 48 | 1.5 | 111 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-033 | HAUS-14 | WE 33 | 5. OG rechts | 119 | 4.5 | 276 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-034 | HAUS-14 | WE 34 | 5. OG links | 118 | 4.5 | 274 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-035 | HAUS-14 | WE 35 | 5. OG links | 85 | 3 | 197 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-036 | HAUS-14 | WE 36 | 5. OG rechts | 107 | 4 | 248 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-037 | HAUS-14 | GE 37 | EG Ladenlokal | 142 | 0 | 348 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-038 | HAUS-14 | TG 38 | Tiefgarage | 12.5 | 0 | 23 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-039 | HAUS-16 | WE 39 | 1. OG links | 64 | 2 | 149 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-040 | HAUS-16 | WE 40 | 1. OG mitte | 73 | 2.5 | 169 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-041 | HAUS-16 | WE 41 | 1. OG rechts | 106 | 4 | 246 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-042 | HAUS-16 | WE 42 | 2. OG links | 103 | 4 | 239 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-043 | HAUS-16 | WE 43 | 2. OG mitte | 94 | 3.5 | 218 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-044 | HAUS-16 | WE 44 | 2. OG rechts | 95 | 3.5 | 221 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-045 | HAUS-16 | WE 45 | 3. OG links | 66 | 2 | 153 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-046 | HAUS-16 | WE 46 | 3. OG mitte | 85 | 3 | 197 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-047 | HAUS-16 | WE 47 | 3. OG rechts | 110 | 4 | 255 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-048 | HAUS-16 | WE 48 | 4. OG links | 64 | 2 | 149 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-049 | HAUS-16 | WE 49 | 4. OG mitte | 115 | 4.5 | 267 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-050 | HAUS-16 | WE 50 | 4. OG rechts | 59 | 2 | 137 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-051 | HAUS-16 | WE 51 | 4. OG rechts | 85 | 3 | 197 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
| EH-052 | HAUS-16 | TG 52 | Tiefgarage | 12.5 | 0 | 23 | [MASTER-EINHEITEN, MASTER-STAMMDATEN] |
<!-- BCE:SECTION units END -->
<!-- BCE:SECTION owners START hash=a551243ba07a46e26ae2ff2426d900b1e804ad3000de960a985ec6e55668140e -->
## Owners

| ID | Name | Units | Self-user | Board | Email | Sources |
| --- | --- | --- | --- | --- | --- | --- |
| EIG-001 | Marcus Dowerg | EH-037; EH-032 | no | no | marcus.dowerg@outlook.com | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-002 | Gertraud Holsten | EH-047; EH-033 | yes | no | gertraud.holsten@gmail.com | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-003 | Arnulf Heintze | EH-025; EH-049 | no | no | arnulf.heintze@gmail.com | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-004 | Erdal Beckmann | EH-043; EH-015 | yes | yes | erdal.beckmann@gmx.de | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-005 | Josefine Nohlmans | EH-007; EH-024 | yes | no | josefine.nohlmans@gmail.com | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-006 | Winfried Ullmann | EH-027; EH-026 | yes | no | winfried.ullmann@yahoo.de | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-007 | Anni Wagenknecht | EH-048; EH-044 | yes | no | anni.wagenknecht@gmx.de | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-008 | Dunja Schacht | EH-012; EH-028 | yes | no | dunja.schacht@gmx.de | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-009 | Horst Vollbrecht | EH-002; EH-038 | no | no | horst.vollbrecht@gmx.de | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-010 | Ingbert Nerger | EH-052; EH-050 | no | yes | ingbert.nerger@gmx.de | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-011 | Caroline Bohlander | EH-031; EH-035 | no | no | caroline.bohlander@gmx.de | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-012 | Kunigunda Ditschlerin | EH-005; EH-036 | yes | no | kunigunda.ditschlerin@icloud.com | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-013 | Dominic Jacobs | EH-023; EH-016 | no | no | dominic.jacobs@t-online.de | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-014 | Hulda Eckbauer | EH-019; EH-009 | no | no | hulda.eckbauer@t-online.de | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-015 | Kranz Vermoegensverwaltung | EH-011; EH-017 | yes | no | kranz.vermoegensverwaltung@capital-partners.com | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-016 | Wolfgang Hettner | EH-034; EH-010 | no | no | wolfgang.hettner@web.de | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-017 | Osman Jacob | EH-001; EH-030 | yes | no | osman.jacob@yahoo.de | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-018 | Irmingard Margraf | EH-018 | yes | no | irmingard.margraf@t-online.de | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-019 | Mina Textor | EH-042 | no | no | mina.textor@icloud.com | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-020 | Ronald Kelley | EH-045 | no | yes | ronald.kelley@icloud.com | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-021 | Dörte Kraus | EH-039 | no | no | doerte.kraus@gmx.de | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-022 | Tom Hartmann | EH-029 | no | no | tom.hartmann@icloud.com | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-023 | Gottlob Hahn | EH-040 | yes | no | gottlob.hahn@gmail.com | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-024 | Willfried Harloff | EH-013 | no | no | willfried.harloff@yahoo.de | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-025 | Hiltrud Speer | EH-003 | no | no | hiltrud.speer@t-online.de | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-026 | Silja Henschel | EH-020 | yes | no | silja.henschel@posteo.de | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-027 | Ingolf Röhricht | EH-014 | yes | no | ingolf.roehricht@gmail.com | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-028 | Oswald Gröttner | EH-022 | no | no | oswald.groettner@t-online.de | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-029 | Sükrü Aumann | EH-041 | no | no | suekrue.aumann@posteo.de | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-030 | Dorothe Wulf | EH-046 | no | no | dorothe.wulf@icloud.com | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-031 | Dörthe Hövel | EH-021 | no | no | doerthe.hoevel@t-online.de | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-032 | Jo Reuter | EH-051 | no | no | jo.reuter@icloud.com | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-033 | Xenia Conradi | EH-008 | yes | no | xenia.conradi@outlook.com | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-034 | Harro Bloch | EH-004 | yes | no | harro.bloch@gmail.com | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
| EIG-035 | Markus Fliegner | EH-006 | no | no | markus.fliegner@gmx.de | [MASTER-EIGENTUEMER, MASTER-STAMMDATEN] |
<!-- BCE:SECTION owners END -->
<!-- BCE:SECTION tenants START hash=04782be98679af897674f90495597717bd96b6b4269eae411884cf0bb5dcc34b -->
## Tenants

| ID | Name | Unit | Owner | Start | End | Sources |
| --- | --- | --- | --- | --- | --- | --- |
| MIE-001 | Julius Nette | EH-025 | EIG-003 | 2022-07-11 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-002 | Edelgard Wulf | EH-021 | EIG-031 | 2021-06-28 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-003 | Joanna Schäfer | EH-049 | EIG-003 | 2020-03-22 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-004 | Horst-Günter Zänker | EH-051 | EIG-032 | 2021-07-23 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-005 | Steffi Riehl | EH-013 | EIG-024 | 2022-07-20 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-006 | Chantal Täsche | EH-045 | EIG-020 | 2023-01-29 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-007 | David Jenkins | EH-023 | EIG-013 | 2024-01-07 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-008 | Ferenc Stahr | EH-003 | EIG-025 | 2022-04-29 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-009 | Marliese Hermann | EH-002 | EIG-009 | 2021-01-21 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-010 | Ewa Thies | EH-046 | EIG-030 | 2022-06-20 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-011 | Peggy Hein | EH-016 | EIG-013 | 2024-01-11 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-012 | Alwine Sager | EH-022 | EIG-028 | 2020-04-04 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-013 | Kiara Mcintyre | EH-010 | EIG-016 | 2020-10-20 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-014 | Wilma Roht | EH-039 | EIG-021 | 2022-02-26 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-015 | Hanna Schweitzer | EH-034 | EIG-016 | 2024-09-01 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-016 | Magrit Mitschke | EH-032 | EIG-001 | 2021-08-27 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-017 | Edeltraud Renner | EH-029 | EIG-022 | 2024-03-24 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-018 | Louise Ladeck | EH-035 | EIG-011 | 2022-01-30 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-019 | Jörgen Seidel | EH-050 | EIG-010 | 2020-07-18 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-020 | Anika Zimmer | EH-042 | EIG-019 | 2022-06-29 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-021 | Galina Wohlgemut | EH-041 | EIG-029 | 2021-11-14 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-022 | Carsten Austermühle | EH-031 | EIG-011 | 2020-08-13 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-023 | Björn Weinhage | EH-037 | EIG-001 | 2020-08-11 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-024 | Anette Vogt | EH-009 | EIG-014 | 2020-10-30 | 2026-02-27 | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-025 | Jasmin Trub | EH-019 | EIG-014 | 2022-07-13 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
| MIE-026 | Kamil Trub | EH-006 | EIG-035 | 2020-07-16 | active | [MASTER-MIETER, MASTER-STAMMDATEN] |
<!-- BCE:SECTION tenants END -->
<!-- BCE:SECTION contractors START hash=ae7c533b1b04f22d14a32626bf150567cbaa033bc408743d38379d56113b1504 -->
## Contractors

| ID | Company | Trade | Contact | Email | Phone | Sources |
| --- | --- | --- | --- | --- | --- | --- |
| DL-001 | Hausmeister Mueller GmbH | Hausmeisterdienst | Slawomir Sölzer | slawomir.soelzer@hausmeister-mueller.de | (08367) 36576 | [MASTER-DIENSTLEISTER, MASTER-STAMMDATEN] |
| DL-002 | Aufzug Schindler & Co. GmbH | Aufzugswartung | Paul-Heinz Köhler | paul.heinz.koehler@aufzug-schindler-co.de | +49 (0) 8098 851656 | [MASTER-DIENSTLEISTER, MASTER-STAMMDATEN] |
| DL-003 | Heiztechnik Berlin GmbH | Heizungswartung | Olga Holsten | olga.holsten@heiztechnik-berlin.de | (03689) 980940 | [MASTER-DIENSTLEISTER, MASTER-STAMMDATEN] |
| DL-004 | Reinigungsservice Kowalski | Treppenhausreinigung | Malte Becker | malte.becker@reinigungsservice-kowalski.de | +49(0)8366 752545 | [MASTER-DIENSTLEISTER, MASTER-STAMMDATEN] |
| DL-005 | Gaertnerei Gruener Daumen | Gartenpflege | Ekkehart Wende | ekkehart.wende@gaertnerei-gruener-daumen.de | 01561 49784 | [MASTER-DIENSTLEISTER, MASTER-STAMMDATEN] |
| DL-006 | Schornsteinfegermeister Bauer | Schornsteinfeger | Jacek Weinhold | jacek.weinhold@schornsteinfegermeister-bauer.de | 0226838851 | [MASTER-DIENSTLEISTER, MASTER-STAMMDATEN] |
| DL-007 | Allianz Versicherungs-AG | Gebaeudeversicherung | Rolf Schönland | rolf.schoenland@allianz-versicherungs-ag.de | 05161 369681 | [MASTER-DIENSTLEISTER, MASTER-STAMMDATEN] |
| DL-008 | Vattenfall Europe Sales GmbH | Strom Allgemein | Bernd-Dieter Fiebig | bernd.dieter.fiebig@vattenfall-europe-sales.de | +49(0)3292 12779 | [MASTER-DIENSTLEISTER, MASTER-STAMMDATEN] |
| DL-009 | GASAG Berliner Gaswerke AG | Gas | Irmengard Mentzel | irmengard.mentzel@gasag-berliner-gaswerke-ag.de | +49(0)0541199867 | [MASTER-DIENSTLEISTER, MASTER-STAMMDATEN] |
| DL-010 | Berliner Wasserbetriebe | Wasser/Abwasser | Falk Trommler | falk.trommler@berliner-wasserbetriebe.de | 07889 255466 | [MASTER-DIENSTLEISTER, MASTER-STAMMDATEN] |
| DL-011 | BSR Berliner Stadtreinigung | Muellentsorgung | Mehdi Faust | mehdi.faust@bsr-berliner-stadtreinigung.de | 04629148652 | [MASTER-DIENSTLEISTER, MASTER-STAMMDATEN] |
| DL-012 | Elektro Schmidt e.K. | Elektriker | Carola Buchholz | carola.buchholz@elektro-schmidt-e-k.de | +49(0)1888 05929 | [MASTER-DIENSTLEISTER, MASTER-STAMMDATEN] |
| DL-013 | Sanitaer Schulze GmbH | Sanitaer/Heizung | Ernst-August Jessel | ernst.august.jessel@sanitaer-schulze.de | 03597 746886 | [MASTER-DIENSTLEISTER, MASTER-STAMMDATEN] |
| DL-014 | Dachdecker Richter | Dachdecker | Catherine Heydrich | catherine.heydrich@dachdecker-richter.de | 08261 375060 | [MASTER-DIENSTLEISTER, MASTER-STAMMDATEN] |
| DL-015 | SecureLock Systems Ltd. | Schliessanlage | Thomas Kennedy | thomas.kennedy@securelock-systems-ltd.com | (477)890-1043 | [MASTER-DIENSTLEISTER, MASTER-STAMMDATEN] |
| DL-016 | TechClean International | Fassadenreinigung | Lisa Brown | lisa.brown@techclean-international.com | 598.808.9324x6095 | [MASTER-DIENSTLEISTER, MASTER-STAMMDATEN] |
<!-- BCE:SECTION contractors END -->
<!-- BCE:SECTION financials START hash=7d256e1b393e29bbaa0e9b5111fe38bac19df1749c609fb8b28dcb1ecad5c9dd -->
## Financials

- Payment facts: 1619
- Date range: 2024-01-01 to 2025-12-31
- Approx. positive inflow total: 1039169.60
- Approx. negative outflow total: -150586.98
- Categories: Gutschrift (749), hausgeld (381), miete (302), Ueberweisung (89), dienstleister (89), sonstige (7), versorger (2)

### Recent Payments

| TX | Date | Type | Amount | Counterparty | Reference | Sources |
| --- | --- | --- | --- | --- | --- | --- |
| TX-01619 | 2025-12-31 | Gutschrift | 423.03 | Postbank Berlin | Zinsgutschrift 2025 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01618 | 2025-12-28 | Ueberweisung | -12.50 | Postbank Berlin | Kontofuehrungsgebuehr 12/2025 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01617 | 2025-12-26 | Ueberweisung | -355.22 | Elektro Schmidt e.K. | Rechnung R20250168 Elektro Schmidt e.K. | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01616 | 2025-12-24 | DEBIT | -569.42 | Elektro Schmidt e.K. | Rechnung R20250107 Elektro Schmidt e.K. | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01614 | 2025-12-23 | Ueberweisung | -220.15 | Aufzug Schindler & Co. GmbH | Rechnung R20250080 Aufzug Schindler & Co. GmbH | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01615 | 2025-12-23 | Ueberweisung | -987.70 | Heiztechnik Berlin GmbH | Rechnung R20250088 Heiztechnik Berlin GmbH | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01613 | 2025-12-18 | Ueberweisung | -412.93 | Reinigungsservice Kowalski | Rechnung R20250047 Reinigungsservice Kowalski | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01612 | 2025-12-17 | DEBIT | -161.84 | SecureLock Systems Ltd. | Rechnung RE-2025-0155 SecureLock Systems Ltd. | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01611 | 2025-12-11 | Ueberweisung | -286.08 | Hausmeister Mueller GmbH | Rechnung R20250023 Hausmeister Mueller GmbH | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01600 | 2025-12-05 | CREDIT | 32.51 | Marcus Dowerg | Hausgeld 12/2025 EH-037,EH-032 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01601 | 2025-12-05 | Gutschrift | 26.28 | Josefine Nohlmans | Hausgeld 12/2025 EH-007,EH-024 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01602 | 2025-12-05 | Gutschrift | 28.76 | Winfried Ullmann | Hausgeld 12/2025 EH-027,EH-026 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01603 | 2025-12-05 | Gutschrift | 21.60 | Hulda Eckbauer | Hausgeld 12/2025 EH-019,EH-009 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01604 | 2025-12-05 | CREDIT | 34.57 | Wolfgang Hettner | Hausgeld 12/2025 EH-034,EH-010 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01605 | 2025-12-05 | Gutschrift | 32.73 | Osman Jacob | Hausgeld 12/2025 EH-001,EH-030 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01606 | 2025-12-05 | Gutschrift | 10.55 | Dörte Kraus | Hausgeld 12/2025 EH-039 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01607 | 2025-12-05 | Gutschrift | 19.76 | Tom Hartmann | Hausgeld 12/2025 EH-029 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01608 | 2025-12-05 | Gutschrift | 13.95 | Ingolf Röhricht | Hausgeld 12/2025 EH-014 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01609 | 2025-12-05 | Gutschrift | 12.32 | Oswald Gröttner | Hausgeld 12/2025 EH-022 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01610 | 2025-12-05 | CREDIT | 7.86 | Xenia Conradi | Hausgeld 12/2025 EH-008 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01594 | 2025-12-04 | Gutschrift | 37.61 | Gertraud Holsten | Hausgeld 12/2025 EH-047,EH-033 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01595 | 2025-12-04 | CREDIT | 9.70 | Horst Vollbrecht | Hausgeld 12/2025 EH-002,EH-038 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01596 | 2025-12-04 | CREDIT | 33.57 | Dominic Jacobs | Hausgeld 12/2025 EH-023,EH-016 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01597 | 2025-12-04 | Gutschrift | 11.97 | Gottlob Hahn | Hausgeld 12/2025 EH-040 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01598 | 2025-12-04 | CREDIT | 10.20 | Hiltrud Speer | Hausgeld 12/2025 EH-003 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01599 | 2025-12-04 | Gutschrift | 13.46 | Dörthe Hövel | Hausgeld 12/2025 EH-021 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01577 | 2025-12-03 | Gutschrift | 2019.00 | Joanna Schäfer | Miete 12/2025 EH-049 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01578 | 2025-12-03 | Gutschrift | 1256.00 | Chantal Täsche | Miete 12/2025 EH-045 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01579 | 2025-12-03 | CREDIT | 1767.00 | David Jenkins | Miete 12/2025 EH-023 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
| TX-01580 | 2025-12-03 | CREDIT | 1070.00 | Ferenc Stahr | Miete 12/2025 EH-003 | [BANK-BASE-KONTOAUSZUG-2024-2025, INDEX-BASE-BANK-INDEX] |
<!-- BCE:SECTION financials END -->
<!-- BCE:SECTION invoices START hash=69e58aa00f39f9aa5d89b6c8a4dd61e75bac46cd66d5bc986b1507157030ddda -->
## Invoices

- Invoice facts: 194
- Amount available from structured index: 162
- Metadata-only PDF invoices pending text extraction: 32
- Review/anomaly candidates: 3
- Complete invoice ledger is in contexts/LIE-001/fact-index.json; Context.md shows review items and latest invoices only.

### Review Candidates

| Invoice | Date | Contractor | Number | Gross | Decision | Sources |
| --- | --- | --- | --- | --- | --- | --- |
| INV-DUP-00192 | 2025-11-18 | DL-012 | R76250191 | 569.42 | needs_review | [INV-DUP-00192] |
| INV-DUP-00194 | 2025-07-04 | DL-003 | INV-DUP-00194 | PDF text pending | needs_review | [INV-DUP-00194] |
| INV-FAKE-00193 | 2024-05-16 | DL-FAKE-188 | RE-2024-0192 | 571.20 | needs_review | [INV-FAKE-00193] |

### Latest Invoices

| Invoice | Date | Contractor | Number | Gross | Decision | Sources |
| --- | --- | --- | --- | --- | --- | --- |
| INV-00189 | 2025-12-28 | DL-001 | R20250024 | 1157.63 | keep | [INV-00189] |
| INV-00190 | 2025-12-28 | DL-004 | R20250048 | 217.29 | keep | [INV-00190] |
| INV-00191 | 2025-12-28 | DL-005 | R20250072 | 114.24 | keep | [INV-00191] |
| INV-00188 | 2025-12-19 | DL-003 | INV-00188 | PDF text pending | keep | [INV-00188] |
| INV-00187 | 2025-12-18 | DL-002 | R20250080 | 220.15 | keep | [INV-00187] |
| INV-00186 | 2025-12-15 | DL-012 | R20250168 | 355.22 | keep | [INV-00186] |
| INV-00185 | 2025-12-07 | DL-012 | R20250107 | 569.42 | keep | [INV-00185] |
| INV-00184 | 2025-12-03 | DL-015 | INV-00184 | PDF text pending | keep | [INV-00184] |
| INV-00181 | 2025-11-28 | DL-001 | R20250023 | 286.08 | keep | [INV-00181] |
| INV-00182 | 2025-11-28 | DL-004 | R20250047 | 412.93 | keep | [INV-00182] |
| INV-00183 | 2025-11-28 | DL-005 | R20250071 | 118.05 | keep | [INV-00183] |
| INV-00180 | 2025-11-22 | DL-012 | R20250110 | 355.22 | keep | [INV-00180] |
| INV-DUP-00192 | 2025-11-18 | DL-012 | R76250191 | 569.42 | needs_review | [INV-DUP-00192] |
| INV-00179 | 2025-11-13 | DL-013 | RE-2025-0116 | 145.66 | keep | [INV-00179] |
| INV-00178 | 2025-11-09 | DL-014 | R20250144 | 275.13 | keep | [INV-00178] |
| INV-00177 | 2025-11-08 | DL-013 | RE-2025-0125 | 316.06 | keep | [INV-00177] |
| INV-00176 | 2025-11-07 | DL-001 | R20250175 | 179.93 | keep | [INV-00176] |
| INV-00172 | 2025-10-28 | DL-001 | R20250022 | 1019.59 | keep | [INV-00172] |
| INV-00173 | 2025-10-28 | DL-004 | R20250046 | 427.21 | keep | [INV-00173] |
| INV-00174 | 2025-10-28 | DL-005 | R20250070 | 110.43 | keep | [INV-00174] |
| INV-00175 | 2025-10-28 | DL-012 | R20250191 | 569.42 | keep | [INV-00175] |
| INV-00171 | 2025-10-20 | DL-016 | INV-00171 | PDF text pending | keep | [INV-00171] |
| INV-00168 | 2025-09-28 | DL-001 | R20250021 | 455.29 | keep | [INV-00168] |
| INV-00169 | 2025-09-28 | DL-004 | R20250045 | 130.90 | keep | [INV-00169] |
| INV-00170 | 2025-09-28 | DL-005 | R20250069 | 612.85 | keep | [INV-00170] |
| INV-00167 | 2025-09-24 | DL-016 | INV-00167 | PDF text pending | keep | [INV-00167] |
| INV-00166 | 2025-09-22 | DL-002 | R20250078 | 220.15 | keep | [INV-00166] |
| INV-00165 | 2025-09-17 | DL-003 | INV-00165 | PDF text pending | keep | [INV-00165] |
| INV-00164 | 2025-09-11 | DL-001 | R20250177 | 1088.85 | keep | [INV-00164] |
| INV-00163 | 2025-09-04 | DL-012 | Datum: | 314.76 | keep | [INV-00163] |
<!-- BCE:SECTION invoices END -->
<!-- BCE:SECTION documents START hash=466c1cab8906c3d16327340d94965a6341d58e862326f86662217315ce78e7b4 -->
## Letters And Documents

- Document metadata facts: 135
- ETV protocols with extracted decisions: 2
- Types: etv_einladung (70), hausgeld (35), bka (13), mahnung (10), mieterhoehung (3), kuendigung (2), etv_protokoll (2)
- Amount is shown as n/a when the document type does not contain a direct monetary amount.
- Table below shows latest 50; complete structured facts and extracted text are in fact-index.json and normalized PDF markdown.

### Extracted ETV Protocol Decisions

| Letter | Date | Type | Decisions | Sources |
| --- | --- | --- | --- | --- |
| LTR-0131 | 2025-05-28 | etv_protokoll | TOP 1: Genehmigung der Jahresabrechnung des Vorjahres; TOP 2: Entlastung der Verwaltung; TOP 3: Beschluss Wirtschaftsplan naechstes Jahr | [LTR-0131] |
| LTR-0037 | 2024-06-01 | etv_protokoll | TOP 1: Genehmigung der Jahresabrechnung des Vorjahres; TOP 2: Entlastung der Verwaltung; TOP 3: Beschluss Wirtschaftsplan naechstes Jahr | [LTR-0037] |

### Latest Documents

| Letter | Date | Type | Subject | Amount | Sources |
| --- | --- | --- | --- | --- | --- |
| LTR-0135 | 2025-12-08 | mahnung | Zahlungserinnerung (1. Mahnung) | 1863.00 | [LTR-0135] |
| LTR-0134 | 2025-11-05 | kuendigung | Ordentliche Kuendigung Mietvertrag Wohnung WE 32 | n/a | [LTR-0134] |
| LTR-0133 | 2025-10-19 | mahnung | Zahlungserinnerung (1. Mahnung) | 487.59 | [LTR-0133] |
| LTR-0132 | 2025-07-17 | mahnung | Zahlungserinnerung (1. Mahnung) | 1256.00 | [LTR-0132] |
| LTR-0131 | 2025-05-28 | etv_protokoll | Protokoll Eigentuemerversammlung 2025 | n/a | [LTR-0131] |
| LTR-0130 | 2025-05-24 | bka | Summe Betriebskosten (Ihr Anteil): 1.685,62 EUR | 762.87 | [LTR-0130] |
| LTR-0129 | 2025-05-23 | hausgeld | Hausgeldabrechnung Wirtschaftsjahr 2024 | 1416.30 | [LTR-0129] |
| LTR-0128 | 2025-05-22 | hausgeld | Hausgeldabrechnung Wirtschaftsjahr 2024 | 2961.82 | [LTR-0128] |
| LTR-0127 | 2025-05-21 | hausgeld | Hausgeldabrechnung Wirtschaftsjahr 2024 | 600.47 | [LTR-0127] |
| LTR-0126 | 2025-05-17 | hausgeld | Hausgeldabrechnung Wirtschaftsjahr 2024 | 2792.91 | [LTR-0126] |
| LTR-0125 | 2025-05-16 | bka | Summe Betriebskosten (Ihr Anteil): 1.636,29 EUR | 739.42 | [LTR-0125] |
| LTR-0124 | 2025-05-15 | hausgeld | Hausgeldabrechnung Wirtschaftsjahr 2024 | 2743.68 | [LTR-0124] |
| LTR-0122 | 2025-05-14 | bka | Summe Betriebskosten (Ihr Anteil): 3.375,85 EUR | 1624.16 | [LTR-0122] |
| LTR-0123 | 2025-05-14 | hausgeld | Hausgeldabrechnung Wirtschaftsjahr 2024 | 1259.32 | [LTR-0123] |
| LTR-0120 | 2025-05-13 | bka | Summe Betriebskosten (Ihr Anteil): 3.642,93 EUR | 1728.33 | [LTR-0120] |
| LTR-0121 | 2025-05-13 | bka | Summe Betriebskosten (Ihr Anteil): 2.279,92 EUR | 1036.33 | [LTR-0121] |
| LTR-0118 | 2025-05-12 | bka | Summe Betriebskosten (Ihr Anteil): 2.250,72 EUR | 1109.56 | [LTR-0118] |
| LTR-0119 | 2025-05-12 | hausgeld | Hausgeldabrechnung Wirtschaftsjahr 2024 | 904.35 | [LTR-0119] |
| LTR-0116 | 2025-05-10 | hausgeld | Hausgeldabrechnung Wirtschaftsjahr 2024 | 1092.92 | [LTR-0116] |
| LTR-0117 | 2025-05-10 | hausgeld | Hausgeldabrechnung Wirtschaftsjahr 2024 | 3467.84 | [LTR-0117] |
| LTR-0114 | 2025-04-25 | hausgeld | Hausgeldabrechnung Wirtschaftsjahr 2024 | 1038.11 | [LTR-0114] |
| LTR-0115 | 2025-04-25 | hausgeld | Hausgeldabrechnung Wirtschaftsjahr 2024 | 777.03 | [LTR-0115] |
| LTR-0110 | 2025-04-23 | hausgeld | Hausgeldabrechnung Wirtschaftsjahr 2024 | 1487.05 | [LTR-0110] |
| LTR-0111 | 2025-04-23 | etv_einladung | Einladung zur Eigentuemerversammlung 2025 | n/a | [LTR-0111] |
| LTR-0112 | 2025-04-23 | etv_einladung | Einladung zur Eigentuemerversammlung 2025 | n/a | [LTR-0112] |
| LTR-0113 | 2025-04-23 | etv_einladung | Einladung zur Eigentuemerversammlung 2025 | n/a | [LTR-0113] |
| LTR-0108 | 2025-04-22 | bka | Summe Betriebskosten (Ihr Anteil): 3.037,85 EUR | 1379.56 | [LTR-0108] |
| LTR-0109 | 2025-04-22 | etv_einladung | Einladung zur Eigentuemerversammlung 2025 | n/a | [LTR-0109] |
| LTR-0103 | 2025-04-21 | hausgeld | Hausgeldabrechnung Wirtschaftsjahr 2024 | 2363.22 | [LTR-0103] |
| LTR-0104 | 2025-04-21 | etv_einladung | Einladung zur Eigentuemerversammlung 2025 | n/a | [LTR-0104] |
| LTR-0105 | 2025-04-21 | etv_einladung | Einladung zur Eigentuemerversammlung 2025 | n/a | [LTR-0105] |
| LTR-0106 | 2025-04-21 | etv_einladung | Einladung zur Eigentuemerversammlung 2025 | n/a | [LTR-0106] |
| LTR-0107 | 2025-04-21 | etv_einladung | Einladung zur Eigentuemerversammlung 2025 | n/a | [LTR-0107] |
| LTR-0096 | 2025-04-20 | bka | Summe Betriebskosten (Ihr Anteil): 5.215,04 EUR | 2398.77 | [LTR-0096] |
| LTR-0097 | 2025-04-20 | hausgeld | Hausgeldabrechnung Wirtschaftsjahr 2024 | 764.59 | [LTR-0097] |
| LTR-0098 | 2025-04-20 | etv_einladung | Einladung zur Eigentuemerversammlung 2025 | n/a | [LTR-0098] |
| LTR-0099 | 2025-04-20 | etv_einladung | Einladung zur Eigentuemerversammlung 2025 | n/a | [LTR-0099] |
| LTR-0100 | 2025-04-20 | etv_einladung | Einladung zur Eigentuemerversammlung 2025 | n/a | [LTR-0100] |
| LTR-0101 | 2025-04-20 | etv_einladung | Einladung zur Eigentuemerversammlung 2025 | n/a | [LTR-0101] |
| LTR-0102 | 2025-04-20 | etv_einladung | Einladung zur Eigentuemerversammlung 2025 | n/a | [LTR-0102] |
| LTR-0095 | 2025-04-19 | etv_einladung | Einladung zur Eigentuemerversammlung 2025 | n/a | [LTR-0095] |
| LTR-0091 | 2025-04-18 | bka | Summe Betriebskosten (Ihr Anteil): 4.715,63 EUR | 2101.30 | [LTR-0091] |
| LTR-0092 | 2025-04-18 | hausgeld | Hausgeldabrechnung Wirtschaftsjahr 2024 | 1373.82 | [LTR-0092] |
| LTR-0093 | 2025-04-18 | hausgeld | Hausgeldabrechnung Wirtschaftsjahr 2024 | 1147.33 | [LTR-0093] |
| LTR-0094 | 2025-04-18 | etv_einladung | Einladung zur Eigentuemerversammlung 2025 | n/a | [LTR-0094] |
| LTR-0084 | 2025-04-17 | hausgeld | Hausgeldabrechnung Wirtschaftsjahr 2024 | 1799.64 | [LTR-0084] |
| LTR-0085 | 2025-04-17 | hausgeld | Hausgeldabrechnung Wirtschaftsjahr 2024 | 1018.47 | [LTR-0085] |
| LTR-0086 | 2025-04-17 | hausgeld | Hausgeldabrechnung Wirtschaftsjahr 2024 | 855.09 | [LTR-0086] |
| LTR-0087 | 2025-04-17 | etv_einladung | Einladung zur Eigentuemerversammlung 2025 | n/a | [LTR-0087] |
| LTR-0088 | 2025-04-17 | etv_einladung | Einladung zur Eigentuemerversammlung 2025 | n/a | [LTR-0088] |
<!-- BCE:SECTION documents END -->
<!-- BCE:SECTION current-open-issues START hash=cd0389da080e479f5dfc146a2981f36d3645ea2e21d5a63b3fa9784fb7070477 -->
## Current Open Issues

- Open issue/deadline/obligation facts: 2
- These facts come from scoped observations; ambiguous items stay needs_review instead of being silently promoted.

| Fact | Kind | Subtype | Date | Due | Status | Priority | Entities | Summary | Sources |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FACT-D08EA8ECB86CF067 | obligation | commission_craftsman | 2025-03-26 |  | open | medium | LIE-001, SEMFACT-3D65DD157FBCC5B2 | Die Hausverwaltung wird umgehend einen Handwerker beauftragen und sich in den nächsten Tagen melden. | [EMAIL-04120, EMAIL-04123] |
| FACT-A28DB45DC1681A43 | issue | unpaid_invoice |  |  | open | medium | DL-014, LIE-001, SEMFACT-4FBB269B6A678BDB | Rechnung RE-2025-4420 über 2885,99 EUR von Dachdecker Richter ist unbezahlt. | [EMAIL-04120, EMAIL-04123] |
<!-- BCE:SECTION current-open-issues END -->
<!-- BCE:SECTION recent-important-changes START hash=3e86a7225c743c49d4cef8fefac2c8a58cf5aff513ea38ab0c63fb284980e97f -->
## Recent Important Changes

- Recent semantic/change facts shown: 2

| Fact | Date | Kind | Subtype | Entities | Summary | Sources |
| --- | --- | --- | --- | --- | --- | --- |
| FACT-D08EA8ECB86CF067 | 2025-03-26 | obligation | commission_craftsman | LIE-001, SEMFACT-3D65DD157FBCC5B2 | Die Hausverwaltung wird umgehend einen Handwerker beauftragen und sich in den nächsten Tagen melden. | [EMAIL-04120, EMAIL-04123] |
| FACT-A28DB45DC1681A43 |  | issue | unpaid_invoice | DL-014, LIE-001, SEMFACT-4FBB269B6A678BDB | Rechnung RE-2025-4420 über 2885,99 EUR von Dachdecker Richter ist unbezahlt. | [EMAIL-04120, EMAIL-04123] |
<!-- BCE:SECTION recent-important-changes END -->
<!-- BCE:SECTION risks-needs-review START hash=0a6280a614626db4fc892d679551f2e21efe75f0c1b7e4e5fefd29f998832a5f -->
## Risks / Needs Review

- Risk, semantic needs-review, or invoice anomaly facts: 3
- Routine email metadata is intentionally excluded here; it remains in Communications Needing Review.
- Evidence quotes are included when extracted from unstructured text; n/a means deterministic metadata did not include a body quote.

| Fact | Kind | Subtype | Date | Decision | Priority | Entities | Summary | Evidence | Sources |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FACT-AB6F0F48906AD2B1 | invoice | n/a | 2025-11-18 | needs_review | n/a | DL-012, INV-DUP-00192, LIE-001 | Invoice INV-DUP-00192 (R76250191) is dated 2025-11-18 for DL-012 with gross amount 569.42, net 478.50, VAT 90.92. | n/a | [INV-DUP-00192] |
| FACT-66F3A8BEE9776136 | invoice | n/a | 2025-07-04 | needs_review | n/a | DL-003, INV-DUP-00194, LIE-001 | Invoice INV-DUP-00194 (INV-DUP-00194) is dated 2025-07-04 for DL-003 with gross amount unknown gross, net 1040.60. | n/a | [INV-DUP-00194] |
| FACT-F37917CB590D30FD | invoice | n/a | 2024-05-16 | needs_review | n/a | DL-FAKE-188, INV-FAKE-00193, LIE-001 | Invoice INV-FAKE-00193 (RE-2024-0192) is dated 2024-05-16 for DL-FAKE-188 with gross amount 571.20, net 480.00, VAT 91.20. | n/a | [INV-FAKE-00193] |
<!-- BCE:SECTION risks-needs-review END -->
<!-- BCE:SECTION communications-review START hash=3ba2e96203091a7afe72e7e1fa9dfaf915fe76aa7939a12db6155f96bc419294 -->
## High-Signal Communications Queue

- Communication metadata facts: 4280
- High-signal review candidates shown: 100
- queued_for_body_review means the thread was linked from metadata and keyword triage, but its full body has not been promoted into durable semantic facts yet.
- This is not an entity-link failure. Semantic body facts, when extracted, are promoted into Current Open Issues, Recent Important Changes, and Risks / Needs Review.

| Thread/Fact | Date range | Subject | Triage | Sources |
| --- | --- | --- | --- | --- |
| WI-EMAIL_THREAD-2025-12-NACHTRAG-REPARATUR-ERNST-AUGUST-JESSEL-ERNST-AUGUST-JESSEL-SANITAER-SCHULZE | 2025-12-30 to 2026-01-01 | Nachtrag Reparatur; Re: Nachtrag Reparatur | queued_for_body_review | [EMAIL-06525, EMAIL-06536, EMAIL-06545, EMAIL-06546] |
| WI-EMAIL_THREAD-2025-12-KUENDIGUNG-MIETVERTRAG-MAGRIT-MITSCHKE-MAGRIT-MITSCHKE-GMAIL | 2025-12-31 to 2025-12-31 | Kuendigung Mietvertrag | queued_for_body_review | [EMAIL-06543] |
| WI-EMAIL_THREAD-2025-12-ABSCHLAGSANPASSUNG-BERLINER-WASSERBETRIEBE-FALK-TROMMLER-BERLINER-WASSERBETRIEBE | 2025-12-30 to 2025-12-30 | Abschlagsanpassung | queued_for_body_review | [EMAIL-06524] |
| WI-EMAIL_THREAD-2025-12-ANGEBOT-DACHABDICHTUNG-HAUS-12-CAROLA-BUCHHOLZ-CAROLA-BUCHHOLZ-ELEKTRO-SCHMIDT-E-K | 2025-12-30 to 2025-12-30 | Angebot: Dachabdichtung Haus 12; Re: Angebot: Dachabdichtung Haus 12 | queued_for_body_review | [EMAIL-06531, EMAIL-06538] |
| WI-EMAIL_THREAD-2025-12-ANGEBOT-TREPPENHAUSREINIGUNG-JACEK-WEINHOLD-JACEK-WEINHOLD-SCHORNSTEINFEGERMEISTER-BAUER | 2025-12-30 to 2025-12-30 | Angebot: Treppenhausreinigung | queued_for_body_review | [EMAIL-06529] |
| WI-EMAIL_THREAD-2025-12-FRAGE-ZU-KAUTION-CHANTAL-UTF-8-Q-T-C3-A4SCHE-CHANTAL-TAESCHE-POSTEO | 2025-12-29 to 2025-12-30 | Frage zu Kaution; Re: Frage zu Kaution | queued_for_body_review | [EMAIL-06516, EMAIL-06527] |
| WI-EMAIL_THREAD-2025-12-QUOTE-DACHABDICHTUNG-HAUS-12-THOMAS-KENNEDY-THOMAS-KENNEDY-SECURELOCK-SYSTEMS-LTD | 2025-12-30 to 2025-12-30 | Quote: Dachabdichtung Haus 12 | queued_for_body_review | [EMAIL-06534] |
| WI-EMAIL_THREAD-2025-12-SONDERUMLAGE---EINSPRUCH-FRAU-GERTRAUD-HOLSTEN-GERTRAUD-HOLSTEN-GMAIL | 2025-12-29 to 2025-12-30 | Re: Sonderumlage - Einspruch; Sonderumlage - Einspruch | queued_for_body_review | [EMAIL-06519, EMAIL-06533] |
| WI-EMAIL_THREAD-2025-12-FRAGE-ZU-KAUTION-MAGRIT-MITSCHKE-MAGRIT-MITSCHKE-GMAIL | 2025-12-29 to 2025-12-29 | Frage zu Kaution | queued_for_body_review | [EMAIL-06520] |
| WI-EMAIL_THREAD-2025-12-PROTOKOLL-ENTWURF-ETV-THOMAS-KREUZER-T-KREUZER-HUBER-PARTNER-VERWALTUNG | 2025-12-28 to 2025-12-28 | Protokoll-Entwurf ETV | queued_for_body_review | [EMAIL-06507] |
| WI-EMAIL_THREAD-2025-12-MAHNUNG-RECHNUNG-RE-2025-2770-EKKEHART-WENDE-EKKEHART-WENDE-GAERTNEREI-GRUENER-DAUMEN | 2025-12-27 to 2025-12-27 | Mahnung Rechnung RE-2025-2770 | queued_for_body_review | [EMAIL-06502] |
| WI-EMAIL_THREAD-2025-12-JAHRESABRECHNUNG-2024-BERLINER-WASSERBETRIEBE-FALK-TROMMLER-BERLINER-WASSERBETRIEBE | 2025-12-17 to 2025-12-25 | Jahresabrechnung 2024 | queued_for_body_review | [EMAIL-06422, EMAIL-06490] |
| WI-EMAIL_THREAD-2025-12-JAHRESABRECHNUNG-2024-BSR-BERLINER-STADTREINIGUNG-MEHDI-FAUST-BSR-BERLINER-STADTREINIGUNG | 2025-12-25 to 2025-12-25 | Jahresabrechnung 2024 | queued_for_body_review | [EMAIL-06488] |
| WI-EMAIL_THREAD-2025-12-QUOTE-SANITAER-REPARATUR-LISA-BROWN-LISA-BROWN-TECHCLEAN-INTERNATIONAL | 2025-12-24 to 2025-12-25 | Quote: Sanitaer-Reparatur; Re: Quote: Sanitaer-Reparatur | queued_for_body_review | [EMAIL-06482, EMAIL-06486] |
| WI-EMAIL_THREAD-2025-12-WASSERSCHADEN-BAD-EDELGARD-WULF-EDELGARD-WULF-GMX | 2025-12-24 to 2025-12-24 | Wasserschaden Bad | queued_for_body_review | [EMAIL-06481] |
| WI-EMAIL_THREAD-2025-12-AUFTRAGSBESTAETIGUNG-PAUL-HEINZ-UTF-8-Q-K-C3-B6HLER-PAUL-HEINZ-KOEHLER-AUFZUG-SCHINDLER-CO | 2025-12-14 to 2025-12-23 | Auftragsbestaetigung; Re: Auftragsbestaetigung | queued_for_body_review | [EMAIL-06389, EMAIL-06472, EMAIL-06480] |
| WI-EMAIL_THREAD-2025-12-NACHTRAG-REPARATUR-ROLF-UTF-8-Q-SCH-C3-B6NLAND-ROLF-SCHOENLAND-ALLIANZ-VERSICHERUNGS-AG | 2025-12-23 to 2025-12-23 | Nachtrag Reparatur; Re: Nachtrag Reparatur | queued_for_body_review | [EMAIL-06473, EMAIL-06479] |
| WI-EMAIL_THREAD-2025-12-ANGEBOT-DACHABDICHTUNG-HAUS-12-ROLF-UTF-8-Q-SCH-C3-B6NLAND-ROLF-SCHOENLAND-ALLIANZ-VERSICHERUNGS-AG | 2025-12-08 to 2025-12-22 | Angebot: Dachabdichtung Haus 12; Re: Angebot: Dachabdichtung Haus 12 | queued_for_body_review | [EMAIL-06325, EMAIL-06454, EMAIL-06464] |
| WI-EMAIL_THREAD-2025-12-JAHRESABRECHNUNG-2024-VATTENFALL-EUROPE-SALES-GMBH-BERND-DIETER-FIEBIG-VATTENFALL-EUROPE-SALES | 2025-12-22 to 2025-12-22 | Jahresabrechnung 2024 | queued_for_body_review | [EMAIL-06465] |
| WI-EMAIL_THREAD-2025-12-KUENDIGUNG-MIETVERTRAG-UTF-8-Q-BJ-C3-B6RN-WEINHAGE-BJOERN-WEINHAGE-GMX | 2025-12-22 to 2025-12-22 | Kuendigung Mietvertrag | queued_for_body_review | [EMAIL-06466] |
| WI-EMAIL_THREAD-2025-12-ANGEBOT-TREPPENHAUSREINIGUNG-ERNST-AUGUST-JESSEL-ERNST-AUGUST-JESSEL-SANITAER-SCHULZE | 2025-12-21 to 2025-12-21 | Angebot: Treppenhausreinigung | queued_for_body_review | [EMAIL-06458] |
| WI-EMAIL_THREAD-2025-12-KUENDIGUNG-MIETVERTRAG-LOUISE-LADECK-LOUISE-LADECK-OUTLOOK | 2025-12-21 to 2025-12-21 | Kuendigung Mietvertrag; Re: Kuendigung Mietvertrag | queued_for_body_review | [EMAIL-06452, EMAIL-06455] |
| WI-EMAIL_THREAD-2025-12-MIETMINDERUNG-ANKUENDIGUNG-ANIKA-ZIMMER-ANIKA-ZIMMER-GMX | 2025-12-10 to 2025-12-21 | Mietminderung Ankuendigung; Re: Mietminderung Ankuendigung | queued_for_body_review | [EMAIL-06349, EMAIL-06362, EMAIL-06450] |
| WI-EMAIL_THREAD-2025-12-MIETMINDERUNG-ANKUENDIGUNG-MAGRIT-MITSCHKE-MAGRIT-MITSCHKE-GMAIL | 2025-12-21 to 2025-12-21 | Mietminderung Ankuendigung | queued_for_body_review | [EMAIL-06459] |
| WI-EMAIL_THREAD-2025-12-PREISANPASSUNG-ZUM-21-12-2025-BERLINER-WASSERBETRIEBE-FALK-TROMMLER-BERLINER-WASSERBETRIEBE | 2025-12-21 to 2025-12-21 | Preisanpassung zum 21.12.2025 | queued_for_body_review | [EMAIL-06460] |
| WI-EMAIL_THREAD-2025-12-RECHNUNG-RE-2025-4926-FALK-TROMMLER-FALK-TROMMLER-BERLINER-WASSERBETRIEBE | 2025-12-20 to 2025-12-21 | Re: Rechnung RE-2025-4926; Rechnung RE-2025-4926 | queued_for_body_review | [EMAIL-06447, EMAIL-06456] |
| WI-EMAIL_THREAD-2025-12-AUFTRAGSBESTAETIGUNG-FALK-TROMMLER-FALK-TROMMLER-BERLINER-WASSERBETRIEBE | 2025-12-14 to 2025-12-20 | Auftragsbestaetigung | queued_for_body_review | [EMAIL-06391, EMAIL-06444] |
| WI-EMAIL_THREAD-2025-12-SONDERUMLAGE---EINSPRUCH-FRAU-UTF-8-Q-D-C3-B6RTHE_H-C3-B6VEL-DOERTHE-HOEVEL-T-ONLINE | 2025-12-20 to 2025-12-20 | Sonderumlage - Einspruch | queued_for_body_review | [EMAIL-06442] |
| WI-EMAIL_THREAD-2025-12-WASSERSCHADEN-BAD-PEGGY-HEIN-PEGGY-HEIN-OUTLOOK | 2025-12-19 to 2025-12-19 | Wasserschaden Bad | queued_for_body_review | [EMAIL-06435] |
| WI-EMAIL_THREAD-2025-12-FRAGE-ZU-KAUTION-PEGGY-HEIN-PEGGY-HEIN-OUTLOOK | 2025-12-18 to 2025-12-18 | Frage zu Kaution | queued_for_body_review | [EMAIL-06432] |
| WI-EMAIL_THREAD-2025-12-NACHTRAG-REPARATUR-IRMENGARD-MENTZEL-IRMENGARD-MENTZEL-GASAG-BERLINER-GASWERKE-AG | 2025-12-17 to 2025-12-18 | Nachtrag Reparatur; Re: Nachtrag Reparatur | queued_for_body_review | [EMAIL-06420, EMAIL-06430] |
| WI-EMAIL_THREAD-2025-12-PROTOKOLL-ENTWURF-ETV-ANNA-BERGER-A-BERGER-HUBER-PARTNER-VERWALTUNG | 2025-12-06 to 2025-12-17 | Protokoll-Entwurf ETV | queued_for_body_review | [EMAIL-06313, EMAIL-06318, EMAIL-06421] |
| WI-EMAIL_THREAD-2025-12-PROTOKOLL-ENTWURF-ETV-SABINE-HUBER-SABINE-HUBER-HUBER-PARTNER-VERWALTUNG | 2025-12-17 to 2025-12-17 | Protokoll-Entwurf ETV | queued_for_body_review | [EMAIL-06425] |
| WI-EMAIL_THREAD-2025-12-MIETMINDERUNG-ANKUENDIGUNG-EDELTRAUD-RENNER-EDELTRAUD-RENNER-GMX | 2025-12-15 to 2025-12-16 | Mietminderung Ankuendigung; Re: Mietminderung Ankuendigung | queued_for_body_review | [EMAIL-06399, EMAIL-06410] |
| WI-EMAIL_THREAD-2025-12-MIETMINDERUNG-ANKUENDIGUNG-PEGGY-HEIN-PEGGY-HEIN-OUTLOOK | 2025-12-13 to 2025-12-15 | Mietminderung Ankuendigung; Re: Mietminderung Ankuendigung | queued_for_body_review | [EMAIL-06380, EMAIL-06398] |
| WI-EMAIL_THREAD-2025-12-SONDERUMLAGE---EINSPRUCH-FRAU-CAROLINE-BOHLANDER-CAROLINE-BOHLANDER-GMX | 2025-12-15 to 2025-12-15 | Sonderumlage - Einspruch | queued_for_body_review | [EMAIL-06403] |
| WI-EMAIL_THREAD-2025-12-SONDERUMLAGE---EINSPRUCH-HERR-MARKUS-FLIEGNER-MARKUS-FLIEGNER-GMX | 2025-12-15 to 2025-12-15 | Sonderumlage - Einspruch | queued_for_body_review | [EMAIL-06405] |
| WI-EMAIL_THREAD-2025-12-FRAGE-ZU-KAUTION-CARSTEN-UTF-8-Q-AUSTERM-C3-BCHLE-CARSTEN-AUSTERMUEHLE-WEB | 2025-12-14 to 2025-12-14 | Frage zu Kaution | queued_for_body_review | [EMAIL-06396] |
| WI-EMAIL_THREAD-2025-12-MAHNUNG-RECHNUNG-RE-2025-9791-BERND-DIETER-FIEBIG-BERND-DIETER-FIEBIG-VATTENFALL-EUROPE-SALES | 2025-12-14 to 2025-12-14 | Mahnung Rechnung RE-2025-9791 | queued_for_body_review | [EMAIL-06392] |
| WI-EMAIL_THREAD-2025-12-MIETMINDERUNG-ANKUENDIGUNG-CHANTAL-UTF-8-Q-T-C3-A4SCHE-CHANTAL-TAESCHE-POSTEO | 2025-12-09 to 2025-12-14 | Mietminderung Ankuendigung; Re: Mietminderung Ankuendigung | queued_for_body_review | [EMAIL-06341, EMAIL-06381, EMAIL-06385] |
| WI-EMAIL_THREAD-2025-12-MIETMINDERUNG-ANKUENDIGUNG-GALINA-WOHLGEMUT-GALINA-WOHLGEMUT-OUTLOOK | 2025-12-13 to 2025-12-13 | Mietminderung Ankuendigung | queued_for_body_review | [EMAIL-06373] |
| WI-EMAIL_THREAD-2025-12-ABSTIMMUNG-ZU-ANGEBOT-THOMAS-KREUZER-T-KREUZER-HUBER-PARTNER-VERWALTUNG | 2025-12-08 to 2025-12-12 | Abstimmung zu Angebot | queued_for_body_review | [EMAIL-06329, EMAIL-06372] |
| WI-EMAIL_THREAD-2025-12-HEIZUNG-FAELLT-AUS-CARSTEN-UTF-8-Q-AUSTERM-C3-BCHLE-CARSTEN-AUSTERMUEHLE-WEB | 2025-12-11 to 2025-12-12 | Heizung faellt aus; Re: Heizung faellt aus | queued_for_body_review | [EMAIL-06351, EMAIL-06370] |
| WI-EMAIL_THREAD-2025-12-HEIZUNG-FAELLT-AUS-JASMIN-TRUB-JASMIN-TRUB-OUTLOOK | 2025-12-11 to 2025-12-12 | Heizung faellt aus; Re: Heizung faellt aus | queued_for_body_review | [EMAIL-06357, EMAIL-06364] |
| WI-EMAIL_THREAD-2025-12-KUENDIGUNG-MIETVERTRAG-GALINA-WOHLGEMUT-GALINA-WOHLGEMUT-OUTLOOK | 2025-12-12 to 2025-12-12 | Kuendigung Mietvertrag | queued_for_body_review | [EMAIL-06369] |
| WI-EMAIL_THREAD-2025-12-MAHNUNG-RECHNUNG-RE-2025-5289-MEHDI-FAUST-MEHDI-FAUST-BSR-BERLINER-STADTREINIGUNG | 2025-12-11 to 2025-12-12 | Mahnung Rechnung RE-2025-5289; Re: Mahnung Rechnung RE-2025-5289 | queued_for_body_review | [EMAIL-06353, EMAIL-06363] |
| WI-EMAIL_THREAD-2025-12-MIETMINDERUNG-ANKUENDIGUNG-STEFFI-RIEHL-STEFFI-RIEHL-POSTEO | 2025-12-12 to 2025-12-12 | Mietminderung Ankuendigung | queued_for_body_review | [EMAIL-06371] |
| WI-EMAIL_THREAD-2025-12-JAHRESABRECHNUNG-2024-ALLIANZ-VERSICHERUNGS-AG-ROLF-SCHOENLAND-ALLIANZ-VERSICHERUNGS-AG | 2025-12-11 to 2025-12-11 | Jahresabrechnung 2024 | queued_for_body_review | [EMAIL-06355] |
| WI-EMAIL_THREAD-2025-12-NACHTRAG-REPARATUR-JACEK-WEINHOLD-JACEK-WEINHOLD-SCHORNSTEINFEGERMEISTER-BAUER | 2025-12-10 to 2025-12-11 | Nachtrag Reparatur; Re: Nachtrag Reparatur | queued_for_body_review | [EMAIL-06345, EMAIL-06359] |
| WI-EMAIL_THREAD-2025-12-RECHNUNG-RE-2025-7929-FALK-TROMMLER-FALK-TROMMLER-BERLINER-WASSERBETRIEBE | 2025-12-11 to 2025-12-11 | Rechnung RE-2025-7929 | queued_for_body_review | [EMAIL-06354] |
| WI-EMAIL_THREAD-2025-12-MAHNUNG-RECHNUNG-RE-2025-5446-EKKEHART-WENDE-EKKEHART-WENDE-GAERTNEREI-GRUENER-DAUMEN | 2025-12-10 to 2025-12-10 | Mahnung Rechnung RE-2025-5446 | queued_for_body_review | [EMAIL-06342] |
| WI-EMAIL_THREAD-2025-12-ANGEBOT-GARTENPFLEGE-SOMMER-MALTE-BECKER-MALTE-BECKER-REINIGUNGSSERVICE-KOWALSKI | 2025-12-07 to 2025-12-09 | Angebot: Gartenpflege Sommer; Re: Angebot: Gartenpflege Sommer | queued_for_body_review | [EMAIL-06321, EMAIL-06335] |
| WI-EMAIL_THREAD-2025-12-NACHTRAG-REPARATUR-CAROLA-BUCHHOLZ-CAROLA-BUCHHOLZ-ELEKTRO-SCHMIDT-E-K | 2025-12-05 to 2025-12-09 | Nachtrag Reparatur; Re: Nachtrag Reparatur | queued_for_body_review | [EMAIL-06309, EMAIL-06330, EMAIL-06336] |
| WI-EMAIL_THREAD-2025-12-ANGEBOT-ELEKTRO-PRUEFUNG-BERND-DIETER-FIEBIG-BERND-DIETER-FIEBIG-VATTENFALL-EUROPE-SALES | 2025-12-04 to 2025-12-05 | Angebot: Elektro-Pruefung; Re: Angebot: Elektro-Pruefung | queued_for_body_review | [EMAIL-06296, EMAIL-06311] |
| WI-EMAIL_THREAD-2025-12-SONDERUMLAGE---EINSPRUCH-FRAU-IRMINGARD-MARGRAF-IRMINGARD-MARGRAF-T-ONLINE | 2025-12-05 to 2025-12-05 | Sonderumlage - Einspruch | queued_for_body_review | [EMAIL-06307] |
| WI-EMAIL_THREAD-2025-12-MAHNUNG-RECHNUNG-RE-2025-9497-JACEK-WEINHOLD-JACEK-WEINHOLD-SCHORNSTEINFEGERMEISTER-BAUER | 2025-12-04 to 2025-12-04 | Mahnung Rechnung RE-2025-9497 | queued_for_body_review | [EMAIL-06293] |
| WI-EMAIL_THREAD-2025-12-SONDERUMLAGE---EINSPRUCH-FRAU-ANNI-WAGENKNECHT-ANNI-WAGENKNECHT-GMX | 2025-12-04 to 2025-12-04 | Sonderumlage - Einspruch | queued_for_body_review | [EMAIL-06297] |
| WI-EMAIL_THREAD-2025-12-SONDERUMLAGE---EINSPRUCH-FRAU-JOSEFINE-NOHLMANS-JOSEFINE-NOHLMANS-GMAIL | 2025-12-04 to 2025-12-04 | Sonderumlage - Einspruch | queued_for_body_review | [EMAIL-06299] |
| WI-EMAIL_THREAD-2025-12-WARTUNGSBERICHT-FALK-TROMMLER-FALK-TROMMLER-BERLINER-WASSERBETRIEBE | 2025-12-04 to 2025-12-04 | Wartungsbericht | queued_for_body_review | [EMAIL-06298] |
| WI-EMAIL_THREAD-2025-12-ANGEBOT-SCHLIESSANLAGE-ROLF-UTF-8-Q-SCH-C3-B6NLAND-ROLF-SCHOENLAND-ALLIANZ-VERSICHERUNGS-AG | 2025-12-02 to 2025-12-02 | Angebot: Schliessanlage | queued_for_body_review | [EMAIL-06279] |
| WI-EMAIL_THREAD-2025-12-ABSTIMMUNG-ZU-ANGEBOT-SABINE-HUBER-SABINE-HUBER-HUBER-PARTNER-VERWALTUNG | 2025-12-01 to 2025-12-01 | Abstimmung zu Angebot | queued_for_body_review | [EMAIL-06273] |
| WI-EMAIL_THREAD-2025-12-TERMINBESTAETIGUNG-WARTUNG-FALK-TROMMLER-FALK-TROMMLER-BERLINER-WASSERBETRIEBE | 2025-12-01 to 2025-12-01 | Terminbestaetigung Wartung | queued_for_body_review | [EMAIL-06276] |
| WI-EMAIL_THREAD-2025-11-KUENDIGUNG-MIETVERTRAG-ANETTE-VOGT-ANETTE_VOGT-YAHOO | 2025-11-30 to 2025-11-30 | Kuendigung Mietvertrag | queued_for_body_review | [EMAIL-06266] |
| WI-EMAIL_THREAD-2025-11-MAHNUNG-RECHNUNG-RE-2025-2320-EKKEHART-WENDE-EKKEHART-WENDE-GAERTNEREI-GRUENER-DAUMEN | 2025-11-30 to 2025-11-30 | Mahnung Rechnung RE-2025-2320 | queued_for_body_review | [EMAIL-06267] |
| WI-EMAIL_THREAD-2025-11-SONDERUMLAGE---EINSPRUCH-HERR-GOTTLOB-HAHN-GOTTLOB-HAHN-GMAIL | 2025-11-10 to 2025-11-30 | Re: Sonderumlage - Einspruch; Sonderumlage - Einspruch | queued_for_body_review | [EMAIL-06095, EMAIL-06262, EMAIL-06264] |
| WI-EMAIL_THREAD-2025-11-HEIZUNG-FAELLT-AUS-ALWINE-SAGER-ALWINE-SAGER-WEB | 2025-11-16 to 2025-11-29 | Heizung faellt aus; Re: Heizung faellt aus | queued_for_body_review | [EMAIL-06136, EMAIL-06244, EMAIL-06256] |
| WI-EMAIL_THREAD-2025-11-MAHNUNG-RECHNUNG-RE-2025-9507-CAROLA-BUCHHOLZ-CAROLA-BUCHHOLZ-ELEKTRO-SCHMIDT-E-K | 2025-11-29 to 2025-11-29 | Mahnung Rechnung RE-2025-9507 | queued_for_body_review | [EMAIL-06258] |
| WI-EMAIL_THREAD-2025-11-NACHTRAG-REPARATUR-PAUL-HEINZ-UTF-8-Q-K-C3-B6HLER-PAUL-HEINZ-KOEHLER-AUFZUG-SCHINDLER-CO | 2025-11-28 to 2025-11-28 | Nachtrag Reparatur | queued_for_body_review | [EMAIL-06253] |
| WI-EMAIL_THREAD-2025-11-SONDERUMLAGE---EINSPRUCH-FRAU-UTF-8-Q-D-C3-B6RTE-KRAUS-DOERTE-KRAUS-GMX | 2025-11-28 to 2025-11-28 | Sonderumlage - Einspruch | queued_for_body_review | [EMAIL-06251] |
| WI-EMAIL_THREAD-2025-11-ABSTIMMUNG-ZU-ANGEBOT-SABINE-HUBER-SABINE-HUBER-HUBER-PARTNER-VERWALTUNG | 2025-11-02 to 2025-11-27 | Abstimmung zu Angebot | queued_for_body_review | [EMAIL-06027, EMAIL-06122, EMAIL-06215, EMAIL-06235] |
| WI-EMAIL_THREAD-2025-11-ANGEBOT-DACHABDICHTUNG-HAUS-12-IRMENGARD-MENTZEL-IRMENGARD-MENTZEL-GASAG-BERLINER-GASWERKE-AG | 2025-11-25 to 2025-11-27 | Angebot: Dachabdichtung Haus 12; Re: Angebot: Dachabdichtung Haus 12 | queued_for_body_review | [EMAIL-06224, EMAIL-06238] |
| WI-EMAIL_THREAD-2025-11-ANGEBOT-SANITAER-REPARATUR-OLGA-HOLSTEN-OLGA-HOLSTEN-HEIZTECHNIK-BERLIN | 2025-11-27 to 2025-11-27 | Angebot: Sanitaer-Reparatur | queued_for_body_review | [EMAIL-06241] |
| WI-EMAIL_THREAD-2025-11-PROTOKOLL-ENTWURF-ETV-SABINE-HUBER-SABINE-HUBER-HUBER-PARTNER-VERWALTUNG | 2025-11-27 to 2025-11-27 | Protokoll-Entwurf ETV | queued_for_body_review | [EMAIL-06237] |
| WI-EMAIL_THREAD-2025-11-WASSERSCHADEN-BAD-WILMA-ROHT-WILMA-ROHT-GMAIL | 2025-11-27 to 2025-11-27 | Wasserschaden Bad | queued_for_body_review | [EMAIL-06247] |
| WI-EMAIL_THREAD-2025-11-KUENDIGUNG-MIETVERTRAG-CARSTEN-UTF-8-Q-AUSTERM-C3-BCHLE-CARSTEN-AUSTERMUEHLE-WEB | 2025-11-23 to 2025-11-26 | Kuendigung Mietvertrag | queued_for_body_review | [EMAIL-06201, EMAIL-06231] |
| WI-EMAIL_THREAD-2025-11-NACHTRAG-REPARATUR-ERNST-AUGUST-JESSEL-ERNST-AUGUST-JESSEL-SANITAER-SCHULZE | 2025-11-26 to 2025-11-26 | Nachtrag Reparatur | queued_for_body_review | [EMAIL-06227] |
| WI-EMAIL_THREAD-2025-11-TERMINBESTAETIGUNG-WARTUNG-PAUL-HEINZ-UTF-8-Q-K-C3-B6HLER-PAUL-HEINZ-KOEHLER-AUFZUG-SCHINDLER-CO | 2025-11-26 to 2025-11-26 | Terminbestaetigung Wartung | queued_for_body_review | [EMAIL-06228] |
| WI-EMAIL_THREAD-2025-11-JAHRESABRECHNUNG-2024-GASAG-BERLINER-GASWERKE-AG-IRMENGARD-MENTZEL-GASAG-BERLINER-GASWERKE-AG | 2025-11-17 to 2025-11-25 | Jahresabrechnung 2024 | queued_for_body_review | [EMAIL-06150, EMAIL-06161, EMAIL-06218] |
| WI-EMAIL_THREAD-2025-11-MAHNUNG-RECHNUNG-RE-2025-8040-OLGA-HOLSTEN-OLGA-HOLSTEN-HEIZTECHNIK-BERLIN | 2025-11-23 to 2025-11-25 | Mahnung Rechnung RE-2025-8040; Re: Mahnung Rechnung RE-2025-8040 | queued_for_body_review | [EMAIL-06204, EMAIL-06219] |
| WI-EMAIL_THREAD-2025-11-MAHNUNG-RECHNUNG-RE-2025-6382-PAUL-HEINZ-UTF-8-Q-K-C3-B6HLER-PAUL-HEINZ-KOEHLER-AUFZUG-SCHINDLER-CO | 2025-11-23 to 2025-11-24 | Mahnung Rechnung RE-2025-6382; Re: Mahnung Rechnung RE-2025-6382 | queued_for_body_review | [EMAIL-06207, EMAIL-06209] |
| WI-EMAIL_THREAD-2025-11-FRAGE-ZU-KAUTION-LOUISE-LADECK-LOUISE-LADECK-OUTLOOK | 2025-11-16 to 2025-11-23 | Frage zu Kaution | queued_for_body_review | [EMAIL-06139, EMAIL-06202] |
| WI-EMAIL_THREAD-2025-11-WASSERSCHADEN-BAD-ALWINE-SAGER-ALWINE-SAGER-WEB | 2025-11-23 to 2025-11-23 | Wasserschaden Bad | queued_for_body_review | [EMAIL-06206] |
| WI-EMAIL_THREAD-2025-11-ANGEBOT-JAHRESWARTUNG-HEIZUNGSANLAGE-BERND-DIETER-FIEBIG-BERND-DIETER-FIEBIG-VATTENFALL-EUROPE-SALES | 2025-11-22 to 2025-11-22 | Angebot: Jahreswartung Heizungsanlage | queued_for_body_review | [EMAIL-06185] |
| WI-EMAIL_THREAD-2025-11-ANGEBOT-SANITAER-REPARATUR-MEHDI-FAUST-MEHDI-FAUST-BSR-BERLINER-STADTREINIGUNG | 2025-11-22 to 2025-11-22 | Angebot: Sanitaer-Reparatur | queued_for_body_review | [EMAIL-06192] |
| WI-EMAIL_THREAD-2025-11-MAHNUNG-RECHNUNG-RE-2025-8522-CATHERINE-HEYDRICH-CATHERINE-HEYDRICH-DACHDECKER-RICHTER | 2025-11-22 to 2025-11-22 | Mahnung Rechnung RE-2025-8522 | queued_for_body_review | [EMAIL-06186] |
| WI-EMAIL_THREAD-2025-11-MAHNUNG-RECHNUNG-RE-2025-8763-ROLF-UTF-8-Q-SCH-C3-B6NLAND-ROLF-SCHOENLAND-ALLIANZ-VERSICHERUNGS-AG | 2025-11-22 to 2025-11-22 | Mahnung Rechnung RE-2025-8763; Re: Mahnung Rechnung RE-2025-8763 | queued_for_body_review | [EMAIL-06190, EMAIL-06195] |
| WI-EMAIL_THREAD-2025-11-WASSERSCHADEN-BAD-CARSTEN-UTF-8-Q-AUSTERM-C3-BCHLE-CARSTEN-AUSTERMUEHLE-WEB | 2025-11-21 to 2025-11-22 | Re: Wasserschaden Bad; Wasserschaden Bad | queued_for_body_review | [EMAIL-06176, EMAIL-06196] |
| WI-EMAIL_THREAD-2025-11-MAHNUNG-RECHNUNG-RE-2025-2717-MALTE-BECKER-MALTE-BECKER-REINIGUNGSSERVICE-KOWALSKI | 2025-11-19 to 2025-11-19 | Mahnung Rechnung RE-2025-2717 | queued_for_body_review | [EMAIL-06158] |
| WI-EMAIL_THREAD-2025-11-MAHNUNG-RECHNUNG-RE-2025-3399-JACEK-WEINHOLD-JACEK-WEINHOLD-SCHORNSTEINFEGERMEISTER-BAUER | 2025-11-19 to 2025-11-19 | Mahnung Rechnung RE-2025-3399 | queued_for_body_review | [EMAIL-06163] |
| WI-EMAIL_THREAD-2025-11-HEIZUNG-FAELLT-AUS-WILMA-ROHT-WILMA-ROHT-GMAIL | 2025-11-17 to 2025-11-17 | Heizung faellt aus; Re: Heizung faellt aus | queued_for_body_review | [EMAIL-06144, EMAIL-06151] |
| WI-EMAIL_THREAD-2025-11-FRAGE-ZU-KAUTION-EDELGARD-WULF-EDELGARD-WULF-GMX | 2025-11-16 to 2025-11-16 | Frage zu Kaution | queued_for_body_review | [EMAIL-06133] |
| WI-EMAIL_THREAD-2025-11-WASSERSCHADEN-BAD-LOUISE-LADECK-LOUISE-LADECK-OUTLOOK | 2025-11-13 to 2025-11-16 | Wasserschaden Bad | queued_for_body_review | [EMAIL-06110, EMAIL-06126, EMAIL-06132] |
| WI-EMAIL_THREAD-2025-11-NACHTRAG-REPARATUR-EKKEHART-WENDE-EKKEHART-WENDE-GAERTNEREI-GRUENER-DAUMEN | 2025-11-15 to 2025-11-15 | Nachtrag Reparatur | queued_for_body_review | [EMAIL-06128] |
| WI-EMAIL_THREAD-2025-11-PROTOKOLL-ENTWURF-ETV-ANNA-BERGER-A-BERGER-HUBER-PARTNER-VERWALTUNG | 2025-11-09 to 2025-11-15 | Protokoll-Entwurf ETV | queued_for_body_review | [EMAIL-06088, EMAIL-06129] |
| WI-EMAIL_THREAD-2025-11-PROTOKOLL-ENTWURF-ETV-THOMAS-KREUZER-T-KREUZER-HUBER-PARTNER-VERWALTUNG | 2025-11-09 to 2025-11-15 | Protokoll-Entwurf ETV | queued_for_body_review | [EMAIL-06085, EMAIL-06124] |
| WI-EMAIL_THREAD-2025-11-NACHTRAG-REPARATUR-JACEK-WEINHOLD-JACEK-WEINHOLD-SCHORNSTEINFEGERMEISTER-BAUER | 2025-11-05 to 2025-11-13 | Nachtrag Reparatur | queued_for_body_review | [EMAIL-06052, EMAIL-06116] |
| WI-EMAIL_THREAD-2025-11-TERMINBESTAETIGUNG-WARTUNG-FALK-TROMMLER-FALK-TROMMLER-BERLINER-WASSERBETRIEBE | 2025-11-13 to 2025-11-13 | Terminbestaetigung Wartung | queued_for_body_review | [EMAIL-06111] |
| WI-EMAIL_THREAD-2025-11-MAHNUNG-RECHNUNG-RE-2025-4616-JACEK-WEINHOLD-JACEK-WEINHOLD-SCHORNSTEINFEGERMEISTER-BAUER | 2025-11-12 to 2025-11-12 | Mahnung Rechnung RE-2025-4616 | queued_for_body_review | [EMAIL-06105] |
| WI-EMAIL_THREAD-2025-11-MIETMINDERUNG-ANKUENDIGUNG-ANETTE-VOGT-ANETTE-VOGT-GMX | 2025-11-09 to 2025-11-09 | Mietminderung Ankuendigung | queued_for_body_review | [EMAIL-06086] |
| WI-EMAIL_THREAD-2025-11-SONDERUMLAGE---EINSPRUCH-HERR-INGBERT-NERGER-INGBERT-NERGER-GMX | 2025-11-08 to 2025-11-08 | Sonderumlage - Einspruch | queued_for_body_review | [EMAIL-06079] |
<!-- BCE:SECTION communications-review END -->
<!-- BCE:SECTION provenance START hash=453d9864bab53e9267cff1202bbaee4a80ea9bc69a0a5d48da39afccc1a23782 -->
## Provenance And Source Of Truth

- Context.md is a materialized view, not the source of truth.
- Source registry: contexts/LIE-001/source-registry.json
- Entity index: contexts/LIE-001/entity-index.json
- Fact index: contexts/LIE-001/fact-index.json
- Entity links: workdir/entity-links/entity-links.jsonl
- Observations: workdir/observations/observations.jsonl
- Semantic observations: workdir/semantic/observations.jsonl
- Latest change set: workdir/changes/latest-change-set.json
- Entity context views: contexts/LIE-001/entities/*.md
- Patch log: contexts/LIE-001/patch-log.jsonl

| Fact kind | Count |
| --- | --- |
| building | 3 |
| communication | 4280 |
| contractor | 16 |
| document | 135 |
| invoice | 194 |
| issue | 1 |
| obligation | 1 |
| owner | 35 |
| payment | 1619 |
| property_profile | 1 |
| relationship | 133 |
| source_bundle | 1 |
| tenant | 26 |
| unit | 52 |
<!-- BCE:SECTION provenance END -->
