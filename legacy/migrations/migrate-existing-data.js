(() => {
  'use strict';

  const MANAGER_KEY = 'periodManager';
  const MIGRATION_KEY = 'existingDocs_2025_10_to_2026_09_v2';
  const LEGACY_START = '2026-04';
  const LEGACY_END = '2026-09';
  const TARGET_START = '2025-10';
  const TARGET_END = '2026-09';
  const LEGACY_ID = LEGACY_START + '_' + LEGACY_END;
  const TARGET_ID = TARGET_START + '_' + TARGET_END;

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function normalizeSnapshot(raw, start, end, status = 'Activo') {
    const base = typeof defaultState === 'function' ? defaultState() : {};
    const source = raw && typeof raw === 'object' ? clone(raw) : {};
    const merged = { ...base, ...source };
    merged.period = { ...(base.period || {}), ...(source.period || {}) };
    merged.settings = { ...(base.settings || {}), ...(source.settings || {}) };
    merged.integrations = {
      ...(base.integrations || {}),
      ...(source.integrations || {}),
      firebase: {
        ...(base.integrations?.firebase || {}),
        ...(source.integrations?.firebase || {})
      }
    };
    merged.period.start = start;
    merged.period.end = end;
    merged.period.status = status;
    if (typeof syncPeriodCodes === 'function') syncPeriodCodes(merged.period);
    if (!Array.isArray(merged.needPlan)) merged.needPlan = Array.isArray(merged.plan) ? clone(merged.plan) : [];
    if (!Array.isArray(merged.needFollowup)) merged.needFollowup = Array.isArray(merged.followup) ? clone(merged.followup) : [];
    return merged;
  }

  function currentSnapshot() {
    const out = {};
    Object.keys(state || {}).forEach(key => {
      if (key === MANAGER_KEY) return;
      out[key] = clone(state[key]);
    });
    return normalizeSnapshot(out, TARGET_START, TARGET_END, state?.period?.status || 'Activo');
  }

  function needCount(snapshot) {
    return (snapshot?.coordinations || []).reduce((total, item) => {
      const items = Array.isArray(item?.needItems) ? item.needItems : [];
      return total + items.filter(need => String(need?.text || '').trim()).length;
    }, 0);
  }

  function snapshotScore(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return 0;
    return (
      needCount(snapshot) * 20 +
      (snapshot.needPlan?.length || 0) * 10 +
      (snapshot.needFollowup?.length || 0) * 10 +
      (snapshot.plan?.length || 0) * 4 +
      (snapshot.followup?.length || 0) * 4 +
      (snapshot.teachers?.length || 0)
    );
  }

  function hydrateIntoState(snapshot, manager, status) {
    const normalized = normalizeSnapshot(snapshot, TARGET_START, TARGET_END, status || 'Activo');
    state = { ...normalized, [MANAGER_KEY]: manager };
    if (typeof syncPeriodCodes === 'function') syncPeriodCodes(state.period);
  }

  function markMigration(manager, details) {
    if (!manager.migrations || typeof manager.migrations !== 'object') manager.migrations = {};
    manager.migrations[MIGRATION_KEY] = {
      at: new Date().toISOString(),
      from: LEGACY_START + ' a ' + LEGACY_END,
      to: TARGET_START + ' a ' + TARGET_END,
      ...details
    };
  }

  function migrateOnce() {
    const manager = state?.[MANAGER_KEY];
    if (!manager || !Array.isArray(manager.periods)) return { ready: false, changed: false };
    if (manager.migrations?.[MIGRATION_KEY]) return { ready: true, changed: false };

    let legacy = manager.periods.find(item => (item?.start === LEGACY_START && item?.end === LEGACY_END));
    let target = manager.periods.find(item => (item?.start === TARGET_START && item?.end === TARGET_END));

    const stateIsLegacy = state?.period?.start === LEGACY_START && state?.period?.end === LEGACY_END;
    const activeLegacySnapshot = stateIsLegacy ? currentSnapshot() : null;

    if (!legacy && stateIsLegacy) {
      legacy = {
        id: LEGACY_ID,
        start: LEGACY_START,
        end: LEGACY_END,
        label: 'Abril 2026 - Septiembre 2026',
        status: state?.period?.status || 'Activo',
        createdAt: new Date().toISOString(),
        snapshot: activeLegacySnapshot
      };
      manager.periods.push(legacy);
    }

    if (!legacy) {
      markMigration(manager, { migrated: false, reason: 'legacy-period-not-found' });
      return { ready: true, changed: true, migrated: false };
    }

    const targetStatus = target?.status || legacy?.status || 'Activo';
    const legacySnapshot = normalizeSnapshot(
      activeLegacySnapshot || legacy.snapshot || {},
      TARGET_START,
      TARGET_END,
      targetStatus
    );

    if (target && target !== legacy) {
      const targetSnapshot = normalizeSnapshot(target.snapshot || {}, TARGET_START, TARGET_END, targetStatus);
      const useLegacy = snapshotScore(legacySnapshot) >= snapshotScore(targetSnapshot);
      target.snapshot = useLegacy ? legacySnapshot : targetSnapshot;
      target.id = TARGET_ID;
      target.start = TARGET_START;
      target.end = TARGET_END;
      target.label = 'Octubre 2025 - Septiembre 2026';
      target.status = targetStatus;
      target.updatedAt = new Date().toISOString();
      manager.periods = manager.periods.filter(item => item !== legacy);
    } else {
      target = legacy;
      target.id = TARGET_ID;
      target.start = TARGET_START;
      target.end = TARGET_END;
      target.label = 'Octubre 2025 - Septiembre 2026';
      target.status = targetStatus;
      target.updatedAt = new Date().toISOString();
      target.snapshot = legacySnapshot;
    }

    manager.activeId = TARGET_ID;
    hydrateIntoState(target.snapshot, manager, target.status);
    target.snapshot = currentSnapshot();
    markMigration(manager, {
      migrated: true,
      needs: needCount(target.snapshot),
      planRows: target.snapshot.needPlan?.length || 0,
      followupRows: target.snapshot.needFollowup?.length || 0
    });

    return { ready: true, changed: true, migrated: true };
  }

  let applying = false;
  async function applyMigrationWhenReady() {
    if (applying) return;
    const manager = state?.[MANAGER_KEY];
    if (!manager?.periods?.length) return;

    applying = true;
    try {
      const result = migrateOnce();
      if (!result.ready || !result.changed) return;
      if (typeof save === 'function') await save();
      if (typeof render === 'function') render();
      if (result.migrated && typeof toast === 'function') {
        toast('Datos existentes reasignados a Octubre 2025 – Septiembre 2026');
      }
    } catch (error) {
      console.error('[DocFormación] No se pudo migrar el período histórico:', error);
    } finally {
      applying = false;
    }
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    void applyMigrationWhenReady();
    if (state?.[MANAGER_KEY]?.migrations?.[MIGRATION_KEY] || attempts >= 80) clearInterval(timer);
  }, 100);
})();
