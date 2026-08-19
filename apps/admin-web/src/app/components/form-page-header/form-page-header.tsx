import { Button, Flex } from '@radix-ui/themes';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { useNavigateBack } from '../../hooks/use-navigate-back';

type FormPageHeaderProps = {
  backLabel: string;
};

export const FormPageHeader = ({ backLabel }: FormPageHeaderProps) => {
  const navigateBack = useNavigateBack();

  return (
    <Flex align="center" gap="2">
      <Button variant="ghost" color="gray" onClick={navigateBack}>
        <ArrowLeftIcon size={16} />
        {backLabel}
      </Button>
    </Flex>
  );
};
