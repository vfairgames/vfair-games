import {
  Button,
  Flex,
  SegmentedControl,
  Separator,
  Switch,
  Text,
} from '@radix-ui/themes';
import type { PartnerThemeConfig, ThemeAppearance } from '@vfair/radix-palette';
import { PartnerLogoUpload } from '../partner-logo-upload/partner-logo-upload';
import { PartnerThemeColorField } from '../partner-theme-color-field/partner-theme-color-field';
import { FormSelect } from '../form-select/form-select';
import {
  DEFAULT_APPEARANCE_OPTIONS,
  PALETTE_FIELD_KEYS,
  type PaletteField,
} from '../partner-theme-editor/partner-theme-editor-helpers';

type PartnerThemeEditorFieldsProps = {
  partnerId: number;
  theme: PartnerThemeConfig;
  editingAppearance: ThemeAppearance;
  isPreviewStale: boolean;
  isPaletteAtDefault: boolean;
  isDirty: boolean;
  isSaving: boolean;
  onThemeChange: (
    updater: (current: PartnerThemeConfig) => PartnerThemeConfig,
  ) => void;
  onEditingAppearanceChange: (appearance: ThemeAppearance) => void;
  onLogoChange: (logo: string | null) => void;
  onApplyPreview: () => void;
  onResetPaletteDefaults: () => void;
  onSave: () => void;
};

export const PartnerThemeEditorFields = ({
  partnerId,
  theme,
  editingAppearance,
  isPreviewStale,
  isPaletteAtDefault,
  isDirty,
  isSaving,
  onThemeChange,
  onEditingAppearanceChange,
  onLogoChange,
  onApplyPreview,
  onResetPaletteDefaults,
  onSave,
}: PartnerThemeEditorFieldsProps) => {
  const fieldKeys = PALETTE_FIELD_KEYS[editingAppearance];

  const updateField = (field: PaletteField, value: string) => {
    const key = fieldKeys[field];
    onThemeChange((current) => ({ ...current, [key]: value }));
  };

  return (
    <Flex direction="column" gap="4" className="partner-theme-editor__fields">
      <Flex direction="column" gap="3">
        <Text size="3" weight="medium">
          Theme settings
        </Text>
        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium">
            Default appearance
          </Text>
          <FormSelect
            value={theme.defaultAppearance}
            onChange={(value) =>
              onThemeChange((current) => ({
                ...current,
                defaultAppearance: value as ThemeAppearance,
              }))
            }
            options={DEFAULT_APPEARANCE_OPTIONS}
          />
        </Flex>
        <Flex align="center" justify="between" gap="2">
          <Text as="label" size="2" weight="medium">
            Allow theme switcher in game
          </Text>
          <Switch
            checked={theme.themeSwitcherEnabled}
            onCheckedChange={(checked) =>
              onThemeChange((current) => ({
                ...current,
                themeSwitcherEnabled: checked,
              }))
            }
          />
        </Flex>
      </Flex>

      <PartnerLogoUpload
        partnerId={partnerId}
        logo={theme.logo}
        onLogoChange={onLogoChange}
      />

      <Flex direction="column" gap="2">
        <Text size="3" weight="medium">
          Palette
        </Text>
        <SegmentedControl.Root
          value={editingAppearance}
          onValueChange={(value) =>
            onEditingAppearanceChange(value as ThemeAppearance)
          }
        >
          <SegmentedControl.Item value="light">Light</SegmentedControl.Item>
          <SegmentedControl.Item value="dark">Dark</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Flex>

      <PartnerThemeColorField
        label="Accent"
        value={theme[fieldKeys.accent]}
        onChange={(value) => updateField('accent', value)}
      />
      <PartnerThemeColorField
        label="Gray"
        value={theme[fieldKeys.gray]}
        onChange={(value) => updateField('gray', value)}
      />
      <PartnerThemeColorField
        label="Background"
        value={theme[fieldKeys.background]}
        onChange={(value) => updateField('background', value)}
      />

      <Separator size="4" />
      <Flex justify="end">
        <Button
          variant="soft"
          onClick={onApplyPreview}
          disabled={!isPreviewStale}
        >
          Apply on preview
        </Button>
      </Flex>
      <Separator size="4" />

      <Flex justify="end" gap="2">
        <Button
          variant="soft"
          color="gray"
          onClick={onResetPaletteDefaults}
          disabled={isPaletteAtDefault}
        >
          Reset to defaults
        </Button>
        <Button onClick={onSave} loading={isSaving} disabled={!isDirty}>
          Save theme
        </Button>
      </Flex>
    </Flex>
  );
};
