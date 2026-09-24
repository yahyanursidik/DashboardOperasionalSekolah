import * as refine from "@refinedev/core";

export * from "@refinedev/core";
export type AuthBindings = refine.AuthProvider;

const withQueryAliases = (value: any) => {
  const query = value?.query ?? value?.tableQuery;

  // Refine 5 auth hooks (`useGetIdentity` and `usePermissions`) return a
  // TanStack query result directly. Data hooks may still expose it beneath
  // `query`/`tableQuery`. Only project the legacy aliases when that nested
  // query exists; otherwise the direct result (including `data`) must remain
  // intact. Overwriting it with `undefined` hid every role-bound menu.
  if (!query) return value;

  return {
    ...value,
    data: query.data ?? value?.data,
    error: query.error ?? value?.error,
    isLoading: query.isLoading ?? value?.isLoading,
    isFetching: query.isFetching ?? value?.isFetching,
    isError: query.isError ?? value?.isError,
    refetch: query.refetch ?? value?.refetch,
  };
};

const withMutationAliases = (value: any) => {
  const mutation = value?.mutation;
  return {
    ...value,
    isLoading: mutation?.isPending ?? mutation?.isLoading,
    isPending: mutation?.isPending,
    isError: mutation?.isError,
    error: mutation?.error,
    mutate: value?.mutate ?? mutation?.mutate,
    mutateAsync: value?.mutateAsync ?? mutation?.mutateAsync,
  };
};

/**
 * Refine 5 renamed the page cursor from `current` to `currentPage`.
 * The application previously supplied the v4 shape in a few screens; convert
 * it at the boundary so those screens retain their selected page.
 */
const withCurrentPage = (args: any[]) => {
  const [props, ...rest] = args;
  const pagination = props?.pagination;

  if (
    pagination &&
    "current" in pagination &&
    !("currentPage" in pagination)
  ) {
    return [
      {
        ...props,
        pagination: {
          ...pagination,
          currentPage: pagination.current,
        },
      },
      ...rest,
    ];
  }

  return args;
};

export function useList<TQueryFnData = any, TError = any, TData = TQueryFnData>(...args: any[]): any {
  return withQueryAliases((refine.useList as any)(...withCurrentPage(args)));
}

export function useOne<TQueryFnData = any, TError = any, TData = TQueryFnData>(...args: any[]): any {
  return withQueryAliases((refine.useOne as any)(...args));
}

export function useMany<TQueryFnData = any, TError = any, TData = TQueryFnData>(...args: any[]): any {
  return withQueryAliases((refine.useMany as any)(...args));
}

export function useShow<TData = any, TError = any>(...args: any[]): any {
  const value = (refine.useShow as any)(...args);
  return { ...value, queryResult: value?.query, ...withQueryAliases(value) };
}

export function useTable<TData = any, TError = any>(...args: any[]): any {
  const value = (refine.useTable as any)(...withCurrentPage(args));
  const query = value?.tableQuery;
  return {
    ...value,
    tableQueryResult: query,
    current: value?.currentPage,
    setCurrent: value?.setCurrentPage,
    ...withQueryAliases(value),
  };
}

export function useSelect<TData = any, TError = any, TOption = any>(...args: any[]): any {
  const value = (refine.useSelect as any)(...args);
  return { ...value, queryResult: value?.query, ...withQueryAliases(value) };
}

export function useForm<TData = any, TError = any, TVariables = any>(...args: any[]): any {
  const value = (refine.useForm as any)(...args);
  return {
    ...value,
    queryResult: value?.query,
    mutationResult: value?.mutation,
    formLoading: value?.query?.isLoading ?? value?.mutation?.isPending ?? false,
  };
}

export function useGetIdentity<TIdentity = any>(...args: any[]): any {
  return withQueryAliases((refine.useGetIdentity as any)(...(args.length ? args : [{}])));
}

export function usePermissions<TPermissions = any>(...args: any[]): any {
  return withQueryAliases((refine.usePermissions as any)(...(args.length ? args : [{}])));
}

export function useLogin<TVariables = any>(...args: any[]): any {
  return withMutationAliases((refine.useLogin as any)(...args));
}

export function useLogout<TVariables = any>(...args: any[]): any {
  return withMutationAliases((refine.useLogout as any)(...args));
}

export function useCreate<TData = any, TError = any, TVariables = any>(...args: any[]): any {
  return withMutationAliases((refine.useCreate as any)(...args));
}

export function useCreateMany<TData = any, TError = any, TVariables = any>(...args: any[]): any {
  return withMutationAliases((refine.useCreateMany as any)(...args));
}

export function useUpdate<TData = any, TError = any, TVariables = any>(...args: any[]): any {
  return withMutationAliases((refine.useUpdate as any)(...args));
}

export function useDelete<TData = any, TError = any, TVariables = any>(...args: any[]): any {
  return withMutationAliases((refine.useDelete as any)(...args));
}

export function useCustomMutation<TData = any, TError = any, TVariables = any>(...args: any[]): any {
  return withMutationAliases((refine.useCustomMutation as any)(...args));
}
