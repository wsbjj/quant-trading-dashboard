import { API_LIMITS, getApiKeyStatus } from "../env";
import { prisma } from "../prisma";
import { classifyRefreshRisk } from "./monitoring";

export type AppSettings = {
  refreshIntervalSeconds: 15 | 30 | 60;
  maxMonitoredSymbols: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  refreshIntervalSeconds: 30,
  maxMonitoredSymbols: 25,
};

const SETTING_KEYS = {
  refreshIntervalSeconds: "refreshIntervalSeconds",
  maxMonitoredSymbols: "maxMonitoredSymbols",
};

export async function getAppSettings() {
  const rows = await prisma.appSetting.findMany();
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const interval = Number(values.get(SETTING_KEYS.refreshIntervalSeconds) ?? DEFAULT_SETTINGS.refreshIntervalSeconds);
  const maxMonitored = Number(values.get(SETTING_KEYS.maxMonitoredSymbols) ?? DEFAULT_SETTINGS.maxMonitoredSymbols);
  const refreshIntervalSeconds = interval === 15 || interval === 60 ? interval : 30;
  const maxMonitoredSymbols = Number.isFinite(maxMonitored) ? Math.max(1, Math.min(50, maxMonitored)) : 25;

  return {
    refreshIntervalSeconds,
    maxMonitoredSymbols,
    refreshRisk: classifyRefreshRisk({ refreshIntervalSeconds, maxMonitoredSymbols }),
    apiKeyStatus: getApiKeyStatus(),
    apiLimits: API_LIMITS,
  };
}

export async function updateAppSettings(input: Partial<AppSettings>) {
  const writes: Array<Promise<unknown>> = [];
  if (input.refreshIntervalSeconds !== undefined) {
    const interval = input.refreshIntervalSeconds === 15 || input.refreshIntervalSeconds === 60 ? input.refreshIntervalSeconds : 30;
    writes.push(
      prisma.appSetting.upsert({
        where: { key: SETTING_KEYS.refreshIntervalSeconds },
        update: { value: String(interval) },
        create: { key: SETTING_KEYS.refreshIntervalSeconds, value: String(interval) },
      }),
    );
  }
  if (input.maxMonitoredSymbols !== undefined) {
    const max = Math.max(1, Math.min(50, Math.floor(input.maxMonitoredSymbols)));
    writes.push(
      prisma.appSetting.upsert({
        where: { key: SETTING_KEYS.maxMonitoredSymbols },
        update: { value: String(max) },
        create: { key: SETTING_KEYS.maxMonitoredSymbols, value: String(max) },
      }),
    );
  }
  await Promise.all(writes);
  return getAppSettings();
}
