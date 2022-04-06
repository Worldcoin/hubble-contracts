// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import { AccountTree } from "./AccountTree.sol";
import { DefaultTreeParams } from "./DefaultTreeParams.sol";

/**
    The AccountTree constructor accepts an initial state, this contract passes it the
    state of an empty tree.
*/
contract DefaultAccountTree is DefaultTreeParams, AccountTree {
    // solhint-disable-next-line no-empty-blocks
    constructor() public AccountTree(INITIAL_LEFT_ROOT, 0, initialSubtrees) {}
}
