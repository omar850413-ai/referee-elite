
'use client';
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutGrid,
  Users,
  Calendar,
  BarChart,
  Settings,
  Mountain,
} from 'lucide-react';

export default function AppSidebar() {
  const { state } = useSidebar();
  return (
    <>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 p-2 h-16">
          <Mountain className="h-6 w-6" />
          <h2
            className={`font-semibold text-lg overflow-hidden transition-all duration-300 ${
              state === 'collapsed' ? 'w-0' : 'w-auto'
            }`}
          >
            Soy Asesor
          </h2>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton href="/" isActive tooltip={{ children: 'Panel' }}>
              <LayoutGrid />
              Panel
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton href="#" tooltip={{ children: 'Clientes' }}>
              <Users />
              Clientes
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton href="#" tooltip={{ children: 'Calendario' }}>
              <Calendar />
              Calendario
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton href="#" tooltip={{ children: 'Reportes' }}>
              <BarChart />
              Reportes
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 mt-auto border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton href="#" tooltip={{ children: 'Configuración' }}>
              <Settings />
              Configuración
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
