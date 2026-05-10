-- Gast-Codes: nur G01 und G02 behalten. Alte Pseudonyme G1, G2, G3, … entfernen (Cascade auf Sessions, Tasks, …).
DELETE FROM "User"
WHERE pseudonym ~* '^G[0-9]+$'
  AND UPPER(TRIM(pseudonym)) NOT IN ('G01', 'G02');
