# Migration von 20 Figurentypen × 2 Teams auf 16 echte Blender-Frames

## Zielvertrag

Die Migration erzeugt 40 neue RGBA-Sheets mit jeweils 4096×256 Pixeln und hält
Framegröße 256×256, Ursprung (0,5/0,92), Blickrichtung rechts, Kamera, Figurenmaßstab
und Spielgeschwindigkeit bei. Gangindizes 0–7 dauern bei nominaler Geschwindigkeit je 65 ms, Angriffindizes 8–15 je 40 ms.
Der sichtbare Kontakt liegt auf Index 12 bei 160 ms. Angriffsdauer 320 ms und Gangzyklus
520 ms bleiben identisch. Angriffscooldowns, Schadenszeitpunkt und Projektiltempo
ändern sich durch die Animation nicht.

Jeder Typ erhält getrennte, bearbeitbare Blender-Actions für Gang und Angriff.
Die jeweiligen Actionframes 0–7 ergeben die acht Exportsamples; Frame 8 ist ein
ungerenderter Abschluss für Schleife beziehungsweise Rückkehr. Kein Sampling
zwischen der bisherigen Gangphase und deren direkt folgendem Angriffsschlüssel.
Fuß-/Hufkontakt und Waffengriffe werden vor jedem Render geometrisch ausgewertet,
einschließlich Zwischenzeiten. Einziger Ausgangspunkt sind die tatsächlich
gespeicherten Quellen und ihre nachgewiesenen Bindungen.

## Reihenfolge und Entscheidungspunkte

| Batch | Typen | Sheets | Bewegungsarbeit und Freigabegrund |
|---|---|---:|---|
| Studie, vorhanden | clubman / knight, Spieler | 2 Studien | 16 echte Frames, Fuß-/Huf-IK, Kontakt 160 ms und Loop-/Recovery-Abschluss; vom Hauptagenten visuell geprüft. |
| 1, jetzt begrenzt | rifleman / sniper | 4 | Zwei Hände am Gewehr, gerichtete Mündung, Schulterkontakt, Rückstoß, Erhaltung der Sniper-v2-Geometrie; neue Bild-/Bewegungsreview vor Fortsetzung. |
| 2, Gewehr- und Energieschützen | musketeer / laser-soldier / plasma-trooper | 6 | Übertragung nur nach Prüfung der tatsächlichen Griffe; unterschiedliche Schulterhöhe, Energiespulen und Rückstoß; Laser/Plasma optisch unterscheidbar. |
| 3, Nahkampf zu Fuß | clubman / spearman / swordsman / duelist / super-heavy | 10 | Schlag-/Stoßbahn mit Kontakt auf 12, Gewichtsverlagerung und feste Sohlen. Titan-v2 separat prüfen: seine Geometrie, Zweihandhammer und Waffenbone erhalten; keine generische menschliche Pose darüberlegen. |
| 4, Bogen und Wurf | archer / slinger / grenadier | 6 | Spannung/Freigabe beziehungsweise Wurfbogen statt Gewehrrückstoß; tatsächlicher Pfeil-/Stein-/Granatenanker beim Freigabeframe 12. |
| 5, Reiter | knight / cavalry / dino-rider | 6 | Knight-Studie als technische Referenz; unterschiedliche Anatomie, Zahl/Gelenke der Beine und Reitersitz einzeln prüfen. Hufe/Füße tragen das Tier, Reiter folgt dem Rumpf, Waffe bleibt im Griff. |
| 6, Geschütze und Maschinen | ballista / cannon / tank / mech | 8 | Rollen/Ketten und Waffenrücklauf bei Fahrzeugen; Bogenarme/Sehne beim Geschütz; gelenkige Bodenkontakte beim Mech. Keine erfundene menschliche Gehbewegung. |

