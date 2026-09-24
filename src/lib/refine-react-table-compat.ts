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
  return {
    ...value,
    ...table,
    tableQueryResult: value?.refineCore?.tableQuery,
    current: value?.refineCore?.currentPage,
    setCurrent: value?.refineCore?.setCurrentPage,
  };
}
