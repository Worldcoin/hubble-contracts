// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { Chooser } from "../proposers/Chooser.sol";

contract ProofOfAuthority is Chooser {
    mapping(address => bool) proposers;

    constructor(address[] memory _proposers) {
        for (uint256 i = 0; i < _proposers.length; ++i) {
            proposers[_proposers[i]] = true;
        }
    }

    function getProposer() external view override returns (address) {
        if (proposers[tx.origin]) {
            return tx.origin;
        }
        return address(0);
    }
}