Die sechs Produktionsbatches ergeben genau 40 Sheets für genau 20 IDs. Die zwei
vorhandenen Studien sind Referenzen und werden nicht zusätzlich gezählt. Jeder
Batch bleibt zunächst unter `art/blender/candidates/animation-v3/`; beim ersten
Schützenbatch unter `ranged-family/`. Familienübergreifende Übertragung erfolgt
erst nach Sichtprüfung eines repräsentativen Typs und dessen Exportnachweisen.

## Erhaltung und geometrische Prüfungen

1. Vor dem Aufbau Originalquelle, Public-Sheet und verwendete Metadaten archivieren
   und hashen. Quellen der beiden Teams jeweils untersuchen; keine Annahme, dass
   Gegner bereits identische Geometrie besitzen.
2. Meshnamen, Topologie, Restkoordinaten, Objekttransform, Materialien, Bones und
   Gewichtsgruppen vorab aufnehmen. Sniper und Titan tragen
   `authored_character_revision=2` und `runtime_weapon_mesh`; ihre vorhandenen
   Ausrüstungsteile und präzisen Waffenbones sind verpflichtende Erhaltungsdaten.
   Zusätzliche Fuß-/Handsteuerungen sind nur zulässig, wenn sie eine belegte
   Bindungslücke schließen; sie dürfen nicht bei jedem Aufbau erneut entstehen.
3. Gangphysik zur vorhandenen Grundgeschwindigkeit und Sprite-Skalierung auslegen.
   Standphasenkontakt wird nach Gegenrechnung der virtuellen Vorwärtsbewegung
   geprüft, Schwungphase mit tatsächlichem Bodenabstand. Geschwindigkeitsänderungen
   durch spätere Spielzustände benötigen gegebenenfalls eine an die Strecke
   gekoppelte Laufzeitphase; das ist getrennt vom unveränderten520 ms-Grundvertrag.
4. Angriffsfüße beziehungsweise abgestellte Räder/Ketten bleiben am Boden.
   Schulter-/Handkontakt wird gegen die reale Waffengeometrie geprüft. Bei Bogen
   und Wurf gehört die beabsichtigte Freigabe ausdrücklich zur Prüfung.
5. Alle 16 Muzzles aus ausgewerteter Geometrie projizieren. Einträge weiterhin nach
   exakter Unit-ID; die bestehenden 20 gemeinsamen Einträge können bleiben, wenn
   Spieler- und Gegnermessung für alle 16 Frames innerhalb 0,001 Pixel übereinstimmen.
   Jede Abweichung ist ein zu klärender Geometrievertrag, keine pauschale Spiegelkorrektur.
6. Zwei Quellen je Typ erneut öffnen, Actionwechsel, Loopabschluss und Rückkehr
   prüfen. Materialunterschiede der Teams müssen sichtbar bleiben, während Kamera,
   Fußursprung und Waffenkoordinaten übereinstimmen. Nahkampf-/Reiterstudie zeigte
   bereits, warum reine Bézier-Zwischenbilder ohne solche Prüfungen nicht genügen.
7. Alle 32 Bilder je Typ separat rendern und packen. Acht reale Gang- und acht reale
   Angriffsposen verlangen; bei Mechanik muss die Veränderung aus einem sinnvollen
   beweglichen Teil stammen, nicht aus Rauschen oder Farbpuls. Auswertung von
   Geometrieveränderung ergänzt deshalb die reine PNG-Verschiedenheit.

## Betroffene technische Verträge — Umsetzung durch den Hauptagenten

