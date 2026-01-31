import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Briefcase, DollarSign, Calendar } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

const chartData = [
  { month: 'Enero', clients: 12 },
  { month: 'Febrero', clients: 15 },
  { month: 'Marzo', clients: 22 },
  { month: 'Abril', clients: 25 },
  { month: 'Mayo', clients: 19 },
  { month: 'Junio', clients: 32 },
];

const chartConfig = {
  clients: {
    label: 'Nuevos Clientes',
    color: 'hsl(var(--primary))',
  },
} satisfies import('@/components/ui/chart').ChartConfig;

export default function Home() {
  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clientes Activos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">125</div>
            <p className="text-xs text-muted-foreground">
              +10% desde el mes pasado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Consultas del Mes
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground">
              +5 desde la semana pasada
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ingresos del Mes
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$5,231.89</div>
            <p className="text-xs text-muted-foreground">
              +20.1% desde el mes pasado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas Citas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">2 para hoy</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Crecimiento de Clientes</CardTitle>
            <CardDescription>
              Nuevos clientes en los últimos 6 meses.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar
                  dataKey="clients"
                  fill="var(--color-clients)"
                  radius={4}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              Se completaron 5 consultas esta semana.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Juan Pérez</div>
                    <div className="text-sm text-muted-foreground">
                      juan.perez@email.com
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">Completada</Badge>
                  </TableCell>
                  <TableCell className="text-right">Hace 1 día</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Maria García</div>
                    <div className="text-sm text-muted-foreground">
                      maria.garcia@email.com
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge>Pendiente</Badge>
                  </TableCell>
                  <TableCell className="text-right">Hace 2 días</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Carlos Rodríguez</div>
                    <div className="text-sm text-muted-foreground">
                      c.rod@email.com
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">Completada</Badge>
                  </TableCell>
                  <TableCell className="text-right">Hace 3 días</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Ana Martínez</div>
                    <div className="text-sm text-muted-foreground">
                      ana.m@email.com
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive">Cancelada</Badge>
                  </TableCell>
                  <TableCell className="text-right">Hace 4 días</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
