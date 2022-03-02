// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
pragma experimental ABIEncoderV2;

import { MerkleTree } from "../libs/MerkleTree.sol";

contract TestMerkleTree {
    function testVerify(
        bytes32 root,
        bytes32 leaf,
        uint256 path,
        bytes32[] memory witness
    ) public view returns (bool, uint256) {
        uint256 gasCost = gasleft();
        bool result = MerkleTree.verify(root, leaf, path, witness);
        return (result, gasCost - gasleft());
    }

    function testMerklize(bytes32[] memory nodes)
        public
        view
        returns (bytes32, uint256)
    {
        bytes32 inputNode = nodes[0];
        uint256 left = gasleft();
        bytes32 root = MerkleTree.merklize(nodes);
        uint256 cost = left - gasleft();
        require(nodes[0] == inputNode, "input mutated");
        return (root, cost);
    }

    function testGetRoot(uint256 level) public view returns (bytes32, uint256) {
        uint256 gasCost = gasleft();
        bytes32 root = MerkleTree.getRoot(level);
        return (root, gasCost - gasleft());
    }
}
