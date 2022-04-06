// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { AccountTree } from "./AccountTree.sol";
import { BLS } from "./libs/BLS.sol";
import { Chooser } from "./proposers/Chooser.sol";

/**
    @dev For gas efficiency reason, public key itself is not logged in events but is
    expected to be parsed from the calldata.
 */
contract BLSAccountRegistry is AccountTree {
    Chooser public immutable chooser;

    event SinglePubkeyRegistered(uint256 pubkeyID);
    event BatchPubkeyRegistered(uint256 startID, uint256 endID);

    constructor(
        Chooser _chooser,
        bytes32 rootLeft,
        uint256 leafIndexLeft,
        bytes32[DEPTH] memory filledSubtreesLeft
    ) public AccountTree(rootLeft, leafIndexLeft, filledSubtreesLeft) {
        chooser = _chooser;
    }

    modifier onlyCoordinator() {
        require(
            msg.sender == chooser.getProposer(),
            "BLSAccountRegistry: Invalid proposer"
        );
        _;
    }

    function register(uint256[4] calldata pubkey) external returns (uint256) {
        bytes32 leaf = keccak256(abi.encodePacked(pubkey));
        uint256 pubkeyID = _updateSingle(leaf);
        emit SinglePubkeyRegistered(pubkeyID);
        return pubkeyID;
    }

    function registerBatch(uint256[4][BATCH_SIZE] calldata pubkeys)
        external
        onlyCoordinator
        returns (uint256)
    {
        bytes32[BATCH_SIZE] memory leafs;
        for (uint256 i = 0; i < BATCH_SIZE; i++) {
            bytes32 leaf = keccak256(abi.encodePacked(pubkeys[i]));
            leafs[i] = leaf;
        }
        uint256 lowerOffset = _updateBatch(leafs);
        emit BatchPubkeyRegistered(lowerOffset, lowerOffset + BATCH_SIZE - 1);
        return lowerOffset;
    }

    function exists(
        uint256 pubkeyID,
        uint256[4] calldata pubkey,
        bytes32[WITNESS_LENGTH] calldata witness
    ) external view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(pubkey));
        return _checkInclusion(leaf, pubkeyID, witness);
    }
}
