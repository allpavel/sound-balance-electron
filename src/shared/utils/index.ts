export {
	type NormalizationPlatform,
	normalizeFilePath,
} from "./filePathNormalizer";
export { formatValidationIssues } from "./formatValidationIssues";
export { isLegalStatusTransition } from "./isLegalStatusTransition";
export { pathToString, sanitizeControlChars } from "./pathToString";
export {
	configurePlatform,
	getPlatform,
	resetPlatformContext,
} from "./platformContext";
