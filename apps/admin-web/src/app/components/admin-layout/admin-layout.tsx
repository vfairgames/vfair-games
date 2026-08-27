import { Flex, Box } from '@radix-ui/themes';
import { Outlet } from 'react-router';
import clsx from 'clsx';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
import { useLayoutStore } from '../../store/layout-store';
import './admin-layout.scss';

export const AdminLayout = () => {
  const isSidebarOpen = useLayoutStore((s) => s.isSidebarOpen);
  const closeSidebar = useLayoutStore((s) => s.closeSidebar);

  return (
    <Flex className="admin-layout">
      <Sidebar />
      {isSidebarOpen && (
        <Box
          className={clsx(
            'admin-layout__backdrop',
            isSidebarOpen && 'admin-layout__backdrop--visible',
          )}
          onClick={closeSidebar}
        />
      )}
      <Flex className="admin-layout__main" direction="column" flexGrow="1">
        <Header />
        <Box className="admin-layout__content" p="4" flexGrow="1">
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
};
