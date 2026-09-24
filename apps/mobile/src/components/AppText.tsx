import { Text, type TextProps } from 'react-native';

import { colors, type, type TypeVariant } from '@/constants/theme';

interface Props extends TextProps {
  variant?: TypeVariant;
  color?: string;
  uppercase?: boolean;
}

/** All app text goes through here so the type scale and font family stay consistent. */
export function AppText({
  variant = 'bodyMd',
  color = colors.textPrimary,
  uppercase,
  style,
  ...rest
}: Props) {
  return (
    <Text
      {...rest}
      style={[type[variant], { color }, uppercase && { textTransform: 'uppercase' }, style]}
    />
  );
}
