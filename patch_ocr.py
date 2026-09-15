import re

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('import {\n  Select,', '''import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Select,''')

batch_func = '''  const [scanTarget, setScanTarget] = useState<'starter' | 'substitute' | 'staff'>('starter');

  const handleScanBatch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    try {
       const { data: { text } } = await Tesseract.recognize(file, 'spa');
       const lines = text.split('\\n').map((l: string) => l.trim().toUpperCase()).filter((l: string) => l.length > 3);
       const filteredLines = lines.filter((l: string) => !l.match(/LIGA|PRESIDENTE|TEMPORADA|VIGENCIA|FEDERACION|ASOCIACION|CREDENCIAL|FIRMA|EDAD|FECHA|CURP|FOLIO|JUGADOR|CATEGORIA|AFILIACION/));
       
       let parsedCount = 0;
       
       if (scanTarget === 'staff') {
          const newStaff = [];
          for (const line of filteredLines) {
              const name = line.replace(/[^A-ZÑÁÉÍÓÚ\s]/g, '').trim();
              if (name.length > 5) {
                 newStaff.push({
                    id: Date.now().toString() + Math.random().toString(),
                    name,
                    role: 'AUXILIAR'
                 });
              }
          }
          if (newStaff.length > 0) {
             const currentStaff = matchState?.staff?.[currentSide] || [];
             updateMatch({ staff: { ...(matchState?.staff || {home:[], away:[]}), [currentSide]: [...currentStaff, ...newStaff] } as any });
             parsedCount = newStaff.length;
          }
       } else {
          const newPlayers: Player[] = [];
          for (const line of filteredLines) {
              const match = line.match(/^[^A-Z0-9]*?(\d{1,3})[^A-Z]*?([A-ZÑÁÉÍÓÚ\s]{4,})/);
              if (match) {
                 let num = match[1];
                 let name = match[2].trim().replace(/[^A-ZÑÁÉÍÓÚ\s]/g, '').trim();
                 newPlayers.push({
                    id: Date.now().toString() + Math.random().toString(),
                    number: num,
                    name,
                    type: scanTarget
                 });
              } else if (/^[A-ZÑÁÉÍÓÚ\s]{5,}$/.test(line.replace(/[^A-ZÑÁÉÍÓÚ\s]/g, ''))) {
                 let name = line.replace(/[^A-Z0-9ÑÁÉÍÓÚ\s]/g, '').trim();
                 newPlayers.push({
                    id: Date.now().toString() + Math.random().toString(),
                    number: '0',
                    name,
                    type: scanTarget
                 });
              }
          }
          if (newPlayers.length > 0) {
             const currentLineups = matchState?.lineups?.[currentSide] || [];
             const merged = [...currentLineups, ...newPlayers];
             merged.sort((a, b) => (parseInt(a.number)||0) - (parseInt(b.number)||0));
             updateMatch({ lineups: { ...(matchState?.lineups || {home:[], away:[]}), [currentSide]: merged } as any });
             parsedCount = newPlayers.length;
          }
       }

       toast({
         title: "ESCANEO BATCH EXITOSO",
         description: Se agregaron  registros.,
       });
    } catch (error) {
       console.error(error);
       toast({
         variant: "destructive",
         title: "ERROR AL ESCANEAR",
         description: "NO SE PUDO RECONOCER EL TEXTO. INTÉNTALO DE NUEVO.",
       });
    }
    e.target.value = '';
    setIsScanning(false);
  };
'''
content = content.replace("const [isScanning, setIsScanning] = useState(false);", batch_func + "\n  const [isScanning, setIsScanning] = useState(false);")


team_name_code = '''<CardTitle className="text-lg font-black uppercase italic">{teamNames[side]}</CardTitle>
                    </div>'''
new_team_name_code = '''<CardTitle className="text-lg font-black uppercase italic">{teamNames[side]}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/20 rounded-full text-white" disabled={isScanning}>
                             {isScanning && currentSide === side ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                           </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => { setCurrentSide(side); setScanTarget('starter'); document.getElementById('camera-scan')?.click() }}>Cargar Titulares</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => { setCurrentSide(side); setScanTarget('substitute'); document.getElementById('camera-scan')?.click() }}>Cargar Suplentes</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => { setCurrentSide(side); setScanTarget('staff'); document.getElementById('camera-scan')?.click() }}>Cargar Cuerpo Técnico</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>'''
content = content.replace(team_name_code, new_team_name_code)


hidden_input = '''<input id="camera-scan" type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanBatch} disabled={isScanning} />'''
content = content.replace('<div className="container mx-auto p-4 max-w-md pb-24">', '<div className="container mx-auto p-4 max-w-md pb-24">\n      ' + hidden_input)

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
