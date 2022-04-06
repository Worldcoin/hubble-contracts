// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { DefaultTreeParams } from "./DefaultTreeParams.sol";
import { BLSAccountRegistry } from "./BLSAccountRegistry.sol";
import { Chooser } from "./proposers/Chooser.sol";

contract DefaultBLSAccountRegistry is DefaultTreeParams, BLSAccountRegistry {
    constructor(Chooser _chooser)
        public
        BLSAccountRegistry(_chooser, INITIAL_LEFT_ROOT, 0, initialSubtrees)
    {} // solhint-disable-line no-empty-blocks
}
