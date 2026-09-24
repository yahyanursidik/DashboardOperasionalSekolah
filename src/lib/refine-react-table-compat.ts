import * as refineTable from "@refinedev/react-table";

export * from "@refinedev/react-table";

export function useTable<TData = any, TError = any>(...args: any[]): any {
  const [props, ...rest] = args;
  const pagination = props?.refineCore?.pagination;
  const normalizedArgs =
    pagination && "current" in pagination && !("currentPage" in pagination)
      ? [
          {
            ...props,
            refineCore: {
              ...props.refineCore,
              pagination: { ...pagination, currentPage: pagination.current },
            },
          },
          ...rest,
        ]
      : args;
  const value = (refineTable.useTable as any)(...normalizedArgs);
  const table = value?.reactTable;
  const refineCore = value?.refineCore ?? {};
  const tableQueryResult = refineCore.tableQuery;
  const current = refineCore.currentPage;
  const setCurrent = refineCore.setCurrentPage;

  // Existing screens read the v4-compatible aliases from both the wrapper
  // root and `refineCore`. Keep one normalized query reference in both
  // locations so list routes never dereference an undefined table query.
  return {
    ...value,
    ...table,
    refineCore: {
      ...refineCore,
      tableQueryResult,
      current,
      setCurrent,
    },
    tableQueryResult,
    current,
    setCurrent,
  };
}
