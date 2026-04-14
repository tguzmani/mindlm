import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEntries,
  getEntry,
  createEntry,
  updateEntry,
  deleteEntry,
  CreateEntryDto,
  UpdateEntryDto,
} from '@/lib/api';

const ENTRIES_KEY = ['entries'] as const;
const entryKey = (id: string) => ['entries', id] as const;

export function useEntries() {
  return useQuery({
    queryKey: ENTRIES_KEY,
    queryFn: getEntries,
  });
}

export function useEntry(id: string) {
  return useQuery({
    queryKey: entryKey(id),
    queryFn: () => getEntry(id),
    enabled: !!id,
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateEntryDto) => createEntry(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENTRIES_KEY });
    },
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateEntryDto }) =>
      updateEntry(id, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ENTRIES_KEY });
      queryClient.invalidateQueries({ queryKey: entryKey(variables.id) });
    },
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENTRIES_KEY });
    },
  });
}
