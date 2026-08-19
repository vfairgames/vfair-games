import { NavLink } from 'react-router-dom';
import { Flex, Text } from '@radix-ui/themes';
import {
  SquaresFourIcon,
  HandshakeIcon,
  UsersIcon,
  IdentificationCardIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import clsx from 'clsx';
import { useLayoutStore } from '../../store/layout-store';
import { useAuthStore } from '../../auth/auth-store';
import './sidebar.scss';

type NavItem = {
  label: string;
  icon: React.ReactNode;
  path: string;
  permission?: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    icon: <SquaresFourIcon size={18} />,
    path: '/dashboard',
    permission: 'MANAGE_PLAYERS',
  },
  {
    label: 'Partners',
    icon: <HandshakeIcon size={18} />,
    path: '/partners',
    permission: 'MANAGE_PARTNERS',
  },
  {
    label: 'Users',
    icon: <UsersIcon size={18} />,
    path: '/users',
    permission: 'MANAGE_USERS',
  },
  {
    label: 'Players',
    icon: <IdentificationCardIcon size={18} />,
    path: '/players',
    permission: 'MANAGE_PLAYERS',
  },
  {
    label: 'Failed Rounds',
    icon: <WarningCircleIcon size={18} />,
    path: '/failed-rounds',
    permission: 'MANAGE_PLAYERS',
  },
];

const SidebarItem = ({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate: () => void;
}) => (
  <NavLink
    to={item.path}
    className={({ isActive }) =>
      clsx('sidebar__item', isActive && 'sidebar__item--active')
    }
    onClick={onNavigate}
  >
    <Flex align="center" gap="2">
      {item.icon}
      <Text size="2" weight="medium">
        {item.label}
      </Text>
    </Flex>
  </NavLink>
);

export const Sidebar = () => {
  const isSidebarOpen = useLayoutStore((s) => s.isSidebarOpen);
  const closeSidebar = useLayoutStore((s) => s.closeSidebar);
  const permissions = useAuthStore((s) => s.user?.permissions ?? {});

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || permissions[item.permission] === true,
  );

  return (
    <Flex
      className={clsx('sidebar', isSidebarOpen && 'sidebar--open')}
      direction="column"
      gap="1"
    >
      {visibleItems.map((item) => (
        <SidebarItem key={item.label} item={item} onNavigate={closeSidebar} />
      ))}
    </Flex>
  );
};
