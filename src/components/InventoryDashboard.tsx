import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  authApi,
  InventoryItem,
  InventoryStatus,
  NewInventoryItem,
} from '../auth/authApi';
import { useAppTheme } from '../ThemeProvider';
import { fontFamilies, ThemeColors } from '../theme';
import { LoadingAnimation } from './LoadingAnimation';

type Props = {
  accessToken: string;
};

type ItemForm = {
  name: string;
  category: string;
  unit: string;
  quantity: string;
  minimumStock: string;
  unitCost: string;
};

type StatusFilter = 'all' | InventoryStatus;
type MovementForm = { item: InventoryItem; type: 'in' | 'out' } | null;

const EMPTY_FORM: ItemForm = {
  name: '',
  category: 'Coffee',
  unit: 'kg',
  quantity: '0',
  minimumStock: '1',
  unitCost: '0',
};

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'All statuses',
  'in-stock': 'In stock',
  'low-stock': 'Low stock',
  'out-of-stock': 'Out of stock',
};

const currency = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

export function InventoryDashboard({ accessToken }: Props) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState({
    stockValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalItems: 0,
    movementsToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [movement, setMovement] = useState<MovementForm>(null);
  const [movementQuantity, setMovementQuantity] = useState('1');

  useEffect(() => {
    let active = true;
    authApi.inventory(accessToken)
      .then((data) => {
        if (!active) return;
        setItems(data.items);
        setSummary(data.summary);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load inventory.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery =
        !query || `${item.name} ${item.category} ${item.unit}`.toLowerCase().includes(query);
      return matchesQuery && (statusFilter === 'all' || item.status === statusFilter);
    });
  }, [items, search, statusFilter]);

  async function refreshInventory() {
    const data = await authApi.inventory(accessToken);
    setItems(data.items);
    setSummary(data.summary);
  }

  function openCreateItem() {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setError(null);
    setItemModal(true);
  }

  function openEditItem(item: InventoryItem) {
    setEditingItem(item);
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantity: String(item.quantity),
      minimumStock: String(item.minimumStock),
      unitCost: String(item.unitCost),
    });
    setError(null);
    setItemModal(true);
  }

  async function saveItem() {
    setError(null);
    setNotice(null);
    const quantity = Number(form.quantity);
    const minimumStock = Number(form.minimumStock);
    const unitCost = Number(form.unitCost);
    if (
      !form.name.trim() ||
      !form.category.trim() ||
      !form.unit.trim() ||
      !Number.isFinite(quantity) ||
      quantity < 0 ||
      !Number.isFinite(minimumStock) ||
      minimumStock < 0 ||
      !Number.isFinite(unitCost) ||
      unitCost < 0
    ) {
      setError('Enter an item name, category, unit, and valid non-negative quantities and cost.');
      return;
    }

    const itemData: NewInventoryItem = {
      name: form.name.trim(),
      category: form.category.trim(),
      unit: form.unit.trim(),
      quantity,
      minimumStock,
      unitCost,
    };
    setBusy(true);
    try {
      if (editingItem) {
        await authApi.updateInventoryItem(accessToken, editingItem.id, itemData);
        setNotice(`${itemData.name} updated.`);
      } else {
        await authApi.createInventoryItem(accessToken, itemData);
        setNotice(`${itemData.name} added to inventory.`);
      }
      setItemModal(false);
      try {
        await refreshInventory();
      } catch (refreshError) {
        setError(
          refreshError instanceof Error
            ? `Saved successfully, but inventory could not be refreshed: ${refreshError.message}`
            : 'Saved successfully, but inventory could not be refreshed.',
        );
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this item.');
    } finally {
      setBusy(false);
    }
  }

  async function saveMovement() {
    if (!movement) return;
    const quantity = Number(movementQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Enter a quantity greater than zero.');
      return;
    }
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await authApi.moveInventory(accessToken, movement.item.id, movement.type, quantity);
      setNotice(
        `${movement.item.name}: ${movement.type === 'in' ? 'stock received' : 'stock used'} (${quantity} ${movement.item.unit}).`,
      );
      setMovement(null);
      try {
        await refreshInventory();
      } catch (refreshError) {
        setError(
          refreshError instanceof Error
            ? `Stock was updated, but inventory could not be refreshed: ${refreshError.message}`
            : 'Stock was updated, but inventory could not be refreshed.',
        );
      }
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : 'Unable to update stock.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.page}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Coffee inventory</Text>
          <Text style={styles.subtitle}>Track quantities, costs, and low-stock levels.</Text>
        </View>
        <Button label="+  Add item" onPress={openCreateItem} />
      </View>

      {error && !itemModal && !movement ? <Feedback text={error} danger /> : null}
      {notice ? <Feedback text={notice} /> : null}

      <View style={styles.metrics}>
        <MetricCard
          label="Stock value"
          value={currency.format(summary.stockValue)}
          detail="Current inventory at cost"
          icon="$"
          accent="dirty"
        />
        <MetricCard
          label="Low stock items"
          value={String(summary.lowStockItems)}
          detail={summary.outOfStockItems ? `${summary.outOfStockItems} out of stock` : 'At or below minimum'}
          icon="!"
          accent="yellow"
        />
        <MetricCard
          label="Total items"
          value={String(summary.totalItems)}
          detail={`${Math.max(0, summary.totalItems - summary.outOfStockItems)} with stock on hand`}
          icon="▦"
          accent="orange"
        />
        <MetricCard
          label="Movements today"
          value={String(summary.movementsToday)}
          detail="Stock ins and outs"
          icon="↕"
          accent="ink"
        />
      </View>

      <View style={styles.inventoryCard}>
        <View style={styles.listHeading}>
          <View>
            <Text style={styles.cardTitle}>Inventory list</Text>
            <Text style={styles.cardHint}>Coffee, milk, syrups, and café supplies.</Text>
          </View>
          {loading ? <LoadingAnimation size={20} /> : null}
        </View>

        <View style={styles.filters}>
          <TextInput
            accessibilityLabel="Search inventory"
            onChangeText={setSearch}
            placeholder="Search inventory..."
            placeholderTextColor={palette.muted}
            style={styles.search}
            value={search}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusFilters}
          >
            {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((filter) => (
              <Pressable
                accessibilityRole="button"
                key={filter}
                onPress={() => setStatusFilter(filter)}
                style={[styles.statusFilter, filter === statusFilter && styles.statusFilterSelected]}
              >
                <Text
                  style={[
                    styles.statusFilterText,
                    filter === statusFilter && styles.statusFilterTextSelected,
                  ]}
                >
                  {STATUS_LABELS[filter]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <LoadingAnimation label="Loading inventory" size={40} />
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>☕</Text>
            <Text style={styles.emptyTitle}>
              {items.length === 0 ? 'Your inventory starts here' : 'No items match those filters'}
            </Text>
            <Text style={styles.emptyHint}>
              {items.length === 0
                ? 'Add your coffee beans, milk, syrups, and other café essentials.'
                : 'Try a different search or status.'}
            </Text>
            {items.length === 0 ? <Button label="+  Add your first item" onPress={openCreateItem} /> : null}
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tableScrollContent}
          >
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <TableCell label="ITEM" width={210} header />
                <TableCell label="QUANTITY" width={110} header />
                <TableCell label="MIN. STOCK" width={112} header />
                <TableCell label="UNIT COST" width={112} header />
                <TableCell label="STOCK VALUE" width={124} header />
                <TableCell label="STATUS" width={112} header />
                <TableCell label="ACTIONS" width={216} header />
              </View>
              {filteredItems.map((item) => (
                <View key={item.id} style={styles.tableRow}>
                  <View style={[styles.cell, styles.itemCell, { width: 210, flexGrow: 210 }]}>
                    <Text numberOfLines={1} style={styles.itemName}>{item.name}</Text>
                    <Text numberOfLines={1} style={styles.itemSub}>{item.category} · {item.unit}</Text>
                  </View>
                  <TableCell label={formatQuantity(item.quantity)} unit={item.unit} width={110} strong />
                  <TableCell label={formatQuantity(item.minimumStock)} unit={item.unit} width={112} />
                  <TableCell label={currency.format(item.unitCost)} width={112} />
                  <TableCell label={currency.format(item.stockValue)} width={124} />
                  <View style={[styles.cell, { width: 112, flexGrow: 112 }]}>
                    <StatusBadge status={item.status} />
                  </View>
                  <View style={[styles.cell, styles.actionCell, { width: 216, flexGrow: 216 }]}>
                    <SmallButton label="+ In" onPress={() => openMovement(item, 'in', setMovement, setMovementQuantity, setError)} />
                    <SmallButton label="− Out" onPress={() => openMovement(item, 'out', setMovement, setMovementQuantity, setError)} />
                    <SmallButton label="Edit" onPress={() => openEditItem(item)} />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          setItemModal(false);
          setMovement(null);
        }}
        transparent
        visible={itemModal || Boolean(movement)}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {movement
                  ? `${movement.type === 'in' ? 'Receive stock' : 'Record stock used'}`
                  : editingItem
                    ? 'Edit inventory item'
                    : 'Add inventory item'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {movement
                  ? `${movement.item.name} · current stock ${formatQuantity(movement.item.quantity)} ${movement.item.unit}`
                  : 'Enter the product details used by your café.'}
              </Text>

              {movement ? (
                <Field
                  label={`Quantity (${movement.item.unit})`}
                  value={movementQuantity}
                  onChangeText={setMovementQuantity}
                  keyboardType="decimal-pad"
                />
              ) : (
                <>
                  <Field label="Item name *" value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="e.g. Oat milk" />
                  <View style={styles.fieldPair}>
                    <Field label="Category" value={form.category} onChangeText={(category) => setForm({ ...form, category })} placeholder="Coffee" />
                    <Field label="Unit *" value={form.unit} onChangeText={(unit) => setForm({ ...form, unit })} placeholder="kg" />
                  </View>
                  <View style={styles.fieldPair}>
                    <Field label="Quantity on hand *" value={form.quantity} onChangeText={(quantity) => setForm({ ...form, quantity })} keyboardType="decimal-pad" />
                    <Field label="Minimum stock *" value={form.minimumStock} onChangeText={(minimumStock) => setForm({ ...form, minimumStock })} keyboardType="decimal-pad" />
                  </View>
                  <Field label="Cost per unit (₱) *" value={form.unitCost} onChangeText={(unitCost) => setForm({ ...form, unitCost })} keyboardType="decimal-pad" />
                </>
              )}

              {error ? <Feedback text={error} danger /> : null}
              <View style={styles.modalActions}>
                <SmallButton
                  label="Cancel"
                  onPress={() => {
                    setItemModal(false);
                    setMovement(null);
                    setError(null);
                  }}
                />
                <Button
                  label={movement ? (movement.type === 'in' ? 'Receive stock' : 'Record usage') : editingItem ? 'Save changes' : 'Add item'}
                  onPress={() => void (movement ? saveMovement() : saveItem())}
                  busy={busy}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function openMovement(
  item: InventoryItem,
  type: 'in' | 'out',
  setMovement: (value: MovementForm) => void,
  setQuantity: (value: string) => void,
  setError: (value: string | null) => void,
) {
  setMovement({ item, type });
  setQuantity('1');
  setError(null);
}

function formatQuantity(quantity: number) {
  return Number.isInteger(quantity) ? quantity.toLocaleString() : quantity.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
  accent: 'dirty' | 'yellow' | 'orange' | 'ink';
}) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricTop}>
        <Text style={styles.metricLabel}>{label}</Text>
        <View style={[styles.metricIcon, styles[`metricIcon_${accent}`]]}>
          <Text style={[styles.metricIconText, styles[`metricText_${accent}`]]}>{icon}</Text>
        </View>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  );
}

function TableCell({
  label,
  unit,
  width,
  header = false,
  strong = false,
}: {
  label: string;
  unit?: string;
  width: number;
  header?: boolean;
  strong?: boolean;
}) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return (
    <View style={[styles.cell, { width, flexGrow: width }]}>
      {unit && !header ? (
        <Text style={styles.cellText}>
          <Text style={strong && styles.cellStrong}>{label}</Text>
          <Text style={styles.cellUnit}> {unit}</Text>
        </Text>
      ) : (
        <Text style={[header ? styles.tableHeaderText : styles.cellText, strong && styles.cellStrong]}>
          {label}
        </Text>
      )}
    </View>
  );
}

function StatusBadge({ status }: { status: InventoryStatus }) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return (
    <View
      style={[
        styles.statusBadge,
        status === 'in-stock'
          ? styles.statusIn
          : status === 'low-stock'
            ? styles.statusLow
            : styles.statusOut,
      ]}
    >
      <Text
        style={[
          styles.statusText,
          status === 'in-stock'
            ? styles.statusTextIn
            : status === 'low-stock'
              ? styles.statusTextLow
              : styles.statusTextOut,
        ]}
      >
        {status === 'in-stock' ? 'In stock' : status === 'low-stock' ? 'Low stock' : 'Out of stock'}
      </Text>
    </View>
  );
}

function SmallButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.smallButton, pressed && styles.smallButtonPressed]}
    >
      <Text style={styles.smallButtonText}>{label}</Text>
    </Pressable>
  );
}

function Button({
  label,
  onPress,
  busy = false,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
}) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
    >
      {busy ? <LoadingAnimation size={20} /> : <Text style={styles.primaryButtonText}>{label}</Text>}
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad';
}) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return (
    <View style={styles.modalField}>
      <Text style={styles.modalFieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        style={styles.modalInput}
        value={value}
      />
    </View>
  );
}

function Feedback({ text, danger = false }: { text: string; danger?: boolean }) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return (
    <Text accessibilityRole="alert" style={[styles.feedback, danger ? styles.feedbackDanger : null]}>
      {text}
    </Text>
  );
}

function createStyles(palette: ThemeColors) {
  return StyleSheet.create({
  page: { gap: 18 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headingCopy: { flex: 1 },
  title: { color: palette.ink, fontSize: 24, fontFamily: fontFamilies.bold },
  subtitle: { color: palette.muted, fontSize: 12, fontFamily: fontFamilies.regular, marginTop: 4 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: {
    flexGrow: 1,
    flexBasis: 170,
    minWidth: 150,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.paper,
  },
  metricTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  metricLabel: { color: palette.muted, fontSize: 11, fontFamily: fontFamilies.medium },
  metricIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metricIcon_dirty: { backgroundColor: palette.orangeSoft },
  metricIcon_yellow: { backgroundColor: palette.yellowSoft },
  metricIcon_orange: { backgroundColor: palette.orangeSoft },
  metricIcon_ink: { backgroundColor: palette.boneWhite },
  metricIconText: { fontSize: 15, fontFamily: fontFamilies.bold },
  metricText_dirty: { color: palette.dirtyOrange },
  metricText_yellow: { color: palette.statusInText },
  metricText_orange: { color: palette.pumpkinOrange },
  metricText_ink: { color: palette.ink },
  metricValue: { color: palette.ink, fontSize: 23, fontFamily: fontFamilies.bold, marginTop: 14 },
  metricDetail: { color: palette.muted, fontSize: 10, fontFamily: fontFamilies.regular, marginTop: 3 },
  cardTitle: { color: palette.ink, fontSize: 16, fontFamily: fontFamilies.semiBold },
  cardHint: { color: palette.muted, fontSize: 10, fontFamily: fontFamilies.regular, marginTop: 4 },
  inventoryCard: { backgroundColor: palette.paper, borderRadius: 16, borderWidth: 1, borderColor: palette.line, overflow: 'hidden' },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 19 },
  filters: { gap: 10, paddingHorizontal: 19, paddingBottom: 15 },
  search: { height: 42, borderRadius: 10, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 13, backgroundColor: palette.paper, color: palette.ink, fontSize: 12, fontFamily: fontFamilies.regular },
  statusFilters: { gap: 7, alignItems: 'center' },
  statusFilter: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper },
  statusFilterSelected: { borderColor: palette.pumpkinOrange, backgroundColor: palette.accentSoft },
  statusFilterText: { color: palette.muted, fontSize: 9, fontFamily: fontFamilies.medium },
  statusFilterTextSelected: { color: palette.dirtyOrange, fontFamily: fontFamilies.semiBold },
  loading: { minHeight: 170, justifyContent: 'center', alignItems: 'center', gap: 9 },
  loadingText: { color: palette.muted, fontSize: 11, fontFamily: fontFamilies.regular },
  empty: { minHeight: 210, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { fontSize: 28, marginBottom: 8 },
  emptyTitle: { color: palette.ink, fontSize: 15, fontFamily: fontFamilies.semiBold },
  emptyHint: { maxWidth: 320, color: palette.muted, textAlign: 'center', fontSize: 11, lineHeight: 17, fontFamily: fontFamilies.regular, marginTop: 5, marginBottom: 14 },
  tableScrollContent: { flexGrow: 1 },
  table: { width: '100%', minWidth: 996, paddingHorizontal: 12 },
  tableRow: { width: '100%', minHeight: 61, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: palette.line },
  tableHeader: { minHeight: 38, borderTopWidth: 0 },
  cell: { minHeight: 58, justifyContent: 'center', paddingHorizontal: 7 },
  tableHeaderText: { color: palette.muted, fontSize: 8, letterSpacing: 0.6, fontFamily: fontFamilies.semiBold },
  cellText: { color: palette.ink, fontSize: 10, fontFamily: fontFamilies.regular },
  cellStrong: { color: palette.ink, fontFamily: fontFamilies.semiBold },
  cellUnit: { color: palette.muted, fontSize: 9, fontFamily: fontFamilies.regular },
  itemCell: { paddingLeft: 2 },
  itemName: { color: palette.ink, fontSize: 10, fontFamily: fontFamilies.semiBold },
  itemSub: { color: palette.muted, fontSize: 9, fontFamily: fontFamilies.regular, marginTop: 4 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 },
  statusIn: { backgroundColor: palette.statusInBackground },
  statusLow: { backgroundColor: palette.statusLowBackground },
  statusOut: { backgroundColor: palette.statusOutBackground },
  statusText: { fontSize: 8, fontFamily: fontFamilies.semiBold },
  statusTextIn: { color: palette.statusInText },
  statusTextLow: { color: palette.statusLowText },
  statusTextOut: { color: palette.statusOutText },
  actionCell: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  smallButton: { minHeight: 31, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 9, borderRadius: 8, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper },
  smallButtonPressed: { backgroundColor: palette.surfaceSubtle },
  smallButtonText: { color: palette.dirtyOrange, fontSize: 9, fontFamily: fontFamilies.semiBold },
  primaryButton: { minHeight: 40, paddingHorizontal: 15, justifyContent: 'center', alignItems: 'center', borderRadius: 11, backgroundColor: palette.pumpkinOrange },
  primaryButtonPressed: { opacity: 0.86 },
  primaryButtonText: { color: '#fff', fontSize: 10, fontFamily: fontFamilies.semiBold },
  modalBackdrop: { flex: 1, justifyContent: 'center', backgroundColor: palette.overlay, padding: 16 },
  modalScroll: { flexGrow: 1, justifyContent: 'center' },
  modalCard: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: 22, borderRadius: 20, backgroundColor: palette.paper },
  modalTitle: { color: palette.ink, fontSize: 19, fontFamily: fontFamilies.bold },
  modalSubtitle: { color: palette.muted, fontSize: 10, lineHeight: 16, fontFamily: fontFamilies.regular, marginTop: 4, marginBottom: 18 },
  modalField: { flex: 1, marginBottom: 12 },
  modalFieldLabel: { color: palette.ink, fontSize: 9, fontFamily: fontFamilies.semiBold, marginBottom: 6 },
  modalInput: { minHeight: 43, borderWidth: 1, borderColor: palette.line, borderRadius: 10, paddingHorizontal: 11, color: palette.ink, backgroundColor: palette.paper, fontSize: 11, fontFamily: fontFamilies.regular },
  fieldPair: { flexDirection: 'row', gap: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 8 },
  feedback: { color: palette.dirtyOrange, fontSize: 10, fontFamily: fontFamilies.medium, marginBottom: 10 },
  feedbackDanger: { color: palette.danger },
  });
}
