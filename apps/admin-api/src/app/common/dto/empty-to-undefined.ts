export const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value == null ? undefined : value;
