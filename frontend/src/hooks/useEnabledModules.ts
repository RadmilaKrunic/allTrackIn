import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../api/client';
import type { ModuleKey } from '../types';

const ALL_MODULES: ModuleKey[] = ['events', 'todo', 'work', 'eating', 'training', 'spending', 'period', 'books'];

export function useEnabledModules(): Set<ModuleKey> {
  const { data: prefs } = useQuery({
    queryKey: ['settings', 'preferences'],
    queryFn: settingsApi.getPreferences,
    staleTime: 30_000,
  });

  const enabled = prefs?.enabledModules ?? ALL_MODULES;
  return new Set(enabled);
}
