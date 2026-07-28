import { useCallback, useState } from 'react';
import { api } from './api';

export function useForceRefresh(load: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await api.refresh();
    } catch {
      // best-effort — fall back to whatever is already cached
    }
    await load();
    setRefreshing(false);
  }, [load]);

  return { refreshing, onRefresh };
}
