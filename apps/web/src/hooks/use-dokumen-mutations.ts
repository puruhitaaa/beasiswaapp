import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dokumenApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";

export function useUploadDokumenMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pendaftaranId,
      kodePermohonan,
      persyaratanId,
      file,
    }: {
      pendaftaranId: string;
      kodePermohonan: string;
      persyaratanId: string;
      file: File;
    }) => {
      return await dokumenApi.upload(pendaftaranId, kodePermohonan, persyaratanId, file);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.myActive() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.transaksi.detail(variables.pendaftaranId),
      });
    },
  });
}
