import { currentQueen } from "./selectors";
import { deleteRecord, loadState, putRecord, runWrite } from "./idb";
import { newId, nowIso } from "./dates";
import { isLegacyHealthId, legacyActionId } from "./health";
import type { ColonyAction, HealthRecord, Queen } from "./types";

async function applyAction(action: ColonyAction): Promise<void> {
  const state = await loadState();

  if (action.type === "change_queen") {
    const current = currentQueen(state, action.colonyId);
    if (current) {
      action.retiredQueenId = current.id;
      const retired: Queen = {
        ...current,
        retiredAt: action.date,
        retireReason: action.queenRetireReason,
      };
      await putRecord("queens", retired);
    }
    const nextId = newId();
    action.spawnedQueenId = nextId;
    const next: Queen = {
      id: nextId,
      colonyId: action.colonyId,
      introducedAt: action.queenIntroducedAt || action.date,
      origin: action.queenOrigin,
    };
    await putRecord("queens", next);
  }

  if (action.type === "move" && action.moveToApiaryId) {
    const colony = state.colonies.find((item) => item.id === action.colonyId);
    if (colony) {
      action.previousApiaryId = colony.apiaryId;
      await putRecord("colonies", {
        ...colony,
        apiaryId: action.moveToApiaryId,
        updatedAt: nowIso(),
      });
    }
  }

  await putRecord("actions", action);
}

/** Persists an action and applies side effects (reina, traslado) in one write. */
export async function commitAction(action: ColonyAction): Promise<void> {
  await runWrite(() => applyAction(action));
}

async function applyHealth(row: HealthRecord): Promise<void> {
  await putRecord("health", row);
}

export async function commitHealth(row: HealthRecord): Promise<void> {
  await runWrite(() => applyHealth(row));
}

export async function commitHealthMany(rows: HealthRecord[]): Promise<void> {
  await runWrite(async () => {
    for (const row of rows) await applyHealth(row);
  });
}

export async function removeHealth(id: string): Promise<void> {
  await runWrite(async () => {
    if (isLegacyHealthId(id)) {
      await deleteRecord("actions", legacyActionId(id));
      return;
    }
    const state = await loadState();
    const row = (state.health ?? []).find((item) => item.id === id);
    await deleteRecord("health", id);
    if (row?.actionId) await deleteRecord("actions", row.actionId);
  });
}

export async function removeAction(id: string): Promise<void> {
  await runWrite(async () => {
    const state = await loadState();
    const action = state.actions.find((item) => item.id === id);
    if (action?.type === "change_queen") {
      if (action.spawnedQueenId) await deleteRecord("queens", action.spawnedQueenId);
      if (action.retiredQueenId) {
        const queen = state.queens.find((item) => item.id === action.retiredQueenId);
        if (queen) {
          const restored: Queen = { ...queen };
          delete restored.retiredAt;
          delete restored.retireReason;
          await putRecord("queens", restored);
        }
      }
    }
    if (action?.type === "move" && action.previousApiaryId) {
      const colony = state.colonies.find((item) => item.id === action.colonyId);
      if (colony) {
        await putRecord("colonies", {
          ...colony,
          apiaryId: action.previousApiaryId,
          updatedAt: nowIso(),
        });
      }
    }
    const linked = (state.health ?? []).filter((item) => item.actionId === id);
    await deleteRecord("actions", id);
    for (const row of linked) await deleteRecord("health", row.id);
  });
}
