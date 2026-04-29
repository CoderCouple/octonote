import { useNavigate } from 'react-router-dom';
import { Search, Network, Calendar } from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

export function NavQuickLinks() {
  const navigate = useNavigate();

  const links = [
    { label: 'Search', icon: Search, path: '/' },
    { label: 'Graph', icon: Network, path: '/graph' },
    { label: 'Daily', icon: Calendar, path: '/daily' },
  ] as const;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Quick Links</SidebarGroupLabel>
      <SidebarMenu>
        {links.map((link) => (
          <SidebarMenuItem key={link.label}>
            <SidebarMenuButton
              tooltip={link.label}
              onClick={() => navigate(link.path)}
            >
              <link.icon className="h-4 w-4" />
              <span>{link.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
