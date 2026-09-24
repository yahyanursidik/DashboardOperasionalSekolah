import * as refineHookForm from "@refinedev/react-hook-form";

export * from "@refinedev/react-hook-form";

export function useForm<TVariables = any, TContext = any, TData = any>(...args: any[]): any {
  const value = (refineHookForm.useForm as any)(...args);
  return {
    ...value,
    refineCore: {
      ...value?.refineCore,
      queryResult: value?.refineCore?.query,
    },
  };
}
