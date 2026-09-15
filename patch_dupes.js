const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf-8');

const oldLogic =           if (newPlayers.length > 0) {
             const currentLineups = matchState?.lineups?.[currentSide] || [];
             const merged = [...currentLineups, ...newPlayers];
             merged.sort((a, b) => (parseInt(a.number)||0) - (parseInt(b.number)||0));
             updateMatch({ lineups: { ...(matchState?.lineups || {home:[], away:[]}), [currentSide]: merged } as any });
             parsedCount = newPlayers.length;
          };

const newLogic =           if (newPlayers.length > 0) {
             const currentLineups = matchState?.lineups?.[currentSide] || [];
             const uniqueNewPlayers: Player[] = [];
             let hasDuplicateNumber = false;
             
             // Nombres y numeros actualmente registrados
             const existingNames = new Set(currentLineups.map(p => p.name.toUpperCase().replace(/\\s+/g, ' ')));
             const existingNumbers = new Set(currentLineups.filter(p => p.number).map(p => p.number));

             for (const p of newPlayers) {
                const normalizedName = p.name.toUpperCase().replace(/\\s+/g, ' ');
                // 1. Omitir si el nombre ya existe
                if (existingNames.has(normalizedName)) continue;
                
                // 2. Si es un nuevo jugador, verificar numero repetido
                if (p.number && existingNumbers.has(p.number)) {
                    hasDuplicateNumber = true;
                    p.number = ''; // Limpiar el numero para ingreso manual
                } else if (p.number) {
                    existingNumbers.add(p.number);
                }
                
                existingNames.add(normalizedName);
                uniqueNewPlayers.push(p);
             }

             if (uniqueNewPlayers.length > 0) {
                 const merged = [...currentLineups, ...uniqueNewPlayers];
                 merged.sort((a, b) => (parseInt(a.number)||0) - (parseInt(b.number)||0));
                 updateMatch({ lineups: { ...(matchState?.lineups || {home:[], away:[]}), [currentSide]: merged } as any });
                 parsedCount = uniqueNewPlayers.length;
                 
                 if (hasDuplicateNumber) {
                     setTimeout(() => {
                         toast({
                             variant: "destructive",
                             title: "N\u00daMERO REPETIDO DETECTADO",
                             description: "Se detect\u00f3 un n\u00famero que ya estaba en uso. El n\u00famero de ese jugador qued\u00f3 en blanco para que lo asignes a mano.",
                         });
                     }, 1000);
                 }
             }
          };

if (content.includes(oldLogic)) {
    content = content.replace(oldLogic, newLogic);
    fs.writeFileSync('src/app/page.tsx', content);
    console.log("Exito");
} else {
    console.log("No se encontro oldLogic");
}
