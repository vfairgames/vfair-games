import {
  Box,
  Button,
  Card,
  Callout,
  Flex,
  Heading,
  Spinner,
  Text,
} from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/auth-store';
import './sign-in-page.scss';

export const SignInPage = () => {
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.error);
  const sessionStatus = useAuthStore((s) => s.sessionStatus);
  const navigate = useNavigate();

  const [username, setUsername] = useState('player1');
  const [password, setPassword] = useState('secret');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      navigate('/', { replace: true });
    }
  }, [sessionStatus, navigate]);

  if (sessionStatus === 'unknown') {
    return (
      <Flex className="sign-in-page" align="center" justify="center">
        <Spinner size="3" />
      </Flex>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(username, password);
    setLoading(false);

    if (success) {
      navigate('/');
    }
  };

  return (
    <Flex className="sign-in-page" align="center" justify="center">
      <Card className="sign-in-page__card" size="4">
        <Flex direction="column" gap="6" align="center">
          <Flex direction="column" gap="1" align="center">
            <Heading size="6">Fake Partner</Heading>
            <Text size="2" color="gray">
              Sign in
            </Text>
          </Flex>
          <Box width="100%">
            <form onSubmit={handleSubmit} autoComplete="off">
              <Flex direction="column" gap="4">
                {error && (
                  <Callout.Root color="red" size="1">
                    <Callout.Text>{error}</Callout.Text>
                  </Callout.Root>
                )}
                <Flex direction="column" gap="2">
                  <Text as="label" size="2" weight="medium">
                    Username
                  </Text>
                  <input
                    className="sign-in-page__input"
                    type="text"
                    name="username"
                    placeholder="player1"
                    autoComplete="off"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </Flex>
                <Flex direction="column" gap="2">
                  <Text as="label" size="2" weight="medium">
                    Password
                  </Text>
                  <input
                    className="sign-in-page__input"
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    autoComplete="off"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Flex>
                <Flex direction="column" align="stretch" mt="2">
                  <Button size="3" type="submit" loading={loading}>
                    Login
                  </Button>
                </Flex>
              </Flex>
            </form>
          </Box>
        </Flex>
      </Card>
    </Flex>
  );
};