| Stelle | Heute | Nötige zusammenhängende Änderung |
|---|---|---|
| `src/scenes/BootScene.ts`, `validateLoadedAssets` |2048×256, Frames0–7,8Sockets|4096×256, Frames0–15,16Sockets; beide Teams vollständig prüfen. `frameWidth` und `frameHeight` bleiben256.|
| `src/scenes/BattleScene.ts`, `updateUnitPresentation` |Gang `%4` und `/130`; Angriff `4+min(3,floor(dt/80))`|Gang `%8` aus tatsächlicher Wegstrecke gemäß `GAIT_CONTRACT.md` (bei nominalem Tempo äquivalent zu `/65`); Angriff `8+min(7,floor(dt/40))`. Derselbe Simulationszeitgeber, Pause und Zeitraffer bleiben erhalten.|
| `BattleScene.ts`, Projektilstart gegen Einheiten und Basis |`muzzlePoint(...,6,...)`|Beide Stellen auf Kontaktindex12; sichtbarer Frame und Waffenanker müssen denselben Zeitpunkt verwenden.|
| `BattleScene.ts`, Angriffseinstieg |`attackUntil = now+320`, Verzögerung160ms|Beides beibehalten; Kommentar zu Frames4–7/80ms auf8–15/40ms ändern. Kein zweiter Schadensaufruf durch Zwischenframes.|
| `src/game/projectilePresentation.ts` |Array nach Unit-ID/Frame;256px, Ursprung0,5/0,92|Transform bleibt unverändert; Vertrag und Tests verlangen16Samplepunkte. Gegner weiterhin erst nach Projektion horizontal spiegeln.|
| `src/__tests__/projectilePresentation.test.ts` |Markerbeispiel auf Index6|Kontaktbeispiel auf 12; zusätzlich Nichtkontaktframes und beide Spiegelrichtungen prüfen.|
| `src/__tests__/battleGameplay.test.ts` und tatsächliche E2E-Prüfungen |Aktuelle Angriffsraten/-schäden/-frames|Verzögerung160ms, Angriffsdauer 320 ms, genau ein Treffer, Pause/Zeitraffer und Reset/Pools auf neuem Vertragsstand prüfen; keine erwarteten Schadenswerte wegen mehr Frames erhöhen.|
| `tools/blender/export_scenes.py` |`bake_sockets`/`export_unit` laufen1–8 in einer Action|Actions des neuen Layouts explizit auswählen und jeweils0–7 rendern;16Sockets und internen Frame12-Kontakt exportieren. Überarbeitete Szenen dürfen nicht durch alte generische Posen verändert werden.|
| `tools/blender/pack_sheets.py` |8Frames,2048Breite, Walk0–3, Attack4–7,Kontakt6|16Frames,4096Breite, Walk0–7, Attack8–15,Kontakt12. Auch `existing_record`, Manifeste und Einzeltyp-Neupacken müssen dasselbe Layout verwenden.|
| `tools/blender/verify_art.py` |8Bilder/8Sockets je Typ,2048Breite|16/16 und4096; Familien-Geometrienachweise zusätzlich zu Alpha-,Clipping-,Farb- und Hashprüfungen. Anzahl85sonstiger Gesamtbilder/-quellen bleibt bei gleicher Assetliste unverändert.|
| `tools/blender/validate_blend_sources.py` |Kamera/Mesh/Socket-Existenz|Actionzuordnung, Clipabschluss, unveränderte v2-Modelldaten und16gültige Marker ergänzen.|
| `public/assets/reborn/manifest*.json` |8Frames mit alten Indexlisten|Beide Manifeste gemeinsam mit40Sheets und20Socketeinträgen auf16Layout aktualisieren. Portraitframe0 und die im Boot erzeugten Portraitausschnitte gezielt gegen die neue Grundpose prüfen.|

Der Packer darf einen Mischbestand nicht stillschweigend als vollständig migriert
deklarieren. Eine explizite Layoutversion in den Exportmetadaten und ein gemeinsamer
Laufzeit-Layoutvertrag vermeiden verstreute magische Zahlen. Die getrennten
Studienwerkzeuge ändern den bisherigen Packer und Exporter zunächst nicht.

## Übernahme und Abschlussprüfung

Vor einer Übernahme liegen alle 40 Sheets, 40 Blenderquellen, 20 × 16 Sockets, beide
Manifeste und die dazu passende Laufzeitänderung vollständig im Prüfbereich vor.
Die neuen Familien durchlaufen Bild-/Bewegungsreview im echten HUD mit den
tatsächlichen Sprite-Skalierungen. Insbesondere Bogenfreigabe, Geschützmechanik,
Sniperhaltung und Titanhammer erhalten jeweils eine eigene Sichtentscheidung.

