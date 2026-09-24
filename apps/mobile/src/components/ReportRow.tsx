import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Report } from '@ou-campus-map/shared-types';
import { StyleSheet, View } from 'react-native';

import { REPORT_CATEGORY_META } from '@/constants/categories';
import { colors, radius, space } from '@/constants/theme';
import { relativeTime, timeUntil } from '@/lib/geo';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

interface Props {
  report: Report;
  buildingName?: string;
  onVote?: (vote: 1 | -1) => void;
  voting?: boolean;
}

/** Feed row: category icon, title, place, relative time, score, up/down (design doc §9.2). */
export function ReportRow({ report, buildingName, onVote, voting }: Props) {
  const meta = REPORT_CATEGORY_META[report.category];
  const score = report.upvotes - report.downvotes;
  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: `${meta.color}26` }]}>
        <MaterialCommunityIcons name={meta.icon} size={22} color={meta.color} />
      </View>
      <View style={styles.body}>
        <AppText variant="labelSm" color={meta.color} uppercase>
          {meta.label}
        </AppText>
        <AppText variant="titleMd">{report.title}</AppText>
        {report.description && (
          <AppText color={colors.textSecondary} numberOfLines={3}>
            {report.description}
          </AppText>
        )}
        <AppText variant="bodySm" color={colors.textSecondary}>
          {[
            buildingName,
            relativeTime(report.created_at),
            `expires in ${timeUntil(report.expires_at)}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </AppText>
      </View>
      {onVote && (
        <View style={styles.votes}>
          <IconButton
            icon="arrow-up-bold-outline"
            accessibilityLabel={`Confirm report: ${report.title}`}
            onPress={() => onVote(1)}
            size={40}
            color={colors.success}
            background="transparent"
          />
          <AppText variant="labelLg" accessibilityLabel={`Score ${score}`}>
            {voting ? '…' : score}
          </AppText>
          <IconButton
            icon="arrow-down-bold-outline"
            accessibilityLabel={`Dispute report: ${report.title}`}
            onPress={() => onVote(-1)}
            size={40}
            color={colors.textSecondary}
            background="transparent"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: space.xxs },
  votes: { alignItems: 'center', justifyContent: 'center' },
});
