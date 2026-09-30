/**
 * Space Claiming Feature Flag and Runtime Configuration
 */

export let ENABLE_SPACE_CLAIMING = false;

export function setEnableSpaceClaimingForTesting(enabled: boolean) {
  ENABLE_SPACE_CLAIMING = enabled;
}
