import type { RootState } from "@renderer/store/store";
import { useSelector } from "react-redux";

export const useAppSelector = useSelector.withTypes<RootState>();
