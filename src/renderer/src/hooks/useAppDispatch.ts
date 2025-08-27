import type { AppDispatch } from "@renderer/store/store";
import { useDispatch } from "react-redux";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
