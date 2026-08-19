import { DropdownMenu, Flex, Heading, IconButton } from '@radix-ui/themes';
import {
  GearIcon,
  SignOutIcon,
  UserCircleIcon,
  ListIcon,
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/auth-store';
import { useLayoutStore } from '../../store/layout-store';
import './header.scss';

export const Header = () => {
  const logout = useAuthStore((s) => s.logout);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const pageTitle = useLayoutStore((s) => s.pageTitle);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/sign-in');
  };

  return (
    <Flex className="header" align="center" px="4" gap="3">
      <IconButton
        className="header__menu-btn"
        variant="ghost"
        color="gray"
        size="2"
        onClick={toggleSidebar}
      >
        <ListIcon size={20} />
      </IconButton>
      {pageTitle && (
        <Heading size="4" weight="medium">
          {pageTitle}
        </Heading>
      )}
      <Flex ml="auto">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton variant="ghost" color="gray" size="2">
              <UserCircleIcon size={22} weight="duotone" />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Item onClick={() => navigate('/settings')}>
              <GearIcon size={16} />
              Settings
            </DropdownMenu.Item>
            <DropdownMenu.Item color="red" onClick={handleLogout}>
              <SignOutIcon size={16} />
              Logout
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Flex>
    </Flex>
  );
};
