// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface Chooser {
    /**
     * @dev Gets a proposer that is eligible to submit a batch
     */
    function getProposer() external view returns (address proposer);
}
