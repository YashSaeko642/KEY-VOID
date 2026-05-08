import { useContext } from "react";
import { EnterVoidContext } from "./enterVoidContextInstance";

export function useEnterVoid() {
  const context = useContext(EnterVoidContext);
  if (!context) {
    throw new Error("useEnterVoid must be used within EnterVoidProvider");
  }
  return context;
}
