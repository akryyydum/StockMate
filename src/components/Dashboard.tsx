import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { authApi, DashboardActivity, DashboardOverview } from '../auth/authApi';
import { useAppTheme } from '../ThemeProvider';
import { fontFamilies, ThemeColors } from '../theme';
import { LoadingAnimation } from './LoadingAnimation';

type Props = {
  accessToken: string;
};

const currency = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

export function Dashboard({ accessToken }: Props) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setError(null);
    try {
      setData(await authApi.dashboard(accessToken));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadDashboard();
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadDashboard]);

  const summary = data?.summary;
  const total = summary
    ? summary.inStockItems + summary.lowStockItems + summary.outOfStockItems
    : 0;
  const movementMaximum = Math.max(
    1,
    ...(data?.dailyMovements ?? []).map((day) => day.incoming + day.outgoing),
  );
  const hasMovements = (data?.dailyMovements ?? []).some(
    (day) => day.incoming + day.outgoing > 0,
  );

  return (
    <View style={styles.page}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Your café inventory and team activity at a glance.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={loading}
          onPress={() => void loadDashboard()}
          style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
        >
          {loading
            ? <LoadingAnimation size={18} />
            : <Text style={styles.refreshText}>↻  Refresh</Text>}
        </Pressable>
      </View>

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {!data && loading ? (
        <View style={styles.loading}>
          <LoadingAnimation label="Loading dashboard" size={40} />
        </View>
      ) : null}

      {summary ? (
        <>
          <View style={styles.metrics}>
            <Metric label="Stock value" value={currency.format(summary.stockValue)} hint="Current value at cost" accent="orange" />
            <Metric label="Total items" value={String(summary.totalItems)} hint={`${summary.newItemsThisWeek} added this week`} accent="yellow" />
            <Metric label="Low stock" value={String(summary.lowStockItems)} hint={`${summary.outOfStockItems} currently out of stock`} accent="warning" />
            <Metric label="Stock movements today" value={String(summary.movementsToday)} hint={`${summary.stockInsToday} in · ${summary.stockOutsToday} out`} accent="neutral" />
            <Metric label="In stock" value={String(summary.inStockItems)} hint={`${total ? Math.round((summary.inStockItems / total) * 100) : 0}% of tracked items`} accent="yellow" />
            <Metric label="Team accounts" value={String(summary.activeUsers)} hint="Accounts with inventory access" accent="neutral" />
          </View>

          <View style={styles.movementCard}>
            <View style={styles.activityHeader}>
              <View>
                <Text style={styles.cardTitle}>Stock movement</Text>
                <Text style={styles.cardHint}>Incoming and outgoing movements · last 7 days</Text>
              </View>
              <View style={styles.legend}>
                <LegendItem label="In" color={palette.burntYellow} />
                <LegendItem label="Out" color={palette.pumpkinOrange} />
              </View>
            </View>
            <View style={styles.chart}>
              {data.dailyMovements.map((day) => {
                const totalForDay = day.incoming + day.outgoing;
                const height = totalForDay === 0
                  ? 0
                  : Math.max(5, (totalForDay / movementMaximum) * 92);
                const incomingHeight = totalForDay === 0 ? 0 : (day.incoming / totalForDay) * height;
                const outgoingHeight = height - incomingHeight;
                return (
                  <View key={day.date} style={styles.chartDay}>
                    <Text style={styles.chartCount}>{totalForDay || ''}</Text>
                    <View style={styles.barTrack}>
                      {outgoingHeight > 0 ? <View style={[styles.barOutgoing, { height: outgoingHeight }]} /> : null}
                      {incomingHeight > 0 ? <View style={[styles.barIncoming, { height: incomingHeight }]} /> : null}
                    </View>
                    <Text style={styles.chartLabel}>{day.label}</Text>
                  </View>
                );
              })}
            </View>
            {!hasMovements ? <Text style={styles.chartEmpty}>No stock movements recorded this week.</Text> : null}
          </View>

          <View style={styles.contentGrid}>
            <View style={styles.statusCard}>
              <Text style={styles.cardTitle}>Inventory health</Text>
              <Text style={styles.cardHint}>Stock levels compared with minimum thresholds.</Text>
              <StatusRow label="In stock" value={summary.inStockItems} total={total} background={palette.statusInBackground} color={palette.statusInText} />
              <StatusRow label="Low stock" value={summary.lowStockItems} total={total} background={palette.statusLowBackground} color={palette.statusLowText} />
              <StatusRow label="Out of stock" value={summary.outOfStockItems} total={total} background={palette.statusOutBackground} color={palette.statusOutText} />
            </View>
            <View style={styles.activityCard}>
              <View style={styles.activityHeader}>
                <View>
                  <Text style={styles.cardTitle}>Recent activity</Text>
                  <Text style={styles.cardHint}>Latest sign-ins and inventory changes.</Text>
                </View>
                {data.activities.length ? (
                  <Text style={styles.activityCount}>{data.activities.length} events</Text>
                ) : null}
              </View>
              {data.activities.length ? (
                data.activities.map((activity) => (
                  <ActivityRow key={activity.id} activity={activity} />
                ))
              ) : (
                <Text style={styles.emptyText}>No activity recorded yet.</Text>
              )}
            </View>
          </View>
        </>
      ) : !loading && !error ? (
        <Text style={styles.emptyText}>Dashboard data is not available.</Text>
      ) : null}
    </View>
  );
}

