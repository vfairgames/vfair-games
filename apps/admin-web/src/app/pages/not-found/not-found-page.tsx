import { Card, Flex, Heading, Text } from '@radix-ui/themes';

export const NotFoundPage = () => (
  <Card size="3">
    <Flex direction="column" align="center" justify="center" gap="2" py="9">
      <Heading size="8" color="gray">
        404
      </Heading>
      <Text size="3" color="gray">
        Page not found.
      </Text>
    </Flex>
  </Card>
);
