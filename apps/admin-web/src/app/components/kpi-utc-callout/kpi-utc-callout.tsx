import { Callout } from '@radix-ui/themes';

export const KpiUtcCallout = () => (
  <Callout.Root color="blue" size="1">
    <Callout.Text>
      Daily totals are stored by UTC calendar day. Date filters use your local
      calendar dates and are matched to those UTC day keys.
    </Callout.Text>
  </Callout.Root>
);
