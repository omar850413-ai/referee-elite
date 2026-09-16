const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf-8');

const oldLogic = const lines = text.split('\\n').map((l: string) => l.trim().toUpperCase()).filter((l: string) => l.length > 3);
       const filteredLines = lines.filter((l: string) => !l.match(/LIGA|PRESIDENTE|TEMPORADA|VIGENCIA|FEDERACION|ASOCIACION|CREDENCIAL|FIRMA|EDAD|FECHA|CURP|FOLIO|JUGADOR|CATEGORIA|AFILIACION/));
       
       if (scanTarget === 'staff') {
          const newStaff: Player[] = [];
          for (const line of filteredLines) {
              const raw = line.replace(/[^A-ZÑÁÉÍÓÚ\\s]/g, '').trim();
              const name = formatName(raw);
              if (name.length > 5 && name.split(' ').filter(w => w.length > 1).length >= 2) {
                 newStaff.push({
                    id: Date.now().toString() + Math.random().toString(),
                    name,
                    type: scanTarget
                 });
              }
          }
          if (newStaff.length > 0) {
               const currentStaff = matchState?.staff?.[currentSide] || [];
               const uniqueNewStaff: Player[] = [];
               let parsedCount = 0;
               const existingNames = new Set(currentStaff.map(s => s.name.toUpperCase().replace(/\\s+/g, ' ')));
               
               for (const s of newStaff) {
                  const normalizedName = s.name.toUpperCase().replace(/\\s+/g, ' ');
                  if (existingNames.has(normalizedName)) continue;
                  existingNames.add(normalizedName);
                  uniqueNewStaff.push(s);
               }
               
               if (uniqueNewStaff.length > 0) {
                   updateMatch({ staff: { ...(matchState?.staff || {home:[], away:[]}), [currentSide]: [...currentStaff, ...uniqueNewStaff] } as any });
                   parsedCount = uniqueNewStaff.length;
               }
            }
         } else {
            const newPlayers: Player[] = [];
            for (const line of filteredLines) {
                const match = line.match(/(?:^|\\s)(\\d{1,3})\\s*[-.]?\\s*([A-ZÑÁÉÍÓÚ]{2,}(?:\\s+[A-ZÑÁÉÍÓÚ]{2,})+)/);
                if (match) {
                   let num = match[1];
                   let raw = match[2].trim().replace(/[^A-ZÑÁÉÍÓÚ\\s]/g, '').trim();
                   let name = formatName(raw);
                   newPlayers.push({
                      id: Date.now().toString() + Math.random().toString(),
                      number: num,
                      name,
                      type: scanTarget
                   });
                }
            }
            if (newPlayers.length > 0) {;

const newLogic = 
       const cleanText = text.toUpperCase();
       const forbidden = /LIGA|PRESIDENTE|TEMPORADA|VIGENCIA|FEDERACION|ASOCIACION|CREDENCIAL|FIRMA|EDAD|FECHA|CURP|FOLIO|JUGADOR|CATEGORIA|AFILIACION/;
       
       if (scanTarget === 'staff') {
          const newStaff: Player[] = [];
          const names = cleanText.match(/(?:^|\\s)([A-ZÑÁÉÍÓÚ]{3,}(?:\\s+[A-ZÑÁÉÍÓÚ]{3,})+)(?=\\s|$)/g)?.map(n => n.trim()).filter(n => !n.match(forbidden)) || [];
          for (const raw of names) {
              const name = formatName(raw);
              newStaff.push({
                id: Date.now().toString() + Math.random().toString(),
                name,
                type: scanTarget
              });
          }
          if (newStaff.length > 0) {
               const currentStaff = matchState?.staff?.[currentSide] || [];
               const uniqueNewStaff: Player[] = [];
               let parsedCount = 0;
               const existingNames = new Set(currentStaff.map(s => s.name.toUpperCase().replace(/\\s+/g, ' ')));
               
               for (const s of newStaff) {
                  const normalizedName = s.name.toUpperCase().replace(/\\s+/g, ' ');
                  if (existingNames.has(normalizedName)) continue;
                  existingNames.add(normalizedName);
                  uniqueNewStaff.push(s);
               }
               
               if (uniqueNewStaff.length > 0) {
                   updateMatch({ staff: { ...(matchState?.staff || {home:[], away:[]}), [currentSide]: [...currentStaff, ...uniqueNewStaff] } as any });
                   parsedCount = uniqueNewStaff.length;
               }
            }
         } else {
            let newPlayers: Player[] = [];
            // Strategy 1: Regex across newlines
            const regex = /(?:^|\\s)(\\d{1,3})\\s*[-.)|]?\\s*([A-ZÑÁÉÍÓÚ]{2,}(?:\\s+[A-ZÑÁÉÍÓÚ]{2,})+)/g;
            const matches = Array.from(cleanText.matchAll(regex));
            
            for (const match of matches) {
                let num = match[1];
                let raw = match[2].trim().replace(/[^A-ZÑÁÉÍÓÚ\\s]/g, '').trim();
                if (raw.match(forbidden)) continue;
                newPlayers.push({
                  id: Date.now().toString() + Math.random().toString(),
                  number: num,
                  name: formatName(raw),
                  type: scanTarget
                });
            }

            // Strategy 2: If we didn't find enough, it might be a column-based table (numbers first, then names)
            if (newPlayers.length < 5) {
                const numbers = cleanText.match(/(?:^|\\s)(\\d{1,3})(?=\\s|$)/g)?.map(n => n.trim()) || [];
                const names = cleanText.match(/(?:^|\\s)([A-ZÑÁÉÍÓÚ]{3,}(?:\\s+[A-ZÑÁÉÍÓÚ]{3,})+)(?=\\s|$)/g)?.map(n => n.trim().replace(/[^A-ZÑÁÉÍÓÚ\\s]/g, '')).filter(n => !n.match(forbidden)) || [];
                
                if (names.length >= 3 && numbers.length >= 3) {
                   newPlayers = []; // Reset and use zip strategy
                   const limit = Math.min(numbers.length, names.length);
                   for (let i = 0; i < limit; i++) {
                      newPlayers.push({
                        id: Date.now().toString() + Math.random().toString(),
                        number: numbers[i],
                        name: formatName(names[i]),
                        type: scanTarget
                      });
                   }
                }
            }

            if (newPlayers.length > 0) {;

content = content.replace(oldLogic.replace(/ÑÁÉÍÓÚ/g, "'?%?\"s"), newLogic);
// Also just in case the powershell ruined characters last time, I'll use a loose replace or just normal
content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/app/page.tsx', content);
console.log('Fixed parsing logic');
