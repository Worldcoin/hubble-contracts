// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
pragma experimental ABIEncoderV2;

import { Transfer } from "../Transfer.sol";
import { Types } from "../libs/Types.sol";
import { Tx } from "../libs/Tx.sol";
import { Transition } from "../libs/Transition.sol";

contract TestTransfer is Transfer {
    function _checkSignature(
        uint256[2] memory signature,
        Types.SignatureProof memory proof,
        bytes32 stateRoot,
        bytes32 accountRoot,
        bytes32 domain,
        bytes memory txs
    ) public returns (uint256, Types.Result) {
        uint256 operationCost = gasleft();
        Types.AuthCommon memory common =
            Types.AuthCommon({
                signature: signature,
                stateRoot: stateRoot,
                accountRoot: accountRoot,
                domain: domain,
                txs: txs
            });
        Types.Result result = checkSignature(common, proof);
        return (operationCost - gasleft(), result);
    }

    function testProcessTransfer(
        bytes32 _balanceRoot,
        Tx.Transfer memory _tx,
        uint256 tokenID,
        Types.StateMerkleProof memory from,
        Types.StateMerkleProof memory to
    ) public pure returns (bytes32, Types.Result) {
        return Transition.processTransfer(_balanceRoot, _tx, tokenID, from, to);
    }

    function testProcessTransferCommit(
        bytes32 stateRoot,
        uint256 maxTxSize,
        uint256 feeReceiver,
        bytes memory txs,
        Types.StateMerkleProof[] memory proofs
    ) public view returns (bytes32, uint256) {
        bytes32 newRoot;
        uint256 operationCost = gasleft();
        (newRoot, ) = processTransferCommit(
            stateRoot,
            maxTxSize,
            feeReceiver,
            txs,
            proofs
        );
        return (newRoot, operationCost - gasleft());
    }
}