function LegendItem({ label, color }: { label: string; color: string }) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function Metric({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent: 'orange' | 'yellow' | 'warning' | 'neutral';
}) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricAccent, styles[`accent_${accent}`]]} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text>
      <Text numberOfLines={1} style={styles.metricHint}>{hint}</Text>
    </View>
  );
}

function StatusRow({
  label,
  value,
  total,
  background,
  color,
}: {
  label: string;
  value: number;
  total: number;
  background: string;
  color: string;
}) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  const ratio = total ? value / total : 0;
  return (
    <View style={styles.statusRow}>
      <View style={styles.statusLabelRow}>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
        <Text style={styles.statusLabel}>{label}</Text>
        <Text style={styles.statusValue}>{value}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${ratio * 100}%`, backgroundColor: color },
            !value && { backgroundColor: background },
          ]}
        />
      </View>
    </View>
  );
}

function ActivityRow({ activity }: { activity: DashboardActivity }) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  const description = describeActivity(activity);
  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityIcon, { backgroundColor: activityColor(activity, palette).background }]}>
        <Text style={[styles.activityIconText, { color: activityColor(activity, palette).text }]}>
          {activityIcon(activity.type)}
        </Text>
      </View>
      <View style={styles.activityCopy}>
        <Text style={styles.activityTitle}>
          <Text style={styles.actorName}>{activity.actorName}</Text>
          {' '}{description}
        </Text>
        {activity.itemName ? <Text numberOfLines={1} style={styles.activityItem}>{activity.itemName}</Text> : null}
      </View>
      <Text style={styles.activityTime}>{formatTime(activity.createdAt)}</Text>
    </View>
  );
}

function describeActivity(activity: DashboardActivity) {
  switch (activity.type) {
    case 'login':
      return 'signed in';
    case 'user_created':
      return `added ${activity.targetName ?? 'a team member'}`;
    case 'inventory_created':
      return 'added an inventory item';
    case 'inventory_updated':
      return 'updated an inventory item';
    case 'stock_in':
      return `added ${formatQuantity(activity.quantity)} ${activity.unit ?? ''} to stock`;
    case 'stock_out':
      return `removed ${formatQuantity(activity.quantity)} ${activity.unit ?? ''} from stock`;
  }
}

function activityIcon(type: DashboardActivity['type']) {
  if (type === 'login') return '↪';
  if (type === 'stock_in' || type === 'inventory_created' || type === 'user_created') return '+';
  if (type === 'stock_out') return '−';
  return '↻';
}

function activityColor(activity: DashboardActivity, palette: ThemeColors) {
  if (activity.type === 'stock_out') {
    return { background: palette.statusOutBackground, text: palette.statusOutText };
  }
  if (activity.type === 'login') {
    return { background: palette.yellowSoft, text: palette.statusInText };
  }
  return { background: palette.orangeSoft, text: palette.dirtyOrange };
}

function formatQuantity(quantity: number | null) {
  return quantity === null ? '' : quantity.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Unknown time';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function createStyles(palette: ThemeColors) {
  return StyleSheet.create({
    page: { gap: 18 },
    headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    headingCopy: { flex: 1 },
    title: { color: palette.ink, fontSize: 24, fontFamily: fontFamilies.bold },
    subtitle: { color: palette.muted, fontSize: 12, fontFamily: fontFamilies.regular, marginTop: 4 },
    refreshButton: { minHeight: 38, minWidth: 86, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', borderRadius: 11, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper },
    refreshText: { color: palette.dirtyOrange, fontSize: 10, fontFamily: fontFamilies.semiBold },
    pressed: { opacity: 0.75 },
    error: { color: palette.danger, fontSize: 11, fontFamily: fontFamilies.medium },
    loading: { minHeight: 150, justifyContent: 'center', alignItems: 'center', gap: 10 },
    hint: { color: palette.muted, fontSize: 10, fontFamily: fontFamilies.regular },
    metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    metricCard: { flexGrow: 1, flexBasis: 185, minWidth: 155, minHeight: 128, overflow: 'hidden', padding: 16, borderRadius: 17, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper },
    metricAccent: { width: 30, height: 4, borderRadius: 3, marginBottom: 13 },
    accent_orange: { backgroundColor: palette.pumpkinOrange },
    accent_yellow: { backgroundColor: palette.burntYellow },
    accent_warning: { backgroundColor: palette.statusLowText },
    accent_neutral: { backgroundColor: palette.muted },
    metricLabel: { color: palette.muted, fontSize: 10, fontFamily: fontFamilies.medium },
    metricValue: { color: palette.ink, fontSize: 23, fontFamily: fontFamilies.bold, marginTop: 6 },
    metricHint: { color: palette.muted, fontSize: 9, fontFamily: fontFamilies.regular, marginTop: 4 },
    contentGrid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 14 },
    statusCard: { flexGrow: 1, flexBasis: 280, padding: 19, borderRadius: 17, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper },
    activityCard: { flexGrow: 2, flexBasis: 460, padding: 19, borderRadius: 17, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper },
    movementCard: { padding: 19, borderRadius: 17, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper },
    activityHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 7 },
    cardTitle: { color: palette.ink, fontSize: 15, fontFamily: fontFamilies.semiBold },
    cardHint: { color: palette.muted, fontSize: 9, fontFamily: fontFamilies.regular, marginTop: 4 },
    legend: { flexDirection: 'row', gap: 13 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 7, height: 7, borderRadius: 4 },
    legendText: { color: palette.muted, fontSize: 9, fontFamily: fontFamilies.medium },
    chart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', minHeight: 125, marginTop: 10 },
    chartDay: { flex: 1, height: 125, justifyContent: 'flex-end', alignItems: 'center', gap: 6 },
    chartCount: { color: palette.muted, fontSize: 8, fontFamily: fontFamilies.medium },
    barTrack: { width: 22, height: 94, justifyContent: 'flex-end', overflow: 'hidden', borderRadius: 7, backgroundColor: palette.surfaceSubtle },
    barIncoming: { width: '100%', backgroundColor: palette.burntYellow },
    barOutgoing: { width: '100%', backgroundColor: palette.pumpkinOrange },
    chartLabel: { color: palette.muted, fontSize: 9, fontFamily: fontFamilies.medium },
    chartEmpty: { color: palette.muted, fontSize: 9, textAlign: 'center', fontFamily: fontFamilies.regular },
    statusRow: { marginTop: 20 },
    statusLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusLabel: { flex: 1, color: palette.ink, fontSize: 10, fontFamily: fontFamilies.medium },
    statusValue: { color: palette.muted, fontSize: 10, fontFamily: fontFamilies.semiBold },
    progressTrack: { height: 8, overflow: 'hidden', borderRadius: 8, backgroundColor: palette.surfaceSubtle },
    progressFill: { height: '100%', borderRadius: 8 },
    activityCount: { color: palette.muted, fontSize: 9, fontFamily: fontFamilies.medium },
    activityRow: { minHeight: 63, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: palette.line },
    activityIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
    activityIconText: { fontSize: 15, fontFamily: fontFamilies.bold },
    activityCopy: { flex: 1, minWidth: 0, paddingVertical: 8 },
    activityTitle: { color: palette.muted, fontSize: 9, lineHeight: 15, fontFamily: fontFamilies.regular },
    actorName: { color: palette.ink, fontFamily: fontFamilies.semiBold },
    activityItem: { color: palette.dirtyOrange, fontSize: 9, fontFamily: fontFamilies.medium, marginTop: 2 },
    activityTime: { color: palette.muted, fontSize: 8, fontFamily: fontFamilies.regular, textAlign: 'right' },
    emptyText: { color: palette.muted, fontSize: 10, fontFamily: fontFamilies.regular, paddingVertical: 20 },
  });
}
