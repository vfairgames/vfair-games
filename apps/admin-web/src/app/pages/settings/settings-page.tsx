import {
  Button,
  Card,
  Flex,
  Heading,
  Separator,
  Text,
  TextField,
} from '@radix-ui/themes';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuthStore } from '../../auth/auth-store';
import { usePageTitle } from '../../hooks/use-page-title';
import { updateProfile } from '../../services/admin-api.service';
import { toast } from '../../store/toast-store';
import './settings-page.scss';

const emailSchema = z.object({
  email: z.string().email('Enter a valid email'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type EmailFormValues = z.infer<typeof emailSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export const SettingsPage = () => {
  usePageTitle('Settings');
  const user = useAuthStore((state) => state.user);
  const applySessionUpdate = useAuthStore((state) => state.applySessionUpdate);

  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors },
    reset: resetEmailForm,
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    values: { email: user?.email ?? '' },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      password: '',
      confirmPassword: '',
    },
  });

  const emailMutation = useMutation({
    mutationFn: (values: EmailFormValues) =>
      updateProfile({ email: values.email.trim() }),
    onSuccess: (result) => {
      const { accessToken, ...user } = result;
      applySessionUpdate(accessToken, user);
      resetEmailForm({ email: user.email });
      toast.success('Email updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (values: PasswordFormValues) =>
      updateProfile({
        currentPassword: values.currentPassword,
        password: values.password,
      }),
    onSuccess: (result) => {
      const { accessToken, ...user } = result;
      applySessionUpdate(accessToken, user);
      resetPasswordForm();
      toast.success('Password updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onEmailSubmit = handleEmailSubmit((values) => {
    if (values.email.trim() === user?.email) {
      toast.error('Enter a different email address');
      return;
    }
    emailMutation.mutate(values);
  });

  const onPasswordSubmit = handlePasswordSubmit((values) => {
    passwordMutation.mutate(values);
  });

  return (
    <Flex direction="column" gap="4" p="4" className="settings-page">
      <Card className="settings-page__card">
        <Flex direction="column" gap="4">
          <Heading size="3" weight="medium">
            Email
          </Heading>
          <form onSubmit={onEmailSubmit} autoComplete="off">
            <Flex direction="column" gap="4">
              <Flex direction="column" gap="1">
                <Text as="label" size="2" weight="medium">
                  Email address
                </Text>
                <TextField.Root
                  type="email"
                  placeholder="user@example.com"
                  autoComplete="off"
                  color={emailErrors.email ? 'red' : undefined}
                  {...registerEmail('email')}
                />
                {emailErrors.email && (
                  <Text size="1" color="red">
                    {emailErrors.email.message}
                  </Text>
                )}
              </Flex>
              <Flex justify="end">
                <Button type="submit" loading={emailMutation.isPending}>
                  Update email
                </Button>
              </Flex>
            </Flex>
          </form>
        </Flex>
      </Card>

      <Card className="settings-page__card">
        <Flex direction="column" gap="4">
          <Heading size="3" weight="medium">
            Password
          </Heading>
          <form onSubmit={onPasswordSubmit} autoComplete="off">
            <Flex direction="column" gap="4">
              <Flex direction="column" gap="1">
                <Text as="label" size="2" weight="medium">
                  Current password
                </Text>
                <TextField.Root
                  type="password"
                  autoComplete="current-password"
                  color={passwordErrors.currentPassword ? 'red' : undefined}
                  {...registerPassword('currentPassword')}
                />
                {passwordErrors.currentPassword && (
                  <Text size="1" color="red">
                    {passwordErrors.currentPassword.message}
                  </Text>
                )}
              </Flex>

              <Separator size="4" />

              <Flex direction="column" gap="1">
                <Text as="label" size="2" weight="medium">
                  New password
                </Text>
                <TextField.Root
                  type="password"
                  autoComplete="new-password"
                  color={passwordErrors.password ? 'red' : undefined}
                  {...registerPassword('password')}
                />
                {passwordErrors.password && (
                  <Text size="1" color="red">
                    {passwordErrors.password.message}
                  </Text>
                )}
              </Flex>

              <Flex direction="column" gap="1">
                <Text as="label" size="2" weight="medium">
                  Confirm new password
                </Text>
                <TextField.Root
                  type="password"
                  autoComplete="new-password"
                  color={passwordErrors.confirmPassword ? 'red' : undefined}
                  {...registerPassword('confirmPassword')}
                />
                {passwordErrors.confirmPassword && (
                  <Text size="1" color="red">
                    {passwordErrors.confirmPassword.message}
                  </Text>
                )}
              </Flex>

              <Flex justify="end">
                <Button type="submit" loading={passwordMutation.isPending}>
                  Update password
                </Button>
              </Flex>
            </Flex>
          </form>
        </Flex>
      </Card>
    </Flex>
  );
};