Die Übernahme ist ein gemeinsamer Versionswechsel der Produktionsverträge.
Einzelne Zielersetzungen können atomar erfolgen, sind aber keine 40 Dateien umfassende
Dateisystemtransaktion. Der laufende Build darf daher keinen Zwischenstand aus
altem Bootvertrag und neuen Sheets ausliefern. Sicherungen und Hashlisten müssen
den vollständigen bisherigen Stand wiederherstellbar halten.

Danach: vollständige Assetprüfung, erneut geöffnete Blenderquellen, gezielte
kanonische Reexports pro Familie, Projektprüfungen und Produktionsbuild. Der
Hauptagent spielt anschließend reale Partien mit verschiedenen Epochen und
Schwierigkeitsgraden, prüft Pause/Tempo/Neustart und beurteilt die Bewegung im
Kampfgeschehen. Die bisherigen 85 Bild-/Blender-Assets behalten ihre Rollen; mit der neuen Gangmetadatendatei entstehen 72 Runtime-Assets beziehungsweise 74 Paketdateien;
Bytes und Produktionshashes ändern sich und müssen neu protokolliert werden.

Mehr Frames beheben fehlende Bewegungsphasen und erleichtern lesbaren Kontakt.
Sie ersetzen weder charakteristische Posen noch Figuren-/Umgebungsdetail und sind
für sich allein kein Nachweis für das übergeordnete AAA-Ziel.

Der konkrete Metadatenentwurf und der Vertrag für Formationsbremsung stehen in [GAIT_CONTRACT.md](GAIT_CONTRACT.md). Diese Datei ist für die unabhängige Vorbereitung der Runtime-Helfer maßgeblich; Angriffszeit und Marker bleiben davon getrennt.

## Bereits vorbereitet, noch nicht in die Spielproduktion integriert

Der Hauptagent hat den regulären Exporter, Packer, `render.ps1` und `verify_art.py`
für explizite 8-/16-Frame-Verträge vorbereitet. Standard bleibt 8; unpassende
Quelldimensionen werden abgewiesen. Der reguläre Export wählt die gespeicherten
v3-Actions und erhält ihre Bindungen, anstatt generische Posen darüberzulegen.
Der Packer wurde für beide Layouts auf identische RGBA-Pixel geprüft.

Der reguläre Rifleman-Reexport aus isolierten Quellenkopien ergibt für beide
Teams exakt die 16 Studienmarker. Die 32 Bilder unterscheiden sich beim Spieler
in 29, beim Gegner in 20 von jeweils 1.048.576 Pixeln, maximal um eine RGB-Stufe;
Alpha ist identisch. Der Nachweis steht unter
`exporter-render-validation/pixel-validation.json`. Das ist ein sehr enger
Reproduktionsnachweis, keine Behauptung bitidentischer Cycles-Renders.

`qa_finish` hat reine Laufzeithelfer samt 36 gezielten Tests, TypeScript- und
Lintprüfung vorbereitet. Sie sind noch nicht in die Darstellung integriert.
Der Metadatenvalidator verlangt exakt die abgestimmten Felder und 20 IDs;
Geschwindigkeit entspricht den Einheitsdaten, Strecke entspricht Tempo × Dauer.
Rad-/Kettenmodelle dürfen eine geometrisch passende andere Gangdauer verwenden.

Die vier fertigen Rifleman-/Sniper-Kandidaten wurden im echten Modern-HUD mit
beiden Teams, tatsächlichen Battle-Sprite-Skalen und Portraitausschnitten geprüft.
Zielhaltung, Waffengröße und Lesbarkeit wurden akzeptiert. Produktionsquellen,
Public-Sheets und Spiel-Framelayout bleiben bis zur gemeinsamen Migration
unverändert. Stop-/Stand- und Angriffseinstiege bleiben eigenständige Laufzeitchecks.